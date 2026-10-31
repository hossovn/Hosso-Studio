import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`ALTER TABLE "cross_sell_listings" ADD COLUMN IF NOT EXISTS "last_synced_at" timestamp(3) with time zone;
ALTER TABLE "cross_sell_listings" ADD COLUMN IF NOT EXISTS "next_sync_at" timestamp(3) with time zone;
ALTER TABLE "cross_sell_listings" ADD COLUMN IF NOT EXISTS "sync_error" varchar;
CREATE INDEX IF NOT EXISTS "cross_sell_listings_next_sync_at_idx" ON "cross_sell_listings" ("next_sync_at");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP INDEX IF EXISTS "cross_sell_listings_next_sync_at_idx";
ALTER TABLE "cross_sell_listings" DROP COLUMN IF EXISTS "last_synced_at", DROP COLUMN IF EXISTS "next_sync_at", DROP COLUMN IF EXISTS "sync_error";`)
}
