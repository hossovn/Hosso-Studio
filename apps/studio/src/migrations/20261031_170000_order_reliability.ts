import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE IF NOT EXISTS 'shop-order-recovery';
ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE IF NOT EXISTS 'shop-order-recovery';
ALTER TABLE shop_products ADD COLUMN IF NOT EXISTS stock_version numeric DEFAULT 0;
UPDATE shop_products SET stock_version = 0 WHERE stock_version IS NULL;
ALTER TABLE shop_orders ADD COLUMN IF NOT EXISTS checkout_state varchar,
 ADD COLUMN IF NOT EXISTS checkout_key varchar, ADD COLUMN IF NOT EXISTS lookup_token varchar,
 ADD COLUMN IF NOT EXISTS placed_hooks jsonb, ADD COLUMN IF NOT EXISTS hook_lease_until timestamptz,
 ADD COLUMN IF NOT EXISTS hooks_complete boolean DEFAULT false;
UPDATE shop_orders SET lookup_token = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '') WHERE lookup_token IS NULL OR lookup_token = '';
UPDATE shop_orders SET checkout_key = order_no WHERE checkout_key IS NULL;
UPDATE shop_orders SET hooks_complete = true WHERE checkout_state IS NULL AND (checkout_complete = true OR checkout_draft IS NULL);
UPDATE shop_orders SET checkout_state = CASE WHEN checkout_complete = true OR checkout_draft IS NULL THEN 'confirmed' ELSE 'legacy_review' END WHERE checkout_state IS NULL;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM shop_orders WHERE checkout_draft IS NOT NULL AND hooks_complete = false) THEN
 RAISE EXCEPTION 'Resolve pending checkout/events before rolling back order reliability'; END IF;
END $$;
ALTER TABLE shop_products DROP COLUMN IF EXISTS stock_version;
ALTER TABLE shop_orders DROP COLUMN IF EXISTS checkout_state, DROP COLUMN IF EXISTS checkout_key,
 DROP COLUMN IF EXISTS lookup_token, DROP COLUMN IF EXISTS placed_hooks,
 DROP COLUMN IF EXISTS hook_lease_until, DROP COLUMN IF EXISTS hooks_complete;`)
}
