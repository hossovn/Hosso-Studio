// Build an additive PostgreSQL delta against the previous complete release snapshot.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
const require = createRequire(new URL('../apps/studio/package.json', import.meta.url))
process.env.HOSSO_DATABASE_URL = 'postgres://unused/unused'
process.env.HOSSO_SECRET = 'partner-schema-generation-only'
process.env.HOSSO_SCRIPT = '1'
process.env.HOSSO_LICENSE_ENFORCE = '0'
const { build } = createRequire(require.resolve('tsx/package.json'))('esbuild')
const schemaModule = new URL('../apps/studio/.tmp/partner-connections-schema.mjs', import.meta.url)
await mkdir(new URL('./', schemaModule), { recursive: true })
await build({ entryPoints: [fileURLToPath(new URL('./order-workflow-schema.ts', import.meta.url))], outfile: fileURLToPath(schemaModule), bundle: true, platform: 'node', format: 'esm', packages: 'external', tsconfig: fileURLToPath(new URL('../apps/studio/tsconfig.json', import.meta.url)), plugins: [{ name: 'local-hosso', setup(build) { build.onResolve({ filter: /^@hosso\// }, args => ({ path: require.resolve(args.path) })) } }] })
let config = await import(schemaModule.href)
while (config && !config.secret && config.default) config = await config.default
await unlink(schemaModule)
const { getPayload } = await import(pathToFileURL(require.resolve('payload')).href)
const payload = await getPayload({ config, disableDBConnect: true, disableOnInit: true })
try {
  const { generateDrizzleJson, generateMigration } = createRequire(require.resolve('@payloadcms/db-postgres'))('drizzle-kit/api')
  const current = generateDrizzleJson(payload.db.schema)
  const previous = JSON.parse(await readFile(new URL('../apps/studio/src/migrations/20261101_180000_order_workflow.json', import.meta.url)))
  const statements = await generateMigration(previous, current)
  assert.ok(statements.length >= 10)
  assert.ok(!statements.some(statement => /DROP\s+(?:TABLE|COLUMN|TYPE)|TRUNCATE|DELETE\s+FROM/i.test(statement)))
  assert.ok(statements.every(statement => /cross_sell_partners/.test(statement)), 'Only partner connection schema may change')
  const name = '20261102_040000_partner_connections'
  const source = "import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'\n\nexport async function up({ db }: MigrateUpArgs): Promise<void> {\n  await db.execute(sql`" + statements.join('\n') + "`)\n}\n\nexport async function down(_args: MigrateDownArgs): Promise<void> {\n  throw new Error('Partner identities and order keys are forward-only. Restore the pre-upgrade backup to roll back this release.')\n}\n"
  await writeFile(new URL('../apps/studio/src/migrations/' + name + '.ts', import.meta.url), source)
  await writeFile(new URL('../apps/studio/src/migrations/' + name + '.json', import.meta.url), JSON.stringify(current, null, 2) + '\n')
  console.log('Generated additive partner connection migration:', statements.length, 'statements')
} finally { await payload.destroy() }
