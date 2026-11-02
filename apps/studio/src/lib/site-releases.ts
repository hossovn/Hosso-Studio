import { createHash } from 'node:crypto'
import type { Endpoint, PayloadRequest } from 'payload'
import hosso from '@hosso-config'
import { buildPuckConfig, coreBlocks } from '@hosso/studio-blocks'
import { inTransaction } from '../../../../packages/blocks/src/transactions'
import { canEditPages, canPublish, isAdmin } from './access'
import { AREAS } from '../globals/SiteAreas'
import { inspectPage, type PublishIssue } from './publish-checks'
import { msg } from './lang'
import { lockSitePublication } from './site-publication-lock'

type Scope = 'pages' | 'posts' | 'reusable-blocks' | 'site-areas' | 'site-settings'
export type ReleaseItem = { key: string; scope: Scope; id?: string | number; title: string; translations: Record<string, Record<string, any>> }
type ReviewedIssue = PublishIssue & { key: string; locale: string; href: string }
const COLLECTIONS = ['pages', 'posts', 'reusable-blocks'] as const
const GLOBALS = ['site-areas', 'site-settings'] as const
const META = new Set(['id', 'createdAt', 'updatedAt', 'globalType', 'builderLink', 'editors', '_status'])
const clean = (doc: Record<string, any>) => Object.fromEntries(Object.entries(doc).filter(([key]) => !META.has(key)))
const canonical = (value: any): any => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])])) : value
const signature = (value: unknown) => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex')
const response = (error: string, status = 400) => Response.json({ error }, { status })
const defaultLocale = hosso.locales[0].code

async function capture(req: PayloadRequest, draft: boolean): Promise<ReleaseItem[]> {
  const result = new Map<string, ReleaseItem>()
  for (const { code: locale } of hosso.locales) {
    for (const scope of COLLECTIONS) {
      let page = 1, hasNextPage = true
      while (hasNextPage) {
        const batch = await req.payload.find({ collection: scope, draft, locale: locale as any, fallbackLocale: false, depth: 0, limit: 100, page, sort: 'id', req, overrideAccess: true })
        for (const doc of batch.docs as Record<string, any>[]) {
          const key = `${scope}:${doc.id}`
          const item: ReleaseItem = result.get(key) ?? { key, scope, id: doc.id, title: doc.title || doc.slug || key, translations: {} }
          item.translations[locale] = { ...clean(doc), _status: doc._status ?? 'draft' }
          result.set(key, item)
        }
        hasNextPage = batch.hasNextPage; page++
      }
    }
    for (const scope of GLOBALS) {
      const doc = await req.payload.findGlobal({ slug: scope, draft, locale: locale as any, fallbackLocale: false, depth: 0, req, overrideAccess: true }) as Record<string, any>
      const item: ReleaseItem = result.get(scope) ?? { key: scope, scope, title: scope === 'site-areas' ? msg(req, 'Header, footer và vùng giao diện', 'Header, footer and site areas') : msg(req, 'Cài đặt giao diện website', 'Site appearance settings'), translations: {} }
      item.translations[locale] = clean(doc)
      result.set(scope, item)
    }
  }
  return [...result.values()]
}

function editorHref(item: ReleaseItem, locale: string, area?: string, issue?: PublishIssue) {
  if (item.scope === 'site-settings') return '/admin/globals/site-settings'
  const q = new URLSearchParams({ locale })
  if (item.scope !== 'pages') q.set('c', item.scope === 'site-areas' ? 'area' : item.scope)
  if (issue?.block) q.set('block', issue.block)
  if (issue?.element) q.set('element', issue.element)
  if (issue?.device) q.set('device', issue.device)
  return `/editor/${area || item.id}?${q}`
}

async function review(req: PayloadRequest) {
  const before = await capture(req, false)
  const latest = await capture(req, true)
  const changed = latest.filter((item) => item.translations[defaultLocale]?._status === 'draft' || signature(item.translations) !== signature(before.find((old) => old.key === item.key)?.translations))
  const history = await req.payload.find({ collection: 'site-releases' as any, depth: 0, sort: '-id', limit: 20, req, overrideAccess: true })
  return { before, latest, changed, history: history.docs as any[], revision: signature({ before, latest, lastRelease: history.docs[0]?.id }) }
}

