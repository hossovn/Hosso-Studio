import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import Module, { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'

assert.ok(process.env.COMMERCE_TEST_DATABASE_URL, 'Use a disposable PostgreSQL instance with CREATE DATABASE permission')
const require = createRequire(new URL('../apps/studio/package.json', import.meta.url))
const pgRequire = createRequire(require.resolve('@payloadcms/db-postgres'))
const { Pool, Client } = pgRequire('pg'), { generateMigration } = pgRequire('drizzle-kit/api'), { PgDialect } = pgRequire('drizzle-orm/pg-core')
const { sql } = await import(pathToFileURL(require.resolve('@payloadcms/db-postgres')).href)
const before = JSON.parse(await readFile(new URL('../apps/studio/src/migrations/20261101_180000_order_workflow.json', import.meta.url)))
const after = JSON.parse(await readFile(new URL('../apps/studio/src/migrations/20261102_040000_partner_connections.json', import.meta.url)))
const empty = { ...structuredClone(before), tables: {}, enums: {}, schemas: {}, sequences: {}, views: {} }
const name = 'partner_connections_' + Date.now(), admin = new Pool({ connectionString: process.env.COMMERCE_TEST_DATABASE_URL })
await admin.query('CREATE DATABASE "' + name + '"')
const url = new URL(process.env.COMMERCE_TEST_DATABASE_URL); url.pathname = '/' + name
const db = new Client({ connectionString: url.toString() })
try {
  await db.connect()
  for (const statement of await generateMigration(empty, before)) await db.query(statement)
  const file = new URL('../apps/studio/src/migrations/20261102_040000_partner_connections.ts', import.meta.url)
  const mod = new Module(fileURLToPath(file)); mod.require = id => id === '@payloadcms/db-postgres' ? { sql } : require(id)
  const ts = require('typescript')
  mod._compile(ts.transpileModule(await readFile(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, fileURLToPath(file))
  const ddl = []
  await mod.exports.up({ db: { execute: statement => ddl.push(new PgDialect().sqlToQuery(statement).sql) } })
  const norm = value => value.replace(/\s+/g, ' ').trim()
  assert.equal(norm(ddl.join('\n')), norm((await generateMigration(before, after)).join('\n')))
  assert.doesNotMatch(ddl.join('\n'), /DROP\s+(TABLE|COLUMN|TYPE)|TRUNCATE|DELETE\s+FROM/i)
  await db.query('BEGIN'); for (const statement of ddl) await db.query(statement); await db.query('COMMIT')
  const result = spawnSync(process.execPath, [fileURLToPath(new URL('./test-partner-connections.mjs', import.meta.url))], { env: { ...process.env, PARTNER_TEST_DATABASE_URL: url.toString() }, stdio: 'inherit', timeout: 120000 })
  assert.equal(result.status, 0, 'Full partner integration tests must pass on upgraded PostgreSQL')
  await assert.rejects(mod.exports.down({}), /forward-only/)
  console.log('PASS additive PostgreSQL schema upgrade plus real partner migration and credential/permission integration tests')
} finally {
  // Client.end waits for the socket to close; Pool.end can resolve before it does.
  // A normal DROP also catches leaked connections instead of terminating them.
  try { await db.end(); await admin.query('DROP DATABASE "' + name + '"') }
  finally { await admin.end() }
}
