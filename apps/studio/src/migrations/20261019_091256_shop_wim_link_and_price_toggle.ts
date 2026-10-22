import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_shop_products_price_display" AS ENUM('default', 'show', 'hide');
  CREATE TABLE "shop_settings_policy_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  ALTER TABLE "shop_products" ADD COLUMN "price_display" "enum_shop_products_price_display" DEFAULT 'default';
  ALTER TABLE "shop_products" ADD COLUMN "display_name" varchar;
  ALTER TABLE "shop_products" ADD COLUMN "wim_id" varchar;
  ALTER TABLE "shop_settings" ADD COLUMN "show_prices" boolean DEFAULT true;
  ALTER TABLE "shop_settings" ADD COLUMN "price_hidden_label" varchar DEFAULT 'Liên hệ để biết giá';
  ALTER TABLE "shop_settings" ADD COLUMN "policy_title" varchar;
  ALTER TABLE "shop_settings_policy_items" ADD CONSTRAINT "shop_settings_policy_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."shop_settings"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "shop_settings_policy_items_order_idx" ON "shop_settings_policy_items" USING btree ("_order");
  CREATE INDEX "shop_settings_policy_items_parent_id_idx" ON "shop_settings_policy_items" USING btree ("_parent_id");
  CREATE INDEX "shop_products_wim_id_idx" ON "shop_products" USING btree ("wim_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "shop_settings_policy_items" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "shop_settings_policy_items" CASCADE;
  DROP INDEX "shop_products_wim_id_idx";
  ALTER TABLE "shop_products" DROP COLUMN "price_display";
  ALTER TABLE "shop_products" DROP COLUMN "display_name";
  ALTER TABLE "shop_products" DROP COLUMN "wim_id";
  ALTER TABLE "shop_settings" DROP COLUMN "show_prices";
  ALTER TABLE "shop_settings" DROP COLUMN "price_hidden_label";
  ALTER TABLE "shop_settings" DROP COLUMN "policy_title";
  DROP TYPE "public"."enum_shop_products_price_display";`)
}
