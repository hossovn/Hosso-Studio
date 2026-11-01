// Read-only code audit reproductions. All credentials are synthetic; networking is loopback only.
import assert from 'node:assert/strict'
import http from 'node:http'
import { once } from 'node:events'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { mkdir, writeFile } from 'node:fs/promises'

const require = createRequire(new URL('../apps/studio/package.json', import.meta.url))
const { tsImport } = require('tsx/esm/api')
const load = (p) => tsImport(p, { parentURL: import.meta.url, tsconfig: fileURLToPath(new URL('../apps/studio/tsconfig.json', import.meta.url)) })
const { authenticate } = await load('../packages/plugin-cross-sell/src/service.ts')
const { baseUrl } = await load('../packages/plugin-cross-sell/src/core.ts')
const { wimFetch } = await load('../packages/plugin-wim/src/client.ts')
const { sendPurchase } = await load('../packages/plugin-cross-sell/src/remote.ts')
const evidence = []
const record = (id, result) => { evidence.push({ id, ...result }); console.log('REPRODUCED', id, JSON.stringify(result)) }

const consumerKey = 'ck_' + 'a'.repeat(40)
const partner = { id: 41, kind: 'woocommerce', active: true, authMethod: 'direct', consumerKey, consumerSecret: 'cs_' + 'b'.repeat(40) }
const payload = { find: async () => ({ docs: [partner] }) }
const authenticated = await authenticate({ payload, headers: new Headers({ authorization: 'Bearer ' + consumerKey }) })
assert.equal(authenticated.id, partner.id)
record('S01', { description: 'Woo consumer key alone authenticates inbound partner requests', acceptedWithoutConsumerSecret: true })

const previousEnvironment = process.env.NODE_ENV
process.env.NODE_ENV = 'production'
try {
  const accepted = ['https://127.0.0.1', 'https://10.0.0.1', 'https://169.254.169.254'].map((url) => baseUrl(url).hostname)
  assert.equal(accepted.length, 3)
  record('S04', { description: 'Partner URL validator accepts private/link-local HTTPS hosts', accepted, networkRequests: 0 })
} finally { if (previousEnvironment === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previousEnvironment }

let receivedFakeKey
const target = http.createServer((req, res) => { receivedFakeKey = req.headers['x-api-key']; res.setHeader('content-type', 'application/json'); res.end('{"ok":true}') })
const redirector = http.createServer((req, res) => { res.writeHead(302, { location: 'http://127.0.0.1:' + target.address().port + '/destination' }); res.end() })
target.listen(0, '127.0.0.1'); await once(target, 'listening')
redirector.listen(0, '127.0.0.1'); await once(redirector, 'listening')
try {
  const fakeKey = 'audit-synthetic-key-never-a-real-secret'
  await wimFetch({ apiUrl: 'http://127.0.0.1:' + redirector.address().port, apiKey: fakeKey, timeoutMs: 3000 }, '/v1/products')
  assert.equal(receivedFakeKey, fakeKey)
  record('S05', { description: 'WIM HTTP client forwards X-API-Key across a redirect to a different origin', forwardedToOtherOrigin: true, syntheticCredential: true })
} finally { await Promise.all([new Promise((r) => target.close(r)), new Promise((r) => redirector.close(r))]) }

process.env.NODE_ENV = 'test'
process.env.HOSSO_LICENSE_ENFORCE = '0'
process.env.HOSSO_SEPAY_KEY = 'synthetic-audit-webhook-key'
const { default: payment } = await load('../packages/plugin-payment/src/index.ts')
const paymentRoute = payment.payload({}).endpoints.find((e) => e.path === '/plugins/payment/sepay/webhook')
const fixture = (failConsumer = false) => {
  const row = { id: 1, orderNo: 'SO-000001', amount: 100000, status: 'pending' }
  let events = 0
  const payload = {
    config: { custom: { hossoPlugins: [{ id: 'audit-consumer', hooks: { onOrderPaid: async () => { events++; if (failConsumer) throw new Error('Injected database failure') } } }] } },
    logger: { error: () => {} },
    find: async () => ({ docs: ['pending', 'underpaid'].includes(row.status) ? [{ ...row }] : [] }),
    count: async () => ({ totalDocs: 0 }),
    update: async ({ data }) => { Object.assign(row, data); return { ...row } },
  }
  const send = (id, amount) => paymentRoute.handler({ payload, headers: new Headers({ authorization: 'Apikey ' + process.env.HOSSO_SEPAY_KEY }), json: async () => ({ id, transferType: 'in', transferAmount: amount, content: 'SO-000001' }) })
  return { row, send, events: () => events }
}
const failedConsumer = fixture(true)
assert.equal((await failedConsumer.send('synthetic-txn-1', 100000)).status, 200)
assert.equal(failedConsumer.row.status, 'paid')
assert.equal((await failedConsumer.send('synthetic-txn-1', 100000)).status, 200)
assert.equal(failedConsumer.events(), 1)
record('F10', { description: 'Bank webhook acknowledges paid row despite a failed downstream paid-event consumer; replay does not redeliver event', providerAcknowledged: true, paymentRow: failedConsumer.row.status, consumerCallsAfterReplay: failedConsumer.events() })
const split = fixture()
await split.send('synthetic-part-1', 60000)
await split.send('synthetic-part-2', 40000)
assert.equal(split.row.status, 'underpaid')
assert.equal(split.row.paidAmount, 40000)
record('F11', { description: 'Split transfers overwrite received amount instead of accumulating a transaction ledger', due: 100000, actualTransferred: 100000, recordedPaidAmount: split.row.paidAmount, status: split.row.status })

const originalFetch = globalThis.fetch
try {
  const purchase = { key: crypto.randomUUID(), buyer: { name: 'Audit retailer', phone: '0901234567' }, items: [{ id: '7', quantity: 1, price: 100000, commissionPct: 15 }] }
  globalThis.fetch = async (_url, init) => {
    const sent = JSON.parse(init.body)
    return Response.json({ id: 101, status: 'pending', currency: 'VND', total: '100000', meta_data: sent.meta_data, refunds: [], line_items: [{ product_id: 999, quantity: 8, total: '100000' }] })
  }
  const parsed = await sendPurchase({ ...partner, apiUrl: 'https://supplier-fixture.invalid' }, purchase)
  assert.equal(parsed.total, 100000)
  assert.equal(parsed.commission, 15000)
  record('F07', { description: 'Woo supplier response with different product and quantity is accepted if key and total match', requestedProduct: '7', requestedQuantity: 1, returnedProduct: 999, returnedQuantity: 8, accepted: true, externalNetworkRequests: 0 })
} finally { globalThis.fetch = originalFetch }

await mkdir('output/commerce-audit-2026-11-01', { recursive: true })
await writeFile('output/commerce-audit-2026-11-01/security-reproductions.json', JSON.stringify({ scope: 'local fixtures only', evidence }, null, 2))
