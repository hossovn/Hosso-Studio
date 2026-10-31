import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`ALTER TABLE "shop_products" ADD COLUMN IF NOT EXISTS "short_description" varchar;
ALTER TABLE "shop_products" ADD COLUMN IF NOT EXISTS "supplier_content" jsonb;
ALTER TABLE "shop_products" ADD COLUMN IF NOT EXISTS "supplier_stock_unmanaged" boolean DEFAULT false;
CREATE TABLE IF NOT EXISTS "shop_products_additional_information" (
  "_order" integer NOT NULL, "_parent_id" integer NOT NULL REFERENCES "shop_products"("id") ON DELETE CASCADE,
  "id" varchar PRIMARY KEY NOT NULL, "name" varchar NOT NULL, "value" varchar NOT NULL
);
CREATE INDEX IF NOT EXISTS "shop_products_additional_information_order_idx" ON "shop_products_additional_information" ("_order");
CREATE INDEX IF NOT EXISTS "shop_products_additional_information_parent_id_idx" ON "shop_products_additional_information" ("_parent_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS "shop_products_additional_information";
ALTER TABLE "shop_products" DROP COLUMN IF EXISTS "short_description", DROP COLUMN IF EXISTS "supplier_content", DROP COLUMN IF EXISTS "supplier_stock_unmanaged";`)
}
