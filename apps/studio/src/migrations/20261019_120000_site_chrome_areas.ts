import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site_areas_locales" ADD COLUMN "site_header" jsonb;
  ALTER TABLE "site_areas_locales" ADD COLUMN "site_footer" jsonb;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site_areas_locales" DROP COLUMN "site_header";
  ALTER TABLE "site_areas_locales" DROP COLUMN "site_footer";`)
}
