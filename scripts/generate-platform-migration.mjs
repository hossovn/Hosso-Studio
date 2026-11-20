import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { beforePlatform } from './lib/platform-schema.mjs'
const require = createRequire(new URL('../apps/studio/package.json', import.meta.url))
const sqlite = process.argv.includes('--sqlite')
process.env.HOSSO_DATABASE_URL = sqlite ? 'file::memory:' : 'postgres://unused/unused'
process.env.HOSSO_SECRET = 'platform-schema-generation-only'
process.env.HOSSO_SCRIPT = '1'
const { tsImport } = require('tsx/esm/api')
const { default: configPromise } = await tsImport('../apps/studio/src/payload.config.ts', { parentURL: import.meta.url, tsconfig: fileURLToPath(new URL('../apps/studio/tsconfig.json', import.meta.url)) })
const config = await configPromise
config.jobs.autoRun = []
const { getPayload } = require('payload')
const payload = await getPayload({ config, disableDBConnect: true, disableOnInit: true })
try {
  const api = require('drizzle-kit/api')
  const current = await (sqlite ? api.generateSQLiteDrizzleJson : api.generateDrizzleJson)(payload.db.schema)
  const previous = beforePlatform(current)
  const statements = await (sqlite ? api.generateSQLiteMigration : api.generateMigration)(previous, current)
  assert.ok(statements.length > 10)
  assert.ok(!statements.some((sql) => /DROP\s+(?:TABLE|COLUMN|TYPE)|TRUNCATE|DELETE\s+FROM/i.test(sql)), 'Expected an additive migration')
  await mkdir(new URL('../.tmp/', import.meta.url), { recursive: true })
  await writeFile(new URL(`../.tmp/platform-${sqlite ? 'sqlite' : 'pg'}-before.json`, import.meta.url), JSON.stringify(previous))
  await writeFile(new URL(`../.tmp/platform-${sqlite ? 'sqlite' : 'pg'}-after.json`, import.meta.url), JSON.stringify(current))
  if (sqlite) {
    await writeFile(new URL('./lib/platform-sqlite.sql', import.meta.url), statements.join('\n') + '\n')
  } else {
    const name = '20261117_090000_studio_platform'
    const source = "import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'\nimport { backfillEntrySearch } from '../lib/platform-search-backfill'\n\nexport async function up({ db }: MigrateUpArgs): Promise<void> {\n  await db.execute(sql`" + statements.join('\n') + "`)\n  await backfillEntrySearch(db)\n}\n\nexport async function down(_args: MigrateDownArgs): Promise<void> {\n  throw new Error('Platform leads, returns and analytics history are forward-only. Restore the pre-upgrade database backup to roll back.')\n}\n"
    await writeFile(new URL('../apps/studio/src/migrations/' + name + '.ts', import.meta.url), source)
    await writeFile(new URL('../apps/studio/src/migrations/' + name + '.json', import.meta.url), JSON.stringify(current, null, 2) + '\n')
  }
  console.log(`Generated additive platform ${sqlite ? 'SQLite' : 'PostgreSQL'} migration: ${statements.length} statements`)
} finally { await payload.destroy() }
process.exit(0)
