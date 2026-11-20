import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { createHmac } from 'node:crypto'
import { generateKeyPairSync, sign, createHash } from 'node:crypto'
import { createLocalReq, getPayload } from 'payload'
import config from '../src/payload.config'
import hosso from '../hosso.config'
import { kilnPlugins, initializeManagedPlugins } from '../src/lib/kiln-plugins'
import { kilnPluginSettings } from '../src/lib/kiln-plugin-settings'
import { kilnPaymentReceipts } from '../src/lib/kiln-payment-receipts'
import { managedPluginAllowed, managedPluginSecrets } from '../../../packages/blocks/src/managed-plugins'
import { approvedSmtpTarget, readPluginSecrets } from '../src/lib/kiln-plugin-secrets'
import { getWimConfig } from '../../../packages/plugin-wim/src/config'
import { wimFetch, wimGet } from '../../../packages/plugin-wim/src/client'
import { request as partnerRequest } from '../../../packages/plugin-cross-sell/src/remote'
import { withManagedPlugins } from '../../../packages/blocks/src/managed-plugin-guard'

const payload = await getPayload({ config })
const { privateKey, publicKey } = generateKeyPairSync('ed25519')
const tenant = '11111111-1111-4111-8111-111111111111'
process.env.HOSSO_TENANT = tenant
process.env.HOSSO_PLUGIN_AUTHORITY = 'kiln'
process.env.HOSSO_PLUGIN_TRUST = JSON.stringify({ test: publicKey.export({ type: 'spki', format: 'der' }).subarray(-32).toString('base64') })
process.env.HOSSO_SERVICE_TOKEN = 'disposable-plugin-service-token-123456789'
process.env.HOSSO_ENCRYPTION_KEY = 'ab'.repeat(32)
process.env.HOSSO_SMTP_ALLOWED_HOSTS = 'smtp.example.test'
const generation = '22222222-2222-4222-8222-222222222222'
function token(revision: number, enabled: string[], extra = {}) {
  const capabilities = hosso.installedPlugins.map(p => ({ id: p.id, version: p.manifest!.version, enabled: enabled.includes(p.id) }))
  const iat = Math.floor(Date.now() / 1000)
  const body = Buffer.from(JSON.stringify({ v: 1, iss: 'kiln', aud: 'hosso-studio', tenant_id: tenant, generation, revision, iat, exp: iat + 300, capabilities, hash: createHash('sha256').update(JSON.stringify(capabilities)).digest('hex'), ...extra })).toString('base64url')
  return `KPL1.test.${body}.${sign(null, Buffer.from(body), privateKey).toString('base64url')}`
}
async function apply(value: string, auth = process.env.HOSSO_SERVICE_TOKEN) {
  const req = await createLocalReq({}, payload)
  req.headers = new Headers({ authorization: 'Bearer ' + auth, 'x-hosso-tenant': tenant })
  req.json = async () => ({ token: value })
  const res = await kilnPlugins.find(e => e.method === 'put')!.handler(req)
  return { status: res.status, body: await res.json() }
}
async function configure(method: string, plugin: string, body?: unknown) {
  const req = await createLocalReq({}, payload)
  req.headers = new Headers({ authorization: 'Bearer ' + process.env.HOSSO_SERVICE_TOKEN, 'x-hosso-tenant': tenant })
  req.routeParams = { plugin }
  req.json = async () => body
  const res = await kilnPluginSettings.find(e => e.method === method)!.handler(req)
  return { status: res.status, body: await res.json() }
}
async function latePayment(body: unknown, auth: string) {
  const req = await createLocalReq({}, payload)
  req.headers = new Headers({ authorization: auth })
  req.json = async () => body
  const response = await payload.config.endpoints.find(e => e.path === '/plugins/payment/sepay/webhook')!.handler(req)
  return { status: response.status, body: await response.json() }
}
async function receiptInbox(method: string, cursor = 0, auth = process.env.HOSSO_SERVICE_TOKEN) {
  const req = await createLocalReq({}, payload)
  req.headers = new Headers({ authorization: 'Bearer ' + auth, 'x-hosso-tenant': tenant })
  req.routeParams = { cursor: String(cursor) }
  const response = await kilnPaymentReceipts.find(e => e.method === method)!.handler(req)
  return { status: response.status, body: await response.json() }
}
try {
  await initializeManagedPlugins(payload)
  assert.equal(await managedPluginAllowed('shop'), false)
  assert.equal((await apply(token(1, ['shop']), 'wrong')).status, 403)
  assert.equal((await apply(token(1, ['shop']), '')).status, 403)
  const first = await apply(token(1, ['shop', 'payment', 'notify']))
  assert.equal(first.status, 200, JSON.stringify(first))
  assert.equal(first.body.revision, 1)
  assert.equal(first.body.readiness.payment, 'needs_configuration')
  assert.equal(await managedPluginAllowed('payment'), true)
  let configuration = await configure('get', 'payment')
  assert.equal(configuration.status, 200)
  assert.equal((await configure('patch', 'payment', { expected_updated_at: configuration.body.updated_at, values: { arbitrary: 'blocked' } })).status, 400)
  assert.equal((await configure('patch', 'payment', { expected_updated_at: configuration.body.updated_at, values: { bank: '970422', accountNumber: '123' } })).status, 200)
  assert.equal((await configure('patch', 'payment', { expected_updated_at: configuration.body.updated_at, values: { note: 'stale' } })).status, 409)
  configuration = await configure('get', 'payment')
  const secret = 'test-sepay-webhook-secret-never-returned'
  const stored = await configure('patch', 'payment', { expected_updated_at: configuration.body.updated_at, values: { sepayKey: secret } })
  assert.equal(stored.status, 200)
  assert.equal(stored.body.values.sepayKey, '••••••••')
  assert.equal(JSON.stringify(stored.body).includes(secret), false)
  const encrypted = await payload.db.findOne({ collection: 'managed-plugin-state', where: { key: { equals: 'secrets:payment' } } }) as any
  assert.ok(encrypted.token.startsWith('enc:v1:'))
  assert.equal(encrypted.token.includes(secret), false)
  assert.equal((await readPluginSecrets(payload, 'payment')).sepayKey, secret)
  assert.equal((await managedPluginSecrets('payment')).sepayKey, secret)
  const masked = await configure('patch', 'payment', { expected_updated_at: stored.body.updated_at, values: { sepayKey: '••••••••' } })
  assert.equal(masked.status, 200)
  assert.equal((await readPluginSecrets(payload, 'payment')).sepayKey, secret)
  assert.equal(approvedSmtpTarget('smtps://user:pass@smtp.example.test:465', 'sender@example.test').hostname, 'smtp.example.test')
  for (const address of ['smtp://user:pass@localhost', 'https://user:pass@smtp.example.test', 'smtp://user:pass@smtp.example.test:25', 'smtps://user:pass@smtp.example.test/?disableTLS=true']) assert.throws(() => approvedSmtpTarget(address, 'sender@example.test'))
  await initializeManagedPlugins(payload) // reader reinitialization must reload durable state
  assert.equal(await managedPluginAllowed('payment'), true)
  const settings = await payload.updateGlobal({ slug: 'payment-settings', data: { bank: '970422', accountNumber: '123', accountName: 'Test' } as never })
  assert.ok(settings)
  await payload.db.create({ collection: 'shop-orders', data: { orderNo: 'SO-123456789', total: 10000, status: 'new', paymentStatus: 'unpaid', operationsVersion: 0 } })
  await payload.db.create({ collection: 'payments', data: { orderNo: 'SO-123456789', amount: 10000, paidAmount: 0, openingPaidAmount: 0, refundedAmount: 0, version: 0, status: 'pending' } })
  assert.equal((await apply(token(2, ['shop']))).status, 200)
  assert.equal(await managedPluginAllowed('payment'), false)
  const late = { id: 'late-verified-event', transferType: 'in', transferAmount: 5000, accountNumber: '123', code: 'SO-123456789', currency: 'VND' }
  assert.equal((await latePayment(late, 'wrong')).status, 401)
  assert.equal((await latePayment({ ...late, accountNumber: 'wrong' }, 'Apikey ' + secret)).status, 400)
  assert.equal((await latePayment({ ...late, code: 'SO-99999999' }, 'Apikey ' + secret)).status, 503)
  assert.equal((await latePayment(late, 'Apikey ' + secret)).body.held_for_review, true)
  assert.equal((await latePayment(late, 'Apikey ' + secret)).status, 200)
  const concurrentReceipt = { ...late, id: 'late-concurrent-event', transferAmount: 700 }
  const deliveries = await Promise.all([latePayment(concurrentReceipt, 'Apikey ' + secret), latePayment(concurrentReceipt, 'Apikey ' + secret)])
  assert.ok(deliveries.some(result => result.status === 200))
  assert.ok(deliveries.every(result => [200, 503].includes(result.status)))
  assert.equal((await latePayment(concurrentReceipt, 'Apikey ' + secret)).status, 200, 'provider retry must settle duplicate delivery')
  const retained = await payload.db.find({ collection: 'payment-transactions', where: { reference: { equals: concurrentReceipt.id } } })
  assert.equal(retained.docs.length, 1, 'concurrent receipts duplicated evidence')
  const originalCreate = payload.db.create.bind(payload.db)
  payload.db.create = async args => {
    const created = await originalCreate(args)
    if (args.collection === 'payment-transactions') throw new Error('injected persistence failure')
    return created
  }
  const retriedReceipt = { ...late, id: 'late-retry-event', transferAmount: 300 }
  try { assert.equal((await latePayment(retriedReceipt, 'Apikey ' + secret)).status, 503) }
  finally { payload.db.create = originalCreate }
  assert.equal((await payload.db.find({ collection: 'payment-transactions', where: { reference: { equals: retriedReceipt.id } } })).docs.length, 0)
  assert.equal((await latePayment(retriedReceipt, 'Apikey ' + secret)).status, 200, 'failed persistence must be recoverable')
  assert.equal((await latePayment({ ...late, transferAmount: 5001 }, 'Apikey ' + secret)).status, 503)
  const heldPayment = await payload.db.findOne({ collection: 'payments', where: { orderNo: { equals: late.code } } }) as any
  assert.equal(heldPayment.paidAmount, 0, 'disabled receipt changed payment balance')
  assert.equal((await receiptInbox('get', 0, 'wrong')).status, 403)
  const inbox = await receiptInbox('get')
  assert.equal(inbox.status, 200)
  assert.equal(inbox.body.items.length, 3)
  assert.equal(JSON.stringify(inbox.body).includes(secret), false)
  assert.equal(inbox.body.items[0].order_no, late.code)
  const receiptID = Number(inbox.body.items.find((row: any) => row.reference === late.id).id)
  assert.equal((await receiptInbox('post', receiptID)).status, 409)
  await assert.rejects(() => managedPluginSecrets('payment'))
  await assert.rejects(() => getWimConfig(payload))
  await assert.rejects(() => wimFetch({} as any, '/v1/products'))
  await assert.rejects(() => wimGet({} as any, '/v1/products', {}, []))
  await assert.rejects(() => partnerRequest({} as any, 'catalog'))
  let fieldEffects = 0
  const before = { collections: [{ slug: 'existing', fields: [{ name: 'data', type: 'text' }] }] } as any
  const synthetic = withManagedPlugins({ id: 'payment', payload: (cfg: any) => ({ ...cfg, collections: [{ ...cfg.collections[0], fields: [{ name: 'data', type: 'text', hooks: { beforeChange: [({ value }: any) => { fieldEffects++; return value }] } }] }] }) } as any).payload!(before) as any
  assert.equal(await synthetic.collections[0].fields[0].hooks.beforeChange[0]({ value: 'retained' }), 'retained')
  assert.equal(fieldEffects, 0)
  let guardedEffects = 0
  const inheritedEndpoint = { path: '/existing', method: 'get', handler: async () => Response.json({ existing: true }) }
  const addedEndpoint = { path: '/plugin', method: 'post', handler: async () => { guardedEffects++; return Response.json({ ok: true }) } }
  const guardedJob = { slug: 'plugin-job', schedule: [{ cron: '* * * * *', queue: 'default' }], handler: async () => { guardedEffects++; return { output: {} } }, onSuccess: async () => { guardedEffects++ }, onFail: async () => { guardedEffects++ } }
  const inheritedConfig = { collections: [{ slug: 'existing', fields: [], endpoints: [inheritedEndpoint] }], globals: [{ slug: 'existing-settings', fields: [], endpoints: [inheritedEndpoint] }] } as any
  const guardedConfig = withManagedPlugins({ id: 'payment', payload: (cfg: any) => ({
    ...cfg,
    collections: [{ ...cfg.collections[0], endpoints: [...cfg.collections[0].endpoints, addedEndpoint] }, { slug: 'added', fields: [], endpoints: [addedEndpoint] }],
    globals: [{ ...cfg.globals[0], endpoints: [...cfg.globals[0].endpoints, addedEndpoint] }, { slug: 'added-settings', fields: [], endpoints: [addedEndpoint] }],
    jobs: { tasks: [guardedJob], workflows: [guardedJob] },
  }) } as any).payload!(inheritedConfig) as any
  for (const resource of [...guardedConfig.collections, ...guardedConfig.globals]) {
    const route = resource.endpoints.find((e: any) => e.path === '/plugin')
    assert.equal((await route.handler({})).status, 403)
  }
  assert.equal(guardedConfig.collections[0].endpoints[0], inheritedEndpoint)
  assert.equal((await inheritedEndpoint.handler()).status, 200)
  for (const job of [...guardedConfig.jobs.tasks, ...guardedConfig.jobs.workflows]) await assert.rejects(() => job.handler({}))
  await guardedConfig.jobs.tasks[0].onFail({})
  await guardedConfig.jobs.tasks[0].onSuccess({})
  assert.deepEqual(await guardedConfig.jobs.tasks[0].schedule[0].hooks.beforeSchedule({ defaultBeforeSchedule: () => { guardedEffects++; return { shouldSchedule: true } } }), { shouldSchedule: false })
  assert.equal(guardedEffects, 0, 'disabled callbacks or routes performed effects')
  delete process.env.HOSSO_PLUGIN_AUTHORITY
  try {
    assert.equal((await guardedConfig.collections[1].endpoints[0].handler({})).status, 200)
    await guardedConfig.jobs.workflows[0].handler({})
    let defaultScheduleCalled = false
    assert.deepEqual(await guardedConfig.jobs.tasks[0].schedule[0].hooks.beforeSchedule({ defaultBeforeSchedule: () => { defaultScheduleCalled = true; return { shouldSchedule: false } } }), { shouldSchedule: false })
    assert.equal(defaultScheduleCalled, true, 'default duplicate-job scheduling constraint was skipped')
    assert.equal(guardedEffects, 2, 'standalone execution was changed by managed authority')
  } finally { process.env.HOSSO_PLUGIN_AUTHORITY = 'kiln' }
  assert.equal((await configure('get', 'payment')).status, 403)
  assert.equal((await apply(token(1, ['shop', 'payment']))).status, 409)
  assert.equal((await apply(token(2, ['shop', 'payment']))).status, 409)
  await assert.rejects(() => payload.findGlobal({ slug: 'payment-settings', overrideAccess: true }))
  const payment = hosso.plugins.find(p => p.id === 'payment')!
  for (const fn of Object.values(payment.commerce ?? {})) await assert.rejects(() => (fn as Function)(payload, {}, {}))
  const notifyTask = payload.config.jobs.tasks?.find(t => t.slug.includes('notify'))
  assert.ok(notifyTask)
  await assert.rejects(() => (notifyTask!.handler as Function)({ req: { payload }, input: {} }))
  assert.equal((await apply(token(3, ['shop', 'payment']))).status, 200)
  assert.equal((await receiptInbox('post', receiptID)).status, 200)
  assert.equal((await receiptInbox('post', receiptID)).status, 200)
  for (const row of inbox.body.items.filter((row: any) => row.id !== receiptID)) {
    const concurrent = await Promise.all([receiptInbox('post', row.id), receiptInbox('post', row.id)])
    assert.ok(concurrent.some(result => result.status === 200))
    assert.ok(concurrent.every(result => [200, 409].includes(result.status)))
    assert.equal((await receiptInbox('post', row.id)).status, 200)
  }
  assert.equal((await receiptInbox('get')).body.items.length, 0)
  assert.equal((await payload.db.findOne({ collection: 'payments', where: { orderNo: { equals: late.code } } }) as any).paidAmount, 6000, 'receipt replay double counted funds')
  assert.equal((await payload.findGlobal({ slug: 'payment-settings' }) as any).accountNumber, '123')
  assert.equal((await apply(token(4, ['shop'], { tenant_id: generation }))).status, 400)
  const race = await Promise.all([apply(token(4, ['shop'])), apply(token(5, ['shop', 'payment']))])
  assert.ok(race.every(result => [200, 409].includes(result.status)), JSON.stringify(race))
  assert.equal(await managedPluginAllowed('payment'), true)
  assert.equal((await apply(token(4, ['shop']))).status, 409)
  const realNow = Date.now
  Date.now = () => realNow() + 301000
  try {
    assert.equal(await managedPluginAllowed('payment'), false)
    assert.equal((await receiptInbox('post', receiptID)).status, 409, 'expired authority reconciled a receipt')
    assert.equal((await latePayment({ ...late, id: 'late-expired-event', transferAmount: 1000 }, 'Apikey ' + secret)).status, 200, 'expired authority lost authenticated evidence')
  } finally { Date.now = realNow }
  assert.equal((await apply(token(6, []))).status, 200)
  if (process.env.KILN_E2E_BACKEND && process.env.KILN_PLUGIN_TEST_CHECKPOINT) {
    const directory = dirname(process.env.KILN_PLUGIN_TEST_CHECKPOINT)
    await mkdir(directory, { recursive: true })
    await writeFile(join(directory, 'signing.pem'), privateKey.export({ type: 'pkcs8', format: 'pem' }))
    process.env.HOSSO_SERVICE_TOKEN = createHmac('sha256', 'disposable-e2e-master-at-least-32-characters').update('kiln-studio-service:v1:' + tenant).digest('hex')
    const server = createServer(async (incoming, outgoing) => {
      try {
        const req = await createLocalReq({}, payload)
        req.headers = new Headers(Object.entries(incoming.headers).flatMap(([k, v]): [string, string][] => v === undefined ? [] : [[k, Array.isArray(v) ? v.join(', ') : v]]))
        let raw = ''
        for await (const part of incoming) { raw += part; if (raw.length > 65536) throw new Error('body_limit') }
        req.json = async () => raw ? JSON.parse(raw) : null
        const match = incoming.url?.match(/^\/api\/site\/kiln\/plugins\/([a-z-]+)\/settings$/)
        const receiptMatch = incoming.url?.match(/^\/api\/site\/kiln\/plugins\/payment\/receipts\/(\d+)(\/reconcile)?$/)
        if (match) req.routeParams = { plugin: match[1] }
        if (receiptMatch) req.routeParams = { cursor: receiptMatch[1] }
        const receiptMethod = receiptMatch?.[2] ? 'post' : 'get'
        const handler = receiptMatch && incoming.method?.toLowerCase() === receiptMethod ? kilnPaymentReceipts.find(e => e.method === receiptMethod)?.handler : match ? kilnPluginSettings.find(e => e.method === incoming.method?.toLowerCase())?.handler : incoming.url === '/api/site/kiln/plugins' && incoming.method === 'PUT' ? kilnPlugins[0].handler : null
        if (!handler) { outgoing.writeHead(404); outgoing.end(); return }
        const response = await handler(req)
        outgoing.writeHead(response.status, { 'Content-Type': 'application/json' }); outgoing.end(await response.text())
      } catch { outgoing.writeHead(500); outgoing.end('{}') }
    })
    await new Promise<void>(resolve => server.listen(0, '0.0.0.0', resolve))
    try {
      const address = server.address() as { port: number }
      const args = ['run', '--rm', '-e', 'GOMAXPROCS=2', '-e', 'KILN_STUDIO_E2E_URL=http://localhost:' + address.port, '-v', directory + ':/fixtures:ro', '-v', process.env.KILN_E2E_BACKEND + ':/workspace:ro', '-v', 'hosso-go-mod-cache:/go/pkg/mod', '-v', 'hosso-go-build-cache:/root/.cache/go-build', '-w', '/workspace', 'kiln-runtime-builder:local', 'go', 'test', '-p', '2', './internal/store', '-run', '^TestManagedPluginStudioHTTPIntegration$', '-count=1', '-v']
      const code = await new Promise((resolve, reject) => { const child = spawn('docker', args, { stdio: 'inherit' }); child.on('error', reject); child.on('exit', resolve) })
      assert.equal(code, 0, 'Go → Studio HTTP integration failed')
    } finally { await new Promise<void>(resolve => server.close(() => resolve())) }
    assert.equal((await apply(token(100, ['shop', 'payment']))).status, 200)
  }
  if (process.env.KILN_PLUGIN_TEST_CHECKPOINT) {
    await mkdir(dirname(process.env.KILN_PLUGIN_TEST_CHECKPOINT), { recursive: true })
    await writeFile(process.env.KILN_PLUGIN_TEST_CHECKPOINT, JSON.stringify({ trust: process.env.HOSSO_PLUGIN_TRUST, tenant, generation }))
  }
  console.log('PASS: durable managed bridge, replay, Local API, commerce/jobs/workflows/field/routes guard, direct/cache guards, encrypted secrets, SMTP validation, authenticated late receipts and idempotent reconciliation')
} finally { await payload.destroy() }
