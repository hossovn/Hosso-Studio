import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
CREATE TYPE "public"."enum_site_releases_action" AS ENUM('publish', 'restore');
CREATE TYPE "public"."enum_site_settings_status" AS ENUM('draft', 'published');
CREATE TYPE "public"."enum__site_settings_v_version_footer_columns_kind" AS ENUM('about', 'menu', 'contact', 'social', 'text');
CREATE TYPE "public"."enum__site_settings_v_version_theme" AS ENUM('default', 'alt', 'auto');
CREATE TYPE "public"."enum__site_settings_v_version_tokens_default_font_body" AS ENUM('be-vietnam-pro', 'barlow', 'chakra-petch', 'jetbrains-mono');
CREATE TYPE "public"."enum__site_settings_v_version_tokens_default_font_heading" AS ENUM('be-vietnam-pro', 'barlow', 'chakra-petch', 'jetbrains-mono');
CREATE TYPE "public"."enum__site_settings_v_version_tokens_alt_font_body" AS ENUM('be-vietnam-pro', 'barlow', 'chakra-petch', 'jetbrains-mono');
CREATE TYPE "public"."enum__site_settings_v_version_tokens_alt_font_heading" AS ENUM('be-vietnam-pro', 'barlow', 'chakra-petch', 'jetbrains-mono');
CREATE TYPE "public"."enum__site_settings_v_version_tokens_auto_font_body" AS ENUM('be-vietnam-pro', 'barlow', 'chakra-petch', 'jetbrains-mono');
CREATE TYPE "public"."enum__site_settings_v_version_tokens_auto_font_heading" AS ENUM('be-vietnam-pro', 'barlow', 'chakra-petch', 'jetbrains-mono');
CREATE TYPE "public"."enum__site_settings_v_version_layout_logo_position" AS ENUM('left', 'center');
CREATE TYPE "public"."enum__site_settings_v_version_layout_nav_style" AS ENUM('bar', 'mega');
CREATE TYPE "public"."enum__site_settings_v_version_layout_bar_color" AS ENUM('accent', 'primary', 'dark', 'light');
CREATE TYPE "public"."enum__site_settings_v_version_layout_footer_style" AS ENUM('dark', 'light', 'accent');
CREATE TYPE "public"."enum__site_settings_v_version_status" AS ENUM('draft', 'published');
CREATE TYPE "public"."enum__site_settings_v_published_locale" AS ENUM('vi', 'en');
CREATE TYPE "public"."enum_site_areas_status" AS ENUM('draft', 'published');
CREATE TYPE "public"."enum__site_areas_v_version_status" AS ENUM('draft', 'published');
CREATE TYPE "public"."enum__site_areas_v_published_locale" AS ENUM('vi', 'en');
CREATE TABLE "site_releases" (
    "id" serial PRIMARY KEY NOT NULL,
    "title" varchar NOT NULL,
    "actor" varchar NOT NULL,
    "action" "enum_site_releases_action" NOT NULL,
    "source_release" varchar,
    "review_token" varchar NOT NULL,
    "before" jsonb NOT NULL,
    "after" jsonb NOT NULL,
    "summary" jsonb NOT NULL,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
CREATE TABLE "_site_settings_v_version_social" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" serial PRIMARY KEY NOT NULL,
    "href" varchar,
    "_uuid" varchar
  );
CREATE TABLE "_site_settings_v_version_social_locales" (
    "label" varchar,
    "id" serial PRIMARY KEY NOT NULL,
    "_locale" "_locales" NOT NULL,
    "_parent_id" integer NOT NULL
  );
CREATE TABLE "_site_settings_v_version_footer_columns" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "_locale" "_locales" NOT NULL,
    "id" serial PRIMARY KEY NOT NULL,
    "title" varchar,
    "kind" "enum__site_settings_v_version_footer_columns_kind" DEFAULT 'text',
    "body" varchar,
    "_uuid" varchar
  );
