import assert from 'node:assert/strict'
import { createLocalReq, getPayload } from 'payload'
import config from '../src/payload.config'
import { kilnPages } from '../src/lib/kiln-pages'
import { resolveKilnPage } from '../src/lib/kiln-editor'
import { ssoCodeLogin } from '../src/lib/kiln'
import { createServer } from 'node:http'

const payload = await getPayload({ config })
const tenant = '11111111-1111-4111-8111-111111111111'
const actor = '22222222-2222-4222-8222-222222222222'
const token = 'disposable-kiln-pages-service-token-123456789'
process.env.HOSSO_TENANT = tenant
process.env.HOSSO_SERVICE_TOKEN = token
const exchangeServer = createServer((_req, res) => {
  res.setHeader('Content-Type', 'application/json')
  res.end(
    JSON.stringify({
      success: true,
      data: {
        tenant_id: tenant,
        user_id: actor,
        role: 'owner',
        aud: 'studio.test',
        exp: Math.floor(Date.now() / 1000) + 60,
      },
    }),
  )
})
await new Promise<void>((resolve) =>
  exchangeServer.listen(0, '127.0.0.1', resolve),
)
process.env.HOSSO_KILN_URL =
  'http://127.0.0.1:' + (exchangeServer.address() as { port: number }).port
process.env.HOSSO_PUBLIC_URL = 'https://studio.test'
process.env.HOSSO_KILN_ALLOW_INSECURE_HTTP = 'true'
async function sso(page_id?: string) {
  const req = await createLocalReq({}, payload)
  req.headers = new Headers({
    origin: 'https://studio.test',
    'x-requested-with': 'XMLHttpRequest',
    'content-type': 'application/json',
  })
  req.json = async () => ({
    code: 'sso_code_' + 'a'.repeat(64),
    ...(page_id !== undefined ? { page_id } : {}),
  })
  return ssoCodeLogin.handler(req)
}

