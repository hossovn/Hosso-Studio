import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import Module, { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { beforeOrderWorkflow, workflowColumns, workflowTables } from './lib/order-workflow-schema.mjs'

assert.ok(process.env.COMMERCE_TEST_DATABASE_URL, 'Set COMMERCE_TEST_DATABASE_URL to a disposable PostgreSQL instance with CREATE DATABASE permission')
const require = createRequire(new URL('../apps/studio/package.json', import.meta.url))
const { Pool } = require('pg'), { generateMigration } = require('drizzle-kit/api'), { PgDialect } = require('drizzle-orm/pg-core')
const { sql } = await import(pathToFileURL(require.resolve('@payloadcms/db-postgres')).href)
const current = JSON.parse(await readFile(new URL('../apps/studio/src/migrations/20261101_180000_order_workflow.json', import.meta.url)))
assert.ok(Object.keys(current.tables).length > 80, 'A release snapshot must include the whole application')
const previous = beforeOrderWorkflow(current)
const empty = { ...structuredClone(previous), tables: {}, enums: {}, schemas: {}, sequences: {}, views: {} }
const name = 'order_workflow_upgrade_' + Date.now(), admin = new Pool({ connectionString: process.env.COMMERCE_TEST_DATABASE_URL })
await admin.query('CREATE DATABASE "' + name + '"')
const url = new URL(process.env.COMMERCE_TEST_DATABASE_URL); url.pathname = '/' + name
const db = new Pool({ connectionString: url.toString() })
try {
  for (const statement of await generateMigration(empty, previous)) await db.query(statement)
  await db.query(`INSERT INTO payments (order_no, amount, paid_amount, status) VALUES ('OLD-PAID', 100000, 120000, 'paid');
    INSERT INTO shop_orders (order_no, total, status, payment_status) VALUES ('OLD-SO', 100000, 'completed', 'paid');`)
  const file = new URL('../apps/studio/src/migrations/20261101_180000_order_workflow.ts', import.meta.url)
  const mod = new Module(fileURLToPath(file)); mod.require = id => id === '@payloadcms/db-postgres' ? { sql } : require(id)
  const ts = require('typescript')
  mod._compile(ts.transpileModule(await readFile(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, fileURLToPath(file))
  await db.query('BEGIN')
  await mod.exports.up({ db: { execute: statement => db.query(new PgDialect().sqlToQuery(statement).sql) } })
  await db.query('COMMIT')
  const payment = (await db.query('SELECT * FROM payments')).rows[0]
  assert.equal(Number(payment.paid_amount), 120000); assert.equal(Number(payment.opening_paid_amount), 120000); assert.equal(payment.status, 'paid')
  const old = (await db.query('SELECT * FROM shop_orders')).rows[0]
  assert.equal(old.status, 'completed'); assert.equal(old.payment_status, 'paid'); assert.equal(old.workflow_version, null, 'Legacy orders must not enter automated dispatch')
  for (const [table, columns] of Object.entries(workflowColumns)) {
    const found = (await db.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1", [table])).rows.map(row => row.column_name)
    for (const column of columns) assert.ok(found.includes(column), table + '.' + column)
  }
  for (const table of workflowTables) assert.ok((await db.query('SELECT to_regclass($1) AS name', ['public.' + table])).rows[0].name)
  await db.query(`INSERT INTO commerce_rate_buckets (key,count) VALUES ('same-key', 1)`)
  await assert.rejects(db.query(`INSERT INTO commerce_rate_buckets (key,count) VALUES ('same-key', 2)`), error => error.code === '23505')
  await assert.rejects(mod.exports.down({}), /forward-only/)
  console.log('PASS PostgreSQL workflow upgrade: full snapshot; legacy paid history preserved; no retroactive dispatch; additive tables, columns and unique indexes.')
} finally { await db.end(); await admin.query('DROP DATABASE "' + name + '" WITH (FORCE)'); await admin.end() }
