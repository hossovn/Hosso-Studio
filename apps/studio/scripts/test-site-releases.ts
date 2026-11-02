import assert from 'node:assert/strict'
import { createLocalReq, getPayload } from 'payload'
import config from '../src/payload.config'
import { siteReleasePublish, siteReleaseRestore, siteReleaseReview } from '../src/lib/site-releases'

assert.ok(process.env.HOSSO_DATABASE_URL?.includes('hosso-studio-releases-'), 'Run through scripts/test-site-releases.mjs with a disposable database')
const payload = await getPayload({ config })
const administrator: any = await payload.create({ collection: 'users', data: { email: 'admin@release.test', password: 'release-test-password', roles: ['admin'] } })
const editor: any = await payload.create({ collection: 'users', data: { email: 'editor@release.test', password: 'release-test-password', roles: ['editor'] } })
const publisher: any = await payload.create({ collection: 'users', data: { email: 'publisher@release.test', password: 'release-test-password', roles: ['publisher'] } })
const call = async (endpoint: any, body?: any, user: any = administrator) => {
  const req = await createLocalReq({ user, req: { headers: new Headers(), url: 'http://localhost/api/site/releases', json: async () => body } as any }, payload)
  const result = await endpoint.handler(req)
  return { status: result.status, data: await result.json() }
}
const content = (name: string) => ({ root: { props: {} }, content: [{ type: 'FreeCanvas', props: { id: 'section-' + name, height: 300, _els: [{ id: 'heading-' + name, type: 'heading', x: 50, y: 50, w: 800, h: 100, props: { text: name, level: 1, size: 40 } }] } }] })
const current = async (draft = false): Promise<any> => ({ page: await payload.findByID({ collection: 'pages', id: page.id, draft, locale: 'vi' }), areas: await payload.findGlobal({ slug: 'site-areas', draft, locale: 'vi' }), settings: await payload.findGlobal({ slug: 'site-settings', draft, locale: 'vi' }) })
const page = await payload.create({ collection: 'pages', data: { title: 'Original', slug: 'home', description: 'Original description', content: content('Original'), _status: 'published' }, locale: 'vi' })
await payload.update({ collection: 'pages', id: page.id, data: { title: 'English original', description: 'English description', content: content('English original'), _status: 'published' }, locale: 'en' })
await payload.updateGlobal({ slug: 'site-areas', data: { siteHeader: content('Original header'), _status: 'published' }, locale: 'vi' })
await payload.updateGlobal({ slug: 'site-settings', data: { siteName: 'Original site', theme: 'default', _status: 'published' }, locale: 'vi' })
try {
  const editorReq = await createLocalReq({ user: editor }, payload)
  await assert.rejects(payload.updateGlobal({ slug: 'site-areas', data: { siteHeader: content('Unauthorized publish'), _status: 'published' }, req: editorReq, overrideAccess: false }))
  await assert.rejects(payload.updateGlobal({ slug: 'site-areas', data: { siteHeader: content('Implicit unauthorized publish') }, req: editorReq, overrideAccess: false }))
  await payload.update({ collection: 'pages', id: page.id, draft: true, data: { title: 'Draft page', content: content('Draft page'), _status: 'draft' }, locale: 'vi' })
  await payload.updateGlobal({ slug: 'site-areas', draft: true, data: { siteHeader: content('Draft header'), _status: 'draft' }, locale: 'vi' })
  await payload.updateGlobal({ slug: 'site-settings', draft: true, data: { siteName: 'Draft site', _status: 'draft' }, locale: 'vi' })
  const live = await current()
  assert.equal(live.page.title, 'Original')
  assert.equal(live.areas.siteHeader.content[0].props._els[0].props.text, 'Original header')
  assert.equal(live.settings.siteName, 'Original site')
  assert.equal((await current(true)).page.title, 'Draft page')
  assert.equal((await call(siteReleaseReview, undefined, null)).status, 403)
  assert.equal((await call(siteReleasePublish, {}, editor)).status, 403)
  const publicReq = await createLocalReq({ user: undefined }, payload)
  await assert.rejects(payload.findGlobal({ slug: 'site-areas', draft: true, req: publicReq, overrideAccess: false }))
  console.log('PASS draft isolation for page/header/settings, anonymous draft access and editor publishing permissions')
  let review = (await call(siteReleaseReview)).data
  assert.equal(review.items.length, 3)
  assert.equal((await call(siteReleasePublish, { revision: review.revision, keys: ['site-settings'], acceptWarnings: true }, publisher)).status, 403)
  const staleRevision = review.revision
  await payload.update({ collection: 'pages', id: page.id, draft: true, data: { description: '', _status: 'draft' }, locale: 'vi' })
  assert.equal((await call(siteReleasePublish, { revision: staleRevision, keys: review.items.map((item: any) => item.key), acceptWarnings: true })).status, 409)
  review = (await call(siteReleaseReview)).data
  assert.equal((await call(siteReleasePublish, { revision: review.revision, keys: review.items.map((item: any) => item.key) })).status, 422, 'Warnings require acknowledgement')
  const published = await call(siteReleasePublish, { revision: review.revision, keys: review.items.map((item: any) => item.key), acceptWarnings: true, title: 'Test release' })
  assert.equal(published.status, 200, JSON.stringify(published.data))
  assert.equal((await current()).page.title, 'Draft page')
  assert.equal((await current()).areas.siteHeader.content[0].props._els[0].props.text, 'Draft header')
  assert.equal((await current()).settings.siteName, 'Draft site')
  assert.equal((await payload.findByID({ collection: 'pages', id: page.id, locale: 'en' })).title, 'English original')
  assert.equal((await call(siteReleaseReview)).data.items.length, 0)
  console.log('PASS stale review protection, atomic release of page/header/settings and preservation of the other language')
  review = (await call(siteReleaseReview)).data
  assert.equal(review.history.length, 1)
  assert.equal('before' in review.history[0], false)
  const restored = await call(siteReleaseRestore, { revision: review.revision, id: published.data.id })
  assert.equal(restored.status, 200, JSON.stringify(restored.data))
  assert.equal((await current()).page.title, 'Original')
  assert.equal((await current()).settings.siteName, 'Original site')
  assert.equal((await current()).areas.siteHeader.content[0].props._els[0].props.text, 'Original header')
  console.log('PASS recorded restore of a complete release')
  await payload.update({ collection: 'pages', id: page.id, draft: true, data: { content: content('Pending work'), _status: 'draft' }, locale: 'vi' })
  review = (await call(siteReleaseReview)).data
  assert.equal((await call(siteReleaseRestore, { revision: review.revision, id: published.data.id })).status, 409)
  console.log('PASS restore protects unpublished drafts')
  await payload.updateGlobal({ slug: 'site-areas', draft: true, data: { siteHeader: content('Failing header'), _status: 'draft' }, locale: 'vi' })
  await payload.update({ collection: 'pages', id: page.id, draft: true, data: { title: 'Must roll back', _status: 'draft' }, locale: 'vi' })
  review = (await call(siteReleaseReview)).data
  const originalUpdate = payload.updateGlobal.bind(payload)
  const beforeFailure = await current()
  const historyBefore = await payload.count({ collection: 'site-releases' as any })
  payload.updateGlobal = (async (options: any) => { if (options.req?.transactionID && options.slug === 'site-areas') throw new Error('Injected global write failure'); return originalUpdate(options) }) as any
  const failed = await call(siteReleasePublish, { revision: review.revision, keys: review.items.map((item: any) => item.key), acceptWarnings: true })
  payload.updateGlobal = originalUpdate
  assert.equal(failed.status, 409)
  assert.equal((await current()).page.title, beforeFailure.page.title)
  assert.equal((await current()).areas.siteHeader.content[0].props._els[0].props.text, beforeFailure.areas.siteHeader.content[0].props._els[0].props.text)
  assert.equal((await payload.count({ collection: 'site-releases' as any })).totalDocs, historyBefore.totalDocs)
  console.log('PASS a failed multi-item release rolls back content and its history record')
  const malformed = content('Invalid')
  malformed.content[0].props._els[0].w = -1
  await payload.update({ collection: 'pages', id: page.id, draft: true, data: { content: malformed, _status: 'draft' }, locale: 'vi' })
  review = (await call(siteReleaseReview)).data
  assert.equal((await call(siteReleasePublish, { revision: review.revision, keys: ['pages:' + page.id], acceptWarnings: true })).status, 422, 'Invalid geometry must block publication')
  await payload.update({ collection: 'pages', id: page.id, draft: true, data: { content: content('Valid again'), _status: 'draft' }, locale: 'vi' })
  const newPage = await payload.create({ collection: 'pages', draft: true, data: { title: 'New draft', slug: 'new-draft', description: 'A new page', content: content('New page'), _status: 'draft' }, locale: 'vi' })
  review = (await call(siteReleaseReview)).data
  assert.ok(review.items.some((item: any) => item.key === 'pages:' + newPage.id))
  const newRelease = await call(siteReleasePublish, { revision: review.revision, keys: ['pages:' + newPage.id], acceptWarnings: true })
  assert.equal(newRelease.status, 200)
  assert.equal((await payload.findByID({ collection: 'pages', id: newPage.id, draft: false, locale: 'vi' }))._status, 'published')
  assert.equal((await current()).page.title, beforeFailure.page.title, 'Unselected page stays unchanged')
  assert.equal((await current(true)).page.title, 'Must roll back', 'Unselected draft is retained')
  console.log('PASS invalid geometry blocks publication, new drafts are discoverable and selected publication preserves other drafts')
  review = (await call(siteReleaseReview)).data
  assert.equal((await call(siteReleaseRestore, { revision: review.revision, id: newRelease.data.id })).status, 200)
  assert.equal((await payload.findByID({ collection: 'pages', id: newPage.id, draft: false, locale: 'vi' }))._status, 'draft')
  console.log('PASS restoring a newly published page returns it to draft')
} finally { await payload.destroy() }
