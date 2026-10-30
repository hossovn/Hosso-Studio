import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_cross_sell_partners_auth_method" AS ENUM('direct', 'env');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    ALTER TABLE "cross_sell_partners" 
      ADD COLUMN IF NOT EXISTS "auth_method" "enum_cross_sell_partners_auth_method" DEFAULT 'direct' NOT NULL,
      ADD COLUMN IF NOT EXISTS "token" varchar,
      ADD COLUMN IF NOT EXISTS "consumer_key" varchar,
      ADD COLUMN IF NOT EXISTS "consumer_secret" varchar;

    ALTER TABLE "cross_sell_partners" ALTER COLUMN "credential_env" DROP NOT NULL;
    ALTER TABLE "cross_sell_partners" ALTER COLUMN "commission_pct" DROP NOT NULL;
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "cross_sell_partners" 
      DROP COLUMN IF EXISTS "auth_method",
      DROP COLUMN IF EXISTS "token",
      DROP COLUMN IF EXISTS "consumer_key",
      DROP COLUMN IF EXISTS "consumer_secret";
  `)
}
