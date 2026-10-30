import assert from 'node:assert/strict'
import fs from 'node:fs'
import Module, { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

const require = createRequire(new URL('../apps/studio/package.json', import.meta.url))
const { buildConfig, getPayload } = await import(pathToFileURL(require.resolve('payload')).href)
const { postgresAdapter, sql } = await import(pathToFileURL(require.resolve('@payloadcms/db-postgres')).href)
const { generateDrizzleJson, generateMigration } = require('drizzle-kit/api')
const { PgDialect } = require('drizzle-orm/pg-core')
const ts = require('typescript')
const payload = await getPayload({
  disableDBConnect: true, disableOnInit: true,
  config: buildConfig({
    secret: 'migration-schema-test-only',
    db: postgresAdapter({ pool: { connectionString: 'postgres://unused/unused' } }),
    collections: [], globals: [],
    jobs: { autoRun: [], tasks: [{ slug: 'probe', schedule: [{ cron: '* * * * *', queue: 'default' }], handler: async () => ({ output: {} }) }] },
  }),
})
const current = generateDrizzleJson({ payload_jobs_stats: payload.db.tables.payload_jobs_stats })
const expected = JSON.parse(JSON.stringify(current.tables['public.payload_jobs_stats']))
assert.ok(expected, 'Payload must generate its scheduler statistics table')
const dir = new URL('../apps/studio/src/migrations/', import.meta.url)
const snapshotName = fs.readdirSync(dir).filter(name => name.endsWith('.json')).sort().at(-1)
const snapshot = JSON.parse(fs.readFileSync(new URL(snapshotName, dir), 'utf8'))
assert.deepEqual(snapshot.tables['public.payload_jobs_stats'], expected, 'Migration schema is missing the statistics global required by the running Payload scheduler')
const name = '20261030_130000_payload_job_stats'
const file = new URL(name + '.ts', dir)
const mod = new Module(file.pathname)
mod.require = id => id === '@payloadcms/db-postgres' ? { sql } : require(id)
mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, file.pathname)
const executed = []
const db = { execute: async statement => executed.push(new PgDialect().sqlToQuery(statement).sql) }
await mod.exports.up({ db })
const generated = await generateMigration({ ...current, tables: {} }, current)
const normalize = value => value.replace(/\s+/g, ' ').trim()
assert.equal(normalize(executed.join('\n')), normalize(generated.join('\n').replace('CREATE TABLE ', 'CREATE TABLE IF NOT EXISTS ')))
assert.match(fs.readFileSync(new URL('index.ts', dir), 'utf8'), new RegExp(`name: ['"]${name}['"]`))
executed.length = 0
await mod.exports.down({ db })
assert.equal(normalize(executed.join('\n')), 'DROP TABLE IF EXISTS "payload_jobs_stats";')
console.log('Job stats migration matches Payload PostgreSQL schema, generated DDL, registry and rollback.')