CREATE TABLE "_site_settings_v" (
    "id" serial PRIMARY KEY NOT NULL,
    "version_logo_id" integer,
    "version_favicon_id" integer,
    "version_show_search" boolean DEFAULT true,
    "version_contact_phone" varchar,
    "version_contact_email" varchar,
    "version_contact_zalo" varchar,
    "version_theme" "enum__site_settings_v_version_theme" DEFAULT 'default',
    "version_tokens_default_color_bg" varchar,
    "version_tokens_default_color_surface" varchar,
    "version_tokens_default_color_text" varchar,
    "version_tokens_default_color_muted" varchar,
    "version_tokens_default_color_primary" varchar,
    "version_tokens_default_color_onprimary" varchar,
    "version_tokens_default_color_border" varchar,
    "version_tokens_default_font_body" "enum__site_settings_v_version_tokens_default_font_body",
    "version_tokens_default_font_heading" "enum__site_settings_v_version_tokens_default_font_heading",
    "version_tokens_default_radius" varchar,
    "version_tokens_default_spacing" varchar,
    "version_tokens_alt_color_bg" varchar,
    "version_tokens_alt_color_surface" varchar,
    "version_tokens_alt_color_text" varchar,
    "version_tokens_alt_color_muted" varchar,
    "version_tokens_alt_color_primary" varchar,
    "version_tokens_alt_color_onprimary" varchar,
    "version_tokens_alt_color_border" varchar,
    "version_tokens_alt_font_body" "enum__site_settings_v_version_tokens_alt_font_body",
    "version_tokens_alt_font_heading" "enum__site_settings_v_version_tokens_alt_font_heading",
    "version_tokens_alt_radius" varchar,
    "version_tokens_alt_spacing" varchar,
    "version_tokens_auto_color_bg" varchar,
    "version_tokens_auto_color_surface" varchar,
    "version_tokens_auto_color_text" varchar,
    "version_tokens_auto_color_muted" varchar,
    "version_tokens_auto_color_primary" varchar,
    "version_tokens_auto_color_onprimary" varchar,
    "version_tokens_auto_color_border" varchar,
    "version_tokens_auto_color_accent" varchar,
    "version_tokens_auto_color_onaccent" varchar,
    "version_tokens_auto_color_dark" varchar,
    "version_tokens_auto_font_body" "enum__site_settings_v_version_tokens_auto_font_body",
    "version_tokens_auto_font_heading" "enum__site_settings_v_version_tokens_auto_font_heading",
    "version_tokens_auto_radius" varchar,
    "version_tokens_auto_spacing" varchar,
    "version_layout_logo_position" "enum__site_settings_v_version_layout_logo_position" DEFAULT 'left',
    "version_layout_nav_style" "enum__site_settings_v_version_layout_nav_style" DEFAULT 'bar',
    "version_layout_bar_color" "enum__site_settings_v_version_layout_bar_color" DEFAULT 'accent',
    "version_layout_sticky" boolean DEFAULT true,
    "version_layout_show_hotline" boolean DEFAULT true,
    "version_layout_footer_style" "enum__site_settings_v_version_layout_footer_style" DEFAULT 'dark',
    "version_notifications_to" varchar,
    "version_notifications_on_form" boolean DEFAULT true,
    "version_notifications_on_comment" boolean DEFAULT true,
    "version_comments_enabled" boolean DEFAULT true,
    "version_comments_auto_approve" boolean DEFAULT false,
    "version_maintenance_mode" boolean DEFAULT false,
    "version__status" "enum__site_settings_v_version_status" DEFAULT 'draft',
    "version_updated_at" timestamp(3) with time zone,
    "version_created_at" timestamp(3) with time zone,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "snapshot" boolean,
    "published_locale" "enum__site_settings_v_published_locale",
    "latest" boolean,
    "autosave" boolean
  );
CREATE TABLE "_site_settings_v_locales" (
    "version_site_name" varchar,
    "version_announcement" varchar,
    "version_contact_address" varchar,
    "version_header_menu" jsonb,
    "version_footer_menu" jsonb,
    "version_footer_text" varchar,
    "version_maintenance_message" varchar,
    "id" serial PRIMARY KEY NOT NULL,
    "_locale" "_locales" NOT NULL,
    "_parent_id" integer NOT NULL
  );
CREATE TABLE "_site_areas_v" (
    "id" serial PRIMARY KEY NOT NULL,
    "version__status" "enum__site_areas_v_version_status" DEFAULT 'draft',
    "version_updated_at" timestamp(3) with time zone,
    "version_created_at" timestamp(3) with time zone,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "snapshot" boolean,
    "published_locale" "enum__site_areas_v_published_locale",
    "latest" boolean,
    "autosave" boolean
  );
CREATE TABLE "_site_areas_v_locales" (
    "version_site_header" jsonb,
    "version_site_footer" jsonb,
    "version_before_header" jsonb,
    "version_after_header" jsonb,
    "version_before_footer" jsonb,
    "version_after_footer" jsonb,
    "version_post_sidebar" jsonb,
    "id" serial PRIMARY KEY NOT NULL,
    "_locale" "_locales" NOT NULL,
    "_parent_id" integer NOT NULL
  );
