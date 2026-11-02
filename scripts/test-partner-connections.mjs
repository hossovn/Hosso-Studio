// Isolated SQLite regression. No live credentials, network calls, orders or email.
import assert from 'node:assert/strict'
import { mkdtemp, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { existsSync } from 'node:fs'
if (!existsSync(new URL('../packages/plugin-cross-sell/src/connections.ts', import.meta.url))) {
  console.log('SKIP partner runtime tests: install the private cross-sell package to run this suite (required in the TCAP release pipeline)')
  process.exit(0)
}
const require = createRequire(new URL('../apps/studio/package.json', import.meta.url))
const { tsImport } = require('tsx/esm/api')
const load = path => tsImport(path, { parentURL: import.meta.url, tsconfig: fileURLToPath(new URL('../apps/studio/tsconfig.json', import.meta.url)) })
process.env.NODE_ENV = 'test'
process.env.HOSSO_ENCRYPTION_KEY = 'a'.repeat(64)
process.env.HOSSO_LICENSE_ENFORCE = '0'
const [{ default: shop }, { default: crossSell }, connections, service, core, remote] = await Promise.all([
  load('../packages/plugin-shop/src/index.ts'), load('../packages/plugin-cross-sell/src/index.ts'), load('../packages/plugin-cross-sell/src/connections.ts'),
  load('../packages/plugin-cross-sell/src/service.ts'), load('../packages/plugin-cross-sell/src/core.ts'), load('../packages/plugin-cross-sell/src/remote.ts'),
])
const { buildConfig, getPayload, createLocalReq } = await import(pathToFileURL(require.resolve('payload')).href)
const { sqliteAdapter } = await import(pathToFileURL(require.resolve('@payloadcms/db-sqlite')).href)
const { postgresAdapter } = await import(pathToFileURL(require.resolve('@payloadcms/db-postgres')).href)
const directory = await mkdtemp(join(tmpdir(), 'hosso-partner-connections-'))
await mkdir(join(directory, 'media'))
let payload
const PARTNERS = 'cross-sell-partners'
const exportToken = 'export-token-' + 'e'.repeat(40), importToken = 'import-token-' + 'i'.repeat(40)
const base = { buyerName: 'Fixture business', buyerPhone: '0901234567', active: true, authMethod: 'direct' }
try {
  const adapter = process.env.PARTNER_TEST_DATABASE_URL ? postgresAdapter({ pool: { connectionString: process.env.PARTNER_TEST_DATABASE_URL }, push: false }) : sqliteAdapter({ client: { url: 'file:' + join(directory, 'test.db') }, transactionOptions: {} })
  let config = { serverURL: 'https://studio.example.test', secret: 'isolated-partner-fixture', db: adapter, collections: [{ slug: 'users', auth: true, fields: [] }, { slug: 'media', upload: { staticDir: join(directory, 'media') }, fields: [] }], globals: [], custom: { hossoPlugins: [shop, crossSell] }, admin: { user: 'users' }, jobs: { autoRun: [] } }
  config = crossSell.payload(shop.payload(config)); config.jobs.autoRun = []
  // Seed the exact legacy layout, then restore the real profile validation hook.
  config.collections.find(c => c.slug === PARTNERS).hooks.beforeValidate = []
  const offerFilter = config.collections.find(c => c.slug === 'cross-sell-offers').fields.find(f => f.name === 'partners').filterOptions
  delete config.collections.find(c => c.slug === 'cross-sell-offers').fields.find(f => f.name === 'partners').filterOptions
  payload = await getPayload({ config: buildConfig(config), disableOnInit: true, key: 'partner-connections-' + crypto.randomUUID() })
  const partnerConfig = payload.config.collections.find(c => c.slug === PARTNERS)
  const make = data => payload.create({ collection: PARTNERS, data: { ...base, ...data } })
  const woo = await make({ name: 'WordPress', kind: 'woocommerce', apiUrl: 'https://woo.example.test', consumerKey: 'ck_fixture', consumerSecret: 'cs_fixture' })
  const identity = await make({ name: 'WordPress — from WIM', kind: 'hosso', apiUrl: 'https://woo.example.test/', token: exportToken })
  const product = await payload.create({ collection: 'shop-products', data: { name: 'Spark plug', code: 'FIXTURE', price: 475000, stock: 258, active: true } })
  const offer = await payload.create({ collection: 'cross-sell-offers', data: { source: 'shop', product: product.id, partners: [woo.id, identity.id], commissionPct: 15, active: true } })
  const purchase = { key: crypto.randomUUID(), items: [{ id: '7', quantity: 1, price: 475000, commissionPct: 15 }], buyer: { name: base.buyerName, phone: base.buyerPhone } }
  const receipt = await payload.create({ collection: 'cross-sell-receipts', depth: 0, data: { key: 'xs-' + identity.id + '-' + purchase.key, partner: identity.id, purchaseKey: purchase.key, purchase, body: { preserved: true } } })
  const listing = await payload.create({ collection: 'cross-sell-listings', depth: 0, data: { partner: woo.id, remoteId: '7', remoteKey: woo.id + ':7', supplierPrice: 475000, commissionPct: 15, active: true } })
  const raw = id => payload.findByID({ collection: PARTNERS, id, depth: 0, context: { crossSellCredentials: true } })
  await payload.db.updateOne({ collection: PARTNERS, id: woo.id, data: { buyerPhone: '<redacted>' } })
  partnerConfig.hooks.beforeValidate = [connections.validatePartnerProfile]
  payload.config.collections.find(c => c.slug === 'cross-sell-offers').fields.find(f => f.name === 'partners').filterOptions = offerFilter
  if (process.env.PARTNER_TEST_DATABASE_URL) {
    const updateOne = payload.db.updateOne.bind(payload.db)
    payload.db.updateOne = async args => {
      if (args.collection === PARTNERS && args.id === woo.id && args.data.exportIdentity) throw new Error('Injected migration failure')
      return updateOne(args)
    }
    try { await assert.rejects(connections.migrationPartnerConnections(payload), /Injected migration failure/) }
    finally { payload.db.updateOne = updateOne }
    assert.ok(!(await raw(identity.id)).mergedInto, 'A failed profile update must roll back its alias write')
    assert.ok(!(await raw(woo.id)).connectionVersion, 'A failed migration must leave the original profile intact')
  }
  await connections.migrationPartnerConnections(payload)
  const main = await raw(woo.id), alias = await raw(identity.id)
  assert.equal(alias.mergedInto, woo.id)
  assert.equal(main.kind, 'woocommerce'); assert.equal(main.exportIdentity, identity.id)
  assert.equal(main.importEnabled, true); assert.equal(main.exportEnabled, true)
  assert.equal(main.buyerPhone, base.buyerPhone, 'Reuse valid contact information from the same website')
  assert.deepEqual(core.partnerCredentials(main), { key: 'ck_fixture', secret: 'cs_fixture' })
  assert.equal(core.exportCredential(main), exportToken)
  assert.ok(main.exportToken.startsWith('enc:v1:'), 'Copied export credentials stay encrypted at rest')
  const profiles = await payload.find({ collection: PARTNERS, where: connections.primaryProfiles, depth: 0 })
  assert.equal(profiles.totalDocs, 1)
  assert.deepEqual((await payload.findByID({ collection: 'cross-sell-offers', id: offer.id, depth: 0 })).partners, [woo.id])
  assert.deepEqual(await payload.findByID({ collection: 'cross-sell-receipts', id: receipt.id, depth: 0 }), receipt)
  assert.deepEqual(await payload.findByID({ collection: 'cross-sell-listings', id: listing.id, depth: 0 }), listing)
  const before = JSON.stringify(await connections.allPartners(payload))
  await connections.migrationPartnerConnections(payload)
  assert.equal(JSON.stringify(await connections.allPartners(payload)), before, 'Restarting the migration changes no identity or command key')
  const auth = token => service.authenticate({ payload, headers: new Headers({ authorization: 'Bearer ' + token }) })
  const incoming = await auth(exportToken)
  assert.equal(incoming.id, identity.id); assert.equal(incoming.profileId, woo.id)
  assert.equal((await service.offerCatalog(payload, incoming))[0].id, String(product.id), 'Legacy ingress identity sees permissions on the consolidated partner')
  const masked = await payload.findByID({ collection: PARTNERS, id: woo.id, depth: 0 })
  assert.equal(masked.exportToken, '••••••••')
  assert.equal(masked.consumerSecret, '••••••••')
  const bToken = 'studio-b-export-' + 'b'.repeat(40)
  const studio = await make({ name: 'Studio B', kind: 'hosso', apiUrl: 'https://studio-b.example.test', token: importToken, exportEnabled: true, exportToken: bToken })
  const studioRaw = await raw(studio.id)
  assert.equal(core.partnerCredentials(studioRaw).key, importToken)
  assert.equal(core.exportCredential(studioRaw), bToken)
  await assert.rejects(auth(importToken), /Unauthorized/, 'An import credential grants no inbound access')
  const cToken = 'studio-c-' + 'c'.repeat(40)
  const third = await make({ name: 'Studio C', kind: 'hosso', apiUrl: 'https://studio-c.example.test', importEnabled: false, exportEnabled: true, exportToken: cToken })
  assert.equal((await auth(cToken)).id, third.id)
  assert.deepEqual(await service.offerCatalog(payload, await auth(cToken)), [], 'Another partner cannot read WordPress product permissions')
  assert.equal((await payload.find({ collection: PARTNERS, where: connections.primaryProfiles })).totalDocs, 3, 'One website supports many independent partners')
  await assert.rejects(make({ name: 'Duplicate', kind: 'hosso', apiUrl: 'https://WOO.example.test:443/', importEnabled: false }), /already has a partner/)
  await assert.rejects(payload.update({ collection: PARTNERS, id: woo.id, data: { apiUrl: 'https://different.example.test' } }), /different website/)
  await payload.update({ collection: PARTNERS, id: woo.id, data: { importEnabled: false } })
  await assert.rejects(remote.catalog(await service.partnerById(payload, woo.id)), /import is disabled/)
  assert.equal((await auth(exportToken)).profileId, woo.id, 'Disabling imports leaves export authentication working')
  await payload.update({ collection: PARTNERS, id: woo.id, data: { exportEnabled: false } })
  await assert.rejects(auth(exportToken), /Unauthorized/)
  await payload.update({ collection: PARTNERS, id: studio.id, data: { exportToken: cToken } })
  await assert.rejects(auth(cToken), /Unauthorized/, 'Reused export tokens fail closed instead of selecting the wrong website')
  await payload.update({ collection: PARTNERS, id: studio.id, data: { exportToken: bToken } })
  await payload.update({ collection: PARTNERS, id: woo.id, data: { active: false } })
  await assert.rejects(service.partnerById(payload, identity.id), /disabled/)
  await assert.rejects(payload.update({ collection: PARTNERS, id: identity.id, data: { active: true } }), /consolidated partner/)
  await payload.update({ collection: PARTNERS, id: third.id, data: { mergedInto: studio.id, exportIdentity: identity.id, legacyBasicIngress: true, connectionVersion: 999, siteKey: 'forged' } })
  const thirdAfter = await raw(third.id)
  assert.ok(!thirdAfter.mergedInto && !thirdAfter.exportIdentity && !thirdAfter.legacyBasicIngress, 'Client JSON cannot forge identity ownership')
  assert.equal(thirdAfter.connectionVersion, 1)
  assert.equal(thirdAfter.siteKey, 'https://studio-c.example.test')
  process.env.HOSSO_CROSS_SELL_FIXTURE_OUTBOUND_KEY = 'ck_env_fixture'
  process.env.HOSSO_CROSS_SELL_FIXTURE_OUTBOUND_SECRET = 'cs_env_fixture'
  process.env.HOSSO_CROSS_SELL_FIXTURE_EXPORT = 'env-export-' + 'x'.repeat(40)
  partnerConfig.hooks.beforeValidate = []
  const envWoo = await make({ name: 'Inactive env WordPress', kind: 'woocommerce', apiUrl: 'https://env-woo.example.test', active: false, authMethod: 'env', credentialEnv: 'HOSSO_CROSS_SELL_FIXTURE_OUTBOUND_KEY', secretEnv: 'HOSSO_CROSS_SELL_FIXTURE_OUTBOUND_SECRET' })
  const envIdentity = await make({ name: 'Inactive env export', kind: 'hosso', apiUrl: 'https://env-woo.example.test', active: false, authMethod: 'env', credentialEnv: 'HOSSO_CROSS_SELL_FIXTURE_EXPORT' })
  partnerConfig.hooks.beforeValidate = [connections.validatePartnerProfile]
  const secondProduct = await payload.create({ collection: 'shop-products', data: { name: 'Second fixture', code: 'FIXTURE-2', price: 10000, stock: 3, active: true } })
  const inactiveOffer = await payload.create({ collection: 'cross-sell-offers', data: { source: 'shop', product: secondProduct.id, partners: [envIdentity.id], commissionPct: 15, active: false } })
  await connections.migrationPartnerConnections(payload)
  const envMain = await raw(envWoo.id)
  assert.equal(envMain.active, false); assert.equal(envMain.importEnabled, false); assert.equal(envMain.exportEnabled, false)
  assert.deepEqual(core.partnerCredentials(envMain), { key: 'ck_env_fixture', secret: 'cs_env_fixture' })
  assert.equal(core.exportCredential(envMain), process.env.HOSSO_CROSS_SELL_FIXTURE_EXPORT, 'Environment credentials keep their independent directions')
  assert.deepEqual((await payload.findByID({ collection: 'cross-sell-offers', id: inactiveOffer.id, depth: 0 })).partners, [envWoo.id], 'Disabled export profiles still migrate their configured permissions')
  const req = await createLocalReq({ user: { id: 1, roles: ['admin'] } }, payload)
  await connections.allPartners(payload, req)
  assert.ok(!req.context.crossSellCredentials, 'Private credential reads must not unmask the admin response context')
  console.log('PASS ' + (process.env.PARTNER_TEST_DATABASE_URL ? 'PostgreSQL' : 'SQLite') + ': one profile per website, many partners, legacy merge, encrypted independent credentials, original receipt/listing keys, permissions, idempotent restart, per-direction gates, alias master disable and no secret context leak')
} finally {
  if (payload) {
    await payload.destroy()
    assert.deepEqual(Object.keys(payload.db.sessions ?? {}), [], 'No test transaction may remain open')
  }
}

// More than one page of partners must remain addressable.
const many = Array.from({ length: 205 }, (_, i) => ({ id: i + 1 }))
assert.equal((await connections.allPartners({ find: async ({ page, limit }) => ({ docs: many.slice((page - 1) * limit, page * limit), hasNextPage: page * limit < many.length }) })).length, 205)
console.log('PASS partner pagination beyond 100 websites')
// Payload retains a PostgreSQL connection-monitor client after destroy. This
// isolated child has finished all assertions; the parent drops its disposable DB.
if (process.env.PARTNER_TEST_DATABASE_URL) process.stdout.write('', () => process.exit(0))
