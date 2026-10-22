import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_cross_sell_partners_kind" AS ENUM('hosso', 'woocommerce');
  CREATE TYPE "public"."enum_cross_sell_listings_backend" AS ENUM('shop', 'wim');
  CREATE TYPE "public"."enum_cross_sell_offers_source" AS ENUM('shop', 'wim');
  CREATE TYPE "public"."enum_cross_sell_transfers_backend" AS ENUM('shop', 'wim');
  CREATE TYPE "public"."enum_cross_sell_transfers_state" AS ENUM('pending', 'sending', 'sent', 'uncertain');
  CREATE TYPE "public"."enum_cross_sell_transfers_commission_status" AS ENUM('pending', 'eligible', 'cancelled');
  CREATE TYPE "public"."enum_cross_sell_settings_backend" AS ENUM('shop', 'wim');
  CREATE TABLE "cross_sell_partners" (
    "id" serial PRIMARY KEY NOT NULL,
    "name" varchar NOT NULL,
    "kind" "enum_cross_sell_partners_kind" DEFAULT 'hosso' NOT NULL,
    "api_url" varchar NOT NULL,
    "credential_env" varchar NOT NULL,
    "secret_env" varchar,
    "commission_pct" numeric DEFAULT 0 NOT NULL,
    "buyer_name" varchar NOT NULL,
    "buyer_phone" varchar NOT NULL,
    "active" boolean DEFAULT false,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "cross_sell_listings" (
    "id" serial PRIMARY KEY NOT NULL,
    "partner_id" integer NOT NULL,
    "product_id" integer,
    "backend" "enum_cross_sell_listings_backend" DEFAULT 'shop',
    "wim_product_id" varchar,
    "remote_id" varchar NOT NULL,
    "remote_key" varchar NOT NULL,
    "supplier_price" numeric NOT NULL,
    "commission_pct" numeric NOT NULL,
    "active" boolean DEFAULT true,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "cross_sell_offers" (
    "id" serial PRIMARY KEY NOT NULL,
    "source" "enum_cross_sell_offers_source" DEFAULT 'shop' NOT NULL,
    "product_id" integer,
    "wim_product_id" varchar,
    "commission_pct" numeric DEFAULT 0 NOT NULL,
    "active" boolean DEFAULT false,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "cross_sell_offers_rels" (
    "id" serial PRIMARY KEY NOT NULL,
    "order" integer,
    "parent_id" integer NOT NULL,
    "path" varchar NOT NULL,
    "cross_sell_partners_id" integer
  );

  CREATE TABLE "cross_sell_transfers" (
    "id" serial PRIMARY KEY NOT NULL,
    "local_order_id" integer,
    "local_order_no" varchar,
    "partner_id" integer NOT NULL,
    "backend" "enum_cross_sell_transfers_backend" DEFAULT 'shop',
    "wim_order_id" varchar,
    "purchase_key" varchar NOT NULL,
    "purchase" jsonb NOT NULL,
    "state" "enum_cross_sell_transfers_state" DEFAULT 'pending' NOT NULL,
    "remote_id" varchar,
    "remote_status" varchar,
    "remote_total" numeric,
    "commission" numeric NOT NULL,
    "commission_status" "enum_cross_sell_transfers_commission_status" DEFAULT 'pending',
    "last_error" varchar,
    "checked_at" timestamp(3) with time zone,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "cross_sell_dispatches" (
    "id" serial PRIMARY KEY NOT NULL,
    "key" varchar NOT NULL,
    "transfer_id" integer NOT NULL,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "cross_sell_receipts" (
    "id" serial PRIMARY KEY NOT NULL,
    "key" varchar NOT NULL,
    "partner_id" integer NOT NULL,
    "purchase_key" varchar NOT NULL,
    "purchase" jsonb NOT NULL,
    "body" jsonb NOT NULL,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "cross_sell_settings" (
    "id" serial PRIMARY KEY NOT NULL,
    "backend" "enum_cross_sell_settings_backend" DEFAULT 'shop' NOT NULL,
    "wim_branch_id" varchar,
    "updated_at" timestamp(3) with time zone,
    "created_at" timestamp(3) with time zone
  );

  ALTER TABLE "shop_orders" ADD COLUMN "cross_sell_partner_id" integer;
  ALTER TABLE "shop_orders" ADD COLUMN "cross_sell_transfer_id" integer;
  ALTER TABLE "shop_orders" ADD COLUMN "cross_sell_purchase" jsonb;
  ALTER TABLE "shop_orders" ADD COLUMN "cross_sell_inbound_key" varchar;
  ALTER TABLE "shop_orders" ADD COLUMN "cross_sell_inbound_partner_id" integer;
  ALTER TABLE "shop_orders" ADD COLUMN "cross_sell_inbound_purchase" jsonb;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "cross_sell_partners_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "cross_sell_listings_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "cross_sell_offers_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "cross_sell_transfers_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "cross_sell_dispatches_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "cross_sell_receipts_id" integer;
  ALTER TABLE "cross_sell_listings" ADD CONSTRAINT "cross_sell_listings_partner_id_cross_sell_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."cross_sell_partners"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cross_sell_listings" ADD CONSTRAINT "cross_sell_listings_product_id_shop_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."shop_products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cross_sell_offers" ADD CONSTRAINT "cross_sell_offers_product_id_shop_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."shop_products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cross_sell_offers_rels" ADD CONSTRAINT "cross_sell_offers_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."cross_sell_offers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cross_sell_offers_rels" ADD CONSTRAINT "cross_sell_offers_rels_cross_sell_partners_fk" FOREIGN KEY ("cross_sell_partners_id") REFERENCES "public"."cross_sell_partners"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cross_sell_transfers" ADD CONSTRAINT "cross_sell_transfers_local_order_id_shop_orders_id_fk" FOREIGN KEY ("local_order_id") REFERENCES "public"."shop_orders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cross_sell_transfers" ADD CONSTRAINT "cross_sell_transfers_partner_id_cross_sell_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."cross_sell_partners"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cross_sell_dispatches" ADD CONSTRAINT "cross_sell_dispatches_transfer_id_cross_sell_transfers_id_fk" FOREIGN KEY ("transfer_id") REFERENCES "public"."cross_sell_transfers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cross_sell_receipts" ADD CONSTRAINT "cross_sell_receipts_partner_id_cross_sell_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."cross_sell_partners"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "cross_sell_partners_updated_at_idx" ON "cross_sell_partners" USING btree ("updated_at");
  CREATE INDEX "cross_sell_partners_created_at_idx" ON "cross_sell_partners" USING btree ("created_at");
  CREATE INDEX "cross_sell_listings_partner_idx" ON "cross_sell_listings" USING btree ("partner_id");
  CREATE UNIQUE INDEX "cross_sell_listings_product_idx" ON "cross_sell_listings" USING btree ("product_id");
  CREATE UNIQUE INDEX "cross_sell_listings_wim_product_id_idx" ON "cross_sell_listings" USING btree ("wim_product_id");
  CREATE UNIQUE INDEX "cross_sell_listings_remote_key_idx" ON "cross_sell_listings" USING btree ("remote_key");
  CREATE INDEX "cross_sell_listings_updated_at_idx" ON "cross_sell_listings" USING btree ("updated_at");
  CREATE INDEX "cross_sell_listings_created_at_idx" ON "cross_sell_listings" USING btree ("created_at");
  CREATE UNIQUE INDEX "cross_sell_offers_product_idx" ON "cross_sell_offers" USING btree ("product_id");
  CREATE UNIQUE INDEX "cross_sell_offers_wim_product_id_idx" ON "cross_sell_offers" USING btree ("wim_product_id");
  CREATE INDEX "cross_sell_offers_updated_at_idx" ON "cross_sell_offers" USING btree ("updated_at");
  CREATE INDEX "cross_sell_offers_created_at_idx" ON "cross_sell_offers" USING btree ("created_at");
  CREATE INDEX "cross_sell_offers_rels_order_idx" ON "cross_sell_offers_rels" USING btree ("order");
  CREATE INDEX "cross_sell_offers_rels_parent_idx" ON "cross_sell_offers_rels" USING btree ("parent_id");
  CREATE INDEX "cross_sell_offers_rels_path_idx" ON "cross_sell_offers_rels" USING btree ("path");
  CREATE INDEX "cross_sell_offers_rels_cross_sell_partners_id_idx" ON "cross_sell_offers_rels" USING btree ("cross_sell_partners_id");
  CREATE UNIQUE INDEX "cross_sell_transfers_local_order_idx" ON "cross_sell_transfers" USING btree ("local_order_id");
  CREATE INDEX "cross_sell_transfers_partner_idx" ON "cross_sell_transfers" USING btree ("partner_id");
  CREATE UNIQUE INDEX "cross_sell_transfers_wim_order_id_idx" ON "cross_sell_transfers" USING btree ("wim_order_id");
  CREATE UNIQUE INDEX "cross_sell_transfers_purchase_key_idx" ON "cross_sell_transfers" USING btree ("purchase_key");
  CREATE INDEX "cross_sell_transfers_updated_at_idx" ON "cross_sell_transfers" USING btree ("updated_at");
  CREATE INDEX "cross_sell_transfers_created_at_idx" ON "cross_sell_transfers" USING btree ("created_at");
  CREATE UNIQUE INDEX "cross_sell_dispatches_key_idx" ON "cross_sell_dispatches" USING btree ("key");
  CREATE INDEX "cross_sell_dispatches_transfer_idx" ON "cross_sell_dispatches" USING btree ("transfer_id");
  CREATE INDEX "cross_sell_dispatches_updated_at_idx" ON "cross_sell_dispatches" USING btree ("updated_at");
  CREATE INDEX "cross_sell_dispatches_created_at_idx" ON "cross_sell_dispatches" USING btree ("created_at");
  CREATE INDEX "cross_sell_receipts_partner_idx" ON "cross_sell_receipts" USING btree ("partner_id");
  CREATE INDEX "cross_sell_receipts_updated_at_idx" ON "cross_sell_receipts" USING btree ("updated_at");
  CREATE INDEX "cross_sell_receipts_created_at_idx" ON "cross_sell_receipts" USING btree ("created_at");
  CREATE UNIQUE INDEX "key_idx" ON "cross_sell_receipts" USING btree ("key");
  CREATE UNIQUE INDEX "partner_purchaseKey_idx" ON "cross_sell_receipts" USING btree ("partner_id","purchase_key");
  ALTER TABLE "shop_orders" ADD CONSTRAINT "shop_orders_cross_sell_partner_id_cross_sell_partners_id_fk" FOREIGN KEY ("cross_sell_partner_id") REFERENCES "public"."cross_sell_partners"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "shop_orders" ADD CONSTRAINT "shop_orders_cross_sell_transfer_id_cross_sell_transfers_id_fk" FOREIGN KEY ("cross_sell_transfer_id") REFERENCES "public"."cross_sell_transfers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "shop_orders" ADD CONSTRAINT "shop_orders_cross_sell_inbound_partner_id_cross_sell_partners_id_fk" FOREIGN KEY ("cross_sell_inbound_partner_id") REFERENCES "public"."cross_sell_partners"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_cross_sell_partners_fk" FOREIGN KEY ("cross_sell_partners_id") REFERENCES "public"."cross_sell_partners"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_cross_sell_listings_fk" FOREIGN KEY ("cross_sell_listings_id") REFERENCES "public"."cross_sell_listings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_cross_sell_offers_fk" FOREIGN KEY ("cross_sell_offers_id") REFERENCES "public"."cross_sell_offers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_cross_sell_transfers_fk" FOREIGN KEY ("cross_sell_transfers_id") REFERENCES "public"."cross_sell_transfers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_cross_sell_dispatches_fk" FOREIGN KEY ("cross_sell_dispatches_id") REFERENCES "public"."cross_sell_dispatches"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_cross_sell_receipts_fk" FOREIGN KEY ("cross_sell_receipts_id") REFERENCES "public"."cross_sell_receipts"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "shop_orders_cross_sell_partner_idx" ON "shop_orders" USING btree ("cross_sell_partner_id");
  CREATE INDEX "shop_orders_cross_sell_transfer_idx" ON "shop_orders" USING btree ("cross_sell_transfer_id");
  CREATE UNIQUE INDEX "shop_orders_cross_sell_inbound_key_idx" ON "shop_orders" USING btree ("cross_sell_inbound_key");
  CREATE INDEX "shop_orders_cross_sell_inbound_partner_idx" ON "shop_orders" USING btree ("cross_sell_inbound_partner_id");
  CREATE INDEX "payload_locked_documents_rels_cross_sell_partners_id_idx" ON "payload_locked_documents_rels" USING btree ("cross_sell_partners_id");
  CREATE INDEX "payload_locked_documents_rels_cross_sell_listings_id_idx" ON "payload_locked_documents_rels" USING btree ("cross_sell_listings_id");
  CREATE INDEX "payload_locked_documents_rels_cross_sell_offers_id_idx" ON "payload_locked_documents_rels" USING btree ("cross_sell_offers_id");
  CREATE INDEX "payload_locked_documents_rels_cross_sell_transfers_id_idx" ON "payload_locked_documents_rels" USING btree ("cross_sell_transfers_id");
  CREATE INDEX "payload_locked_documents_rels_cross_sell_dispatches_id_idx" ON "payload_locked_documents_rels" USING btree ("cross_sell_dispatches_id");
  CREATE INDEX "payload_locked_documents_rels_cross_sell_receipts_id_idx" ON "payload_locked_documents_rels" USING btree ("cross_sell_receipts_id");
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "cross_sell_partners" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cross_sell_listings" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cross_sell_offers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cross_sell_offers_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cross_sell_transfers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cross_sell_dispatches" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cross_sell_receipts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cross_sell_settings" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "shop_orders" DROP CONSTRAINT "shop_orders_cross_sell_partner_id_cross_sell_partners_id_fk";

  ALTER TABLE "shop_orders" DROP CONSTRAINT "shop_orders_cross_sell_transfer_id_cross_sell_transfers_id_fk";

  ALTER TABLE "shop_orders" DROP CONSTRAINT "shop_orders_cross_sell_inbound_partner_id_cross_sell_partners_id_fk";

  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_cross_sell_partners_fk";

  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_cross_sell_listings_fk";

  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_cross_sell_offers_fk";

  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_cross_sell_transfers_fk";

  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_cross_sell_dispatches_fk";

  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_cross_sell_receipts_fk";

  DROP INDEX "shop_orders_cross_sell_partner_idx";
  DROP INDEX "shop_orders_cross_sell_transfer_idx";
  DROP INDEX "shop_orders_cross_sell_inbound_key_idx";
  DROP INDEX "shop_orders_cross_sell_inbound_partner_idx";
  DROP INDEX "payload_locked_documents_rels_cross_sell_partners_id_idx";
  DROP INDEX "payload_locked_documents_rels_cross_sell_listings_id_idx";
  DROP INDEX "payload_locked_documents_rels_cross_sell_offers_id_idx";
  DROP INDEX "payload_locked_documents_rels_cross_sell_transfers_id_idx";
  DROP INDEX "payload_locked_documents_rels_cross_sell_dispatches_id_idx";
  DROP INDEX "payload_locked_documents_rels_cross_sell_receipts_id_idx";
  ALTER TABLE "shop_orders" DROP COLUMN "cross_sell_partner_id";
  ALTER TABLE "shop_orders" DROP COLUMN "cross_sell_transfer_id";
  ALTER TABLE "shop_orders" DROP COLUMN "cross_sell_purchase";
  ALTER TABLE "shop_orders" DROP COLUMN "cross_sell_inbound_key";
  ALTER TABLE "shop_orders" DROP COLUMN "cross_sell_inbound_partner_id";
  ALTER TABLE "shop_orders" DROP COLUMN "cross_sell_inbound_purchase";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "cross_sell_partners_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "cross_sell_listings_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "cross_sell_offers_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "cross_sell_transfers_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "cross_sell_dispatches_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "cross_sell_receipts_id";
  DROP TABLE "cross_sell_partners" CASCADE;
  DROP TABLE "cross_sell_listings" CASCADE;
  DROP TABLE "cross_sell_offers" CASCADE;
  DROP TABLE "cross_sell_offers_rels" CASCADE;
  DROP TABLE "cross_sell_transfers" CASCADE;
  DROP TABLE "cross_sell_dispatches" CASCADE;
  DROP TABLE "cross_sell_receipts" CASCADE;
  DROP TABLE "cross_sell_settings" CASCADE;
  DROP TYPE "public"."enum_cross_sell_partners_kind";
  DROP TYPE "public"."enum_cross_sell_listings_backend";
  DROP TYPE "public"."enum_cross_sell_offers_source";
  DROP TYPE "public"."enum_cross_sell_transfers_backend";
  DROP TYPE "public"."enum_cross_sell_transfers_state";
  DROP TYPE "public"."enum_cross_sell_transfers_commission_status";
  DROP TYPE "public"."enum_cross_sell_settings_backend";`)
}
