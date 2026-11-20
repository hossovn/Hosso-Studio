import {
  APIError,
  type Endpoint,
  type PayloadRequest,
  type Where,
} from 'payload'
import type { Config, Page } from '../payload-types'
import { inTransaction } from '../../../../packages/blocks/src/transactions'
import { serviceTokenOk } from './kiln-auth'
import { kilnIdentity, kilnPageID, kilnUUID } from './kiln-identity'
import { getPayloadSiteLocales } from './locale'
import { lockSitePublication } from './site-publication-lock'
import { cancelCmsSchedule } from './cms-schedule'

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
const fail = (code: string, status = 400): never => {
  throw new APIError(code, status)
}
const fields = ['title', 'slug', 'description', 'seo_title', 'noindex']
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const select = {
  title: true,
  slug: true,
  description: true,
  seo: true,
  _status: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
} as const

function view(doc: Page, isLive: boolean) {
  return {
    id: String(doc.id),
    title: doc.title,
    slug: doc.slug,
    description: doc.description || '',
    seo_title: doc.seo?.title || '',
    noindex: doc.seo?.noindex === true,
    status: doc._status || 'draft',
    is_live: isLive,
    deleted_at: doc.deletedAt || null,
    created_at: doc.createdAt,
    updated_at: doc.updatedAt,
  }
}

function metadata(body: Record<string, unknown>, create = false) {
  const out: {
    title?: string
    slug?: string
    description?: string
    seo?: { title?: string; noindex?: boolean }
  } = {}
  for (const key of ['title', 'slug', 'description', 'seo_title']) {
    if (body[key] === undefined) continue
    const value = body[key]
    if (
      typeof value !== 'string' ||
      value.length > (key === 'description' ? 2000 : key === 'slug' ? 120 : 300)
    )
      fail('invalid_metadata')
    const text = (value as string).trim()
    if (key === 'title' && !text) fail('title_required')
    if (key === 'slug' && text && !slugPattern.test(text)) fail('invalid_slug')
    if (key === 'slug' && !text && !create) fail('invalid_slug')
    if (key === 'seo_title') out.seo = { title: text }
    else out[key as 'title' | 'slug' | 'description'] = text
  }
  if (body.noindex !== undefined) {
    if (typeof body.noindex !== 'boolean') fail('invalid_metadata')
    out.seo = { ...out.seo, noindex: body.noindex as boolean }
  }
  if (create) {
    if (!out.title) fail('title_required')
    out.slug ||= out
      .title!.normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 120)
      .replace(/-$/, '')
    if (!out.slug) fail('invalid_slug')
  }
  return out
}

async function liveIDs(req: PayloadRequest, ids: (number | string)[]) {
  if (!ids.length) return new Set<string>()
  const live = await req.payload.find({
    collection: 'pages',
    req,
    overrideAccess: false,
    draft: false,
    where: { and: [{ id: { in: ids } }, { _status: { equals: 'published' } }] },
    select: { slug: true },
    limit: ids.length,
    depth: 0,
  })
  return new Set(live.docs.map((doc) => String(doc.id)))
}

