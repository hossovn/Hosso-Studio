import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "site_settings_header_menu_children" CASCADE;
  DROP TABLE "site_settings_header_menu_children_locales" CASCADE;
  DROP TABLE "site_settings_header_menu" CASCADE;
  DROP TABLE "site_settings_header_menu_locales" CASCADE;
  DROP TABLE "site_settings_footer_menu" CASCADE;
  DROP TABLE "site_settings_footer_menu_locales" CASCADE;
  ALTER TABLE "site_settings_locales" ADD COLUMN "header_menu" jsonb;
  ALTER TABLE "site_settings_locales" ADD COLUMN "footer_menu" jsonb;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "site_settings_header_menu_children" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"href" varchar NOT NULL
  );
  
  CREATE TABLE "site_settings_header_menu_children_locales" (
  	"label" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "site_settings_header_menu" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"href" varchar NOT NULL
  );
  
  CREATE TABLE "site_settings_header_menu_locales" (
  	"label" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "site_settings_footer_menu" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"href" varchar NOT NULL
  );
  
  CREATE TABLE "site_settings_footer_menu_locales" (
  	"label" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  ALTER TABLE "site_settings_header_menu_children" ADD CONSTRAINT "site_settings_header_menu_children_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings_header_menu"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_header_menu_children_locales" ADD CONSTRAINT "site_settings_header_menu_children_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings_header_menu_children"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_header_menu" ADD CONSTRAINT "site_settings_header_menu_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_header_menu_locales" ADD CONSTRAINT "site_settings_header_menu_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings_header_menu"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_footer_menu" ADD CONSTRAINT "site_settings_footer_menu_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_footer_menu_locales" ADD CONSTRAINT "site_settings_footer_menu_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings_footer_menu"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "site_settings_header_menu_children_order_idx" ON "site_settings_header_menu_children" USING btree ("_order");
  CREATE INDEX "site_settings_header_menu_children_parent_id_idx" ON "site_settings_header_menu_children" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "site_settings_header_menu_children_locales_locale_parent_id_" ON "site_settings_header_menu_children_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "site_settings_header_menu_children_locales_parent_id_idx" ON "site_settings_header_menu_children_locales" USING btree ("_parent_id");
  CREATE INDEX "site_settings_header_menu_order_idx" ON "site_settings_header_menu" USING btree ("_order");
  CREATE INDEX "site_settings_header_menu_parent_id_idx" ON "site_settings_header_menu" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "site_settings_header_menu_locales_locale_parent_id_unique" ON "site_settings_header_menu_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "site_settings_header_menu_locales_parent_id_idx" ON "site_settings_header_menu_locales" USING btree ("_parent_id");
  CREATE INDEX "site_settings_footer_menu_order_idx" ON "site_settings_footer_menu" USING btree ("_order");
  CREATE INDEX "site_settings_footer_menu_parent_id_idx" ON "site_settings_footer_menu" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "site_settings_footer_menu_locales_locale_parent_id_unique" ON "site_settings_footer_menu_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "site_settings_footer_menu_locales_parent_id_idx" ON "site_settings_footer_menu_locales" USING btree ("_parent_id");
  ALTER TABLE "site_settings_locales" DROP COLUMN "header_menu";
  ALTER TABLE "site_settings_locales" DROP COLUMN "footer_menu";`)
}
