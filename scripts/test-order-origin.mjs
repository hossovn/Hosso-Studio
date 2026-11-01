// Exercise the real admin endpoint without reading or changing an order.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(new URL('../apps/studio/package.json', import.meta.url))
const { tsImport } = require('tsx/esm/api')
const { endpoints } = await tsImport('../packages/plugin-shop/src/endpoints.ts', {
  parentURL: import.meta.url,
  tsconfig: fileURLToPath(new URL('../apps/studio/tsconfig.json', import.meta.url)),
})
const endpoint = endpoints.find(e => e.path.endsWith('/manage-order') && e.method === 'post')
const publicURL = 'https://orders.example.test'
let reads = 0
async function request({ url = publicURL, origin = publicURL, serverURL = publicURL, roles = ['admin'], headers = {} } = {}) {
  return endpoint.handler({
    url: `${url}/api/plugins/shop/manage-order`,
    headers: new Headers({ ...(origin !== null && { origin }), ...headers }),
    user: roles ? { id: 1, roles } : null,
    payload: { config: { serverURL }, findByID: async () => { reads++; throw new Error('No order must be read') } },
    json: async () => ({ action: 'invalid-probe' }),
  })
}
let result = await request()
assert.equal(result.status, 400)
assert.equal((await result.json()).message, 'invalid_action')
result = await request({ url: 'http://studio:3000' })
assert.equal(result.status, 400, `Same-site admin POST behind TLS proxy: ${await result.text()}`)
result = await request({ url: 'https://0.0.0.0:3000', serverURL: `${publicURL}/` })
assert.equal(result.status, 400, 'The configured public URL is canonical even when Next constructs an internal HTTPS URL')
for (const origin of ['https://attacker.example.test', 'http://orders.example.test', `${publicURL}:444`, 'https://sub.orders.example.test', 'http://studio:3000', 'null', `${publicURL}/path`, 'invalid']) {
  result = await request({ url: 'http://studio:3000', origin, headers: { host: 'attacker.example.test', 'x-forwarded-host': 'attacker.example.test', 'x-forwarded-proto': 'https' } })
  assert.equal(result.status, 403, origin)
  assert.equal((await result.json()).message, 'invalid_origin')
}
assert.equal((await request({ roles: null })).status, 403, 'Anonymous callers remain forbidden')
assert.equal((await request({ roles: ['editor'] })).status, 403, 'Editors cannot operate orders')
assert.equal((await request({ roles: ['publisher'] })).status, 403, 'Publishers cannot operate orders')
assert.equal((await request({ serverURL: '', origin: publicURL })).status, 400, 'Unconfigured local installs use the request origin')
assert.equal((await request({ serverURL: '', origin: 'https://attacker.example.test' })).status, 403)
assert.equal((await request({ serverURL: 'not a URL' })).status, 403, 'Invalid configuration fails closed')
assert.equal((await request({ origin: null })).status, 400, 'Authenticated non-browser clients retain existing behavior')
assert.equal(reads, 0)
console.log('PASS real manage-order endpoint: reverse proxy, canonical origin, hostile origins/forwarded headers, admin-only authorization, local fallback, invalid config; zero order effects')
