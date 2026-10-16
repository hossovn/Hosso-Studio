import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "site_settings_header_menu_children" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"href" varchar NOT NULL
  );
  
  CREATE TABLE "site_settings_header_menu" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"href" varchar NOT NULL
  );
  
  CREATE TABLE "site_settings_footer_menu" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"href" varchar NOT NULL
  );
  
  CREATE TABLE "site_settings_social" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"href" varchar NOT NULL
  );
  
  ALTER TABLE "site_settings" ADD COLUMN "logo_id" integer;
  ALTER TABLE "site_settings" ADD COLUMN "favicon_id" integer;
  ALTER TABLE "site_settings" ADD COLUMN "announcement" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "footer_text" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "contact_phone" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "contact_email" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "contact_address" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "contact_zalo" varchar;
  ALTER TABLE "site_settings_header_menu_children" ADD CONSTRAINT "site_settings_header_menu_children_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings_header_menu"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_header_menu" ADD CONSTRAINT "site_settings_header_menu_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_footer_menu" ADD CONSTRAINT "site_settings_footer_menu_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_social" ADD CONSTRAINT "site_settings_social_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "site_settings_header_menu_children_order_idx" ON "site_settings_header_menu_children" USING btree ("_order");
  CREATE INDEX "site_settings_header_menu_children_parent_id_idx" ON "site_settings_header_menu_children" USING btree ("_parent_id");
  CREATE INDEX "site_settings_header_menu_order_idx" ON "site_settings_header_menu" USING btree ("_order");
  CREATE INDEX "site_settings_header_menu_parent_id_idx" ON "site_settings_header_menu" USING btree ("_parent_id");
  CREATE INDEX "site_settings_footer_menu_order_idx" ON "site_settings_footer_menu" USING btree ("_order");
  CREATE INDEX "site_settings_footer_menu_parent_id_idx" ON "site_settings_footer_menu" USING btree ("_parent_id");
  CREATE INDEX "site_settings_social_order_idx" ON "site_settings_social" USING btree ("_order");
  CREATE INDEX "site_settings_social_parent_id_idx" ON "site_settings_social" USING btree ("_parent_id");
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_favicon_id_media_id_fk" FOREIGN KEY ("favicon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "site_settings_logo_idx" ON "site_settings" USING btree ("logo_id");
  CREATE INDEX "site_settings_favicon_idx" ON "site_settings" USING btree ("favicon_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site_settings_header_menu_children" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "site_settings_header_menu" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "site_settings_footer_menu" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "site_settings_social" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "site_settings_header_menu_children" CASCADE;
  DROP TABLE "site_settings_header_menu" CASCADE;
  DROP TABLE "site_settings_footer_menu" CASCADE;
  DROP TABLE "site_settings_social" CASCADE;
  ALTER TABLE "site_settings" DROP CONSTRAINT "site_settings_logo_id_media_id_fk";
  
  ALTER TABLE "site_settings" DROP CONSTRAINT "site_settings_favicon_id_media_id_fk";
  
  DROP INDEX "site_settings_logo_idx";
  DROP INDEX "site_settings_favicon_idx";
  ALTER TABLE "site_settings" DROP COLUMN "logo_id";
  ALTER TABLE "site_settings" DROP COLUMN "favicon_id";
  ALTER TABLE "site_settings" DROP COLUMN "announcement";
  ALTER TABLE "site_settings" DROP COLUMN "footer_text";
  ALTER TABLE "site_settings" DROP COLUMN "contact_phone";
  ALTER TABLE "site_settings" DROP COLUMN "contact_email";
  ALTER TABLE "site_settings" DROP COLUMN "contact_address";
  ALTER TABLE "site_settings" DROP COLUMN "contact_zalo";`)
}
