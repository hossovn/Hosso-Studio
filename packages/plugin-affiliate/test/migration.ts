import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { buildConfig, getPayload } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { PgDialect } from 'drizzle-orm/pg-core'
import pg from 'pg'
import { up, down } from '../../../apps/studio/src/migrations/20261030_120000_affiliate_cps'
assert.ok(process.env.AFFILIATE_TEST_DATABASE_URL, 'Set a disposable PostgreSQL connection')
const admin = new pg.Pool({ connectionString: process.env.AFFILIATE_TEST_DATABASE_URL })
const name = 'affiliate_migration_' + Date.now()
await admin.query('CREATE DATABASE "' + name + '"')
const url = new URL(process.env.AFFILIATE_TEST_DATABASE_URL!); url.pathname = '/' + name
const client = new pg.Pool({ connectionString: url.toString(), max: 1 })
const payload = await getPayload({ config: await buildConfig({ telemetry: false, secret: 'migration-test-secret-32-characters', db: postgresAdapter({ pool: { connectionString: url.toString() } }), collections: [] }), disableDBConnect: true, disableOnInit: true })
const dialect = new PgDialect()
const db = { execute: async (query: any) => { const q = dialect.sqlToQuery(query); return client.query(q.sql, q.params) } } as any
try {
  const before = JSON.parse(await readFile(new URL('../../../apps/studio/src/migrations/20261021_011019_cross_sell.json', import.meta.url), 'utf8'))
  const empty = { ...before, tables: {}, enums: {}, schemas: {}, sequences: {}, roles: {}, policies: {}, views: {} }
  const statements = await (payload.db as any).requireDrizzleKit().generateMigration(empty, before)
  await client.query(statements.join('\n'))
  await client.query(`INSERT INTO affiliates (name, code, email, active) VALUES ('Old Active', 'OLD-A', 'old-a@test.example', true), ('Old Inactive', 'OLD-I', 'old-i@test.example', false); INSERT INTO affiliate_referrals (affiliate_id, order_id, commission, status) VALUES (1, 'OLD-PAID', 12345, 'paid'), (1, 'OLD-PENDING', 100, 'pending')`)
  await client.query('BEGIN'); await up({ db } as any); await client.query('COMMIT')
  assert.deepEqual((await client.query('SELECT approval FROM affiliates ORDER BY id')).rows.map(r => r.approval), ['approved', 'rejected'])
  assert.deepEqual((await client.query('SELECT commission::integer, status, policy FROM affiliate_referrals ORDER BY id')).rows, [{ commission: 12345, status: 'paid', policy: null }, { commission: 100, status: 'pending', policy: null }])
  await client.query(`INSERT INTO affiliate_payouts (affiliate_id, amount, reference, evidence, bank_info) VALUES (1, 100, 'TEST', 'Receipt', 'Bank')`)
  await assert.rejects(() => down({ db } as any), /CPS history exists/)
  await client.query('DELETE FROM affiliate_payouts')
  await client.query('BEGIN'); await down({ db } as any); await client.query('COMMIT')
  assert.equal((await client.query('SELECT commission::integer FROM affiliate_referrals WHERE order_id = $1', ['OLD-PAID'])).rows[0].commission, 12345)
  console.log('PASS CPS migration preserves legacy approval and paid history, rejects destructive rollback and reverses an unused upgrade')
} finally {
  await client.end(); await (payload.db as any).pool?.end(); await payload.destroy()
  await admin.query('DROP DATABASE "' + name + '" WITH (FORCE)'); await admin.end()
}
