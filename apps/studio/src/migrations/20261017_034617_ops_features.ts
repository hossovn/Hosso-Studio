import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "redirects" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"from" varchar NOT NULL,
  	"to" varchar NOT NULL,
  	"permanent" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "edit_locks" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"user_id" varchar NOT NULL,
  	"email" varchar,
  	"expires_at" timestamp(3) with time zone NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "redirects_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "edit_locks_id" integer;
  ALTER TABLE "site_settings" ADD COLUMN "notifications_to" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "notifications_on_form" boolean DEFAULT true;
  ALTER TABLE "site_settings" ADD COLUMN "notifications_on_comment" boolean DEFAULT true;
  ALTER TABLE "site_areas_locales" ADD COLUMN "post_sidebar" jsonb;
  CREATE UNIQUE INDEX "redirects_from_idx" ON "redirects" USING btree ("from");
  CREATE INDEX "redirects_updated_at_idx" ON "redirects" USING btree ("updated_at");
  CREATE INDEX "redirects_created_at_idx" ON "redirects" USING btree ("created_at");
  CREATE UNIQUE INDEX "edit_locks_key_idx" ON "edit_locks" USING btree ("key");
  CREATE INDEX "edit_locks_updated_at_idx" ON "edit_locks" USING btree ("updated_at");
  CREATE INDEX "edit_locks_created_at_idx" ON "edit_locks" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_redirects_fk" FOREIGN KEY ("redirects_id") REFERENCES "public"."redirects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_edit_locks_fk" FOREIGN KEY ("edit_locks_id") REFERENCES "public"."edit_locks"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_redirects_id_idx" ON "payload_locked_documents_rels" USING btree ("redirects_id");
  CREATE INDEX "payload_locked_documents_rels_edit_locks_id_idx" ON "payload_locked_documents_rels" USING btree ("edit_locks_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "redirects" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "edit_locks" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "redirects" CASCADE;
  DROP TABLE "edit_locks" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_redirects_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_edit_locks_fk";
  
  DROP INDEX "payload_locked_documents_rels_redirects_id_idx";
  DROP INDEX "payload_locked_documents_rels_edit_locks_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "redirects_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "edit_locks_id";
  ALTER TABLE "site_settings" DROP COLUMN "notifications_to";
  ALTER TABLE "site_settings" DROP COLUMN "notifications_on_form";
  ALTER TABLE "site_settings" DROP COLUMN "notifications_on_comment";
  ALTER TABLE "site_areas_locales" DROP COLUMN "post_sidebar";`)
}
