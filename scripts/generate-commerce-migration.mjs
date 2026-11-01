// Derive only the approved commerce delta; the last committed snapshot predates unrelated migrations.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { writeFile } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
const require = createRequire(new URL('../apps/studio/package.json', import.meta.url))
process.env.HOSSO_DATABASE_URL = 'postgres://unused/unused'
process.env.HOSSO_SECRET = 'commerce-migration-schema-only'
process.env.HOSSO_SCRIPT = '1'
const { tsImport } = require('tsx/esm/api')
const { default: config } = await tsImport('../apps/studio/src/payload.config.ts', { parentURL: import.meta.url, tsconfig: fileURLToPath(new URL('../apps/studio/tsconfig.json', import.meta.url)) })
const { getPayload } = await import(pathToFileURL(require.resolve('payload')).href)
const payload = await getPayload({ config, disableDBConnect: true, disableOnInit: true })
try {
  const { generateDrizzleJson, generateMigration } = require('drizzle-kit/api')
  const current = generateDrizzleJson(payload.db.schema)
  const previous = structuredClone(current)
  const tables = ['affiliate_settings', 'affiliate_withdrawals', 'garage_price_groups', 'shop_products_garage_prices']
  const added = {
    shop_products: ['affiliate_rate'], shop_categories: ['affiliate_rate'], shop_orders: ['affiliate_refunded_lines'],
    shop_orders_items: ['image', 'price_source', 'price_group'],
    customers: ['garage_status', 'garage_name', 'garage_tax_id', 'garage_address', 'garage_reason', 'price_group_id'],
    shipments: ['shipment_key', 'delivery_by', 'cod_collector', 'group_label'], shipping_settings: ['fee_mode'],
    cross_sell_partners: ['delivery_mode', 'cod_collector', 'shipping_fee', 'allow_retail_discounts'],
    payload_locked_documents_rels: ['affiliate_withdrawals_id', 'garage_price_groups_id'],
  }
  for (const table of tables) { assert.ok(previous.tables['public.' + table], table); delete previous.tables['public.' + table] }
  for (const [table, columns] of Object.entries(added)) {
    const t = previous.tables['public.' + table]; assert.ok(t, table)
    for (const column of columns) { assert.ok(t.columns[column], table + '.' + column); delete t.columns[column] }
    for (const [key, value] of Object.entries(t.indexes)) if (value.columns.some((c) => columns.includes(c.expression))) delete t.indexes[key]
    for (const [key, value] of Object.entries(t.foreignKeys)) if (value.columnsFrom.some((c) => columns.includes(c))) delete t.foreignKeys[key]
  }
  const enums = ['enum_customers_garage_status', 'enum_shipments_delivery_by', 'enum_shipments_cod_collector', 'enum_shipping_settings_fee_mode', 'enum_cross_sell_partners_delivery_mode', 'enum_cross_sell_partners_cod_collector', 'enum_affiliate_withdrawals_status']
  for (const name of enums) { assert.ok(previous.enums['public.' + name], name); delete previous.enums['public.' + name] }
  for (const name of ['enum_payload_jobs_log_task_slug', 'enum_payload_jobs_task_slug']) previous.enums['public.' + name].values = previous.enums['public.' + name].values.filter((v) => v !== 'affiliate-month-end')
  previous.tables['public.affiliates'].columns.commission_pct.default = 10
  previous.tables['public.shipments'].indexes.shipments_order_id_idx.isUnique = true
  const statements = await generateMigration(previous, current)
  assert.ok(statements.length > 10)
  assert.ok(!statements.some((s) => /DROP\s+(?:TABLE|COLUMN|TYPE)|TRUNCATE|DELETE\s+FROM/i.test(s)))
  const name = '20261101_060000_commerce_blocks'
  const ddl = statements.join('\n') + '\nUPDATE "shipments" SET "shipment_key" = "order_id" || \':store\' WHERE "shipment_key" IS NULL;'
  const source = "import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'\n\nexport async function up({ db }: MigrateUpArgs): Promise<void> {\n  await db.execute(sql`" + ddl + "`)\n}\n\nexport async function down(_args: MigrateDownArgs): Promise<void> {\n  throw new Error('Commerce history is forward-only. Restore the pre-upgrade backup to roll back this release.')\n}\n"
  await writeFile(new URL('../apps/studio/src/migrations/' + name + '.ts', import.meta.url), source)
  await writeFile(new URL('../apps/studio/src/migrations/' + name + '.json', import.meta.url), JSON.stringify(current, null, 2) + '\n')
  await writeFile(new URL('../.tmp/commerce-schema-before.json', import.meta.url), JSON.stringify(previous))
  console.log('Generated scoped commerce migration:', statements.length, 'statements. Legacy amounts and policy snapshots are preserved.')
} finally { await payload.destroy() }
