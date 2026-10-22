import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_site_settings_footer_columns_kind" AS ENUM('about', 'menu', 'contact', 'social', 'text');
  CREATE TYPE "public"."enum_site_settings_layout_logo_position" AS ENUM('left', 'center');
  CREATE TYPE "public"."enum_site_settings_layout_nav_style" AS ENUM('bar', 'mega');
  CREATE TYPE "public"."enum_site_settings_layout_bar_color" AS ENUM('accent', 'primary', 'dark', 'light');
  CREATE TYPE "public"."enum_site_settings_layout_footer_style" AS ENUM('dark', 'light', 'accent');
  CREATE TABLE "site_settings_footer_columns" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"kind" "enum_site_settings_footer_columns_kind" DEFAULT 'text' NOT NULL,
  	"body" varchar
  );
  
  ALTER TABLE "site_settings" ADD COLUMN "layout_logo_position" "enum_site_settings_layout_logo_position" DEFAULT 'left';
  ALTER TABLE "site_settings" ADD COLUMN "layout_nav_style" "enum_site_settings_layout_nav_style" DEFAULT 'bar';
  ALTER TABLE "site_settings" ADD COLUMN "layout_bar_color" "enum_site_settings_layout_bar_color" DEFAULT 'accent';
  ALTER TABLE "site_settings" ADD COLUMN "layout_sticky" boolean DEFAULT true;
  ALTER TABLE "site_settings" ADD COLUMN "layout_show_hotline" boolean DEFAULT true;
  ALTER TABLE "site_settings" ADD COLUMN "layout_footer_style" "enum_site_settings_layout_footer_style" DEFAULT 'dark';
  ALTER TABLE "site_settings_footer_columns" ADD CONSTRAINT "site_settings_footer_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "site_settings_footer_columns_order_idx" ON "site_settings_footer_columns" USING btree ("_order");
  CREATE INDEX "site_settings_footer_columns_parent_id_idx" ON "site_settings_footer_columns" USING btree ("_parent_id");
  CREATE INDEX "site_settings_footer_columns_locale_idx" ON "site_settings_footer_columns" USING btree ("_locale");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "site_settings_footer_columns" CASCADE;
  ALTER TABLE "site_settings" DROP COLUMN "layout_logo_position";
  ALTER TABLE "site_settings" DROP COLUMN "layout_nav_style";
  ALTER TABLE "site_settings" DROP COLUMN "layout_bar_color";
  ALTER TABLE "site_settings" DROP COLUMN "layout_sticky";
  ALTER TABLE "site_settings" DROP COLUMN "layout_show_hotline";
  ALTER TABLE "site_settings" DROP COLUMN "layout_footer_style";
  DROP TYPE "public"."enum_site_settings_footer_columns_kind";
  DROP TYPE "public"."enum_site_settings_layout_logo_position";
  DROP TYPE "public"."enum_site_settings_layout_nav_style";
  DROP TYPE "public"."enum_site_settings_layout_bar_color";
  DROP TYPE "public"."enum_site_settings_layout_footer_style";`)
}