async function inspect(req: PayloadRequest, state: Awaited<ReturnType<typeof review>>, selected: ReleaseItem[]) {
  const issues: ReviewedIssue[] = []
  const selectedKeys = new Set(selected.map((item) => item.key))
  const effective = state.before.map((item) => selectedKeys.has(item.key) ? state.latest.find((next) => next.key === item.key)! : item)
  for (const item of selected) if (!effective.some((value) => value.key === item.key)) effective.push(item)
  const paths = new Set(['/', '/tim-kiem', '/bai-viet', '/danh-muc', '/the'])
  for (const item of effective) {
    const doc = item.translations[defaultLocale]
    if (doc && (doc._status === 'published' || selectedKeys.has(item.key))) {
      if (item.scope === 'pages') paths.add(doc.slug === 'home' ? '/' : '/' + doc.slug)
      if (item.scope === 'posts') paths.add('/bai-viet/' + doc.slug)
    }
  }
  const settings = effective.find((item) => item.scope === 'site-settings')?.translations[defaultLocale]
  const theme = hosso.themes.find((item) => item.manifest.name === settings?.theme) ?? hosso.themes[0]
  const schemas = [...coreBlocks, ...hosso.plugins.flatMap((plugin) => plugin.blocks ?? [])]
  const blockTypes = new Set(Object.keys(buildPuckConfig({ schemas, theme, plugins: hosso.plugins, mode: 'render' }).components))
  for (const item of selected) for (const [locale, doc] of Object.entries(item.translations)) {
    if (COLLECTIONS.includes(item.scope as any) && !doc.title && locale !== defaultLocale) continue
    const targets = item.scope === 'site-settings'
      ? [{ area: undefined, doc: { content: { content: [{ type: 'NavMenu', props: { id: 'site-menus', items: [...(doc.headerMenu ?? []), ...(doc.footerMenu ?? [])] } }] } } }]
      : item.scope === 'site-areas' ? AREAS.filter((area) => doc[area.name]).map((area) => ({ area: area.name, doc: { content: doc[area.name] } })) : [{ area: undefined, doc }]
    for (const target of targets) for (const issue of inspectPage(target.doc, { paths, blockTypes, locale, locales: hosso.locales.map((value) => value.code), lang: req.i18n?.language, seo: item.scope === 'pages' || item.scope === 'posts' })) {
      issues.push({ ...issue, key: item.key, locale, href: editorHref(item, locale, target.area, issue) })
    }
  }
  return issues
}

async function apply(req: PayloadRequest, items: ReleaseItem[], publish: boolean) {
  for (const item of items) for (const [locale, document] of Object.entries(item.translations)) {
    const data = { ...document, _status: publish ? 'published' : document._status ?? 'published' }
    if (GLOBALS.includes(item.scope as any)) await req.payload.updateGlobal({ slug: item.scope as any, data, locale: locale as any, draft: false, depth: 0, req, overrideAccess: true })
    else {
      if (!document.title && locale !== defaultLocale) continue
      await req.payload.update({ collection: item.scope as any, id: item.id!, data, locale: locale as any, draft: false, depth: 0, req, overrideAccess: true })
    }
  }
}

const summary = (items: ReleaseItem[]) => items.map((item) => ({ key: item.key, title: item.title, href: editorHref(item, defaultLocale, item.scope === 'site-areas' ? 'siteHeader' : undefined) }))
const allowedItems = (req: PayloadRequest, items: ReleaseItem[]) => items.filter((item) => item.scope !== 'site-settings' || isAdmin(req.user))

export const siteReleaseReview: Endpoint = {
  path: '/site/releases/review', method: 'get',
  handler: async (req) => {
    if (!canEditPages(req.user)) return response('Forbidden', 403)
    const state = await review(req)
    const items = allowedItems(req, state.changed)
    return Response.json({ revision: state.revision, items: summary(items), issues: await inspect(req, state, items), canPublish: canPublish(req.user), history: state.history.map(({ id, title, actor, action, sourceRelease, createdAt, summary }) => ({ id, title, actor, action, sourceRelease, createdAt, summary })) }, { headers: { 'Cache-Control': 'no-store' } })
  },
}

