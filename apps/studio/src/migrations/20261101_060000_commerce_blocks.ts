import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`CREATE TYPE "public"."enum_affiliate_withdrawals_status" AS ENUM('pending', 'approved', 'rejected', 'paid');
CREATE TYPE "public"."enum_shipments_delivery_by" AS ENUM('store', 'partner');
CREATE TYPE "public"."enum_shipments_cod_collector" AS ENUM('store', 'partner');
CREATE TYPE "public"."enum_customers_garage_status" AS ENUM('retail', 'pending', 'approved', 'rejected', 'suspended');
CREATE TYPE "public"."enum_cross_sell_partners_delivery_mode" AS ENUM('consolidated', 'direct');
CREATE TYPE "public"."enum_cross_sell_partners_cod_collector" AS ENUM('store', 'partner');
CREATE TYPE "public"."enum_shipping_settings_fee_mode" AS ENUM('order', 'shipment');
ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE 'affiliate-month-end' BEFORE 'cross-sell-sync';
ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'affiliate-month-end' BEFORE 'cross-sell-sync';
CREATE TABLE "shop_products_garage_prices" (
	"_order" integer NOT NULL,
	"_parent_id" integer NOT NULL,
	"id" varchar PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"variant_id" varchar,
	"override_enabled" boolean DEFAULT false,
	"price" numeric NOT NULL
);

CREATE TABLE "affiliate_withdrawals" (
	"id" serial PRIMARY KEY NOT NULL,
	"affiliate_id" integer NOT NULL,
	"active_key" varchar,
	"amount" numeric,
	"status" "enum_affiliate_withdrawals_status" DEFAULT 'pending' NOT NULL,
	"commissions" jsonb,
	"bank_info" varchar NOT NULL,
	"reason" varchar,
	"payout_id" integer,
	"reviewed_at" timestamp(3) with time zone,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "garage_price_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"active" boolean DEFAULT true,
	"wim_price_list_id" varchar,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "affiliate_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"default_rate" numeric DEFAULT 15,
	"minimum_withdrawal" numeric DEFAULT 100000,
	"allow_off_cycle" boolean DEFAULT true,
	"time_zone" varchar DEFAULT 'Asia/Ho_Chi_Minh',
	"updated_at" timestamp(3) with time zone,
	"created_at" timestamp(3) with time zone
);

DROP INDEX "shipments_order_id_idx";
ALTER TABLE "affiliates" ALTER COLUMN "commission_pct" DROP DEFAULT;
ALTER TABLE "shop_categories" ADD COLUMN "affiliate_rate" numeric;
ALTER TABLE "shop_products" ADD COLUMN "affiliate_rate" numeric;
ALTER TABLE "shop_orders_items" ADD COLUMN "image" varchar;
ALTER TABLE "shop_orders_items" ADD COLUMN "price_source" varchar;
ALTER TABLE "shop_orders_items" ADD COLUMN "price_group" varchar;
ALTER TABLE "shop_orders" ADD COLUMN "affiliate_refunded_lines" jsonb;
ALTER TABLE "shipments" ADD COLUMN "shipment_key" varchar;
ALTER TABLE "shipments" ADD COLUMN "delivery_by" "enum_shipments_delivery_by" DEFAULT 'store';
ALTER TABLE "shipments" ADD COLUMN "cod_collector" "enum_shipments_cod_collector" DEFAULT 'store';
ALTER TABLE "shipments" ADD COLUMN "group_label" varchar;
ALTER TABLE "customers" ADD COLUMN "garage_status" "enum_customers_garage_status" DEFAULT 'retail';
ALTER TABLE "customers" ADD COLUMN "garage_name" varchar;
ALTER TABLE "customers" ADD COLUMN "garage_tax_id" varchar;
ALTER TABLE "customers" ADD COLUMN "garage_address" varchar;
ALTER TABLE "customers" ADD COLUMN "garage_reason" varchar;
ALTER TABLE "customers" ADD COLUMN "price_group_id" integer;
ALTER TABLE "cross_sell_partners" ADD COLUMN "delivery_mode" "enum_cross_sell_partners_delivery_mode" DEFAULT 'consolidated';
ALTER TABLE "cross_sell_partners" ADD COLUMN "cod_collector" "enum_cross_sell_partners_cod_collector" DEFAULT 'store';
ALTER TABLE "cross_sell_partners" ADD COLUMN "shipping_fee" numeric DEFAULT 0;
ALTER TABLE "cross_sell_partners" ADD COLUMN "allow_retail_discounts" boolean DEFAULT false;
ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "affiliate_withdrawals_id" integer;
ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "garage_price_groups_id" integer;
ALTER TABLE "shipping_settings" ADD COLUMN "fee_mode" "enum_shipping_settings_fee_mode" DEFAULT 'order';
ALTER TABLE "shop_products_garage_prices" ADD CONSTRAINT "shop_products_garage_prices_group_id_garage_price_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."garage_price_groups"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "shop_products_garage_prices" ADD CONSTRAINT "shop_products_garage_prices_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."shop_products"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "affiliate_withdrawals" ADD CONSTRAINT "affiliate_withdrawals_affiliate_id_affiliates_id_fk" FOREIGN KEY ("affiliate_id") REFERENCES "public"."affiliates"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "affiliate_withdrawals" ADD CONSTRAINT "affiliate_withdrawals_payout_id_affiliate_payouts_id_fk" FOREIGN KEY ("payout_id") REFERENCES "public"."affiliate_payouts"("id") ON DELETE set null ON UPDATE no action;
CREATE INDEX "shop_products_garage_prices_order_idx" ON "shop_products_garage_prices" USING btree ("_order");
CREATE INDEX "shop_products_garage_prices_parent_id_idx" ON "shop_products_garage_prices" USING btree ("_parent_id");
CREATE INDEX "shop_products_garage_prices_group_idx" ON "shop_products_garage_prices" USING btree ("group_id");
CREATE INDEX "affiliate_withdrawals_affiliate_idx" ON "affiliate_withdrawals" USING btree ("affiliate_id");
CREATE UNIQUE INDEX "affiliate_withdrawals_active_key_idx" ON "affiliate_withdrawals" USING btree ("active_key");
CREATE INDEX "affiliate_withdrawals_payout_idx" ON "affiliate_withdrawals" USING btree ("payout_id");
CREATE INDEX "affiliate_withdrawals_updated_at_idx" ON "affiliate_withdrawals" USING btree ("updated_at");
CREATE INDEX "affiliate_withdrawals_created_at_idx" ON "affiliate_withdrawals" USING btree ("created_at");
CREATE INDEX "garage_price_groups_updated_at_idx" ON "garage_price_groups" USING btree ("updated_at");
CREATE INDEX "garage_price_groups_created_at_idx" ON "garage_price_groups" USING btree ("created_at");
ALTER TABLE "customers" ADD CONSTRAINT "customers_price_group_id_garage_price_groups_id_fk" FOREIGN KEY ("price_group_id") REFERENCES "public"."garage_price_groups"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_affiliate_withdrawals_fk" FOREIGN KEY ("affiliate_withdrawals_id") REFERENCES "public"."affiliate_withdrawals"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_garage_price_groups_fk" FOREIGN KEY ("garage_price_groups_id") REFERENCES "public"."garage_price_groups"("id") ON DELETE cascade ON UPDATE no action;
CREATE UNIQUE INDEX "shipments_shipment_key_idx" ON "shipments" USING btree ("shipment_key");
CREATE INDEX "customers_price_group_idx" ON "customers" USING btree ("price_group_id");
CREATE INDEX "payload_locked_documents_rels_affiliate_withdrawals_id_idx" ON "payload_locked_documents_rels" USING btree ("affiliate_withdrawals_id");
CREATE INDEX "payload_locked_documents_rels_garage_price_groups_id_idx" ON "payload_locked_documents_rels" USING btree ("garage_price_groups_id");
CREATE INDEX "shipments_order_id_idx" ON "shipments" USING btree ("order_id");
UPDATE "shipments" SET "shipment_key" = "order_id" || ':store' WHERE "shipment_key" IS NULL;`)
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  throw new Error('Commerce history is forward-only. Restore the pre-upgrade backup to roll back this release.')
}
