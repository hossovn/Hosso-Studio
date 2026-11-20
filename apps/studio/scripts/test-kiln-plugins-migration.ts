import assert from 'node:assert/strict'
import { getPayload } from 'payload'
import { sql } from '@payloadcms/db-postgres'
import config from '../src/payload.config'
import { migrations } from '../src/migrations'

// This check runs only in the fresh, loopback-bound database owned by the harness.
const database = new URL(process.env.HOSSO_DATABASE_URL || '')
assert.equal(database.hostname, '127.0.0.1')
assert.equal(database.pathname, '/kiln_runtime_test')
assert.ok(process.env.KILN_PLUGIN_TEST_CHECKPOINT)
const payload = await getPayload({ config })
try {
  assert.equal(payload.db.name, 'postgres')
  const adapter = payload.db as any
  const migration = migrations.find(m => m.name === '20261117_120000_managed_plugins')!
  assert.ok(migration, 'managed migration is registered')
  const db = adapter.drizzle
  const rows = async () => (await db.execute(sql`SELECT key, token FROM managed_plugin_state ORDER BY key`)).rows
  const before = await rows()
  assert.ok(before.some((row: any) => row.key === 'authority'))
  assert.ok(before.some((row: any) => row.key === 'secrets:payment'))
  const args = { db, payload } as any
  await migration.down(args)
  assert.deepEqual(await rows(), before, 'rollback lost authority or encrypted tenant settings')
  await migration.up(args)
  await migration.up(args)
  assert.deepEqual(await rows(), before, 'idempotent migration changed tenant data')
  await assert.rejects(() => db.execute(sql`INSERT INTO managed_plugin_state(key, token) VALUES ('authority', 'duplicate')`))
  console.log('PASS: registered managed migration, idempotent upgrade, retained rollback state and unique authority')
} finally { await payload.destroy() }
