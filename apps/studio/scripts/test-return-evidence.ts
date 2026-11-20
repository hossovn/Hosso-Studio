import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { Transformer } from '@napi-rs/image'
import { createLocalReq, getPayload } from 'payload'
import config from '../src/payload.config'
import { cleanReturnEvidence, returnEndpoints } from '../../../packages/plugin-shop/src/returns'

assert.ok(process.env.HOSSO_PRIVATE_DIR?.includes('hosso-studio-cms-'), 'Disposable private storage required')
const settings = await config
settings.jobs!.autoRun = []
const payload = await getPayload({ config: settings, disableOnInit: true })
const priorRetention = process.env.HOSSO_RETURN_EVIDENCE_DAYS
try {
  const admin = await payload.create({ collection: 'users', data: { email: 'evidence@example.test', password: 'evidence-test-password', roles: ['admin'] }, overrideAccess: true })
  const token = 'c'.repeat(64), orderNo = 'EVIDENCE-FIXTURE'
  const product = await payload.create({ collection: 'shop-products' as any, data: { name: 'Evidence fixture', slug: 'evidence-fixture', code: 'EVIDENCE', price: 100000, stock: 5, active: true, source: 'shop' }, overrideAccess: true })
  const order = await payload.create({ collection: 'shop-orders' as any, data: { orderNo, total: 100000, subtotal: 100000, status: 'completed', paymentStatus: 'paid', lookupToken: token, items: [{ productId: String(product.id), source: 'shop', name: 'Fixture', price: 100000, quantity: 1 }] }, overrideAccess: true })
  const row = await payload.create({ collection: 'shop-returns' as any, data: { requestKey: randomUUID(), order: order.id, orderNo, items: [], reason: 'Evidence fixture', state: 'requested' }, overrideAccess: true })
  const request = async (input?: unknown, staff = false, query = '') => {
    const req = await createLocalReq(staff ? { user: { ...admin, collection: 'users' } } : {}, payload)
    req.headers = new Headers({ origin: 'http://localhost:3000' })
    Object.defineProperty(req, 'url', { value: 'http://localhost:3000/api/plugins/shop/return-evidence' + query })
    if (input !== undefined) req.json = async () => input
    return req
  }
  const endpoint = (name: string, method = 'post') => returnEndpoints.find((item) => item.path === '/plugins/shop/' + name && item.method === method)!.handler
  const bytes = await fs.readFile(path.resolve('public/editor-demo/mountain.jpg'))
  const image = 'data:image/jpeg;base64,' + bytes.toString('base64')
  for (let revision = 0; revision < 3; revision++) {
    const result = await endpoint('return-evidence')(await request({ id: row.id, token, revision, image }))
    assert.equal(result.status, 200, await result.text())
  }
  assert.equal((await endpoint('return-evidence')(await request({ id: row.id, token, revision: 3, image }))).status, 409, 'Fourth evidence is rejected')
  const url = `?id=${row.id}&index=0`
  for (const key of ['', 'd'.repeat(64)]) assert.equal((await endpoint('return-evidence', 'get')(await request(undefined, false, url + '&token=' + key))).status, 404)
  const result = await endpoint('return-evidence', 'get')(await request(undefined, false, url + '&token=' + token))
  assert.equal(result.status, 200)
  assert.equal(result.headers.get('Content-Type'), 'image/webp')
  assert.equal(result.headers.get('Cache-Control'), 'private, no-store')
  assert.equal(result.headers.get('X-Content-Type-Options'), 'nosniff')
  const encoded = Buffer.from(await result.arrayBuffer()), meta = await new Transformer(encoded).metadata()
  assert.equal(encoded.toString('ascii', 8, 12), 'WEBP')
  assert.ok(meta.width > 0 && meta.width <= 1600 && meta.height > 0)
  assert.equal((await endpoint('return-evidence', 'get')(await request(undefined, true, url))).status, 200)
  const directory = path.join(process.env.HOSSO_PRIVATE_DIR!, 'returns')
  const stored = await payload.findByID({ collection: 'shop-returns' as any, id: row.id, overrideAccess: true }) as any
  assert.equal((await fs.readdir(directory)).length, 3, 'Rejected upload leaves no extra files')
  const now = new Date(Date.now() + 60 * 86400000), old = new Date(now.getTime() - 3 * 86400000)
  const orphan = path.join(directory, randomUUID() + '.webp'), recent = path.join(directory, randomUUID() + '.webp')
  await fs.writeFile(orphan, encoded); await fs.utimes(orphan, old, old)
  await fs.writeFile(recent, encoded); await fs.utimes(recent, now, now)
  process.env.HOSSO_RETURN_EVIDENCE_DAYS = '0'
  await cleanReturnEvidence(await request(undefined, true), now)
  await assert.rejects(fs.stat(orphan), { code: 'ENOENT' })
  await fs.stat(recent)
  for (const item of stored.evidence) await fs.stat(path.join(directory, item.filename))
  process.env.HOSSO_RETURN_EVIDENCE_DAYS = '30'
  await cleanReturnEvidence(await request(undefined, true), now)
  assert.equal((await payload.findByID({ collection: 'shop-returns' as any, id: row.id, overrideAccess: true }) as any).evidence.length, 3, 'Open requests retain evidence regardless of age')
  const rejected = await endpoint('manage-return')(await request({ id: row.id, revision: 3, action: 'reject', reason: 'Fixture retention review' }, true))
  assert.equal(rejected.status, 200, await rejected.text())
  await cleanReturnEvidence(await request(undefined, true), now)
  assert.equal((await payload.findByID({ collection: 'shop-returns' as any, id: row.id, overrideAccess: true }) as any).evidence.length, 0)
  for (const item of stored.evidence) await assert.rejects(fs.stat(path.join(directory, item.filename)), { code: 'ENOENT' })
  assert.equal((await endpoint('return-evidence', 'get')(await request(undefined, false, url + '&token=' + token))).status, 404)
  console.log('PASS return evidence: real decode/WebP, private token/admin access, attachment limit, orphan grace period, open-request retention and configured expiry')
} finally {
  if (priorRetention === undefined) delete process.env.HOSSO_RETURN_EVIDENCE_DAYS
  else process.env.HOSSO_RETURN_EVIDENCE_DAYS = priorRetention
  await payload.destroy()
}
process.exit(0)
