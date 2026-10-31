import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { migrateProductPool } from './migrate-sqlite-product-pool.mjs'

const dir = await mkdtemp(join(tmpdir(), 'hosso-product-pool-migration-'))
const filename = join(dir, 'legacy.db')
let db = new DatabaseSync(filename)
db.exec(`CREATE TABLE shop_products (id integer PRIMARY KEY, wim_id text, active integer, stock integer);
CREATE TABLE shop_orders (id integer PRIMARY KEY, order_no text);
CREATE TABLE shop_orders_items (id text PRIMARY KEY, product_id text);
CREATE TABLE cross_sell_listings (id integer PRIMARY KEY, product_id integer);
CREATE TABLE cross_sell_transfers (id integer PRIMARY KEY, local_order_id integer, partner_id integer);
CREATE UNIQUE INDEX cross_sell_transfers_local_order_idx ON cross_sell_transfers(local_order_id);
INSERT INTO shop_products VALUES (1, NULL, 1, 10), (2, '1', 0, 0), (3, 'xs-filter', 0, 0);
INSERT INTO shop_orders VALUES (1, 'SO-1');
INSERT INTO shop_orders_items VALUES ('line-1', '1');
INSERT INTO cross_sell_listings VALUES (1, 3);
INSERT INTO cross_sell_transfers VALUES (1, 1, 7);`)
db.close()
const migrated = migrateProductPool(filename)
const old = new DatabaseSync(migrated.backup, { readOnly: true })
assert.equal(old.prepare('PRAGMA table_info(shop_products)').all().some((c) => c.name === 'source'), false)
assert.equal(old.prepare('SELECT COUNT(*) AS n FROM shop_products').get().n, 3)
old.close()
migrateProductPool(filename)
db = new DatabaseSync(filename)
assert.deepEqual(db.prepare('SELECT id, source FROM shop_products ORDER BY id').all().map((r) => [r.id, r.source]), [[1, 'shop'], [2, 'wim'], [3, 'cross-sell']])
assert.equal(db.prepare('SELECT checkout_complete FROM shop_orders').get().checkout_complete, 1)
assert.equal(db.prepare('SELECT product_id FROM shop_orders_items').get().product_id, '1')
const upgraded = db.prepare('SELECT lookup_token, checkout_key, hooks_complete FROM shop_orders').get()
assert.match(upgraded.lookup_token, /^[a-f0-9]{64}$/)
assert.equal(upgraded.checkout_key, 'SO-1')
assert.equal(upgraded.hooks_complete, 1)
db.exec("UPDATE shop_orders SET checkout_draft = '{}', hooks_complete = 0")
db.close()
migrateProductPool(filename)
db = new DatabaseSync(filename)
assert.deepEqual({ ...db.prepare('SELECT lookup_token, checkout_key, hooks_complete FROM shop_orders').get() }, { ...upgraded, hooks_complete: 0 })
db.exec('INSERT INTO cross_sell_transfers VALUES (2, 1, 8)')
assert.throws(() => db.exec('INSERT INTO cross_sell_transfers VALUES (3, 1, 8)'), /UNIQUE/)
db.close()
console.log('PASS SQLite upgrade: consistent backup, stable products/orders/items, source backfill, repeat run, multiple suppliers with unique pairs')

const require = createRequire(new URL('../apps/studio/package.json', import.meta.url))
const { tsImport } = require('tsx/esm/api')
process.env.HOSSO_DATABASE_URL = 'postgres://unused/unused'
process.env.HOSSO_SECRET = 'migration-schema-test-only'
process.env.HOSSO_SCRIPT = '1'
const { default: promise } = await tsImport('../apps/studio/src/payload.config.ts', { parentURL: import.meta.url, tsconfig: fileURLToPath(new URL('../apps/studio/tsconfig.json', import.meta.url)) })
const config = await promise
config.jobs.autoRun = []
const { getPayload } = await import(pathToFileURL(require.resolve('payload')).href)
const payload = await getPayload({ config, disableDBConnect: true, disableOnInit: true })
try {
  const { generateDrizzleJson } = require('drizzle-kit/api')
  const schema = generateDrizzleJson(payload.db.schema)
  for (const [table, columns] of Object.entries({ shop_products: ['source', 'stock_version'], shop_orders: ['checkout_draft', 'checkout_complete', 'checkout_state', 'checkout_key', 'lookup_token', 'placed_hooks', 'hook_lease_until', 'hooks_complete', 'source_orders', 'branch_id', 'cross_sell_purchases'], shop_orders_items: ['source', 'remote_id'] })) {
    for (const column of columns) assert.ok(schema.tables['public.' + table].columns[column], `${table}.${column}`)
  }
  assert.deepEqual(schema.enums['public.enum_shop_products_source'].values, ['shop', 'wim', 'cross-sell'])
  assert.ok(payload.config.jobs.tasks.some((task) => task.slug === 'shop-order-recovery'))
  const indexes = Object.values(schema.tables['public.cross_sell_transfers'].indexes)
  assert.ok(indexes.some((i) => i.isUnique && i.columns.map((c) => c.expression).join(',') === 'local_order_id,partner_id'))
  assert.ok(!indexes.some((i) => i.isUnique && i.columns.length === 1 && i.columns[0].expression === 'local_order_id'))
  const migration = await readFile(new URL('../apps/studio/src/migrations/20261031_160000_shared_product_pool.ts', import.meta.url), 'utf8')
  assert.ok(migration.includes('Reconcile multiple supplier transfers before rolling back'))
  assert.doesNotMatch(migration.split('export async function down')[0], /DROP TABLE|DELETE FROM|TRUNCATE/i)
  const reliability = await readFile(new URL('../apps/studio/src/migrations/20261031_170000_order_reliability.ts', import.meta.url), 'utf8')
  for (const name of ['enum_payload_jobs_task_slug', 'enum_payload_jobs_log_task_slug']) assert.ok(reliability.includes(name + '" ADD VALUE IF NOT EXISTS \'shop-order-recovery\''))
  console.log('PASS PostgreSQL schema: Product source, durable checkout, source line IDs and supplier-pair uniqueness; no database connection')
} finally { await payload.destroy() }
