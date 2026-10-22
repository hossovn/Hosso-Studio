// Test token dịch vụ và token SSO (apps/studio/src/lib/kiln-auth.ts), gồm trường hợp token của site A mở site B.
// Run: node --experimental-strip-types scripts/test-kiln.mjs
import { say } from './lib/say.mjs'
import assert from 'node:assert/strict'
import { generateKeyPairSync, randomUUID, sign } from 'node:crypto'
import { serviceTokenOk, verifySsoToken } from '../apps/studio/src/lib/kiln-auth.ts'

const { publicKey, privateKey } = generateKeyPairSync('ed25519')
const pub = publicKey.export({ format: 'der', type: 'spki' }).subarray(12).toString('base64')
const other = generateKeyPairSync('ed25519')
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
const NOW = 1_800_000_000
const mint = (claims = {}, { key = privateKey, alg = 'EdDSA' } = {}) => {
  const body = `${b64({ alg, typ: 'JWT' })}.${b64({ sub: 'a@b.vn', aud: 'a.hosso.vn', tenant: 'a', iat: NOW, exp: NOW + 60, jti: randomUUID(), ...claims })}`
  return `${body}.${sign(null, Buffer.from(body), key).toString('base64url')}`
}
const check = (t, opts = {}) => verifySsoToken(t, { publicKey: pub, audience: 'a.hosso.vn', now: NOW * 1000, used: new Map(), ...opts })
let n = 0
const ok = (name) => console.log(`  ✓ ${name}`, ++n && '')

assert.equal(check(mint()).ok, true); ok('valid token')
assert.equal(check(mint(), { audience: 'b.hosso.vn' }).reason, 'audience'); ok('token of site A rejected by site B')
assert.equal(check(mint({ aud: 'b.hosso.vn' })).reason, 'audience'); ok('token minted for B rejected by A')
const used = new Map(), t = mint()
assert.equal(check(t, { used }).ok, true)
assert.equal(check(t, { used }).reason, 'replay'); ok('single use (jti)')
assert.equal(check(mint({ exp: NOW - 1, iat: NOW - 61 })).reason, 'expired'); ok('expired')
assert.equal(check(mint({ exp: NOW + 3600 })).reason, 'lifetime'); ok('lifetime over 120s')
assert.equal(check(mint({}, { key: other.privateKey })).reason, 'signature'); ok('wrong signing key')
const [h, p, s] = mint().split('.')
assert.equal(check(`${h}.${b64({ sub: 'root@x.vn', aud: 'a.hosso.vn', iat: NOW, exp: NOW + 60, jti: 'x' })}.${s}`).reason, 'signature'); ok('tampered payload')
assert.equal(check(mint({}, { alg: 'none' })).reason, 'alg'); ok('alg other than EdDSA')
assert.equal(check('x.y').reason, 'malformed'); ok('malformed')
assert.equal(check(mint(), { publicKey: undefined }).reason, 'not_configured'); ok('SSO off without public key')

const token = 'x'.repeat(40)
assert.equal(serviceTokenOk(`Bearer ${token}`, token), true)
assert.equal(serviceTokenOk(`Bearer ${token}y`, token), false)
assert.equal(serviceTokenOk(undefined, token), false)
assert.equal(serviceTokenOk('Bearer short', 'short'), false)
assert.equal(serviceTokenOk(`Bearer ${token}`, undefined), false); ok('service token')
console.log(say('OK: token dịch vụ và SSO.'))
