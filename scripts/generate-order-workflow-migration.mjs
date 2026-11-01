// Generate the additive workflow delta from the installed plugin schema without connecting a database.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { beforeOrderWorkflow } from './lib/order-workflow-schema.mjs'
const require = createRequire(new URL('../apps/studio/package.json', import.meta.url))
process.env.HOSSO_DATABASE_URL = 'postgres://unused/unused'
process.env.HOSSO_SECRET = 'workflow-schema-generation-only'
process.env.HOSSO_SCRIPT = '1'
process.env.HOSSO_LICENSE_ENFORCE = '0'
const { build } = createRequire(require.resolve('tsx/package.json'))('esbuild')
const schemaModule = new URL('../apps/studio/.tmp/order-workflow-schema.mjs', import.meta.url)
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
  const previous = beforeOrderWorkflow(current)
  const statements = await generateMigration(previous, current)
  assert.ok(statements.length > 10)
  assert.ok(!statements.some(s => /DROP\s+(?:TABLE|COLUMN|TYPE)|TRUNCATE|DELETE\s+FROM/i.test(s)))
  const name = '20261101_180000_order_workflow'
  const ddl = statements.join('\n') + '\nUPDATE payments SET opening_paid_amount = COALESCE(paid_amount, 0);'
  const source = "import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'\n\nexport async function up({ db }: MigrateUpArgs): Promise<void> {\n  await db.execute(sql`" + ddl + "`)\n}\n\nexport async function down(_args: MigrateDownArgs): Promise<void> {\n  throw new Error('Order commands and financial history are forward-only. Restore the pre-upgrade backup to roll back this release.')\n}\n"
  await writeFile(new URL('../apps/studio/src/migrations/' + name + '.ts', import.meta.url), source)
  await writeFile(new URL('../apps/studio/src/migrations/' + name + '.json', import.meta.url), JSON.stringify(current, null, 2) + '\n')
  await writeFile(new URL('../.tmp/order-workflow-schema-before.json', import.meta.url), JSON.stringify(previous))
  console.log('Generated additive order workflow migration:', statements.length, 'statements')
} finally { await payload.destroy() }
