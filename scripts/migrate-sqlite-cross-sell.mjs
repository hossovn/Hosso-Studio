// Cập nhật schema SQLite cho bảng cross_sell_partners khi thêm các trường mới
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
    // Kiểm tra xem bảng cross_sell_partners có tồn tại không
    const tableExists = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='cross_sell_partners'"
      )
      .all().length > 0

    if (!tableExists) continue

    const columns = db
      .prepare('PRAGMA table_info(cross_sell_partners)')
      .all()
      .map((c) => c.name)

    // Xóa bảng tạm dở dang nếu có
    db.exec('DROP TABLE IF EXISTS __new_cross_sell_partners;')

    if (!columns.includes('auth_method')) {
      db.exec(
        "ALTER TABLE cross_sell_partners ADD COLUMN auth_method TEXT DEFAULT 'direct';"
      )
      console.log(`[${dbPath}] Added column: auth_method`)
    }
    if (!columns.includes('token')) {
      db.exec('ALTER TABLE cross_sell_partners ADD COLUMN token TEXT;')
      console.log(`[${dbPath}] Added column: token`)
    }
    if (!columns.includes('consumer_key')) {
      db.exec('ALTER TABLE cross_sell_partners ADD COLUMN consumer_key TEXT;')
      console.log(`[${dbPath}] Added column: consumer_key`)
    }
    if (!columns.includes('consumer_secret')) {
      db.exec('ALTER TABLE cross_sell_partners ADD COLUMN consumer_secret TEXT;')
      console.log(`[${dbPath}] Added column: consumer_secret`)
    }
    console.log(`[${dbPath}] Migration completed successfully.`)
  } catch (err) {
    console.error(`[${dbPath}] Error:`, err.message)
  }
}