export const siteReleasePublish: Endpoint = {
  path: '/site/releases/publish', method: 'post',
  handler: async (req) => {
    if (!canPublish(req.user)) return response('Forbidden', 403)
    const body = await req.json?.().catch(() => null)
    if (!body || typeof body.revision !== 'string' || !Array.isArray(body.keys) || !body.keys.length) return response('Invalid release')
    try {
      return await inTransaction(req, async () => {
        await lockSitePublication(req)
        const state = await review(req)
        if (state.revision !== body.revision) return response(msg(req, 'Nội dung đã thay đổi. Hãy kiểm tra lại trước khi xuất bản.', 'Content changed. Review the release again.'), 409)
        const keys = new Set(body.keys)
        const items = allowedItems(req, state.changed).filter((item) => keys.has(item.key))
        if (items.length !== keys.size) return response('Invalid release items', 403)
        const issues = await inspect(req, state, items)
        if (issues.some((issue) => issue.severity === 'error') || (issues.length && body.acceptWarnings !== true)) return Response.json({ error: msg(req, 'Cần xử lý lỗi hoặc xác nhận các cảnh báo.', 'Resolve errors or acknowledge warnings.'), issues }, { status: 422 })
        const before = state.before.filter((item) => keys.has(item.key))
        const after = items.map((item) => ({ ...item, translations: Object.fromEntries(Object.entries(item.translations).map(([locale, doc]) => [locale, { ...doc, _status: 'published' }])) }))
        const release = await req.payload.create({ collection: 'site-releases' as any, data: { title: String(body.title || msg(req, 'Xuất bản website', 'Publish website')).slice(0, 200), actor: req.user!.email, action: 'publish', reviewToken: body.revision, before, after, summary: summary(items) }, req, overrideAccess: true })
        await apply(req, after, true)
        return Response.json({ ok: true, id: release.id })
      })
    } catch (error) { req.payload.logger.error(error); return response(msg(req, 'Xuất bản thất bại; mọi thay đổi trong lần xuất bản đã được hoàn tác. Hãy tải lại để kiểm tra.', 'Publishing failed; this release was rolled back. Reload to review.'), 409) }
  },
}

export const siteReleaseRestore: Endpoint = {
  path: '/site/releases/restore', method: 'post',
  handler: async (req) => {
    if (!canPublish(req.user)) return response('Forbidden', 403)
    const body = await req.json?.().catch(() => null)
    if (!body?.id || typeof body.revision !== 'string') return response('Invalid release')
    try {
      return await inTransaction(req, async () => {
        await lockSitePublication(req)
        const state = await review(req)
        if (body.revision !== state.revision) return response(msg(req, 'Nội dung đã thay đổi. Hãy tải lại trước khi khôi phục.', 'Content changed. Reload before restoring.'), 409)
        const source = await req.payload.findByID({ collection: 'site-releases' as any, id: body.id, req, overrideAccess: true }) as any
        const target: ReleaseItem[] = source.before
        if (!Array.isArray(target) || !target.length) return response('No restore snapshot')
        if (allowedItems(req, target).length !== target.length) return response('Forbidden', 403)
        const keys = new Set(target.map((item) => item.key))
        if (state.changed.some((item) => keys.has(item.key))) return response(msg(req, 'Có bản nháp chưa xuất bản trong phạm vi khôi phục. Hãy xử lý bản nháp trước.', 'Unpublished drafts exist in the restore scope. Resolve them first.'), 409)
        const before = state.before.filter((item) => keys.has(item.key))
        const record = await req.payload.create({ collection: 'site-releases' as any, data: { title: msg(req, 'Khôi phục trước: ', 'Restore before: ') + source.title, actor: req.user!.email, action: 'restore', sourceRelease: String(source.id), reviewToken: body.revision, before, after: target, summary: summary(target) }, req, overrideAccess: true })
        await apply(req, target, false)
        return Response.json({ ok: true, id: record.id })
      })
    } catch (error) { req.payload.logger.error(error); return response(msg(req, 'Khôi phục thất bại; website giữ nguyên trạng thái trước thao tác.', 'Restore failed; the site remains at its previous state.'), 409) }
  },
}
