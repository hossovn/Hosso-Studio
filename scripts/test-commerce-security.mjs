// Security regressions use synthetic credentials and loopback servers only.
import assert from 'node:assert/strict'
import http from 'node:http'
import { once } from 'node:events'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(new URL('../apps/studio/package.json', import.meta.url))
const { tsImport } = require('tsx/esm/api')
const load = path => tsImport(path, { parentURL: import.meta.url, tsconfig: fileURLToPath(new URL('../apps/studio/tsconfig.json', import.meta.url)) })
const security = await load('../packages/blocks/src/server-security.ts')
const { wimFetch } = await load('../packages/plugin-wim/src/client.ts')
process.env.HOSSO_ENCRYPTION_KEY = 'a'.repeat(64)
const encrypted = security.encryptCredential('synthetic-credential')
assert.notEqual(encrypted, 'synthetic-credential')
assert.equal(security.decryptCredential(encrypted), 'synthetic-credential')
process.env.HOSSO_ENCRYPTION_KEY = 'b'.repeat(64)
assert.throws(() => security.decryptCredential(encrypted))
process.env.HOSSO_ENCRYPTION_KEY = 'a'.repeat(64)
assert.throws(() => security.decryptCredential(security.SECRET_MASK))

process.env.NODE_ENV = 'production'
delete process.env.HOSSO_PRIVATE_API_HOSTS
for (const address of ['127.0.0.1', '10.0.0.1', '169.254.169.254', '100.64.0.1', '192.168.1.1', '224.0.0.1', '[::1]', '[::ffff:127.0.0.1]', '[fd00::1]', '[fe80::1]', '[2001:db8::1]']) assert.throws(() => security.assertExternalUrl('https://' + address), address)
assert.throws(() => security.assertExternalUrl('https://user:secret@example.invalid'))
assert.throws(() => security.assertExternalUrl('https://example.invalid:8443'))
assert.equal(security.isPublicAddress('8.8.8.8'), true)
assert.equal(security.isPublicAddress('2606:4700:4700::1111'), true)
await assert.rejects(security.fetchExternal('https://localhost.'), /forbidden address/, 'Hostname DNS results are validated before opening a socket')
process.env.NODE_ENV = 'test'
let received = 0
const target = http.createServer((_req, res) => { received++; res.end('{}') })
const source = http.createServer((req, res) => {
  if (req.url.includes('large')) return res.end('x'.repeat(10000))
  res.writeHead(302, { location: 'http://127.0.0.1:' + target.address().port }); res.end()
})
target.listen(0, '127.0.0.1'); source.listen(0, '127.0.0.1')
await Promise.all([once(target, 'listening'), once(source, 'listening')])
try {
  const origin = 'http://127.0.0.1:' + source.address().port
  await assert.rejects(wimFetch({ apiUrl: origin, apiKey: 'synthetic-never-real', timeoutMs: 1000 }, '/v1/products'))
  assert.equal(received, 0, 'API keys never reach a redirect destination')
  await assert.rejects(security.fetchExternal(origin + '/large', { maxBytes: 1000 }), /too large/)
} finally { source.closeAllConnections(); target.closeAllConnections(); await Promise.all([new Promise(resolve => source.close(resolve)), new Promise(resolve => target.close(resolve))]) }
console.log('PASS encryption/tampering/masks, IPv4/IPv6/URL/DNS restrictions, credential redirect isolation and streaming response limit')

if (existsSync(new URL('../packages/plugin-cross-sell/src/service.ts', import.meta.url))) {
  const { authenticate } = await load('../packages/plugin-cross-sell/src/service.ts')
  const partner = { id: 1, kind: 'woocommerce', active: true, consumerKey: 'ck_' + 'a'.repeat(40), consumerSecret: 'cs_' + 'b'.repeat(40) }
  const payload = { find: async () => ({ docs: [partner] }) }
  await assert.rejects(authenticate({ payload, headers: new Headers({ authorization: 'Bearer ' + partner.consumerKey }) }), /Unauthorized/)
  assert.equal((await authenticate({ payload, headers: new Headers({ authorization: 'Basic ' + Buffer.from(partner.consumerKey + ':' + partner.consumerSecret).toString('base64') }) })).id, partner.id)
  await assert.rejects(authenticate({ payload, headers: new Headers({ authorization: 'Basic ' + Buffer.from(partner.consumerKey + ':wrong-secret').toString('base64') }) }), /Unauthorized/)
  console.log('PASS supplier authentication: Woo requires the key and secret; consumer key alone cannot authenticate as a Hosso partner')
  const { ensurePurchase } = await load('../packages/plugin-cross-sell/src/remote.ts')
  let posts = 0, expirySupported = false
  const supplier = http.createServer((req, res) => {
    if (req.method === 'POST') posts++
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ version: 1, atomicReservation: true, idempotentEnsure: true, lookupByKey: true, cancelByKey: true, commit: true, reservationExpiry: expirySupported, holdMinutes: 5 }))
  })
  supplier.listen(0, '127.0.0.1'); await once(supplier, 'listening')
  try {
    const p = { ...partner, apiUrl: 'http://127.0.0.1:' + supplier.address().port }
    const expiry = new Date(Date.now() + 30 * 60000).toISOString()
    await assert.rejects(ensurePurchase(p, {}, expiry), /thời gian giữ hàng/)
    expirySupported = true
    await assert.rejects(ensurePurchase(p, {}, expiry), /thời gian giữ hàng/)
    assert.equal(posts, 0, 'Unsupported expiry and shorter source TTL are rejected before any supplier order')
  } finally { supplier.closeAllConnections(); await new Promise(resolve => supplier.close(resolve)) }
  console.log('PASS supplier provisional capability and hold-duration gates before side effects')
}
