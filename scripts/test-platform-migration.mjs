import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRequire } from 'node:module'
import { migratePlatform } from './migrate-sqlite-platform.mjs'
import { beforePlatform } from './lib/platform-schema.mjs'
import { sqlitePlatformSchema } from './lib/platform-test-schema.mjs'
const require = createRequire(import.meta.url)
const { generateSQLiteMigration } = require('drizzle-kit/api')
const current = await sqlitePlatformSchema()
const previous = beforePlatform(current)
const empty = { ...structuredClone(previous), tables: {}, views: {}, enums: {} }
const sql = await generateSQLiteMigration(empty, previous)
const directory = await mkdtemp(join(tmpdir(), 'hosso-platform-migration-'))
const filename = join(directory, 'old.db')
let db = new DatabaseSync(filename)
db.exec(sql.join('\n'))
db.exec("INSERT INTO content_entries(id, slug, kind, published) VALUES (1, 'gia-cu', 'faq', 1)")
db.prepare('INSERT INTO content_entries_locales(id, title, data, _locale, _parent_id) VALUES (?, ?, ?, ?, ?)').run(1, 'Động cơ cũ', JSON.stringify({ description: 'Bảo trì định kỳ', price: 1200 }), 'vi', 1)
db.exec("INSERT INTO forms(id, slug) VALUES (1, 'legacy'); INSERT INTO form_submissions(id, form_id, data) VALUES (1, 1, '{\"name\":\"Giữ dữ liệu\"}')")
db.close()
const result = migratePlatform(filename)
assert.equal(result.entries, 1)
assert.ok(result.backup)
db = new DatabaseSync(filename)
assert.equal(db.prepare('SELECT search_text FROM content_entries_locales WHERE id = 1').get().search_text, 'dong co cu bao tri dinh ky 1200')
assert.equal(db.prepare('SELECT data FROM form_submissions WHERE id = 1').get().data, '{"name":"Giữ dữ liệu"}')
assert.equal(db.prepare('SELECT lead_status FROM form_submissions WHERE id = 1').get().lead_status, 'new')
assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), [])
for (const table of Object.values(current.tables)) {
  const columns = new Set(db.prepare(`PRAGMA table_info("${table.name}")`).all().map((column) => column.name))
  for (const name of Object.keys(table.columns)) assert.ok(columns.has(name), `${table.name}.${name} missing after migration`)
}
db.close()
assert.equal(migratePlatform(filename).alreadyApplied, true)
const backup = new DatabaseSync(result.backup, { readOnly: true })
assert.equal(backup.prepare('SELECT title FROM content_entries_locales WHERE id = 1').get().title, 'Động cơ cũ')
assert.ok(!backup.prepare('PRAGMA table_info(content_entries_locales)').all().some((column) => column.name === 'search_text'))
backup.close()
console.log('PASS additive SQLite migration, normalized backfill, preserved legacy data, FK integrity, snapshot backup and idempotent replay')
