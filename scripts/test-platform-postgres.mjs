import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { beforePlatform } from './lib/platform-schema.mjs'
const require = createRequire(new URL('../apps/studio/package.json', import.meta.url))
const url = process.env.PLATFORM_TEST_DATABASE_URL
assert.ok(url, 'Set PLATFORM_TEST_DATABASE_URL to a disposable empty PostgreSQL database')
const { Pool } = createRequire(require.resolve('@payloadcms/db-postgres'))('pg')
const { drizzle } = createRequire(require.resolve('@payloadcms/db-postgres'))('drizzle-orm/node-postgres')
const pool = new Pool({ connectionString: url })
try {
  const existing = await pool.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public'")
  assert.equal(existing.rows.length, 0, 'Refusing to modify a nonempty database')
  const previous = beforePlatform(JSON.parse(await readFile(new URL('../apps/studio/src/migrations/20261117_090000_studio_platform.json', import.meta.url), 'utf8')))
  const { generateMigration } = require('drizzle-kit/api')
  const baseline = await generateMigration({ ...structuredClone(previous), tables: {}, enums: {}, views: {}, sequences: {} }, previous)
  await pool.query(baseline.join('\n'))
  await pool.query("INSERT INTO content_entries(id, slug, kind, published) VALUES (1, 'legacy', 'faq', true)")
  await pool.query('INSERT INTO content_entries_locales(id, title, data, _locale, _parent_id) VALUES ($1, $2, $3, $4, $5)', [1, 'Động cơ cũ', { description: 'Bảo trì định kỳ', price: 1200 }, 'vi', 1])
  await pool.query("INSERT INTO forms(id, slug) VALUES (1, 'legacy'); INSERT INTO form_submissions(id, form_id, data) VALUES (1, 1, '{\"name\":\"Giữ dữ liệu\"}')")
  const { tsImport } = require('tsx/esm/api')
  const migration = await tsImport('../apps/studio/src/migrations/20261117_090000_studio_platform.ts', { parentURL: import.meta.url, tsconfig: fileURLToPath(new URL('../apps/studio/tsconfig.json', import.meta.url)) })
  const db = drizzle(pool)
  await db.transaction(async (transaction) => migration.up({ db: transaction }))
  const search = (await pool.query('SELECT search_text FROM content_entries_locales WHERE id = 1')).rows[0].search_text
  for (const phrase of ['dong co cu', 'bao tri dinh ky', '1200']) assert.ok(search.includes(phrase))
  assert.equal((await pool.query('SELECT data FROM form_submissions WHERE id = 1')).rows[0].data.name, 'Giữ dữ liệu')
  for (const task of ['form-delivery-sweep', 'analytics-retention', 'analytics-record-event', 'shop-return-retention']) await pool.query('INSERT INTO payload_jobs(task_slug) VALUES ($1)', [task])
  await pool.query("INSERT INTO analytics_events(key,event) VALUES ('same','page_view')")
  await assert.rejects(pool.query("INSERT INTO analytics_events(key,event) VALUES ('same','page_view')"), /unique constraint/)
  console.log('PASS PostgreSQL additive migration in a transaction, legacy data/search backfill, job enums and event uniqueness')
} finally { await pool.end() }
