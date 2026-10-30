import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`CREATE TABLE IF NOT EXISTS "payload_jobs_stats" (
    "id" serial PRIMARY KEY NOT NULL,
    "stats" jsonb,
    "updated_at" timestamp(3) with time zone,
    "created_at" timestamp(3) with time zone
  );`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS "payload_jobs_stats";`)
}
