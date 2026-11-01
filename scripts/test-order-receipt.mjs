// Disposable database and fake mail transport. Never sends real email or creates a live order.
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
const require = createRequire(new URL('../apps/studio/package.json', import.meta.url))
const { tsImport } = require('tsx/esm/api')
const load = (p) => tsImport(p, { parentURL: import.meta.url, tsconfig: fileURLToPath(new URL('../apps/studio/tsconfig.json', import.meta.url)) })
process.env.NODE_ENV = 'test'; process.env.HOSSO_LICENSE_ENFORCE = '0'
const directory = await mkdtemp(join(tmpdir(), 'hosso-receipt-'))
await mkdir(join(directory, 'media'))
let payload
try {
  const shopOnly = !process.argv.includes('--with-notify')
  const [{ default: shop }, { default: notify }, { recoverOrders, endpoints }] = await Promise.all([load('../packages/plugin-shop/src/index.ts'), shopOnly ? Promise.resolve({ default: { id: 'no-notify' } }) : load('../packages/plugin-notify/src/index.ts'), load('../packages/plugin-shop/src/endpoints.ts')])
  const { buildConfig, getPayload, createLocalReq } = await import(pathToFileURL(require.resolve('payload')).href)
  const { sqliteAdapter } = await import(pathToFileURL(require.resolve('@payloadcms/db-sqlite')).href)
  let offline = true, sourceCalls = 0, placed = 0
  const sources = { id: 'fixture-source', commerce: { resolveProduct: async (_p, p) => p.code === 'SOURCE' ? { source: 'fixture-source', remoteId: 'fixture', price: p.price, stock: 100 } : undefined, processGroup: async () => { sourceCalls++; if (offline) throw new Error('Fixture source unavailable'); return { id: 'REMOTE-1', status: 'reserved' } }, cancelGroup: async () => {} } }
  const plugins = [shop, notify, sources, { id: 'observer', hooks: { onOrderPlaced: async () => { placed++ } } }]
  let config = { serverURL: 'https://orders.example.test', secret: 'isolated-receipt-test-secret', db: sqliteAdapter({ client: { url: 'file:' + join(directory, 'test.db') }, transactionOptions: {} }), collections: [{ slug: 'users', auth: true, fields: [] }, { slug: 'media', upload: { staticDir: join(directory, 'media') }, fields: [] }], globals: [], custom: { hossoPlugins: plugins }, jobs: { autoRun: [] }, admin: { user: 'users' } }
  for (const p of plugins) if (p.payload) config = p.payload(config)
  config.jobs.autoRun = []
  payload = await getPayload({ config: buildConfig(config), disableOnInit: true, key: 'receipt-' + crypto.randomUUID() })
  if (!shopOnly) await payload.updateGlobal({ slug: 'notify-settings', data: { adminEmail: 'owner@example.test', toCustomer: true, onStatus: true } })
  const sent = []; let failOwner = true
  payload.sendEmail = async (message) => { if (message.to === 'owner@example.test' && failOwner) throw new Error('Fixture SMTP failure'); sent.push(message); return {} }
  const product = await payload.create({ collection: 'shop-products', data: { name: 'Bộ phụ tùng có tên dài để kiểm tra email <script>bad()</script>', code: 'SOURCE', price: 150000, stock: 100, active: true } })
  const base = { cartId: crypto.randomUUID(), checkoutId: crypto.randomUUID(), items: [{ productId: String(product.id), quantity: 1 }], customer: { name: 'Khách thử nghiệm', phone: '0912345678', email: 'buyer@example.test', address: 'Địa chỉ thử nghiệm, không giao hàng' }, fulfillment: { type: 'delivery' }, payment: 'cod', meta: { locale: 'vi' } }
  const req = (extra = {}) => createLocalReq({ req: { headers: new Headers(), ...extra } }, payload)
  base.checkoutId = 'f'.repeat(64)
  const checkout = async (input) => endpoints.find((e) => e.path.endsWith('/checkout')).handler(await req({ json: async () => input }))
  const first = await checkout(base); assert.equal(first.status, 202)
  const receipt = await first.json(); assert.equal(receipt.ok, true); assert.equal(sourceCalls, 0, 'Source processing is deferred')
  for (let i = 0; i < 3; i++) assert.equal((await (await checkout(base)).json()).order.id, receipt.order.id)
  assert.equal((await payload.count({ collection: 'shop-orders' })).totalDocs, 1)
  assert.equal((await payload.findByID({ collection: 'shop-products', id: product.id })).stock, 100, 'No stock effect before approval')
  const recoverReceipt = endpoints.find((e) => e.path.endsWith('/receipt'))
  assert.equal((await recoverReceipt.handler(await req({ json: async () => base }))).status, 202)
  assert.equal((await recoverReceipt.handler(await req({ json: async () => ({ ...base, customer: { ...base.customer, phone: '0900000000' } }) }))).status, 404)
  assert.equal((await recoverReceipt.handler(await req({ json: async () => ({ ...base, checkoutId: '0'.repeat(64) }) }))).status, 404)
  const recovery = () => req().then(recoverOrders)
  await recovery()
  assert.equal(placed, 0, 'Receipt does not prematurely trigger fulfillment/commission events')
  const order = async () => (await payload.find({ collection: 'shop-orders', where: { orderNo: { equals: receipt.order.id } } })).docs[0]
  assert.equal((await order()).approvalState, 'awaiting')
  assert.equal(sourceCalls, 0, 'Background recovery must respect admin approval')
  const { drainCommerceEvents } = await load('../packages/blocks/src/durable-events.ts')
  const runMail = async () => { await drainCommerceEvents(payload); await payload.jobs.run({ where: { taskSlug: { equals: 'notify-order-email' } }, sequential: true, limit: 50, silent: true }) }
  if (!shopOnly) {
  await runMail()
  assert.equal(sent.filter((m) => m.to === 'buyer@example.test').length, 1, 'Owner SMTP failure cannot prevent the customer receipt')
  assert.equal(sent.filter((m) => m.to === 'owner@example.test').length, 0)
  await recovery(); await runMail()
  assert.equal(sent.filter((m) => m.to === 'buyer@example.test').length, 1, 'Recovery cannot duplicate the initial receipt')
  failOwner = false
  const failedJob = (await payload.find({ collection: 'payload-jobs', where: { taskSlug: { equals: 'notify-order-email' } } })).docs.find((j) => !j.completedAt)
  assert.ok(failedJob && failedJob.totalTried >= 1)
  await payload.update({ collection: 'payload-jobs', id: failedJob.id, data: { waitUntil: new Date(Date.now() - 1000).toISOString() } })
  await runMail(); assert.equal(sent.filter((m) => m.to === 'owner@example.test').length, 1)
  }
  const { approveOrder, retryOrderGroups } = await load('../packages/plugin-shop/src/order-workflow.ts')
  const adminReq = () => req({ user: { id: 1, roles: ['admin'] } })
  await approveOrder(await adminReq(), await order(), 0)
  await recovery(); assert.equal(placed, 0); assert.equal(sourceCalls, 1)
  offline = false; await retryOrderGroups(await adminReq(), await order()); await recovery(); assert.equal(placed, 1)
  await recovery(); assert.equal(placed, 1)
  const second = await (await checkout({ ...base, cartId: crypto.randomUUID(), checkoutId: crypto.randomUUID() })).json()
  assert.notEqual(second.order.id, receipt.order.id, 'Customer can place another identical order')
  assert.equal((await payload.count({ collection: 'shop-orders' })).totalDocs, 2)
  const lookup = endpoints.find((e) => e.path.endsWith('/order'))
  const lookupReq = async (token) => lookup.handler(await req({ url: `https://orders.example.test/api/plugins/shop/order?id=${receipt.order.id}&token=${token}` }))
  assert.equal((await lookupReq(receipt.lookupToken)).status, 200); assert.equal((await lookupReq('0'.repeat(64))).status, 404)
  const manage = endpoints.filter((e) => e.path.endsWith('/manage-order'))
  const getManaged = async () => manage.find((e) => e.method === 'get').handler(await req({ user: { id: 1, roles: ['admin'] }, url: `https://orders.example.test/api/plugins/shop/manage-order?id=${(await order()).id}` }))
  assert.equal((await getManaged()).status, 200)
  assert.equal((await manage.find((e) => e.method === 'post').handler(await req({ json: async () => ({ id: (await order()).id, action: 'paid' }) }))).status, 403)
  const act = async (action, extra = {}) => { const o = await order(); return manage.find((e) => e.method === 'post').handler(await req({ user: { id: 1, roles: ['admin'] }, json: async () => ({ id: o.id, version: o.operationsVersion || 0, action, ...extra }) })) }
  assert.equal((await act('confirm')).status, 409, 'Approved orders cannot be approved a second time')
  assert.equal((await act('prepare', { version: 0 })).status, 409, 'Another admin tab must refresh a changed order')
  assert.equal((await act('prepare')).status, 200)
  assert.equal((await act('paid')).status, 400, 'A verified receipt reference is required')
  assert.equal((await act('paid', { reason: 'Verified fixture receipt' })).status, 200); assert.equal((await order()).paymentStatus, 'paid')
  assert.equal((await act('paid', { reason: 'Verified fixture receipt' })).status, 409)
  assert.equal((await act('resend')).status, shopOnly ? 409 : 200)
  assert.equal((await act('cancel')).status, 400)
  assert.equal((await act('cancel', { reason: 'Khách yêu cầu hủy' })).status, 200)
  await recovery()
  assert.equal((await order()).cancellationReason, 'Khách yêu cầu hủy')
  assert.equal((await act('confirm')).status, 409)
  const summary = await (await getManaged()).json()
  assert.ok(summary.order.history.length >= 4)
  if (!shopOnly) assert.ok(summary.notifications.length >= 2, 'Mail progress stays inside the order')
  if (!shopOnly) {
  await runMail()
  const customerEmails = sent.filter((m) => m.to === 'buyer@example.test')
  assert.ok(customerEmails.length >= 4)
  const mailedOrders = (await payload.find({ collection: 'shop-orders', limit: 100 })).docs
  for (const m of customerEmails) {
    const mailedOrder = mailedOrders.find(o => m.subject.includes(o.orderNo))
    assert.ok(mailedOrder && m.text.includes(mailedOrder.lookupToken), 'Each customer email includes its own order access code')
    assert.ok(m.html.includes('Mã bảo mật tra cứu đơn'))
    assert.ok(m.html.includes('https://orders.example.test/trang-thai-don?'))
    assert.ok(m.html.includes('Xem đơn hàng'))
    assert.ok(!m.html.includes('<script>'))
  }
  await mkdir('output/email-preview', { recursive: true })
  await writeFile('output/email-preview/order-received.html', customerEmails[0].html)
  await writeFile('output/email-preview/order-received.txt', customerEmails[0].text)
  }
  console.log('PASS durable receipt, unlimited new orders, idempotent retries, background sources, private lookup, order actions and cancellation' + (shopOnly ? '' : ', recipient-independent SMTP retry and every email link/code'))
} finally { if (payload) await payload.destroy(); }
