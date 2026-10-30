import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`CREATE TYPE "public"."enum_affiliates_approval" AS ENUM('pending', 'approved', 'rejected');
CREATE TYPE "public"."enum_affiliates_commission_type" AS ENUM('percent', 'fixed');
ALTER TYPE "public"."enum_affiliate_referrals_status" ADD VALUE 'holding' BEFORE 'pending';
ALTER TYPE "public"."enum_affiliate_referrals_status" ADD VALUE 'eligible' BEFORE 'pending';
ALTER TYPE "public"."enum_affiliate_referrals_status" ADD VALUE 'review' BEFORE 'pending';
CREATE TABLE "affiliate_clicks" (
	"id" serial PRIMARY KEY NOT NULL,
	"affiliate_id" integer NOT NULL,
	"token" varchar NOT NULL,
	"path" varchar,
	"expires_at" timestamp(3) with time zone,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "affiliate_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar NOT NULL,
	"order_id" varchar,
	"source" varchar NOT NULL,
	"policy" jsonb,
	"items" jsonb,
	"customer_phone" varchar,
	"total" numeric,
	"order_status" varchar,
	"payment_status" varchar,
	"refunded_amount" numeric,
	"completed_at" timestamp(3) with time zone,
	"payment_reference" varchar,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "affiliate_payouts" (
	"id" serial PRIMARY KEY NOT NULL,
	"affiliate_id" integer NOT NULL,
	"amount" numeric,
	"reference" varchar NOT NULL,
	"evidence" varchar NOT NULL,
	"bank_info" varchar NOT NULL,
	"paid_at" timestamp(3) with time zone,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "affiliate_payout_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"payout_id" integer NOT NULL,
	"referral_id" integer NOT NULL,
	"amount" numeric,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "affiliate_audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"action" varchar NOT NULL,
	"subject" varchar NOT NULL,
	"actor" varchar NOT NULL,
	"detail" jsonb,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "affiliate_rate_limits" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar NOT NULL,
	"expires_at" timestamp(3) with time zone,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);

DROP INDEX "affiliate_referrals_order_id_idx";
ALTER TABLE "shop_orders_adjustments" ADD COLUMN "scope" varchar;
ALTER TABLE "shop_orders" ADD COLUMN "affiliate_snapshot" jsonb;
ALTER TABLE "shop_orders" ADD COLUMN "affiliate_refunded_amount" numeric DEFAULT 0;
ALTER TABLE "shop_orders" ADD COLUMN "affiliate_completed_at" timestamp(3) with time zone;
ALTER TABLE "affiliates" ADD COLUMN "approval" "enum_affiliates_approval" DEFAULT 'pending';
ALTER TABLE "affiliates" ADD COLUMN "commission_type" "enum_affiliates_commission_type" DEFAULT 'percent';
ALTER TABLE "affiliates" ADD COLUMN "commission_fixed" numeric DEFAULT 0;
ALTER TABLE "affiliates" ADD COLUMN "hold_days" numeric DEFAULT 14;
ALTER TABLE "affiliate_referrals" ADD COLUMN "source_key" varchar;
ALTER TABLE "affiliate_referrals" ADD COLUMN "source" varchar;
ALTER TABLE "affiliate_referrals" ADD COLUMN "policy" jsonb;
ALTER TABLE "affiliate_referrals" ADD COLUMN "eligible_at" timestamp(3) with time zone;
ALTER TABLE "affiliate_referrals" ADD COLUMN "rejection_reason" varchar;
ALTER TABLE "affiliate_referrals" ADD COLUMN "parent_id" integer;
ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "affiliate_clicks_id" integer;
ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "affiliate_orders_id" integer;
ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "affiliate_payouts_id" integer;
ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "affiliate_payout_items_id" integer;
ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "affiliate_audit_logs_id" integer;
ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "affiliate_rate_limits_id" integer;
ALTER TABLE "affiliate_clicks" ADD CONSTRAINT "affiliate_clicks_affiliate_id_affiliates_id_fk" FOREIGN KEY ("affiliate_id") REFERENCES "public"."affiliates"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "affiliate_payouts" ADD CONSTRAINT "affiliate_payouts_affiliate_id_affiliates_id_fk" FOREIGN KEY ("affiliate_id") REFERENCES "public"."affiliates"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "affiliate_payout_items" ADD CONSTRAINT "affiliate_payout_items_payout_id_affiliate_payouts_id_fk" FOREIGN KEY ("payout_id") REFERENCES "public"."affiliate_payouts"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "affiliate_payout_items" ADD CONSTRAINT "affiliate_payout_items_referral_id_affiliate_referrals_id_fk" FOREIGN KEY ("referral_id") REFERENCES "public"."affiliate_referrals"("id") ON DELETE set null ON UPDATE no action;
CREATE INDEX "affiliate_clicks_affiliate_idx" ON "affiliate_clicks" USING btree ("affiliate_id");
CREATE UNIQUE INDEX "affiliate_clicks_token_idx" ON "affiliate_clicks" USING btree ("token");
CREATE INDEX "affiliate_clicks_updated_at_idx" ON "affiliate_clicks" USING btree ("updated_at");
CREATE INDEX "affiliate_clicks_created_at_idx" ON "affiliate_clicks" USING btree ("created_at");
CREATE UNIQUE INDEX "affiliate_orders_key_idx" ON "affiliate_orders" USING btree ("key");
CREATE INDEX "affiliate_orders_updated_at_idx" ON "affiliate_orders" USING btree ("updated_at");
CREATE INDEX "affiliate_orders_created_at_idx" ON "affiliate_orders" USING btree ("created_at");
CREATE UNIQUE INDEX "source_orderId_idx" ON "affiliate_orders" USING btree ("source","order_id");
CREATE INDEX "affiliate_payouts_affiliate_idx" ON "affiliate_payouts" USING btree ("affiliate_id");
CREATE UNIQUE INDEX "affiliate_payouts_reference_idx" ON "affiliate_payouts" USING btree ("reference");
CREATE INDEX "affiliate_payouts_updated_at_idx" ON "affiliate_payouts" USING btree ("updated_at");
CREATE INDEX "affiliate_payouts_created_at_idx" ON "affiliate_payouts" USING btree ("created_at");
CREATE INDEX "affiliate_payout_items_payout_idx" ON "affiliate_payout_items" USING btree ("payout_id");
CREATE UNIQUE INDEX "affiliate_payout_items_referral_idx" ON "affiliate_payout_items" USING btree ("referral_id");
CREATE INDEX "affiliate_payout_items_updated_at_idx" ON "affiliate_payout_items" USING btree ("updated_at");
CREATE INDEX "affiliate_payout_items_created_at_idx" ON "affiliate_payout_items" USING btree ("created_at");
CREATE INDEX "affiliate_audit_logs_updated_at_idx" ON "affiliate_audit_logs" USING btree ("updated_at");
CREATE INDEX "affiliate_audit_logs_created_at_idx" ON "affiliate_audit_logs" USING btree ("created_at");
CREATE UNIQUE INDEX "affiliate_rate_limits_key_idx" ON "affiliate_rate_limits" USING btree ("key");
CREATE INDEX "affiliate_rate_limits_updated_at_idx" ON "affiliate_rate_limits" USING btree ("updated_at");
CREATE INDEX "affiliate_rate_limits_created_at_idx" ON "affiliate_rate_limits" USING btree ("created_at");
ALTER TABLE "affiliate_referrals" ADD CONSTRAINT "affiliate_referrals_parent_id_affiliate_referrals_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."affiliate_referrals"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_affiliate_clicks_fk" FOREIGN KEY ("affiliate_clicks_id") REFERENCES "public"."affiliate_clicks"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_affiliate_orders_fk" FOREIGN KEY ("affiliate_orders_id") REFERENCES "public"."affiliate_orders"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_affiliate_payouts_fk" FOREIGN KEY ("affiliate_payouts_id") REFERENCES "public"."affiliate_payouts"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_affiliate_payout_items_fk" FOREIGN KEY ("affiliate_payout_items_id") REFERENCES "public"."affiliate_payout_items"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_affiliate_audit_logs_fk" FOREIGN KEY ("affiliate_audit_logs_id") REFERENCES "public"."affiliate_audit_logs"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_affiliate_rate_limits_fk" FOREIGN KEY ("affiliate_rate_limits_id") REFERENCES "public"."affiliate_rate_limits"("id") ON DELETE cascade ON UPDATE no action;
CREATE UNIQUE INDEX "affiliate_referrals_source_key_idx" ON "affiliate_referrals" USING btree ("source_key");
CREATE INDEX "affiliate_referrals_parent_idx" ON "affiliate_referrals" USING btree ("parent_id");
CREATE INDEX "payload_locked_documents_rels_affiliate_clicks_id_idx" ON "payload_locked_documents_rels" USING btree ("affiliate_clicks_id");
CREATE INDEX "payload_locked_documents_rels_affiliate_orders_id_idx" ON "payload_locked_documents_rels" USING btree ("affiliate_orders_id");
CREATE INDEX "payload_locked_documents_rels_affiliate_payouts_id_idx" ON "payload_locked_documents_rels" USING btree ("affiliate_payouts_id");
CREATE INDEX "payload_locked_documents_rels_affiliate_payout_items_id_idx" ON "payload_locked_documents_rels" USING btree ("affiliate_payout_items_id");
CREATE INDEX "payload_locked_documents_rels_affiliate_audit_logs_id_idx" ON "payload_locked_documents_rels" USING btree ("affiliate_audit_logs_id");
CREATE INDEX "payload_locked_documents_rels_affiliate_rate_limits_id_idx" ON "payload_locked_documents_rels" USING btree ("affiliate_rate_limits_id");
UPDATE affiliates SET approval = CASE WHEN active THEN 'approved'::enum_affiliates_approval ELSE 'rejected'::enum_affiliates_approval END;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Financial history must survive an accidental rollback.
  await db.execute(sql`DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM affiliate_referrals WHERE source_key IS NOT NULL OR status::text IN ('holding', 'eligible', 'review'))
      OR EXISTS (SELECT 1 FROM affiliate_orders WHERE policy IS NOT NULL)
      OR EXISTS (SELECT 1 FROM affiliate_payouts) THEN
      RAISE EXCEPTION 'CPS history exists; restore a verified backup instead of dropping financial records';
    END IF;
  END $$;
