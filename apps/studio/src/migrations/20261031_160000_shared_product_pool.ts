import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`DO $$ BEGIN
  CREATE TYPE "public"."enum_shop_products_source" AS ENUM ('shop', 'wim', 'cross-sell');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE "shop_products" ADD COLUMN IF NOT EXISTS "source" "enum_shop_products_source" DEFAULT 'shop';
UPDATE "shop_products" SET "wim_id" = NULL WHERE "wim_id" = '';
DROP INDEX IF EXISTS "shop_products_wim_id_idx";
CREATE UNIQUE INDEX "shop_products_wim_id_idx" ON "shop_products" ("wim_id");
ALTER TABLE "shop_orders" ADD COLUMN IF NOT EXISTS "checkout_draft" jsonb;
ALTER TABLE "shop_orders" ADD COLUMN IF NOT EXISTS "checkout_complete" boolean DEFAULT false;
ALTER TABLE "shop_orders" ADD COLUMN IF NOT EXISTS "source_orders" jsonb;
ALTER TABLE "shop_orders" ADD COLUMN IF NOT EXISTS "branch_id" varchar;
ALTER TABLE "shop_orders_items" ADD COLUMN IF NOT EXISTS "source" varchar;
ALTER TABLE "shop_orders_items" ADD COLUMN IF NOT EXISTS "remote_id" varchar;
UPDATE "shop_orders" SET "checkout_complete" = true WHERE "checkout_draft" IS NULL;
UPDATE "shop_products" SET "source" = 'wim' WHERE "wim_id" IS NOT NULL AND "wim_id" <> '';
DO $$ BEGIN
  IF to_regclass('public.cross_sell_listings') IS NOT NULL THEN
    ALTER TABLE "shop_orders" ADD COLUMN IF NOT EXISTS "cross_sell_purchases" jsonb;
    UPDATE "shop_products" SET "source" = 'cross-sell'
      WHERE "id" IN (SELECT "product_id" FROM "cross_sell_listings" WHERE "product_id" IS NOT NULL);
    DROP INDEX IF EXISTS "cross_sell_transfers_local_order_idx";
    CREATE INDEX IF NOT EXISTS "cross_sell_transfers_local_order_idx" ON "cross_sell_transfers" ("local_order_id");
    CREATE UNIQUE INDEX IF NOT EXISTS "cross_sell_transfers_local_order_partner_idx" ON "cross_sell_transfers" ("local_order_id", "partner_id");
  END IF;
END $$;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Multiple supplier orders cannot safely be squeezed back into the old unique localOrder index.
  await db.execute(sql`DO $$ BEGIN
  IF to_regclass('public.cross_sell_transfers') IS NOT NULL AND EXISTS (
    SELECT "local_order_id" FROM "cross_sell_transfers" WHERE "local_order_id" IS NOT NULL GROUP BY "local_order_id" HAVING count(*) > 1
  ) THEN RAISE EXCEPTION 'Reconcile multiple supplier transfers before rolling back the shared Product pool'; END IF;
END $$;
DROP INDEX IF EXISTS "cross_sell_transfers_local_order_partner_idx";
DO $$ BEGIN IF to_regclass('public.cross_sell_transfers') IS NOT NULL THEN
  DROP INDEX IF EXISTS "cross_sell_transfers_local_order_idx";
  CREATE UNIQUE INDEX "cross_sell_transfers_local_order_idx" ON "cross_sell_transfers" ("local_order_id");
END IF; END $$;
ALTER TABLE "shop_orders" DROP COLUMN IF EXISTS "cross_sell_purchases", DROP COLUMN IF EXISTS "checkout_draft", DROP COLUMN IF EXISTS "checkout_complete", DROP COLUMN IF EXISTS "source_orders", DROP COLUMN IF EXISTS "branch_id";
ALTER TABLE "shop_orders_items" DROP COLUMN IF EXISTS "source", DROP COLUMN IF EXISTS "remote_id";
ALTER TABLE "shop_products" DROP COLUMN IF EXISTS "source";
DROP INDEX IF EXISTS "shop_products_wim_id_idx";
CREATE INDEX "shop_products_wim_id_idx" ON "shop_products" ("wim_id");
DROP TYPE IF EXISTS "public"."enum_shop_products_source";`)
}
