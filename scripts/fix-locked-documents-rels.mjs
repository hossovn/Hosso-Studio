import { DatabaseSync } from 'node:sqlite'

const dbPaths = [
  'apps/studio/data/studio-test.db',
  'apps/studio/data/studio.db',
  'data/studio.db',
]

const requiredCols = [
  'affiliate_clicks_id',
  'affiliate_orders_id',
  'affiliate_payouts_id',
  'affiliate_payout_items_id',
  'affiliate_audit_logs_id',
  'affiliate_rate_limits_id',
]

for (const p of dbPaths) {
  try {
    const db = new DatabaseSync(p)
    const tableExists =
      db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='payload_locked_documents_rels'"
        )
        .all().length > 0
    if (!tableExists) continue

    const current = db
      .prepare('PRAGMA table_info(payload_locked_documents_rels)')
      .all()
      .map((c) => c.name)

    for (const col of requiredCols) {
      if (!current.includes(col)) {
        db.exec(
          `ALTER TABLE payload_locked_documents_rels ADD COLUMN "${col}" integer;`
        )
        console.log(`[${p}] Added column ${col}`)
      }
    }
  } catch (err) {
    console.error(p, err.message)
  }
}