async function call(
  method: string,
  data?: unknown,
  id?: string,
  query = '',
  headers: Record<string, string> = {},
) {
  const req = await createLocalReq({}, payload)
  req.headers = new Headers({
    authorization: 'Bearer ' + token,
    'x-hosso-tenant': tenant,
    'x-hosso-actor': actor,
    ...headers,
  })
  Object.defineProperty(req, 'url', {
    value: 'http://localhost/api/site/kiln/pages' + query,
    configurable: true,
  })
  req.routeParams = id ? { id } : {}
  req.json = async () => data
  const res = await kilnPages.find((e) => e.method === method)!.handler(req)
  return { status: res.status, data: await res.json() }
}
try {
  assert.equal(
    (
      await call('get', undefined, undefined, '', {
        authorization: 'Bearer wrong',
      })
    ).status,
    403,
  )
  assert.equal(
    (await call('get', undefined, undefined, '', { 'x-hosso-tenant': actor }))
      .status,
    403,
  )
  assert.equal(
    (await call('get', undefined, undefined, '', { 'x-hosso-actor': 'bad' }))
      .status,
    403,
  )
  let created = await call('post', {
    title: 'Về chúng tôi',
    slug: 've-chung-toi',
  })
  assert.equal(created.status, 201, JSON.stringify(created))
  const id = created.data.id
  const editorUser = (
    await payload.find({
      collection: 'users',
      where: { email: { equals: actor + '@kiln.invalid' } },
    })
  ).docs[0]
  const editorReq = await createLocalReq(
    { user: { ...editorUser, collection: 'users' } },
    payload,
  )
  assert.equal(String((await resolveKilnPage(editorReq, id)).id), id)
  for (const target of ['../../admin', 'https://evil.test', '999999999'])
    await assert.rejects(() => resolveKilnPage(editorReq, target))
  assert.equal(typeof id, 'string')
  assert.equal(created.data.status, 'draft')
  assert.equal(
    (await call('post', { title: 'Duplicate', slug: 've-chung-toi' })).status,
    409,
  )
  for (const data of [
    { title: '' },
    { title: 'X', slug: '../../admin' },
    { title: 'X', content: {} },
  ])
    assert.equal((await call('post', data)).status, 400)
  const list = await call(
    'get',
    undefined,
    undefined,
    '?q=chúng&status=draft&page=1',
  )
  assert.equal(list.status, 200)
  assert.equal(list.data.docs[0].id, id)
  assert.equal(list.data.total, 1)
  assert.equal(Object.hasOwn(list.data.docs[0], 'content'), false)
  const saved = await payload.update({
    collection: 'pages',
    id,
    draft: true,
    data: {
      content: {
        root: { props: {} },
        content: [
          { type: 'Heading', props: { id: 'heading-1', text: 'Keep me' } },
        ],
      },
    },
  })
  assert.equal(
    (
      await call(
        'patch',
        { title: 'stale', expected_updated_at: created.data.updated_at },
        id,
      )
    ).status,
    409,
  )
  const edited = await call(
    'patch',
    {
      title: 'Giới thiệu',
      description: 'Nội dung mô tả',
      seo_title: 'Về thương hiệu',
      noindex: true,
      expected_updated_at: saved.updatedAt,
    },
    id,
  )
  assert.equal(edited.status, 200, JSON.stringify(edited))
  assert.equal(edited.data.seo_title, 'Về thương hiệu')
  assert.deepEqual(
    (await payload.findByID({ collection: 'pages', id, draft: true })).content,
    saved.content,
  )
  assert.equal(
    (await call('patch', { title: 'missing revision' }, id)).status,
    400,
  )
  const published = await call(
    'patch',
    { status: 'published', expected_updated_at: edited.data.updated_at },
    id,
  )
  assert.equal(published.status, 200, JSON.stringify(published))
  assert.equal(
    (await payload.findByID({ collection: 'pages', id, draft: false }))._status,
    'published',
  )
  assert.equal(published.data.is_live, true)
  const nextDraft = await call(
    'patch',
    { seo_title: 'Chờ duyệt', expected_updated_at: published.data.updated_at },
    id,
  )
  assert.equal(nextDraft.status, 200)
  assert.equal(nextDraft.data.status, 'draft')
  assert.equal(nextDraft.data.is_live, true)
  assert.equal(
    (await payload.findByID({ collection: 'pages', id, draft: false })).seo
      ?.title,
    'Về thương hiệu',
  )
  const unpublished = await call(
    'patch',
    { action: 'unpublish', expected_updated_at: nextDraft.data.updated_at },
    id,
  )
  assert.equal(unpublished.status, 200)
  assert.equal(unpublished.data.is_live, false)
  published.data.updated_at = unpublished.data.updated_at
  const trashed = await call(
    'patch',
    { action: 'trash', expected_updated_at: published.data.updated_at },
    id,
  )
  assert.equal(trashed.status, 200, JSON.stringify(trashed))
  assert.ok(trashed.data.deleted_at)
  await assert.rejects(() => resolveKilnPage(editorReq, id))
  assert.equal((await call('get')).data.total, 0)
  assert.equal(
    (await call('get', undefined, undefined, '?status=trash')).data.total,
    1,
  )
  assert.equal(
    (
      await call(
        'patch',
        { status: 'published', expected_updated_at: trashed.data.updated_at },
        id,
      )
    ).status,
    400,
  )
  const restored = await call(
    'patch',
    { action: 'restore', expected_updated_at: trashed.data.updated_at },
    id,
  )
  assert.equal(restored.status, 200, JSON.stringify(restored))
  assert.equal(restored.data.status, 'draft')
  assert.equal(restored.data.deleted_at, null)
  const second = await call('post', {
    title: 'Trang thứ hai',
    slug: 'trang-thu-hai',
  })
  const selected = await sso(second.data.id)
  assert.equal(selected.status, 200)
  assert.equal((await selected.json()).redirect, '/editor/' + second.data.id)
  assert.ok(selected.headers.get('set-cookie')?.includes('HttpOnly'))
  assert.equal((await sso('../../admin')).status, 400)
  const missing = await sso('999999999')
  assert.notEqual(missing.status, 200)
  assert.equal(missing.headers.get('set-cookie'), null)
  const races = await Promise.all(
    ['A', 'B'].map((title) =>
      call(
        'patch',
        { title, expected_updated_at: restored.data.updated_at },
        id,
      ),
    ),
  )
  assert.deepEqual(
    races.map((r) => r.status).sort(),
    [200, 409],
    'Only one concurrent writer may commit',
  )
  for (let i = 0; i < 12; i++)
    assert.equal(
      (await call('post', { title: 'Trang ' + i, slug: 'page-' + i })).status,
      201,
    )
  const batch1 = await call('get'),
    batch2 = await call('get', undefined, undefined, '?page=2')
  assert.equal(batch1.data.docs.length, 12)
  assert.equal(batch2.data.docs.length, 2)
  assert.equal(batch2.data.total, 14)
  assert.equal(
    new Set(
      [...batch1.data.docs, ...batch2.data.docs].map(
        (p: { id: string }) => p.id,
      ),
    ).size,
    14,
  )
  assert.equal(
    (
      await call(
        'patch',
        { title: 'bad', expected_updated_at: 'old' },
        '../../admin',
      )
    ).status,
    400,
  )
  const user = (
    await payload.find({
      collection: 'users',
      where: { email: { equals: actor + '@kiln.invalid' } },
    })
  ).docs[0]
  await payload.update({
    collection: 'users',
    id: user.id,
    data: { roles: ['author'] },
  })
  assert.equal(
    (await call('get')).status,
    403,
    'A restricted managed identity must not be escalated',
  )
  console.log(
    'PASS: tenant/token/actor isolation, real CMS CRUD, conflict detection, content preservation, publish, trash/restore and revoked identity',
  )
} finally {
  delete process.env.HOSSO_TENANT
  exchangeServer.closeAllConnections()
  await new Promise<void>((resolve) => exchangeServer.close(() => resolve()))
  await payload.destroy()
}
process.exit(0)
