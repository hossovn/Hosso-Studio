import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'
export async function up({db}: MigrateUpArgs): Promise<void> {
 await db.execute(sql`CREATE TABLE "content_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar NOT NULL,
	"slug" varchar NOT NULL,
	"fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "content_entries" ALTER COLUMN "kind" SET DATA TYPE varchar;
ALTER TABLE "content_entries" ALTER COLUMN "kind" SET DEFAULT 'faq';
ALTER TABLE "content_entries" ADD COLUMN "cms" jsonb;
ALTER TABLE "users" ADD COLUMN "content_permissions" jsonb;
ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "content_types_id" integer;
CREATE UNIQUE INDEX "content_types_slug_idx" ON "content_types" USING btree ("slug");
CREATE INDEX "content_types_updated_at_idx" ON "content_types" USING btree ("updated_at");
CREATE INDEX "content_types_created_at_idx" ON "content_types" USING btree ("created_at");
ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_content_types_fk" FOREIGN KEY ("content_types_id") REFERENCES "public"."content_types"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "payload_locked_documents_rels_content_types_id_idx" ON "payload_locked_documents_rels" USING btree ("content_types_id");
DROP TYPE "public"."enum_content_entries_kind";`)
}
export async function down({db}: MigrateDownArgs): Promise<void> {
 await db.execute(sql`DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM "content_types") OR EXISTS (SELECT 1 FROM "content_entries" WHERE "kind" NOT IN ('faq','team','project','service'))
 THEN RAISE EXCEPTION 'Export and remove custom content before rolling back content models'; END IF;
 END $$;`)
 await db.execute(sql`CREATE TYPE "public"."enum_content_entries_kind" AS ENUM('faq', 'team', 'project', 'service');
ALTER TABLE "content_types" DISABLE ROW LEVEL SECURITY;
DROP TABLE "content_types" CASCADE;
ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_content_types_fk";

DROP INDEX "payload_locked_documents_rels_content_types_id_idx";
ALTER TABLE "content_entries" ALTER COLUMN "kind" SET DEFAULT 'faq'::"public"."enum_content_entries_kind";
ALTER TABLE "content_entries" ALTER COLUMN "kind" SET DATA TYPE "public"."enum_content_entries_kind" USING "kind"::"public"."enum_content_entries_kind";
ALTER TABLE "content_entries" DROP COLUMN "cms";
ALTER TABLE "users" DROP COLUMN "content_permissions";
ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "content_types_id";`)
}
