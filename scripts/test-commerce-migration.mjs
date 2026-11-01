import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import Module, { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
assert.ok(process.env.AFFILIATE_TEST_DATABASE_URL, 'Use a disposable PostgreSQL instance with CREATE DATABASE permission')
const require = createRequire(new URL('../apps/studio/package.json', import.meta.url))
const { Pool } = require('pg'), { generateMigration } = require('drizzle-kit/api'), { PgDialect } = require('drizzle-orm/pg-core')
const { sql } = await import(pathToFileURL(require.resolve('@payloadcms/db-postgres')).href)
const snapshot = JSON.parse(await readFile(new URL('../apps/studio/src/migrations/20261101_060000_commerce_blocks.json', import.meta.url)))
const previous = structuredClone(snapshot)
const addedTables = ['affiliate_settings', 'affiliate_withdrawals', 'garage_price_groups', 'shop_products_garage_prices']
const columns = {
  shop_products: ['affiliate_rate'], shop_categories: ['affiliate_rate'], shop_orders: ['affiliate_refunded_lines'], shop_orders_items: ['image', 'price_source', 'price_group'],
  customers: ['garage_status', 'garage_name', 'garage_tax_id', 'garage_address', 'garage_reason', 'price_group_id'], shipments: ['shipment_key', 'delivery_by', 'cod_collector', 'group_label'],
  shipping_settings: ['fee_mode'], cross_sell_partners: ['delivery_mode', 'cod_collector', 'shipping_fee', 'allow_retail_discounts'], payload_locked_documents_rels: ['affiliate_withdrawals_id', 'garage_price_groups_id'],
}
for (const name of addedTables) delete previous.tables['public.' + name]
for (const [name, added] of Object.entries(columns)) {
  const t = previous.tables['public.' + name]
  for (const c of added) delete t.columns[c]
  for (const [name, index] of Object.entries(t.indexes)) if (index.columns.some((c) => added.includes(c.expression))) delete t.indexes[name]
  for (const [name, key] of Object.entries(t.foreignKeys)) if (key.columnsFrom.some((c) => added.includes(c))) delete t.foreignKeys[name]
}
for (const [key, type] of Object.entries(previous.enums)) {
  if (['enum_customers_garage_status', 'enum_shipments_delivery_by', 'enum_shipments_cod_collector', 'enum_shipping_settings_fee_mode', 'enum_cross_sell_partners_delivery_mode', 'enum_cross_sell_partners_cod_collector', 'enum_affiliate_withdrawals_status'].includes(type.name)) delete previous.enums[key]
  else if (type.name.startsWith('enum_payload_jobs')) type.values = type.values.filter((v) => v !== 'affiliate-month-end')
}
previous.tables['public.affiliates'].columns.commission_pct.default = 10
previous.tables['public.shipments'].indexes.shipments_order_id_idx.isUnique = true
const empty = { ...structuredClone(previous), tables: {}, enums: {}, schemas: {}, sequences: {}, views: {} }
const name = 'commerce_migration_' + Date.now(), admin = new Pool({ connectionString: process.env.AFFILIATE_TEST_DATABASE_URL })
await admin.query('CREATE DATABASE "' + name + '"')
const url = new URL(process.env.AFFILIATE_TEST_DATABASE_URL); url.pathname = '/' + name
const db = new Pool({ connectionString: url.toString() })
try {
  for (const statement of await generateMigration(empty, previous)) await db.query(statement)
  await db.query(`INSERT INTO affiliates (name, code, email, commission_pct) VALUES ('Legacy', 'LEGACY', 'legacy@migration.invalid', 10);
    INSERT INTO affiliate_referrals (affiliate_id, order_id, commission, status, policy) VALUES (1, 'OLD-PAID', 12345, 'paid', '{"rate":10,"base":123450}');
    INSERT INTO shipments (order_id, order_total) VALUES ('OLD-SO', 100000);
    INSERT INTO customers (name, email) VALUES ('Legacy buyer', 'buyer@migration.invalid');`)
  const file = new URL('../apps/studio/src/migrations/20261101_060000_commerce_blocks.ts', import.meta.url)
  const mod = new Module(fileURLToPath(file)); mod.require = (id) => id === '@payloadcms/db-postgres' ? { sql } : require(id)
  mod._compile(require('typescript').transpileModule(await readFile(file, 'utf8'), { compilerOptions: { target: require('typescript').ScriptTarget.ES2022, module: require('typescript').ModuleKind.CommonJS } }).outputText, fileURLToPath(file))
  await db.query('BEGIN')
  await mod.exports.up({ db: { execute: async (s) => db.query(new PgDialect().sqlToQuery(s).sql) } })
  await db.query('COMMIT')
  const referral = (await db.query('SELECT commission, status, policy FROM affiliate_referrals')).rows[0]
  assert.equal(Number(referral.commission), 12345); assert.equal(referral.status, 'paid'); assert.equal(referral.policy.rate, 10)
  assert.equal(Number((await db.query('SELECT commission_pct FROM affiliates')).rows[0].commission_pct), 10)
  assert.equal((await db.query('SELECT garage_status FROM customers')).rows[0].garage_status, 'retail')
  assert.equal((await db.query('SELECT shipment_key FROM shipments')).rows[0].shipment_key, 'OLD-SO:store')
  await db.query(`INSERT INTO shipments (order_id, shipment_key) VALUES ('OLD-SO', 'OLD-SO:partner-test')`)
  await assert.rejects(() => db.query(`INSERT INTO shipments (order_id, shipment_key) VALUES ('OTHER-SO', 'OLD-SO:partner-test')`))
  for (const [table, added] of Object.entries(columns)) {
    const found = (await db.query('SELECT column_name FROM information_schema.columns WHERE table_schema=\'public\' AND table_name=$1', [table])).rows.map((r) => r.column_name)
    for (const c of added) assert.ok(found.includes(c), table + '.' + c)
  }
  for (const table of addedTables) assert.ok((await db.query('SELECT to_regclass($1) AS name', ['public.' + table])).rows[0].name)
  await assert.rejects(() => mod.exports.down({}), /forward-only/)
  console.log('PASS commerce migration on PostgreSQL: legacy commission/history preserved; garage defaults, new tables, indexes and grouped shipments verified.')
} finally { await db.end(); await admin.query('DROP DATABASE "' + name + '" WITH (FORCE)'); await admin.end() }
