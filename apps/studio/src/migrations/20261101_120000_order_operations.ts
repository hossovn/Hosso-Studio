import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`ALTER TABLE shop_orders
    ADD COLUMN IF NOT EXISTS processing_issue varchar,
    ADD COLUMN IF NOT EXISTS processing_until timestamptz,
    ADD COLUMN IF NOT EXISTS operations_version numeric DEFAULT 0,
    ADD COLUMN IF NOT EXISTS operation_history jsonb,
    ADD COLUMN IF NOT EXISTS cancellation_reason varchar;
  ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE IF NOT EXISTS 'notify-order-email';
  ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE IF NOT EXISTS 'notify-order-email';`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM payload_jobs WHERE task_slug = 'notify-order-email' AND completed_at IS NULL)
    THEN RAISE EXCEPTION 'Drain order notification jobs before rolling back'; END IF;
  END $$;
  ALTER TABLE shop_orders DROP COLUMN IF EXISTS processing_issue, DROP COLUMN IF EXISTS processing_until,
    DROP COLUMN IF EXISTS operations_version, DROP COLUMN IF EXISTS operation_history, DROP COLUMN IF EXISTS cancellation_reason;`)
}
