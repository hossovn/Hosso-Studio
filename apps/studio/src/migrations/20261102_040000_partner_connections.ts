import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`CREATE TYPE "public"."enum_cross_sell_partners_export_auth_method" AS ENUM('direct', 'env');
ALTER TABLE "cross_sell_partners" ALTER COLUMN "auth_method" DROP NOT NULL;
ALTER TABLE "cross_sell_partners" ADD COLUMN "import_enabled" boolean DEFAULT true;
ALTER TABLE "cross_sell_partners" ADD COLUMN "export_enabled" boolean DEFAULT false;
ALTER TABLE "cross_sell_partners" ADD COLUMN "export_auth_method" "enum_cross_sell_partners_export_auth_method" DEFAULT 'direct';
ALTER TABLE "cross_sell_partners" ADD COLUMN "export_token" varchar;
ALTER TABLE "cross_sell_partners" ADD COLUMN "export_token_env" varchar;
ALTER TABLE "cross_sell_partners" ADD COLUMN "site_key" varchar;
ALTER TABLE "cross_sell_partners" ADD COLUMN "connection_version" numeric;
ALTER TABLE "cross_sell_partners" ADD COLUMN "legacy_basic_ingress" boolean;
ALTER TABLE "cross_sell_partners" ADD COLUMN "merged_into_id" integer;
ALTER TABLE "cross_sell_partners" ADD COLUMN "export_identity_id" integer;
ALTER TABLE "cross_sell_partners" ADD CONSTRAINT "cross_sell_partners_merged_into_id_cross_sell_partners_id_fk" FOREIGN KEY ("merged_into_id") REFERENCES "public"."cross_sell_partners"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "cross_sell_partners" ADD CONSTRAINT "cross_sell_partners_export_identity_id_cross_sell_partners_id_fk" FOREIGN KEY ("export_identity_id") REFERENCES "public"."cross_sell_partners"("id") ON DELETE set null ON UPDATE no action;
CREATE UNIQUE INDEX "cross_sell_partners_site_key_idx" ON "cross_sell_partners" USING btree ("site_key");
CREATE INDEX "cross_sell_partners_merged_into_idx" ON "cross_sell_partners" USING btree ("merged_into_id");
CREATE INDEX "cross_sell_partners_export_identity_idx" ON "cross_sell_partners" USING btree ("export_identity_id");`)
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  throw new Error('Partner identities and order keys are forward-only. Restore the pre-upgrade backup to roll back this release.')
}