function endpoint(method: 'get' | 'post' | 'patch'): Endpoint {
  return {
    path: '/site/kiln/pages' + (method === 'patch' ? '/:id' : ''),
    method,
    handler: async (req) => {
      try {
        const tenant = process.env.HOSSO_TENANT || ''
        if (
          !kilnUUID.test(tenant) ||
          req.headers.get('x-hosso-tenant') !== tenant ||
          !serviceTokenOk(req.headers.get('authorization'))
        )
          fail('forbidden', 403)
        const user = await kilnIdentity(
          req,
          req.headers.get('x-hosso-actor') || '',
        )
        req.user = { ...user, collection: 'users' }
        const settings = await getPayloadSiteLocales(req.payload, true)
        const locale = settings.defaultLocale as Config['locale']
        if (method === 'get') {
          const params = new URL(req.url || '', 'http://localhost').searchParams
          const status = params.get('status') || 'all',
            q = (params.get('q') || '').trim()
          const page = Number(params.get('page') || 1),
            size = 12
          if (
            !['all', 'draft', 'published', 'trash'].includes(status) ||
            !Number.isSafeInteger(page) ||
            page < 1 ||
            page > 100000 ||
            q.length > 160
          )
            fail('invalid_query')
          const and: Where[] = []
          if (status === 'trash') and.push({ deletedAt: { exists: true } })
          else if (status !== 'all') and.push({ _status: { equals: status } })
          if (q)
            and.push({
              or: [{ title: { contains: q } }, { slug: { contains: q } }],
            })
          const result = await req.payload.find({
            collection: 'pages',
            req,
            overrideAccess: false,
            draft: true,
            trash: status === 'trash',
            locale,
            depth: 0,
            select,
            sort: '-updatedAt',
            where: and.length ? { and } : undefined,
            limit: size,
            page,
          })
          const live = await liveIDs(
            req,
            result.docs.map((doc) => doc.id),
          )
          return json({
            docs: result.docs.map((doc) => view(doc, live.has(String(doc.id)))),
            total: result.totalDocs,
            page,
            pages: Math.max(1, result.totalPages),
            locale,
          })
        }
        const body = await req.json?.().catch(() => null)
        if (!body || typeof body !== 'object' || Array.isArray(body))
          fail('invalid_body')
        const allowed =
          method === 'post'
            ? fields
            : [...fields, 'status', 'action', 'expected_updated_at']
        if (Object.keys(body).some((key) => !allowed.includes(key)))
          fail('invalid_body')
        const patch = metadata(body, method === 'post')
        const id = String(req.routeParams?.id || '')
        if (
          method === 'patch' &&
          (!kilnPageID.test(id) ||
            typeof body.expected_updated_at !== 'string' ||
            !Number.isFinite(Date.parse(body.expected_updated_at)))
        )
          fail('invalid_revision')
        if (body.status !== undefined && body.status !== 'published')
          fail('invalid_status')
        if (
          body.action !== undefined &&
          !['trash', 'restore', 'unpublish'].includes(body.action)
        )
          fail('invalid_action')
        if (body.action && (Object.keys(patch).length || body.status))
          fail('invalid_action')
        return await inTransaction(req, async () => {
          await lockSitePublication(req)
          // Serialize duplicate detection with all other page writes, including editor saves.
          if (patch.slug) {
            const duplicate = await req.payload.find({
              collection: 'pages',
              draft: true,
              trash: true,
              req,
              overrideAccess: false,
              depth: 0,
              limit: 1,
              where: {
                and: [
                  { slug: { equals: patch.slug } },
                  ...(method === 'patch' ? [{ id: { not_equals: id } }] : []),
                ],
              },
            })
            if (duplicate.totalDocs) fail('slug_conflict', 409)
          }
          if (method === 'post') {
            const doc = await req.payload.create({
              collection: 'pages',
              locale,
              req,
              overrideAccess: false,
              draft: true,
              data: {
                ...patch,
                title: patch.title!,
                slug: patch.slug!,
                _status: 'draft',
                content: { root: { props: {} }, content: [] },
              },
            })
            return json(view(doc, false), 201)
          }
          const doc = await req.payload.findByID({
            collection: 'pages',
            id,
            draft: true,
            trash: true,
            locale,
            depth: 0,
            req,
            overrideAccess: false,
          })
          if (doc.updatedAt !== body.expected_updated_at)
            fail('revision_conflict', 409)
          if (doc.deletedAt && body.action !== 'restore') fail('page_in_trash')
          if (!doc.deletedAt && body.action === 'restore')
            fail('page_not_in_trash')
          let data: Partial<Page> = {
            ...patch,
            ...(patch.seo ? { seo: { ...doc.seo, ...patch.seo } } : {}),
            _status: 'draft',
          }
          let draft = true
          if (body.action) {
            await cancelCmsSchedule(req, 'pages', id)
            data = {
              _status: 'draft',
              deletedAt:
                body.action === 'trash' ? new Date().toISOString() : null,
              cms: {
                ...(doc.cms as object),
                review: 'draft',
                scheduledAt: null,
              },
            }
            draft = false
          } else if (body.status === 'published') {
            data._status = 'published'
            draft = false
          }
          const updated = await req.payload.update({
            collection: 'pages',
            id,
            data,
            draft,
            trash: true,
            locale,
            req,
            overrideAccess: false,
          })
          return json(view(updated, (await liveIDs(req, [id])).has(id)))
        })
      } catch (error) {
        const status = error instanceof APIError ? error.status : 500
        const codes = [
          'forbidden',
          'invalid_query',
          'invalid_metadata',
          'title_required',
          'invalid_slug',
          'invalid_body',
          'invalid_revision',
          'invalid_status',
          'invalid_action',
          'slug_conflict',
          'revision_conflict',
          'page_in_trash',
          'page_not_in_trash',
        ]
        return json(
          {
            error:
              error instanceof Error && codes.includes(error.message)
                ? error.message
                : status === 404
                  ? 'page_not_found'
                  : 'pages_request_failed',
          },
          status,
        )
      }
    },
  }
}

export const kilnPages: Endpoint[] = [
  endpoint('get'),
  endpoint('post'),
  endpoint('patch'),
]
