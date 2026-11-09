import assert from 'node:assert/strict'
import { exchangeKilnCode } from '../apps/studio/src/lib/kiln-code.ts'
import { kilnFramePolicy } from '../apps/studio/src/lib/kiln-frame.ts'

const tenant = '11111111-1111-4111-8111-111111111111'
const user = '22222222-2222-4222-8222-222222222222'
const now = Date.now()
const valid = { tenant_id: tenant, user_id: user, aud: 'shop.hosso.vn', role: 'owner', exp: Math.floor(now / 1000) + 60 }
const code = `sso_code_${'a'.repeat(64)}`
let calls = 0
const options = {
  tenant, now, kilnURL: 'https://kiln.hosso.vn', publicURL: 'https://shop.hosso.vn',
  fetcher: async (url, init) => {
    calls++
    assert.equal(url.href, 'https://kiln.hosso.vn/api/v1/auth/sso/verify')
    assert.deepEqual(JSON.parse(init.body), { code, audience: 'shop.hosso.vn' })
    assert.equal(init.redirect, 'error')
    return Response.json({ success: true, data: valid })
  },
}
assert.deepEqual(await exchangeKilnCode(code, options), valid)
for (const change of [{ tenant_id: user }, { aud: 'evil.example' }, { role: 'customer' }, { user_id: 'bad' }, { exp: 0 }, { exp: Math.floor(now / 1000) + 1000 }]) {
  await assert.rejects(exchangeKilnCode(code, { ...options, fetcher: async () => Response.json({ success: true, data: { ...valid, ...change } }) }))
}
await assert.rejects(exchangeKilnCode('bad', options))
await assert.rejects(exchangeKilnCode(code, { ...options, kilnURL: 'http://kiln.hosso.vn' }))
await assert.rejects(exchangeKilnCode(code, { ...options, kilnURL: 'https://evil:secret@kiln.hosso.vn' }))
await assert.rejects(exchangeKilnCode(code, { ...options, fetcher: async () => new Response('', { status: 401 }) }))
assert.equal(calls, 1)
assert.equal(kilnFramePolicy('https://kiln.hosso.vn'), "frame-ancestors 'self' https://kiln.hosso.vn")
for (const origin of [undefined, '*', 'https://a.com/path', 'https://a.com https://evil.com', 'javascript:alert(1)']) {
  assert.equal(kilnFramePolicy(origin), "frame-ancestors 'self'")
}
console.log('PASS: valid exchange, fixed audience, tenant/role/user/expiry validation, TLS configuration, provider rejection')
