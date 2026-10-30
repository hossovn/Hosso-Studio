import { DatabaseSync } from 'node:sqlite'
import { existsSync } from 'node:fs'

const dbPaths = [
  'apps/studio/data/studio-test.db',
  'apps/studio/data/studio.db',
  'data/studio.db',
]

for (const dbPath of dbPaths) {
  if (!existsSync(dbPath)) continue
  try {
    const db = new DatabaseSync(dbPath)
    // Lấy tất cả indexes của bảng cross_sell_partners
    const indexes = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='cross_sell_partners'"
      )
      .all()
    for (const idx of indexes) {
      if (idx.name.startsWith('sqlite_autoindex')) continue
      db.exec(`DROP INDEX IF EXISTS "${idx.name}";`)
      console.log(`[${dbPath}] Dropped index: ${idx.name}`)
    }
  } catch (err) {
    console.error(`[${dbPath}] Error:`, err.message)
  }
}