ALTER TABLE "affiliate_clicks" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "affiliate_orders" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "affiliate_payouts" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "affiliate_payout_items" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "affiliate_audit_logs" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "affiliate_rate_limits" DISABLE ROW LEVEL SECURITY;
DROP TABLE "affiliate_clicks" CASCADE;
DROP TABLE "affiliate_orders" CASCADE;
DROP TABLE "affiliate_payouts" CASCADE;
DROP TABLE "affiliate_payout_items" CASCADE;
DROP TABLE "affiliate_audit_logs" CASCADE;
DROP TABLE "affiliate_rate_limits" CASCADE;
ALTER TABLE "affiliate_referrals" DROP CONSTRAINT "affiliate_referrals_parent_id_affiliate_referrals_id_fk";

ALTER TABLE "affiliate_referrals" ALTER COLUMN "status" SET DATA TYPE text;
ALTER TABLE "affiliate_referrals" ALTER COLUMN "status" SET DEFAULT 'pending'::text;
DROP TYPE "public"."enum_affiliate_referrals_status";
CREATE TYPE "public"."enum_affiliate_referrals_status" AS ENUM('pending', 'approved', 'paid', 'cancelled');
ALTER TABLE "affiliate_referrals" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."enum_affiliate_referrals_status";
ALTER TABLE "affiliate_referrals" ALTER COLUMN "status" SET DATA TYPE "public"."enum_affiliate_referrals_status" USING "status"::"public"."enum_affiliate_referrals_status";
DROP INDEX "affiliate_referrals_source_key_idx";
DROP INDEX "affiliate_referrals_parent_idx";
DROP INDEX "payload_locked_documents_rels_affiliate_clicks_id_idx";
DROP INDEX "payload_locked_documents_rels_affiliate_orders_id_idx";
DROP INDEX "payload_locked_documents_rels_affiliate_payouts_id_idx";
DROP INDEX "payload_locked_documents_rels_affiliate_payout_items_id_idx";
DROP INDEX "payload_locked_documents_rels_affiliate_audit_logs_id_idx";
DROP INDEX "payload_locked_documents_rels_affiliate_rate_limits_id_idx";
CREATE UNIQUE INDEX "affiliate_referrals_order_id_idx" ON "affiliate_referrals" USING btree ("order_id");
ALTER TABLE "shop_orders_adjustments" DROP COLUMN "scope";
ALTER TABLE "shop_orders" DROP COLUMN "affiliate_snapshot";
ALTER TABLE "shop_orders" DROP COLUMN "affiliate_refunded_amount";
ALTER TABLE "shop_orders" DROP COLUMN "affiliate_completed_at";
ALTER TABLE "affiliates" DROP COLUMN "approval";
ALTER TABLE "affiliates" DROP COLUMN "commission_type";
ALTER TABLE "affiliates" DROP COLUMN "commission_fixed";
ALTER TABLE "affiliates" DROP COLUMN "hold_days";
ALTER TABLE "affiliate_referrals" DROP COLUMN "source_key";
ALTER TABLE "affiliate_referrals" DROP COLUMN "source";
ALTER TABLE "affiliate_referrals" DROP COLUMN "policy";
ALTER TABLE "affiliate_referrals" DROP COLUMN "eligible_at";
ALTER TABLE "affiliate_referrals" DROP COLUMN "rejection_reason";
ALTER TABLE "affiliate_referrals" DROP COLUMN "parent_id";
ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "affiliate_clicks_id";
ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "affiliate_orders_id";
ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "affiliate_payouts_id";
ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "affiliate_payout_items_id";
ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "affiliate_audit_logs_id";
ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "affiliate_rate_limits_id";
DROP TYPE "public"."enum_affiliates_approval";
DROP TYPE "public"."enum_affiliates_commission_type";`)
}
