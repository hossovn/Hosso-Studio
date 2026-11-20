import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { getPayload } from 'payload'
import config from '../src/payload.config'
import { importSitePackage } from '../src/lib/site-import'
import { buildSitePackage } from '../src/lib/site-package'
import { inspectReadiness } from '../src/lib/readiness'
import { createLocalReq } from 'payload'
import { unzipSync, strFromU8, zipSync, strToU8 } from 'fflate'
if (!process.env.HOSSO_DATABASE_URL?.includes('hosso-studio-cms-')) throw new Error('Disposable database required')
const payload = await getPayload({ config })
try {
  const root = path.resolve('../../seed/sites'), kits = fs.readdirSync(root).filter((name) => /^hosso-.*\.hosso-site\.zip$/.test(name))
  assert.equal(kits.length, 6)
  await payload.updateGlobal({ slug: 'site-settings', data: { siteName: 'Preserve this shop', _status: 'published' }, overrideAccess: true })
  for (const name of kits) {
    const bytes = fs.readFileSync(path.join(root, name))
    const result = await importSitePackage(payload, bytes, () => {})
    assert.ok(result.stats.pages >= 2)
    await assert.rejects(importSitePackage(payload, bytes, () => {}), /Đường dẫn đã tồn tại/)
  }
  const pages = await payload.find({ collection: 'pages', draft: true, limit: 100, overrideAccess: true })
  assert.equal(pages.totalDocs, 23)
  assert.ok(pages.docs.every((page) => page._status === 'draft'))
  assert.equal((await payload.findGlobal({ slug: 'site-settings', overrideAccess: true })).siteName, 'Preserve this shop')
  assert.equal((await payload.count({ collection: 'shop-products' as any, overrideAccess: true })).totalDocs, 0)
  const forms = await payload.find({ collection: 'forms', limit: 100, overrideAccess: true })
  for (const form of forms.docs) assert.ok(pages.docs.some((page) => '/' + page.slug === (form.delivery as any).successHref))
  const badKit = { 'manifest.json': strToU8(JSON.stringify({ format: 2, installMode: 'additive', locales: ['vi'], themes: [], plugins: [] })), 'data/pages.json': strToU8(JSON.stringify([{ slug: 'rollback-fixture', translations: { vi: { title: 'Rollback', content: { content: [], root: { props: {} } } } } }])), 'data/forms.json': strToU8(JSON.stringify([{ slug: 'broken-form', successHref: '/rollback-fixture', translations: { vi: { title: 'Bad' } }, fields: [{ name: 'BAD name', type: 'text', translations: { vi: { label: 'Bad' } } }] }])) }
  await assert.rejects(importSitePackage(payload, zipSync(badKit), () => {}))
  const image = fs.readFileSync(path.resolve('public/editor-demo/mountain.jpg'))
  await assert.rejects(importSitePackage(payload, zipSync({ ...badKit, 'data/media.json': strToU8(JSON.stringify([{ filename: 'rollback-owned.jpg', alt: 'Rollback fixture' }])), 'media/rollback-owned.jpg': image }), () => {}))
  assert.equal(fs.existsSync(path.join(process.env.HOSSO_MEDIA_DIR!, 'rollback-owned.jpg')), false, 'A rolled-back kit removes only its newly written media')
  assert.equal((await payload.count({ collection: 'pages', where: { slug: { equals: 'rollback-fixture' } }, overrideAccess: true })).totalDocs, 0, 'Failed additive import must roll back pages')
  const exported = unzipSync((await buildSitePackage(payload)).data)
  const portableForms = JSON.parse(strFromU8(exported['data/forms.json']))
  assert.ok(portableForms.every((form: any) => form.successHref && !form.delivery))
  const req = await createLocalReq({}, payload)
  const report = await inspectReadiness(req)
  assert.ok(report.checks.some((check) => check.id === 'outbox' && check.state === 'ok'))
  assert.ok(report.checks.some((check) => check.id.startsWith('payment') && check.label.includes('SePay')))
  console.log('PASS six additive kits: 23 draft pages, connected thank-you forms, collision preflight, transactional rollback, unchanged settings/catalog and readiness')
} finally { await payload.destroy() }
process.exit(0)
