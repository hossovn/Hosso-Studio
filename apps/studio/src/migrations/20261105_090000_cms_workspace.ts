import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'
export async function up({db}: MigrateUpArgs): Promise<void> {
 await db.execute(sql`CREATE TYPE "public"."enum_posts_writing_mode" AS ENUM('article', 'canvas');
CREATE TYPE "public"."enum_posts_article_template" AS ENUM('classic', 'reading');
CREATE TYPE "public"."enum__posts_v_version_writing_mode" AS ENUM('article', 'canvas');
CREATE TYPE "public"."enum__posts_v_version_article_template" AS ENUM('classic', 'reading');
CREATE TYPE "public"."enum_content_entries_kind" AS ENUM('faq', 'team', 'project', 'service');
CREATE TABLE "content_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar NOT NULL,
	"kind" "enum_content_entries_kind" DEFAULT 'faq' NOT NULL,
	"published" boolean DEFAULT false,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "content_entries_locales" (
	"title" varchar NOT NULL,
	"data" jsonb,
	"id" serial PRIMARY KEY NOT NULL,
	"_locale" "_locales" NOT NULL,
	"_parent_id" integer NOT NULL
);

ALTER TABLE "pages" ADD COLUMN "cms" jsonb;
ALTER TABLE "pages" ADD COLUMN "deleted_at" timestamp(3) with time zone;
ALTER TABLE "_pages_v" ADD COLUMN "version_cms" jsonb;
ALTER TABLE "_pages_v" ADD COLUMN "version_deleted_at" timestamp(3) with time zone;
ALTER TABLE "posts" ADD COLUMN "cms" jsonb;
ALTER TABLE "posts" ADD COLUMN "writing_mode" "enum_posts_writing_mode" DEFAULT 'canvas';
ALTER TABLE "posts" ADD COLUMN "article_template" "enum_posts_article_template" DEFAULT 'classic';
ALTER TABLE "posts" ADD COLUMN "deleted_at" timestamp(3) with time zone;
ALTER TABLE "posts_locales" ADD COLUMN "article_body" jsonb;
ALTER TABLE "_posts_v" ADD COLUMN "version_cms" jsonb;
ALTER TABLE "_posts_v" ADD COLUMN "version_writing_mode" "enum__posts_v_version_writing_mode" DEFAULT 'canvas';
ALTER TABLE "_posts_v" ADD COLUMN "version_article_template" "enum__posts_v_version_article_template" DEFAULT 'classic';
ALTER TABLE "_posts_v" ADD COLUMN "version_deleted_at" timestamp(3) with time zone;
ALTER TABLE "_posts_v_locales" ADD COLUMN "version_article_body" jsonb;
ALTER TABLE "media" ADD COLUMN "cms" jsonb;
ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "content_entries_id" integer;
ALTER TABLE "site_settings" ADD COLUMN "home_slug" varchar DEFAULT 'home';
ALTER TABLE "_site_settings_v" ADD COLUMN "version_home_slug" varchar DEFAULT 'home';
ALTER TABLE "content_entries_locales" ADD CONSTRAINT "content_entries_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."content_entries"("id") ON DELETE cascade ON UPDATE no action;
CREATE UNIQUE INDEX "content_entries_slug_idx" ON "content_entries" USING btree ("slug");
CREATE INDEX "content_entries_updated_at_idx" ON "content_entries" USING btree ("updated_at");
CREATE INDEX "content_entries_created_at_idx" ON "content_entries" USING btree ("created_at");
CREATE UNIQUE INDEX "content_entries_locales_locale_parent_id_unique" ON "content_entries_locales" USING btree ("_locale","_parent_id");
CREATE INDEX "content_entries_locales_parent_id_idx" ON "content_entries_locales" USING btree ("_parent_id");
ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_content_entries_fk" FOREIGN KEY ("content_entries_id") REFERENCES "public"."content_entries"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "pages_deleted_at_idx" ON "pages" USING btree ("deleted_at");
CREATE INDEX "_pages_v_version_version_deleted_at_idx" ON "_pages_v" USING btree ("version_deleted_at");
CREATE INDEX "posts_deleted_at_idx" ON "posts" USING btree ("deleted_at");
CREATE INDEX "_posts_v_version_version_deleted_at_idx" ON "_posts_v" USING btree ("version_deleted_at");
CREATE INDEX "payload_locked_documents_rels_content_entries_id_idx" ON "payload_locked_documents_rels" USING btree ("content_entries_id");`)
}
export async function down({db}: MigrateDownArgs): Promise<void> {
 await db.execute(sql`ALTER TABLE "content_entries" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "content_entries_locales" DISABLE ROW LEVEL SECURITY;
DROP TABLE "content_entries" CASCADE;
DROP TABLE "content_entries_locales" CASCADE;
ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_content_entries_fk";

DROP INDEX "pages_deleted_at_idx";
DROP INDEX "_pages_v_version_version_deleted_at_idx";
DROP INDEX "posts_deleted_at_idx";
DROP INDEX "_posts_v_version_version_deleted_at_idx";
DROP INDEX "payload_locked_documents_rels_content_entries_id_idx";
ALTER TABLE "pages" DROP COLUMN "cms";
ALTER TABLE "pages" DROP COLUMN "deleted_at";
ALTER TABLE "_pages_v" DROP COLUMN "version_cms";
ALTER TABLE "_pages_v" DROP COLUMN "version_deleted_at";
ALTER TABLE "posts" DROP COLUMN "cms";
ALTER TABLE "posts" DROP COLUMN "writing_mode";
ALTER TABLE "posts" DROP COLUMN "article_template";
ALTER TABLE "posts" DROP COLUMN "deleted_at";
ALTER TABLE "posts_locales" DROP COLUMN "article_body";
ALTER TABLE "_posts_v" DROP COLUMN "version_cms";
ALTER TABLE "_posts_v" DROP COLUMN "version_writing_mode";
ALTER TABLE "_posts_v" DROP COLUMN "version_article_template";
ALTER TABLE "_posts_v" DROP COLUMN "version_deleted_at";
ALTER TABLE "_posts_v_locales" DROP COLUMN "version_article_body";
ALTER TABLE "media" DROP COLUMN "cms";
ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "content_entries_id";
ALTER TABLE "site_settings" DROP COLUMN "home_slug";
ALTER TABLE "_site_settings_v" DROP COLUMN "version_home_slug";
DROP TYPE "public"."enum_posts_writing_mode";
DROP TYPE "public"."enum_posts_article_template";
DROP TYPE "public"."enum__posts_v_version_writing_mode";
DROP TYPE "public"."enum__posts_v_version_article_template";
DROP TYPE "public"."enum_content_entries_kind";`)
}
