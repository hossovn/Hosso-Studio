import assert from 'node:assert/strict'
import { generateKeyPairSync, sign, createHash } from 'node:crypto'
import { verifyManagedSnapshot, acceptManagedSnapshot, configureManagedPlugins, managedPluginAllowed } from '../packages/blocks/src/managed-plugins.ts'

const { privateKey, publicKey } = generateKeyPairSync('ed25519')
const tenant = '11111111-1111-4111-8111-111111111111'
const generation = '22222222-2222-4222-8222-222222222222'
const now = Math.floor(Date.now() / 1000)
const trust = { tenant, keys: { test: publicKey.export({ type: 'spki', format: 'der' }).subarray(-32).toString('base64') }, versions: { shop: '0.1.0', payment: '0.1.0' } }
const caps = [{ id: 'shop', version: '0.1.0', enabled: true }, { id: 'payment', version: '0.1.0', enabled: true }]
const hash = c => createHash('sha256').update(JSON.stringify(c)).digest('hex')
const claims = { v: 1, iss: 'kiln', aud: 'hosso-studio', tenant_id: tenant, generation, revision: 1, hash: hash(caps), iat: now, exp: now + 300, capabilities: caps }
function token(c = claims) { const body = Buffer.from(JSON.stringify(c)).toString('base64url'); return `KPL1.test.${body}.${sign(null, Buffer.from(body), privateKey).toString('base64url')}` }
assert.deepEqual(await verifyManagedSnapshot(token(), trust, now), claims)
for (const change of [{ tenant_id: generation }, { aud: 'other' }, { exp: now }, { exp: now + 301 }, { iat: now + 10 }, { revision: -1 }, { hash: 'bad' }, { capabilities: [...caps, caps[0]] }]) {
  await assert.rejects(() => verifyManagedSnapshot(token({ ...claims, ...change }), trust, now))
}
await assert.rejects(() => verifyManagedSnapshot(token().slice(0, -5) + 'wrong', trust, now))
await assert.rejects(() => verifyManagedSnapshot(token(), { ...trust, keys: {} }, now))
await assert.rejects(() => verifyManagedSnapshot(token(), { ...trust, versions: { shop: '0.1.0' } }, now))
const old = await verifyManagedSnapshot(token(), trust, now)
assert.deepEqual(acceptManagedSnapshot(old, { ...old, iat: now + 1, exp: now + 301 }), { ...old, iat: now + 1, exp: now + 301 })
for (const change of [{ revision: 0 }, { generation: tenant }, { hash: 'conflict' }, { iat: now - 1 }, { exp: now + 299 }]) assert.throws(() => acceptManagedSnapshot(old, { ...old, ...change }))
process.env.HOSSO_PLUGIN_AUTHORITY = 'kiln'
assert.equal(await managedPluginAllowed('payment'), false)
let active = old
configureManagedPlugins(async () => active)
assert.equal(await managedPluginAllowed('payment'), true)
active = { ...old, exp: now - 1 }
assert.equal(await managedPluginAllowed('payment'), false)
active = { ...old, capabilities: caps.map(c => ({ ...c, enabled: false })) }
assert.equal(await managedPluginAllowed('payment'), false)
delete process.env.HOSSO_PLUGIN_AUTHORITY
assert.equal(await managedPluginAllowed('payment'), true)
console.log('PASS: managed signatures, tenant/version binding, replay, renewal, expiry and fail-closed authority')
