import assert from 'node:assert/strict'
import fs from 'node:fs'
import Module, { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'

const require = createRequire(new URL('../apps/studio/package.json', import.meta.url))
const { tsImport } = require('tsx/esm/api')
process.env.HOSSO_DATABASE_URL = 'postgres://unused/unused'
process.env.HOSSO_SECRET = 'migration-schema-test-only'
process.env.HOSSO_SCRIPT = '1'
const { default: promise } = await tsImport('../apps/studio/src/payload.config.ts', {
  parentURL: import.meta.url, tsconfig: fileURLToPath(new URL('../apps/studio/tsconfig.json', import.meta.url)),
})
const config = await promise
config.jobs.autoRun = []
const { getPayload } = await import(pathToFileURL(require.resolve('payload')).href)
const payload = await getPayload({ config, disableDBConnect: true, disableOnInit: true })
try {
  const { generateDrizzleJson } = require('drizzle-kit/api')
  const schema = generateDrizzleJson(payload.db.schema)
  const snapshot = JSON.parse(fs.readFileSync(new URL('../apps/studio/src/migrations/20261030_150000_product_content.json', import.meta.url), 'utf8'))
  const products = schema.tables['public.shop_products']
  for (const [column, type] of [['short_description', 'varchar'], ['supplier_content', 'jsonb'], ['supplier_stock_unmanaged', 'boolean']]) assert.equal(products.columns[column].type, type)
  const info = schema.tables['public.shop_products_additional_information']
  assert.ok(info)
  assert.deepEqual(snapshot.tables['public.shop_products_additional_information'], JSON.parse(JSON.stringify(info)))
  for (const column of ['short_description', 'supplier_content', 'supplier_stock_unmanaged']) assert.deepEqual(snapshot.tables['public.shop_products'].columns[column], JSON.parse(JSON.stringify(products.columns[column])))
  assert.deepEqual(Object.keys(info.columns).sort(), ['_order', '_parent_id', 'id', 'name', 'value'].sort())
  assert.equal(Object.values(info.foreignKeys)[0].onDelete, 'cascade')
  const { sql } = await import(pathToFileURL(require.resolve('@payloadcms/db-postgres')).href)
  const { PgDialect } = require('drizzle-orm/pg-core')
  const ts = require('typescript')
  const name = '20261030_150000_product_content'
  const file = new URL('../apps/studio/src/migrations/' + name + '.ts', import.meta.url)
  const mod = new Module(fileURLToPath(file))
  mod.require = (id) => id === '@payloadcms/db-postgres' ? { sql } : require(id)
  mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, fileURLToPath(file))
  const statements = []
  await mod.exports.up({ db: { execute: async (s) => statements.push(new PgDialect().sqlToQuery(s).sql) } })
  const ddl = statements.join('\n')
  for (const name of ['short_description', 'supplier_content', 'supplier_stock_unmanaged', 'shop_products_additional_information']) assert.ok(ddl.includes('"' + name + '"'))
  assert.doesNotMatch(ddl, /\bDROP\b|\bDELETE\s+FROM\b|\bTRUNCATE\b/i)
  assert.ok(ddl.includes('REFERENCES "shop_products"("id") ON DELETE CASCADE'))
  assert.ok(fs.readFileSync(new URL('../apps/studio/src/migrations/index.ts', import.meta.url), 'utf8').includes(name))
  console.log('Product content migration agrees with Payload field types, child table and additive upgrade policy. No database was connected.')
} finally { await payload.destroy() }
