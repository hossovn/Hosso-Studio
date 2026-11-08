import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Add the storage required by dynamic locales and live chat without changing existing content.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`CREATE TYPE "public"."enum_chat_sessions_status" AS ENUM('open', 'replied', 'closed');
CREATE TYPE "public"."enum_site_settings_site_locales_code" AS ENUM('vi', 'ko', 'en', 'ja', 'zh', 'fr', 'de', 'th');
CREATE TYPE "public"."enum_site_settings_locale_switcher_style" AS ENUM('code', 'pill-flag', 'dropdown-flag');
CREATE TYPE "public"."enum__site_settings_v_version_site_locales_code" AS ENUM('vi', 'ko', 'en', 'ja', 'zh', 'fr', 'de', 'th');
CREATE TYPE "public"."enum__site_settings_v_version_locale_switcher_style" AS ENUM('code', 'pill-flag', 'dropdown-flag');
ALTER TYPE "public"."_locales" ADD VALUE IF NOT EXISTS 'ko';
ALTER TYPE "public"."_locales" ADD VALUE IF NOT EXISTS 'ja';
ALTER TYPE "public"."_locales" ADD VALUE IF NOT EXISTS 'zh';
ALTER TYPE "public"."_locales" ADD VALUE IF NOT EXISTS 'fr';
ALTER TYPE "public"."_locales" ADD VALUE IF NOT EXISTS 'de';
ALTER TYPE "public"."_locales" ADD VALUE IF NOT EXISTS 'th';
ALTER TYPE "public"."enum__pages_v_published_locale" ADD VALUE IF NOT EXISTS 'ko';
ALTER TYPE "public"."enum__pages_v_published_locale" ADD VALUE IF NOT EXISTS 'ja';
ALTER TYPE "public"."enum__pages_v_published_locale" ADD VALUE IF NOT EXISTS 'zh';
ALTER TYPE "public"."enum__pages_v_published_locale" ADD VALUE IF NOT EXISTS 'fr';
ALTER TYPE "public"."enum__pages_v_published_locale" ADD VALUE IF NOT EXISTS 'de';
ALTER TYPE "public"."enum__pages_v_published_locale" ADD VALUE IF NOT EXISTS 'th';
ALTER TYPE "public"."enum__posts_v_published_locale" ADD VALUE IF NOT EXISTS 'ko';
ALTER TYPE "public"."enum__posts_v_published_locale" ADD VALUE IF NOT EXISTS 'ja';
ALTER TYPE "public"."enum__posts_v_published_locale" ADD VALUE IF NOT EXISTS 'zh';
ALTER TYPE "public"."enum__posts_v_published_locale" ADD VALUE IF NOT EXISTS 'fr';
ALTER TYPE "public"."enum__posts_v_published_locale" ADD VALUE IF NOT EXISTS 'de';
ALTER TYPE "public"."enum__posts_v_published_locale" ADD VALUE IF NOT EXISTS 'th';
ALTER TYPE "public"."enum__reusable_blocks_v_published_locale" ADD VALUE IF NOT EXISTS 'ko';
ALTER TYPE "public"."enum__reusable_blocks_v_published_locale" ADD VALUE IF NOT EXISTS 'ja';
ALTER TYPE "public"."enum__reusable_blocks_v_published_locale" ADD VALUE IF NOT EXISTS 'zh';
ALTER TYPE "public"."enum__reusable_blocks_v_published_locale" ADD VALUE IF NOT EXISTS 'fr';
ALTER TYPE "public"."enum__reusable_blocks_v_published_locale" ADD VALUE IF NOT EXISTS 'de';
ALTER TYPE "public"."enum__reusable_blocks_v_published_locale" ADD VALUE IF NOT EXISTS 'th';
ALTER TYPE "public"."enum__site_settings_v_published_locale" ADD VALUE IF NOT EXISTS 'ko';
ALTER TYPE "public"."enum__site_settings_v_published_locale" ADD VALUE IF NOT EXISTS 'ja';
ALTER TYPE "public"."enum__site_settings_v_published_locale" ADD VALUE IF NOT EXISTS 'zh';
ALTER TYPE "public"."enum__site_settings_v_published_locale" ADD VALUE IF NOT EXISTS 'fr';
ALTER TYPE "public"."enum__site_settings_v_published_locale" ADD VALUE IF NOT EXISTS 'de';
ALTER TYPE "public"."enum__site_settings_v_published_locale" ADD VALUE IF NOT EXISTS 'th';
ALTER TYPE "public"."enum__site_areas_v_published_locale" ADD VALUE IF NOT EXISTS 'ko';
ALTER TYPE "public"."enum__site_areas_v_published_locale" ADD VALUE IF NOT EXISTS 'ja';
ALTER TYPE "public"."enum__site_areas_v_published_locale" ADD VALUE IF NOT EXISTS 'zh';
ALTER TYPE "public"."enum__site_areas_v_published_locale" ADD VALUE IF NOT EXISTS 'fr';
ALTER TYPE "public"."enum__site_areas_v_published_locale" ADD VALUE IF NOT EXISTS 'de';
ALTER TYPE "public"."enum__site_areas_v_published_locale" ADD VALUE IF NOT EXISTS 'th';
CREATE TABLE "chat_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"visitor_name" varchar NOT NULL,
	"visitor_phone" varchar,
	"visitor_email" varchar,
	"locale" varchar DEFAULT 'vi',
	"page_path" varchar,
	"status" "enum_chat_sessions_status" DEFAULT 'open',
	"unread_by_staff" numeric DEFAULT 0,
	"unread_by_visitor" numeric DEFAULT 0,
	"last_message_at" timestamp(3) with time zone,
	"last_message_preview" varchar,
	"token_hash" varchar NOT NULL,
	"messages" jsonb DEFAULT '[]'::jsonb,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "site_settings_site_locales" (
	"_order" integer NOT NULL,
	"_parent_id" integer NOT NULL,
	"id" varchar PRIMARY KEY NOT NULL,
	"code" "enum_site_settings_site_locales_code",
	"label" varchar,
	"short_label" varchar
);

CREATE TABLE "_site_settings_v_version_site_locales" (
	"_order" integer NOT NULL,
	"_parent_id" integer NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"code" "enum__site_settings_v_version_site_locales_code",
	"label" varchar,
	"short_label" varchar,
	"_uuid" varchar
);

ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "chat_sessions_id" integer;
ALTER TABLE "site_settings" ADD COLUMN "locale_switcher_style" "enum_site_settings_locale_switcher_style" DEFAULT 'code';
ALTER TABLE "site_settings" ADD COLUMN "floating_dock_enabled" boolean DEFAULT true;
ALTER TABLE "site_settings" ADD COLUMN "zalo_qr_id" integer;
ALTER TABLE "site_settings" ADD COLUMN "live_chat_enabled" boolean DEFAULT false;
ALTER TABLE "site_settings" ADD COLUMN "live_chat_accent" varchar;
ALTER TABLE "site_settings_locales" ADD COLUMN "floating_call_label" varchar;
ALTER TABLE "site_settings_locales" ADD COLUMN "live_chat_title" varchar;
ALTER TABLE "site_settings_locales" ADD COLUMN "live_chat_subtitle" varchar;
ALTER TABLE "site_settings_locales" ADD COLUMN "live_chat_greeting" varchar;
ALTER TABLE "_site_settings_v" ADD COLUMN "version_locale_switcher_style" "enum__site_settings_v_version_locale_switcher_style" DEFAULT 'code';
ALTER TABLE "_site_settings_v" ADD COLUMN "version_floating_dock_enabled" boolean DEFAULT true;
ALTER TABLE "_site_settings_v" ADD COLUMN "version_zalo_qr_id" integer;
ALTER TABLE "_site_settings_v" ADD COLUMN "version_live_chat_enabled" boolean DEFAULT false;
ALTER TABLE "_site_settings_v" ADD COLUMN "version_live_chat_accent" varchar;
ALTER TABLE "_site_settings_v_locales" ADD COLUMN "version_floating_call_label" varchar;
ALTER TABLE "_site_settings_v_locales" ADD COLUMN "version_live_chat_title" varchar;
ALTER TABLE "_site_settings_v_locales" ADD COLUMN "version_live_chat_subtitle" varchar;
ALTER TABLE "_site_settings_v_locales" ADD COLUMN "version_live_chat_greeting" varchar;
ALTER TABLE "site_settings_site_locales" ADD CONSTRAINT "site_settings_site_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "_site_settings_v_version_site_locales" ADD CONSTRAINT "_site_settings_v_version_site_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_site_settings_v"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "chat_sessions_status_idx" ON "chat_sessions" USING btree ("status");
CREATE INDEX "chat_sessions_unread_by_staff_idx" ON "chat_sessions" USING btree ("unread_by_staff");
CREATE INDEX "chat_sessions_last_message_at_idx" ON "chat_sessions" USING btree ("last_message_at");
CREATE INDEX "chat_sessions_token_hash_idx" ON "chat_sessions" USING btree ("token_hash");
CREATE INDEX "chat_sessions_updated_at_idx" ON "chat_sessions" USING btree ("updated_at");
CREATE INDEX "chat_sessions_created_at_idx" ON "chat_sessions" USING btree ("created_at");
CREATE INDEX "site_settings_site_locales_order_idx" ON "site_settings_site_locales" USING btree ("_order");
CREATE INDEX "site_settings_site_locales_parent_id_idx" ON "site_settings_site_locales" USING btree ("_parent_id");
CREATE INDEX "_site_settings_v_version_site_locales_order_idx" ON "_site_settings_v_version_site_locales" USING btree ("_order");
CREATE INDEX "_site_settings_v_version_site_locales_parent_id_idx" ON "_site_settings_v_version_site_locales" USING btree ("_parent_id");
ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_chat_sessions_fk" FOREIGN KEY ("chat_sessions_id") REFERENCES "public"."chat_sessions"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_zalo_qr_id_media_id_fk" FOREIGN KEY ("zalo_qr_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "_site_settings_v" ADD CONSTRAINT "_site_settings_v_version_zalo_qr_id_media_id_fk" FOREIGN KEY ("version_zalo_qr_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
CREATE INDEX "payload_locked_documents_rels_chat_sessions_id_idx" ON "payload_locked_documents_rels" USING btree ("chat_sessions_id");
CREATE INDEX "site_settings_zalo_qr_idx" ON "site_settings" USING btree ("zalo_qr_id");
CREATE INDEX "_site_settings_v_version_version_zalo_qr_idx" ON "_site_settings_v" USING btree ("version_zalo_qr_id");`)
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  throw new Error('Live chat history and localized content are forward-only. Restore the pre-upgrade backup to roll back this migration.')
}