ALTER TABLE "site_settings_social" ALTER COLUMN "href" DROP NOT NULL;
ALTER TABLE "site_settings_social_locales" ALTER COLUMN "label" DROP NOT NULL;
ALTER TABLE "site_settings_footer_columns" ALTER COLUMN "kind" DROP NOT NULL;
ALTER TABLE "site_settings" ALTER COLUMN "theme" DROP NOT NULL;
ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "site_releases_id" integer;
ALTER TABLE "site_settings" ADD COLUMN "_status" "enum_site_settings_status" DEFAULT 'draft';
ALTER TABLE "site_areas" ADD COLUMN "_status" "enum_site_areas_status" DEFAULT 'draft';
ALTER TABLE "_site_settings_v_version_social" ADD CONSTRAINT "_site_settings_v_version_social_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_site_settings_v"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "_site_settings_v_version_social_locales" ADD CONSTRAINT "_site_settings_v_version_social_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_site_settings_v_version_social"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "_site_settings_v_version_footer_columns" ADD CONSTRAINT "_site_settings_v_version_footer_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_site_settings_v"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "_site_settings_v" ADD CONSTRAINT "_site_settings_v_version_logo_id_media_id_fk" FOREIGN KEY ("version_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "_site_settings_v" ADD CONSTRAINT "_site_settings_v_version_favicon_id_media_id_fk" FOREIGN KEY ("version_favicon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "_site_settings_v_locales" ADD CONSTRAINT "_site_settings_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_site_settings_v"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "_site_areas_v_locales" ADD CONSTRAINT "_site_areas_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_site_areas_v"("id") ON DELETE cascade ON UPDATE no action;
CREATE UNIQUE INDEX "site_releases_review_token_idx" ON "site_releases" USING btree ("review_token");
CREATE INDEX "site_releases_updated_at_idx" ON "site_releases" USING btree ("updated_at");
CREATE INDEX "site_releases_created_at_idx" ON "site_releases" USING btree ("created_at");
CREATE INDEX "_site_settings_v_version_social_order_idx" ON "_site_settings_v_version_social" USING btree ("_order");
CREATE INDEX "_site_settings_v_version_social_parent_id_idx" ON "_site_settings_v_version_social" USING btree ("_parent_id");
CREATE UNIQUE INDEX "_site_settings_v_version_social_locales_locale_parent_id_uni" ON "_site_settings_v_version_social_locales" USING btree ("_locale","_parent_id");
CREATE INDEX "_site_settings_v_version_social_locales_parent_id_idx" ON "_site_settings_v_version_social_locales" USING btree ("_parent_id");
CREATE INDEX "_site_settings_v_version_footer_columns_order_idx" ON "_site_settings_v_version_footer_columns" USING btree ("_order");
CREATE INDEX "_site_settings_v_version_footer_columns_parent_id_idx" ON "_site_settings_v_version_footer_columns" USING btree ("_parent_id");
CREATE INDEX "_site_settings_v_version_footer_columns_locale_idx" ON "_site_settings_v_version_footer_columns" USING btree ("_locale");
CREATE INDEX "_site_settings_v_version_version_logo_idx" ON "_site_settings_v" USING btree ("version_logo_id");
CREATE INDEX "_site_settings_v_version_version_favicon_idx" ON "_site_settings_v" USING btree ("version_favicon_id");
CREATE INDEX "_site_settings_v_version_version__status_idx" ON "_site_settings_v" USING btree ("version__status");
CREATE INDEX "_site_settings_v_created_at_idx" ON "_site_settings_v" USING btree ("created_at");
CREATE INDEX "_site_settings_v_updated_at_idx" ON "_site_settings_v" USING btree ("updated_at");
CREATE INDEX "_site_settings_v_snapshot_idx" ON "_site_settings_v" USING btree ("snapshot");
CREATE INDEX "_site_settings_v_published_locale_idx" ON "_site_settings_v" USING btree ("published_locale");
CREATE INDEX "_site_settings_v_latest_idx" ON "_site_settings_v" USING btree ("latest");
CREATE INDEX "_site_settings_v_autosave_idx" ON "_site_settings_v" USING btree ("autosave");
CREATE UNIQUE INDEX "_site_settings_v_locales_locale_parent_id_unique" ON "_site_settings_v_locales" USING btree ("_locale","_parent_id");
CREATE INDEX "_site_settings_v_locales_parent_id_idx" ON "_site_settings_v_locales" USING btree ("_parent_id");
CREATE INDEX "_site_areas_v_version_version__status_idx" ON "_site_areas_v" USING btree ("version__status");
CREATE INDEX "_site_areas_v_created_at_idx" ON "_site_areas_v" USING btree ("created_at");
CREATE INDEX "_site_areas_v_updated_at_idx" ON "_site_areas_v" USING btree ("updated_at");
CREATE INDEX "_site_areas_v_snapshot_idx" ON "_site_areas_v" USING btree ("snapshot");
CREATE INDEX "_site_areas_v_published_locale_idx" ON "_site_areas_v" USING btree ("published_locale");
CREATE INDEX "_site_areas_v_latest_idx" ON "_site_areas_v" USING btree ("latest");
CREATE INDEX "_site_areas_v_autosave_idx" ON "_site_areas_v" USING btree ("autosave");
CREATE UNIQUE INDEX "_site_areas_v_locales_locale_parent_id_unique" ON "_site_areas_v_locales" USING btree ("_locale","_parent_id");
CREATE INDEX "_site_areas_v_locales_parent_id_idx" ON "_site_areas_v_locales" USING btree ("_parent_id");
ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_site_releases_fk" FOREIGN KEY ("site_releases_id") REFERENCES "public"."site_releases"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "payload_locked_documents_rels_site_releases_id_idx" ON "payload_locked_documents_rels" USING btree ("site_releases_id");
CREATE INDEX "site_settings__status_idx" ON "site_settings" USING btree ("_status");
CREATE INDEX "site_areas__status_idx" ON "site_areas" USING btree ("_status");
UPDATE "site_settings" SET "_status" = 'published';
UPDATE "site_areas" SET "_status" = 'published';
`)
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  throw new Error('Site release history and drafts are forward-only. Restore a pre-upgrade backup to downgrade.')
}
