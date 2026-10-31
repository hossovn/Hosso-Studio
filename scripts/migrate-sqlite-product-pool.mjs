import { DatabaseSync } from 'node:sqlite'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Additive upgrade for existing local SQLite sites, with a consistent backup before any writes. */
export function migrateProductPool(filename) {
  const path = resolve(filename)
  if (!existsSync(path)) throw new Error('Database does not exist: ' + path)
  const db = new DatabaseSync(path)
  const backup = path + '.before-product-pool-' + Date.now() + '.bak'
  try {
    db.exec('PRAGMA busy_timeout = 10000')
    const table = (name) => Boolean(db.prepare('SELECT name FROM sqlite_master WHERE type = ? AND name = ?').get('table', name))
    if (!table('shop_products') || !table('shop_orders') || !table('shop_orders_items')) throw new Error('Not a Shop database')
    db.prepare('VACUUM INTO ?').run(backup)
    db.exec('BEGIN IMMEDIATE')
    const add = (table, name, type) => {
      if (!db.prepare(`PRAGMA table_info("${table}")`).all().some((c) => c.name === name)) db.exec(`ALTER TABLE "${table}" ADD COLUMN "${name}" ${type}`)
    }
    const upgradingReliability = !db.prepare('PRAGMA table_info(shop_orders)').all().some((c) => c.name === 'lookup_token')
    add('shop_products', 'source', "text DEFAULT 'shop'")
    add('shop_products', 'stock_version', 'numeric DEFAULT 0')
    db.exec('UPDATE shop_products SET stock_version = 0 WHERE stock_version IS NULL')
    db.exec("UPDATE shop_products SET wim_id = NULL WHERE wim_id = ''")
    db.exec('DROP INDEX IF EXISTS shop_products_wim_id_idx; CREATE UNIQUE INDEX shop_products_wim_id_idx ON shop_products(wim_id)')
    for (const [name, type] of [['checkout_draft', 'text'], ['checkout_complete', 'integer DEFAULT 0'], ['source_orders', 'text'], ['branch_id', 'text']]) add('shop_orders', name, type)
    for (const [name, type] of [['checkout_state', 'text'], ['checkout_key', 'text'], ['lookup_token', 'text'], ['placed_hooks', 'text'], ['hook_lease_until', 'text'], ['hooks_complete', 'integer DEFAULT 0']]) add('shop_orders', name, type)
    db.exec("UPDATE shop_orders SET lookup_token = lower(hex(randomblob(32))) WHERE lookup_token IS NULL OR lookup_token = ''")
    db.exec("UPDATE shop_orders SET checkout_key = order_no WHERE checkout_key IS NULL")
    db.exec("UPDATE shop_orders SET checkout_state = CASE WHEN checkout_complete = 1 OR checkout_draft IS NULL THEN 'confirmed' ELSE 'legacy_review' END WHERE checkout_state IS NULL")
    if (upgradingReliability) db.exec('UPDATE shop_orders SET hooks_complete = 1 WHERE checkout_complete = 1 OR checkout_draft IS NULL')
    for (const name of ['source', 'remote_id']) add('shop_orders_items', name, 'text')
    db.exec("UPDATE shop_products SET source = 'wim' WHERE wim_id IS NOT NULL AND wim_id <> '' AND (source IS NULL OR source = 'shop')")
    db.exec('UPDATE shop_orders SET checkout_complete = 1 WHERE checkout_draft IS NULL')
    if (table('cross_sell_listings')) {
      add('shop_orders', 'cross_sell_purchases', 'text')
      db.exec("UPDATE shop_products SET source = 'cross-sell' WHERE id IN (SELECT product_id FROM cross_sell_listings WHERE product_id IS NOT NULL)")
      if (table('cross_sell_transfers')) db.exec(`DROP INDEX IF EXISTS cross_sell_transfers_local_order_idx;
CREATE INDEX cross_sell_transfers_local_order_idx ON cross_sell_transfers(local_order_id);
CREATE UNIQUE INDEX IF NOT EXISTS cross_sell_transfers_local_order_partner_idx ON cross_sell_transfers(local_order_id, partner_id);`)
    }
    db.exec('COMMIT')
    return { path, backup }
  } catch (error) {
    try { db.exec('ROLLBACK') } catch { /* No transaction started. */ }
    throw error
  } finally { db.close() }
}

if (resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  if (!process.argv[2]) throw new Error('Usage: node scripts/migrate-sqlite-product-pool.mjs <database.db>')
  const result = migrateProductPool(process.argv[2])
  console.log('Migrated: ' + result.path + '\nBackup: ' + result.backup)
}
