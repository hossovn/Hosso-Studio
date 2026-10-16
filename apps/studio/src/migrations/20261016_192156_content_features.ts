import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_posts_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__posts_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_site_settings_tokens_shop_font_body" AS ENUM('be-vietnam-pro', 'barlow', 'jetbrains-mono');
  CREATE TYPE "public"."enum_site_settings_tokens_shop_font_heading" AS ENUM('be-vietnam-pro', 'barlow', 'jetbrains-mono');
  ALTER TYPE "public"."enum_site_settings_theme" ADD VALUE 'shop';
  CREATE TABLE "posts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"excerpt" varchar,
  	"cover_id" integer,
  	"published_at" timestamp(3) with time zone,
  	"content" jsonb,
  	"seo_title" varchar,
  	"seo_image_id" integer,
  	"seo_noindex" boolean,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_posts_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_posts_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_excerpt" varchar,
  	"version_cover_id" integer,
  	"version_published_at" timestamp(3) with time zone,
  	"version_content" jsonb,
  	"version_seo_title" varchar,
  	"version_seo_image_id" integer,
  	"version_seo_noindex" boolean,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__posts_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  ALTER TABLE "pages" ADD COLUMN "seo_title" varchar;
  ALTER TABLE "pages" ADD COLUMN "seo_image_id" integer;
  ALTER TABLE "pages" ADD COLUMN "seo_noindex" boolean;
  ALTER TABLE "_pages_v" ADD COLUMN "version_seo_title" varchar;
  ALTER TABLE "_pages_v" ADD COLUMN "version_seo_image_id" integer;
  ALTER TABLE "_pages_v" ADD COLUMN "version_seo_noindex" boolean;
  ALTER TABLE "_pages_v" ADD COLUMN "autosave" boolean;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "posts_id" integer;
  ALTER TABLE "site_settings" ADD COLUMN "show_search" boolean DEFAULT true;
  ALTER TABLE "site_settings" ADD COLUMN "tokens_shop_color_bg" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "tokens_shop_color_surface" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "tokens_shop_color_text" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "tokens_shop_color_muted" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "tokens_shop_color_primary" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "tokens_shop_color_onprimary" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "tokens_shop_color_border" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "tokens_shop_color_accent" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "tokens_shop_color_onaccent" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "tokens_shop_color_dark" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "tokens_shop_font_body" "enum_site_settings_tokens_shop_font_body";
  ALTER TABLE "site_settings" ADD COLUMN "tokens_shop_font_heading" "enum_site_settings_tokens_shop_font_heading";
  ALTER TABLE "site_settings" ADD COLUMN "tokens_shop_radius" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "tokens_shop_spacing" varchar;
  ALTER TABLE "posts" ADD CONSTRAINT "posts_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts" ADD CONSTRAINT "posts_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_parent_id_posts_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_version_cover_id_media_id_fk" FOREIGN KEY ("version_cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_version_seo_image_id_media_id_fk" FOREIGN KEY ("version_seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE UNIQUE INDEX "posts_slug_idx" ON "posts" USING btree ("slug");
  CREATE INDEX "posts_cover_idx" ON "posts" USING btree ("cover_id");
  CREATE INDEX "posts_seo_seo_image_idx" ON "posts" USING btree ("seo_image_id");
  CREATE INDEX "posts_updated_at_idx" ON "posts" USING btree ("updated_at");
  CREATE INDEX "posts_created_at_idx" ON "posts" USING btree ("created_at");
  CREATE INDEX "posts__status_idx" ON "posts" USING btree ("_status");
  CREATE INDEX "_posts_v_parent_idx" ON "_posts_v" USING btree ("parent_id");
  CREATE INDEX "_posts_v_version_version_slug_idx" ON "_posts_v" USING btree ("version_slug");
  CREATE INDEX "_posts_v_version_version_cover_idx" ON "_posts_v" USING btree ("version_cover_id");
  CREATE INDEX "_posts_v_version_seo_version_seo_image_idx" ON "_posts_v" USING btree ("version_seo_image_id");
  CREATE INDEX "_posts_v_version_version_updated_at_idx" ON "_posts_v" USING btree ("version_updated_at");
  CREATE INDEX "_posts_v_version_version_created_at_idx" ON "_posts_v" USING btree ("version_created_at");
  CREATE INDEX "_posts_v_version_version__status_idx" ON "_posts_v" USING btree ("version__status");
  CREATE INDEX "_posts_v_created_at_idx" ON "_posts_v" USING btree ("created_at");
  CREATE INDEX "_posts_v_updated_at_idx" ON "_posts_v" USING btree ("updated_at");
  CREATE INDEX "_posts_v_latest_idx" ON "_posts_v" USING btree ("latest");
  CREATE INDEX "_posts_v_autosave_idx" ON "_posts_v" USING btree ("autosave");
  ALTER TABLE "pages" ADD CONSTRAINT "pages_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_version_seo_image_id_media_id_fk" FOREIGN KEY ("version_seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_seo_seo_image_idx" ON "pages" USING btree ("seo_image_id");
  CREATE INDEX "_pages_v_version_seo_version_seo_image_idx" ON "_pages_v" USING btree ("version_seo_image_id");
  CREATE INDEX "_pages_v_autosave_idx" ON "_pages_v" USING btree ("autosave");
  CREATE INDEX "payload_locked_documents_rels_posts_id_idx" ON "payload_locked_documents_rels" USING btree ("posts_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "posts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "posts" CASCADE;
  DROP TABLE "_posts_v" CASCADE;
  ALTER TABLE "pages" DROP CONSTRAINT "pages_seo_image_id_media_id_fk";
  
  ALTER TABLE "_pages_v" DROP CONSTRAINT "_pages_v_version_seo_image_id_media_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_posts_fk";
  
  ALTER TABLE "site_settings" ALTER COLUMN "theme" SET DATA TYPE text;
  ALTER TABLE "site_settings" ALTER COLUMN "theme" SET DEFAULT 'default'::text;
  DROP TYPE "public"."enum_site_settings_theme";
  CREATE TYPE "public"."enum_site_settings_theme" AS ENUM('default', 'alt');
  ALTER TABLE "site_settings" ALTER COLUMN "theme" SET DEFAULT 'default'::"public"."enum_site_settings_theme";
  ALTER TABLE "site_settings" ALTER COLUMN "theme" SET DATA TYPE "public"."enum_site_settings_theme" USING "theme"::"public"."enum_site_settings_theme";
  DROP INDEX "pages_seo_seo_image_idx";
  DROP INDEX "_pages_v_version_seo_version_seo_image_idx";
  DROP INDEX "_pages_v_autosave_idx";
  DROP INDEX "payload_locked_documents_rels_posts_id_idx";
  ALTER TABLE "pages" DROP COLUMN "seo_title";
  ALTER TABLE "pages" DROP COLUMN "seo_image_id";
  ALTER TABLE "pages" DROP COLUMN "seo_noindex";
  ALTER TABLE "_pages_v" DROP COLUMN "version_seo_title";
  ALTER TABLE "_pages_v" DROP COLUMN "version_seo_image_id";
  ALTER TABLE "_pages_v" DROP COLUMN "version_seo_noindex";
  ALTER TABLE "_pages_v" DROP COLUMN "autosave";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "posts_id";
  ALTER TABLE "site_settings" DROP COLUMN "show_search";
  ALTER TABLE "site_settings" DROP COLUMN "tokens_shop_color_bg";
  ALTER TABLE "site_settings" DROP COLUMN "tokens_shop_color_surface";
  ALTER TABLE "site_settings" DROP COLUMN "tokens_shop_color_text";
  ALTER TABLE "site_settings" DROP COLUMN "tokens_shop_color_muted";
  ALTER TABLE "site_settings" DROP COLUMN "tokens_shop_color_primary";
  ALTER TABLE "site_settings" DROP COLUMN "tokens_shop_color_onprimary";
  ALTER TABLE "site_settings" DROP COLUMN "tokens_shop_color_border";
  ALTER TABLE "site_settings" DROP COLUMN "tokens_shop_color_accent";
  ALTER TABLE "site_settings" DROP COLUMN "tokens_shop_color_onaccent";
  ALTER TABLE "site_settings" DROP COLUMN "tokens_shop_color_dark";
  ALTER TABLE "site_settings" DROP COLUMN "tokens_shop_font_body";
  ALTER TABLE "site_settings" DROP COLUMN "tokens_shop_font_heading";
  ALTER TABLE "site_settings" DROP COLUMN "tokens_shop_radius";
  ALTER TABLE "site_settings" DROP COLUMN "tokens_shop_spacing";
  DROP TYPE "public"."enum_posts_status";
  DROP TYPE "public"."enum__posts_v_version_status";
  DROP TYPE "public"."enum_site_settings_tokens_shop_font_body";
  DROP TYPE "public"."enum_site_settings_tokens_shop_font_heading";`)
}
