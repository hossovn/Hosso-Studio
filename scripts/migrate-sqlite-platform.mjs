import { DatabaseSync } from 'node:sqlite'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export function migratePlatform(filename) {
  const path = resolve(filename)
  if (!existsSync(path)) throw new Error('Database does not exist: ' + path)
  const db = new DatabaseSync(path)
  const backup = path + '.before-platform-' + Date.now() + '.bak'
  try {
    db.exec('PRAGMA busy_timeout = 10000')
    const tables = new Set(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((row) => row.name))
    for (const name of ['content_entries_locales', 'content_types', 'form_submissions', 'shop_orders', 'payload_locked_documents_rels']) if (!tables.has(name)) throw new Error('Upgrade requires the November 8 schema: missing ' + name)
    if (tables.has('hosso_platform_upgrade') && db.prepare('SELECT version FROM hosso_platform_upgrade WHERE version = 1').get()) return { path, alreadyApplied: true }
    db.prepare('VACUUM INTO ?').run(backup)
    db.exec('PRAGMA foreign_keys = ON; BEGIN IMMEDIATE')
    const source = readFileSync(new URL('./lib/platform-sqlite.sql', import.meta.url), 'utf8')
    for (const statement of source.split(';').map((value) => value.trim()).filter(Boolean)) {
      const create = statement.match(/^CREATE TABLE [`"]([^`"]+)[`"]/i)
      if (create && tables.has(create[1])) continue
      const alter = statement.match(/^ALTER TABLE [`"]([^`"]+)[`"] ADD (?:COLUMN )?[`"]([^`"]+)[`"]/i)
      if (alter && db.prepare(`PRAGMA table_info("${alter[1]}")`).all().some((column) => column.name === alter[2])) continue
      if (/^CREATE (?:UNIQUE )?INDEX /i.test(statement)) db.exec(statement.replace(/^(CREATE (?:UNIQUE )?INDEX) /i, '$1 IF NOT EXISTS '))
      else db.exec(statement)
    }
    const normalize = (value) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLocaleLowerCase()
    const update = db.prepare('UPDATE content_entries_locales SET search_text = ? WHERE id = ?')
    let last = 0, entries = 0
    for (;;) {
      const rows = db.prepare('SELECT id, title, data FROM content_entries_locales WHERE id > ? ORDER BY id LIMIT 500').all(last)
      if (!rows.length) break
      for (const row of rows) {
        const data = row.data ? JSON.parse(row.data) : {}
        update.run(normalize([row.title, ...Object.values(data)].filter((value) => typeof value === 'string' || typeof value === 'number').join(' ')), row.id)
        last = row.id; entries++
      }
    }
    db.exec('CREATE TABLE IF NOT EXISTS hosso_platform_upgrade (version INTEGER PRIMARY KEY); INSERT INTO hosso_platform_upgrade VALUES (1); COMMIT')
    return { path, backup, entries, alreadyApplied: false }
  } catch (error) {
    try { db.exec('ROLLBACK') } catch {}
    throw error
  } finally { db.close() }
}

if (resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  if (!process.argv[2]) throw new Error('Usage: node scripts/migrate-sqlite-platform.mjs <database.db>')
  console.log(migratePlatform(process.argv[2]))
}
