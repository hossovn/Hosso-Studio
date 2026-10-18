import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_shop_reviews_status" AS ENUM('pending', 'approved', 'rejected');
  CREATE TYPE "public"."enum_shop_orders_status" AS ENUM('new', 'confirmed', 'shipping', 'completed', 'cancelled');
  CREATE TYPE "public"."enum_shop_orders_payment_status" AS ENUM('unpaid', 'paid', 'refunded');
  CREATE TYPE "public"."enum_shop_orders_fulfillment_type" AS ENUM('delivery', 'pickup');
  CREATE TYPE "public"."enum_affiliate_referrals_status" AS ENUM('pending', 'approved', 'paid', 'cancelled');
  CREATE TYPE "public"."enum_shipments_status" AS ENUM('pending', 'handed_over', 'delivering', 'delivered', 'returned', 'cancelled');
  CREATE TYPE "public"."enum_vouchers_type" AS ENUM('percent', 'fixed', 'freeship');
  CREATE TYPE "public"."enum_payments_status" AS ENUM('pending', 'paid', 'underpaid');
  CREATE TYPE "public"."enum_site_settings_tokens_auto_font_body" AS ENUM('be-vietnam-pro', 'barlow', 'jetbrains-mono');
  CREATE TYPE "public"."enum_site_settings_tokens_auto_font_heading" AS ENUM('be-vietnam-pro', 'barlow', 'jetbrains-mono');
  CREATE TYPE "public"."enum_shipping_settings_ghn_required_note" AS ENUM('CHOTHUHANG', 'CHOXEMHANGKHONGTHU', 'KHONGCHOXEMHANG');
  ALTER TYPE "public"."enum_site_settings_theme" ADD VALUE 'auto';
  CREATE TABLE "shop_categories" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar,
  	"parent_id" integer,
  	"image_id" integer,
  	"order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "shop_products_variants" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"sku" varchar,
  	"price" numeric,
  	"stock" numeric DEFAULT 0
  );
  
  CREATE TABLE "shop_products_images" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer NOT NULL
  );
  
  CREATE TABLE "shop_products" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar,
  	"code" varchar,
  	"active" boolean DEFAULT true,
  	"category_id" integer,
  	"brand" varchar,
  	"price" numeric NOT NULL,
  	"sale_price" numeric,
  	"stock" numeric DEFAULT 0 NOT NULL,
  	"description" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "shop_products_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "shop_reviews" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"product_id" integer NOT NULL,
  	"name" varchar NOT NULL,
  	"rating" numeric NOT NULL,
  	"comment" varchar,
  	"status" "enum_shop_reviews_status" DEFAULT 'pending',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "shop_orders_adjustments" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"amount" numeric,
  	"source" varchar
  );
  
  CREATE TABLE "shop_orders_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"product_id" varchar NOT NULL,
  	"variant_id" varchar,
  	"name" varchar,
  	"code" varchar,
  	"price" numeric,
  	"quantity" numeric
  );
  
  CREATE TABLE "shop_orders" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order_no" varchar,
  	"cart_id" varchar,
  	"status" "enum_shop_orders_status" DEFAULT 'new' NOT NULL,
  	"subtotal" numeric,
  	"total" numeric,
  	"payment_status" "enum_shop_orders_payment_status" DEFAULT 'unpaid',
  	"email" varchar,
  	"payment_method" varchar DEFAULT 'cod',
  	"fulfillment_type" "enum_shop_orders_fulfillment_type" DEFAULT 'delivery',
  	"customer_name" varchar,
  	"phone" varchar,
  	"address" varchar,
  	"note" varchar,
  	"restocked" boolean,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "affiliates_picks" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"href" varchar NOT NULL
  );
  
  CREATE TABLE "affiliates" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"code" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"password_hash" varchar,
  	"bank_info" varchar,
  	"commission_pct" numeric DEFAULT 10,
  	"active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "affiliate_referrals" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"affiliate_id" integer NOT NULL,
  	"order_id" varchar NOT NULL,
  	"order_total" numeric,
  	"commission" numeric,
  	"status" "enum_affiliate_referrals_status" DEFAULT 'pending',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "shipments" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order_id" varchar NOT NULL,
  	"customer_name" varchar,
  	"phone" varchar,
  	"address" varchar,
  	"order_total" numeric,
  	"payment_method" varchar,
  	"carrier" varchar,
  	"tracking_code" varchar,
  	"status" "enum_shipments_status" DEFAULT 'pending',
  	"note" varchar,
  	"district_id" numeric,
  	"ward_code" varchar,
  	"ghn_status" varchar,
  	"ghn_error" varchar,
  	"synced_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "vouchers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"code" varchar NOT NULL,
  	"type" "enum_vouchers_type" DEFAULT 'percent' NOT NULL,
  	"value" numeric,
  	"min_total" numeric DEFAULT 0,
  	"max_uses" numeric DEFAULT 0,
  	"used_count" numeric DEFAULT 0,
  	"starts_at" timestamp(3) with time zone,
  	"ends_at" timestamp(3) with time zone,
  	"active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payments" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order_no" varchar NOT NULL,
  	"amount" numeric NOT NULL,
  	"status" "enum_payments_status" DEFAULT 'pending',
  	"paid_amount" numeric,
  	"transaction_id" varchar,
  	"paid_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "customers_addresses" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"address" varchar NOT NULL
  );
  
  CREATE TABLE "customers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"phone" varchar,
  	"password_hash" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "customer_orders" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"customer_id" integer NOT NULL,
  	"order_no" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "shop_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"bank_info" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "shipping_settings_carriers" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"tracking_url" varchar
  );
  
  CREATE TABLE "shipping_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"flat_fee" numeric DEFAULT 0,
  	"free_ship_over" numeric DEFAULT 0,
  	"use_ghn_fee" boolean DEFAULT false,
  	"ghn_enabled" boolean DEFAULT false,
  	"ghn_sandbox" boolean DEFAULT false,
  	"ghn_shop_id" numeric,
  	"ghn_weight" numeric DEFAULT 500,
  	"ghn_required_note" "enum_shipping_settings_ghn_required_note" DEFAULT 'CHOXEMHANGKHONGTHU',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "payment_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"bank" varchar,
  	"account_number" varchar,
  	"account_name" varchar,
  	"note" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "notify_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"admin_email" varchar,
  	"to_customer" boolean DEFAULT true,
  	"on_status" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "analytics_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"ga4_id" varchar,
  	"fb_pixel_id" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "shop_categories_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "shop_products_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "shop_reviews_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "shop_orders_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "affiliates_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "affiliate_referrals_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "shipments_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "vouchers_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "payments_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "customers_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "customer_orders_id" integer;
  ALTER TABLE "site_settings" ADD COLUMN "tokens_auto_color_bg" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "tokens_auto_color_surface" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "tokens_auto_color_text" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "tokens_auto_color_muted" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "tokens_auto_color_primary" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "tokens_auto_color_onprimary" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "tokens_auto_color_border" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "tokens_auto_color_accent" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "tokens_auto_color_onaccent" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "tokens_auto_color_dark" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "tokens_auto_font_body" "enum_site_settings_tokens_auto_font_body";
  ALTER TABLE "site_settings" ADD COLUMN "tokens_auto_font_heading" "enum_site_settings_tokens_auto_font_heading";
  ALTER TABLE "site_settings" ADD COLUMN "tokens_auto_radius" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "tokens_auto_spacing" varchar;
  ALTER TABLE "shop_categories" ADD CONSTRAINT "shop_categories_parent_id_shop_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."shop_categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "shop_categories" ADD CONSTRAINT "shop_categories_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "shop_products_variants" ADD CONSTRAINT "shop_products_variants_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."shop_products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "shop_products_images" ADD CONSTRAINT "shop_products_images_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "shop_products_images" ADD CONSTRAINT "shop_products_images_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."shop_products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "shop_products" ADD CONSTRAINT "shop_products_category_id_shop_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."shop_categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "shop_products_texts" ADD CONSTRAINT "shop_products_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."shop_products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "shop_reviews" ADD CONSTRAINT "shop_reviews_product_id_shop_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."shop_products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "shop_orders_adjustments" ADD CONSTRAINT "shop_orders_adjustments_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."shop_orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "shop_orders_items" ADD CONSTRAINT "shop_orders_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."shop_orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "affiliates_picks" ADD CONSTRAINT "affiliates_picks_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."affiliates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "affiliate_referrals" ADD CONSTRAINT "affiliate_referrals_affiliate_id_affiliates_id_fk" FOREIGN KEY ("affiliate_id") REFERENCES "public"."affiliates"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "customers_addresses" ADD CONSTRAINT "customers_addresses_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "customer_orders" ADD CONSTRAINT "customer_orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "shipping_settings_carriers" ADD CONSTRAINT "shipping_settings_carriers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."shipping_settings"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "shop_categories_slug_idx" ON "shop_categories" USING btree ("slug");
  CREATE INDEX "shop_categories_parent_idx" ON "shop_categories" USING btree ("parent_id");
  CREATE INDEX "shop_categories_image_idx" ON "shop_categories" USING btree ("image_id");
  CREATE INDEX "shop_categories_updated_at_idx" ON "shop_categories" USING btree ("updated_at");
  CREATE INDEX "shop_categories_created_at_idx" ON "shop_categories" USING btree ("created_at");
  CREATE INDEX "shop_products_variants_order_idx" ON "shop_products_variants" USING btree ("_order");
  CREATE INDEX "shop_products_variants_parent_id_idx" ON "shop_products_variants" USING btree ("_parent_id");
  CREATE INDEX "shop_products_images_order_idx" ON "shop_products_images" USING btree ("_order");
  CREATE INDEX "shop_products_images_parent_id_idx" ON "shop_products_images" USING btree ("_parent_id");
  CREATE INDEX "shop_products_images_image_idx" ON "shop_products_images" USING btree ("image_id");
  CREATE UNIQUE INDEX "shop_products_slug_idx" ON "shop_products" USING btree ("slug");
  CREATE UNIQUE INDEX "shop_products_code_idx" ON "shop_products" USING btree ("code");
  CREATE INDEX "shop_products_category_idx" ON "shop_products" USING btree ("category_id");
  CREATE INDEX "shop_products_brand_idx" ON "shop_products" USING btree ("brand");
  CREATE INDEX "shop_products_updated_at_idx" ON "shop_products" USING btree ("updated_at");
  CREATE INDEX "shop_products_created_at_idx" ON "shop_products" USING btree ("created_at");
  CREATE INDEX "shop_products_texts_order_parent" ON "shop_products_texts" USING btree ("order","parent_id");
  CREATE INDEX "shop_products_texts_text_idx" ON "shop_products_texts" USING btree ("text");
  CREATE INDEX "shop_reviews_product_idx" ON "shop_reviews" USING btree ("product_id");
  CREATE INDEX "shop_reviews_updated_at_idx" ON "shop_reviews" USING btree ("updated_at");
  CREATE INDEX "shop_reviews_created_at_idx" ON "shop_reviews" USING btree ("created_at");
  CREATE INDEX "shop_orders_adjustments_order_idx" ON "shop_orders_adjustments" USING btree ("_order");
  CREATE INDEX "shop_orders_adjustments_parent_id_idx" ON "shop_orders_adjustments" USING btree ("_parent_id");
  CREATE INDEX "shop_orders_items_order_idx" ON "shop_orders_items" USING btree ("_order");
  CREATE INDEX "shop_orders_items_parent_id_idx" ON "shop_orders_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "shop_orders_order_no_idx" ON "shop_orders" USING btree ("order_no");
  CREATE UNIQUE INDEX "shop_orders_cart_id_idx" ON "shop_orders" USING btree ("cart_id");
  CREATE INDEX "shop_orders_updated_at_idx" ON "shop_orders" USING btree ("updated_at");
  CREATE INDEX "shop_orders_created_at_idx" ON "shop_orders" USING btree ("created_at");
  CREATE INDEX "affiliates_picks_order_idx" ON "affiliates_picks" USING btree ("_order");
  CREATE INDEX "affiliates_picks_parent_id_idx" ON "affiliates_picks" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "affiliates_code_idx" ON "affiliates" USING btree ("code");
  CREATE UNIQUE INDEX "affiliates_email_idx" ON "affiliates" USING btree ("email");
  CREATE INDEX "affiliates_updated_at_idx" ON "affiliates" USING btree ("updated_at");
  CREATE INDEX "affiliates_created_at_idx" ON "affiliates" USING btree ("created_at");
  CREATE INDEX "affiliate_referrals_affiliate_idx" ON "affiliate_referrals" USING btree ("affiliate_id");
  CREATE UNIQUE INDEX "affiliate_referrals_order_id_idx" ON "affiliate_referrals" USING btree ("order_id");
  CREATE INDEX "affiliate_referrals_updated_at_idx" ON "affiliate_referrals" USING btree ("updated_at");
  CREATE INDEX "affiliate_referrals_created_at_idx" ON "affiliate_referrals" USING btree ("created_at");
  CREATE UNIQUE INDEX "shipments_order_id_idx" ON "shipments" USING btree ("order_id");
  CREATE INDEX "shipments_updated_at_idx" ON "shipments" USING btree ("updated_at");
  CREATE INDEX "shipments_created_at_idx" ON "shipments" USING btree ("created_at");
  CREATE UNIQUE INDEX "vouchers_code_idx" ON "vouchers" USING btree ("code");
  CREATE INDEX "vouchers_updated_at_idx" ON "vouchers" USING btree ("updated_at");
  CREATE INDEX "vouchers_created_at_idx" ON "vouchers" USING btree ("created_at");
  CREATE UNIQUE INDEX "payments_order_no_idx" ON "payments" USING btree ("order_no");
  CREATE UNIQUE INDEX "payments_transaction_id_idx" ON "payments" USING btree ("transaction_id");
  CREATE INDEX "payments_updated_at_idx" ON "payments" USING btree ("updated_at");
  CREATE INDEX "payments_created_at_idx" ON "payments" USING btree ("created_at");
  CREATE INDEX "customers_addresses_order_idx" ON "customers_addresses" USING btree ("_order");
  CREATE INDEX "customers_addresses_parent_id_idx" ON "customers_addresses" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "customers_email_idx" ON "customers" USING btree ("email");
  CREATE INDEX "customers_updated_at_idx" ON "customers" USING btree ("updated_at");
  CREATE INDEX "customers_created_at_idx" ON "customers" USING btree ("created_at");
  CREATE INDEX "customer_orders_customer_idx" ON "customer_orders" USING btree ("customer_id");
  CREATE UNIQUE INDEX "customer_orders_order_no_idx" ON "customer_orders" USING btree ("order_no");
  CREATE INDEX "customer_orders_updated_at_idx" ON "customer_orders" USING btree ("updated_at");
  CREATE INDEX "customer_orders_created_at_idx" ON "customer_orders" USING btree ("created_at");
  CREATE INDEX "shipping_settings_carriers_order_idx" ON "shipping_settings_carriers" USING btree ("_order");
  CREATE INDEX "shipping_settings_carriers_parent_id_idx" ON "shipping_settings_carriers" USING btree ("_parent_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_shop_categories_fk" FOREIGN KEY ("shop_categories_id") REFERENCES "public"."shop_categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_shop_products_fk" FOREIGN KEY ("shop_products_id") REFERENCES "public"."shop_products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_shop_reviews_fk" FOREIGN KEY ("shop_reviews_id") REFERENCES "public"."shop_reviews"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_shop_orders_fk" FOREIGN KEY ("shop_orders_id") REFERENCES "public"."shop_orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_affiliates_fk" FOREIGN KEY ("affiliates_id") REFERENCES "public"."affiliates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_affiliate_referrals_fk" FOREIGN KEY ("affiliate_referrals_id") REFERENCES "public"."affiliate_referrals"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_shipments_fk" FOREIGN KEY ("shipments_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_vouchers_fk" FOREIGN KEY ("vouchers_id") REFERENCES "public"."vouchers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_payments_fk" FOREIGN KEY ("payments_id") REFERENCES "public"."payments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_customers_fk" FOREIGN KEY ("customers_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_customer_orders_fk" FOREIGN KEY ("customer_orders_id") REFERENCES "public"."customer_orders"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_shop_categories_id_idx" ON "payload_locked_documents_rels" USING btree ("shop_categories_id");
  CREATE INDEX "payload_locked_documents_rels_shop_products_id_idx" ON "payload_locked_documents_rels" USING btree ("shop_products_id");
  CREATE INDEX "payload_locked_documents_rels_shop_reviews_id_idx" ON "payload_locked_documents_rels" USING btree ("shop_reviews_id");
  CREATE INDEX "payload_locked_documents_rels_shop_orders_id_idx" ON "payload_locked_documents_rels" USING btree ("shop_orders_id");
  CREATE INDEX "payload_locked_documents_rels_affiliates_id_idx" ON "payload_locked_documents_rels" USING btree ("affiliates_id");
  CREATE INDEX "payload_locked_documents_rels_affiliate_referrals_id_idx" ON "payload_locked_documents_rels" USING btree ("affiliate_referrals_id");
  CREATE INDEX "payload_locked_documents_rels_shipments_id_idx" ON "payload_locked_documents_rels" USING btree ("shipments_id");
  CREATE INDEX "payload_locked_documents_rels_vouchers_id_idx" ON "payload_locked_documents_rels" USING btree ("vouchers_id");
  CREATE INDEX "payload_locked_documents_rels_payments_id_idx" ON "payload_locked_documents_rels" USING btree ("payments_id");
  CREATE INDEX "payload_locked_documents_rels_customers_id_idx" ON "payload_locked_documents_rels" USING btree ("customers_id");
  CREATE INDEX "payload_locked_documents_rels_customer_orders_id_idx" ON "payload_locked_documents_rels" USING btree ("customer_orders_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "shop_categories" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "shop_products_variants" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "shop_products_images" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "shop_products" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "shop_products_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "shop_reviews" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "shop_orders_adjustments" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "shop_orders_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "shop_orders" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "affiliates_picks" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "affiliates" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "affiliate_referrals" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "shipments" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "vouchers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payments" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "customers_addresses" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "customers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "customer_orders" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "shop_settings" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "shipping_settings_carriers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "shipping_settings" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payment_settings" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "notify_settings" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "analytics_settings" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "shop_categories" CASCADE;
  DROP TABLE "shop_products_variants" CASCADE;
  DROP TABLE "shop_products_images" CASCADE;
  DROP TABLE "shop_products" CASCADE;
  DROP TABLE "shop_products_texts" CASCADE;
  DROP TABLE "shop_reviews" CASCADE;
  DROP TABLE "shop_orders_adjustments" CASCADE;
  DROP TABLE "shop_orders_items" CASCADE;
  DROP TABLE "shop_orders" CASCADE;
  DROP TABLE "affiliates_picks" CASCADE;
  DROP TABLE "affiliates" CASCADE;
  DROP TABLE "affiliate_referrals" CASCADE;
  DROP TABLE "shipments" CASCADE;
  DROP TABLE "vouchers" CASCADE;
  DROP TABLE "payments" CASCADE;
  DROP TABLE "customers_addresses" CASCADE;
  DROP TABLE "customers" CASCADE;
  DROP TABLE "customer_orders" CASCADE;
  DROP TABLE "shop_settings" CASCADE;
  DROP TABLE "shipping_settings_carriers" CASCADE;
  DROP TABLE "shipping_settings" CASCADE;
  DROP TABLE "payment_settings" CASCADE;
  DROP TABLE "notify_settings" CASCADE;
  DROP TABLE "analytics_settings" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_shop_categories_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_shop_products_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_shop_reviews_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_shop_orders_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_affiliates_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_affiliate_referrals_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_shipments_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_vouchers_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_payments_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_customers_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_customer_orders_fk";
  
  ALTER TABLE "site_settings" ALTER COLUMN "theme" SET DATA TYPE text;
  ALTER TABLE "site_settings" ALTER COLUMN "theme" SET DEFAULT 'default'::text;
  DROP TYPE "public"."enum_site_settings_theme";
  CREATE TYPE "public"."enum_site_settings_theme" AS ENUM('default', 'alt', 'shop');
  ALTER TABLE "site_settings" ALTER COLUMN "theme" SET DEFAULT 'default'::"public"."enum_site_settings_theme";
  ALTER TABLE "site_settings" ALTER COLUMN "theme" SET DATA TYPE "public"."enum_site_settings_theme" USING "theme"::"public"."enum_site_settings_theme";
  DROP INDEX "payload_locked_documents_rels_shop_categories_id_idx";
  DROP INDEX "payload_locked_documents_rels_shop_products_id_idx";
  DROP INDEX "payload_locked_documents_rels_shop_reviews_id_idx";
  DROP INDEX "payload_locked_documents_rels_shop_orders_id_idx";
  DROP INDEX "payload_locked_documents_rels_affiliates_id_idx";
  DROP INDEX "payload_locked_documents_rels_affiliate_referrals_id_idx";
  DROP INDEX "payload_locked_documents_rels_shipments_id_idx";
  DROP INDEX "payload_locked_documents_rels_vouchers_id_idx";
  DROP INDEX "payload_locked_documents_rels_payments_id_idx";
  DROP INDEX "payload_locked_documents_rels_customers_id_idx";
  DROP INDEX "payload_locked_documents_rels_customer_orders_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "shop_categories_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "shop_products_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "shop_reviews_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "shop_orders_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "affiliates_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "affiliate_referrals_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "shipments_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "vouchers_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "payments_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "customers_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "customer_orders_id";
  ALTER TABLE "site_settings" DROP COLUMN "tokens_auto_color_bg";
  ALTER TABLE "site_settings" DROP COLUMN "tokens_auto_color_surface";
  ALTER TABLE "site_settings" DROP COLUMN "tokens_auto_color_text";
  ALTER TABLE "site_settings" DROP COLUMN "tokens_auto_color_muted";
  ALTER TABLE "site_settings" DROP COLUMN "tokens_auto_color_primary";
  ALTER TABLE "site_settings" DROP COLUMN "tokens_auto_color_onprimary";
  ALTER TABLE "site_settings" DROP COLUMN "tokens_auto_color_border";
  ALTER TABLE "site_settings" DROP COLUMN "tokens_auto_color_accent";
  ALTER TABLE "site_settings" DROP COLUMN "tokens_auto_color_onaccent";
  ALTER TABLE "site_settings" DROP COLUMN "tokens_auto_color_dark";
  ALTER TABLE "site_settings" DROP COLUMN "tokens_auto_font_body";
  ALTER TABLE "site_settings" DROP COLUMN "tokens_auto_font_heading";
  ALTER TABLE "site_settings" DROP COLUMN "tokens_auto_radius";
  ALTER TABLE "site_settings" DROP COLUMN "tokens_auto_spacing";
  DROP TYPE "public"."enum_shop_reviews_status";
  DROP TYPE "public"."enum_shop_orders_status";
  DROP TYPE "public"."enum_shop_orders_payment_status";
  DROP TYPE "public"."enum_shop_orders_fulfillment_type";
  DROP TYPE "public"."enum_affiliate_referrals_status";
  DROP TYPE "public"."enum_shipments_status";
  DROP TYPE "public"."enum_vouchers_type";
  DROP TYPE "public"."enum_payments_status";
  DROP TYPE "public"."enum_site_settings_tokens_auto_font_body";
  DROP TYPE "public"."enum_site_settings_tokens_auto_font_heading";
  DROP TYPE "public"."enum_shipping_settings_ghn_required_note";`)
}
