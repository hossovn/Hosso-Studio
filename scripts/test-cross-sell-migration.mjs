import assert from 'node:assert/strict'
import fs from 'node:fs'
import Module, { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'

const require = createRequire(new URL('../apps/studio/package.json', import.meta.url))
const { tsImport } = require('tsx/esm/api')
process.env.HOSSO_DATABASE_URL = 'postgres://unused/unused'
process.env.HOSSO_SECRET = 'migration-schema-test-only'
process.env.HOSSO_SCRIPT = '1'
const { default: configPromise } = await tsImport('../apps/studio/src/payload.config.ts', {
  parentURL: import.meta.url, tsconfig: fileURLToPath(new URL('../apps/studio/tsconfig.json', import.meta.url)),
})
const config = await configPromise
config.jobs.autoRun = []
const { getPayload } = await import(pathToFileURL(require.resolve('payload')).href)
const payload = await getPayload({ config, disableDBConnect: true, disableOnInit: true })
try {
  const { generateDrizzleJson, generateMigration } = require('drizzle-kit/api')
  const current = generateDrizzleJson(payload.db.schema)
  assert.ok(current.tables['public.cross_sell_events'], 'Install the current cross-sell plugin before checking its migration')
  const dir = new URL('../apps/studio/src/migrations/', import.meta.url)
  const latest = '20261030_140000_cross_sell_tracking.json'
  const snapshot = JSON.parse(fs.readFileSync(new URL(latest, dir), 'utf8'))
  for (const [name, table] of Object.entries(current.tables)) {
    if (name.startsWith('public.cross_sell_') || ['public.payload_jobs', 'public.payload_jobs_log', 'public.payload_locked_documents_rels'].includes(name)) {
      assert.deepEqual(snapshot.tables[name], JSON.parse(JSON.stringify(table)), `Migration snapshot differs from installed Payload schema: ${name}`)
    }
  }
  for (const name of ['enum_payload_jobs_task_slug', 'enum_payload_jobs_log_task_slug', 'enum_cross_sell_partners_auth_method']) {
    assert.deepEqual(snapshot.enums['public.' + name], current.enums['public.' + name])
  }
  const previous = JSON.parse(fs.readFileSync(new URL('20261030_130000_payload_job_stats.json', dir), 'utf8'))
  // The earlier direct-credentials migration has no JSON snapshot.
  previous.enums['public.enum_cross_sell_partners_auth_method'] = snapshot.enums['public.enum_cross_sell_partners_auth_method']
  for (const name of ['auth_method', 'token', 'consumer_key', 'consumer_secret', 'credential_env', 'commission_pct']) {
    previous.tables['public.cross_sell_partners'].columns[name] = snapshot.tables['public.cross_sell_partners'].columns[name]
  }
  const generated = await generateMigration(previous, snapshot)
  const name = '20261030_140000_cross_sell_tracking'
  const file = new URL(name + '.ts', dir)
  const { sql } = await import(pathToFileURL(require.resolve('@payloadcms/db-postgres')).href)
  const { PgDialect } = require('drizzle-orm/pg-core')
  const ts = require('typescript')
  const mod = new Module(file.pathname)
  mod.require = id => id === '@payloadcms/db-postgres' ? { sql } : require(id)
  mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, file.pathname)
  const executed = []
  const db = { execute: async statement => executed.push(new PgDialect().sqlToQuery(statement).sql) }
  await mod.exports.up({ db })
  const normalize = value => value.replace(/\s+/g, ' ').trim()
  assert.equal(normalize(executed.join('\n')), normalize(generated.join('\n').replaceAll('ADD VALUE ', 'ADD VALUE IF NOT EXISTS ')))
  assert.doesNotMatch(executed.join('\n'), /\bDROP\b|\bDELETE\s+FROM\b|\bTRUNCATE\b/i, 'Upgrade must preserve existing records')
  assert.match(fs.readFileSync(new URL('index.ts', dir), 'utf8'), new RegExp(`name: ['"]${name}['"]`))
  previous.enums['public.enum_payload_jobs_task_slug'] = snapshot.enums['public.enum_payload_jobs_task_slug']
  previous.enums['public.enum_payload_jobs_log_task_slug'] = snapshot.enums['public.enum_payload_jobs_log_task_slug']
  const rollback = await generateMigration(snapshot, previous)
  executed.length = 0
  await mod.exports.down({ db })
  const statements = value => value.split(';').map(normalize).filter(Boolean).sort()
  const down = executed.join('\n')
  assert.deepEqual(statements(down), statements(rollback.join('\n')))
  assert.ok(down.indexOf('DROP CONSTRAINT') < down.indexOf('DROP TABLE'), 'Remove the inbound lock relationship before dropping its target')
  console.log('Tracking migration matches installed Payload schema and generated additive PostgreSQL DDL.')
} finally {
  await payload.destroy()
}
