import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`CREATE TYPE "public"."enum_commerce_events_kind" AS ENUM('onOrderPaid', 'onOrderStatusChanged');
CREATE TYPE "public"."enum_commerce_events_state" AS ENUM('pending', 'processing', 'done', 'failed');
CREATE TYPE "public"."enum_shop_orders_approval_state" AS ENUM('awaiting', 'approved', 'rejected');
CREATE TYPE "public"."enum_shop_orders_fulfillment_intent" AS ENUM('shipping', 'completed');
CREATE TYPE "public"."enum_shop_orders_customer_decision" AS ENUM('accept_available', 'cancel_all');
CREATE TYPE "public"."enum_shop_order_groups_state" AS ENUM('pending', 'processing', 'accepted', 'missing', 'unknown', 'cancelling', 'cancelled', 'fulfilled', 'attention');
CREATE TYPE "public"."enum_shop_order_groups_intent" AS ENUM('process', 'cancel');
CREATE TYPE "public"."enum_payment_transactions_state" AS ENUM('unmatched', 'allocated');
ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE 'commerce-event-delivery' BEFORE 'shop-order-recovery';
ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'commerce-event-delivery' BEFORE 'shop-order-recovery';
CREATE TABLE "commerce_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar NOT NULL,
	"kind" "enum_commerce_events_kind" NOT NULL,
	"consumer" varchar NOT NULL,
	"body" jsonb NOT NULL,
	"order_no" varchar NOT NULL,
	"state" "enum_commerce_events_state" DEFAULT 'pending' NOT NULL,
	"attempts" numeric DEFAULT 0,
	"next_attempt_at" timestamp(3) with time zone,
	"lease_until" timestamp(3) with time zone,
	"lease_token" varchar,
	"last_error" varchar,
	"completed_at" timestamp(3) with time zone,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "commerce_rate_buckets" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar NOT NULL,
	"count" numeric DEFAULT 0,
	"expires_at" timestamp(3) with time zone,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "shop_order_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar NOT NULL,
	"order_id" integer NOT NULL,
	"source" varchar NOT NULL,
	"label" varchar NOT NULL,
	"plan" jsonb NOT NULL,
	"result" jsonb,
	"committed" boolean DEFAULT false,
	"state" "enum_shop_order_groups_state" DEFAULT 'pending' NOT NULL,
	"intent" "enum_shop_order_groups_intent" DEFAULT 'process',
	"stock_reserved" boolean DEFAULT false,
	"stock_released" boolean DEFAULT false,
	"attempts" numeric DEFAULT 0,
	"next_attempt_at" timestamp(3) with time zone,
	"lease_token" varchar,
	"lease_until" timestamp(3) with time zone,
	"issue" varchar,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "payment_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar NOT NULL,
	"provider" varchar NOT NULL,
	"reference" varchar NOT NULL,
	"body_hash" varchar NOT NULL,
	"order_no" varchar,
	"amount" numeric NOT NULL,
	"currency" varchar DEFAULT 'VND' NOT NULL,
	"account_number" varchar,
	"state" "enum_payment_transactions_state" DEFAULT 'unmatched' NOT NULL,
	"received_at" timestamp(3) with time zone NOT NULL,
	"actor" varchar,
	"reason" varchar,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "payment_refunds" (
	"id" serial PRIMARY KEY NOT NULL,
	"reference" varchar NOT NULL,
	"order_no" varchar NOT NULL,
	"amount" numeric NOT NULL,
	"reason" varchar NOT NULL,
	"actor" varchar NOT NULL,
	"paid_at" timestamp(3) with time zone NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "cross_sell_cancellations" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "shop_orders" ADD COLUMN "workflow_version" numeric;
ALTER TABLE "shop_orders" ADD COLUMN "approval_state" "enum_shop_orders_approval_state";
ALTER TABLE "shop_orders" ADD COLUMN "approved_at" timestamp(3) with time zone;
ALTER TABLE "shop_orders" ADD COLUMN "approved_by" varchar;
ALTER TABLE "shop_orders" ADD COLUMN "workflow_state" varchar;
ALTER TABLE "shop_orders" ADD COLUMN "fulfillment_intent" "enum_shop_orders_fulfillment_intent";
ALTER TABLE "shop_orders" ADD COLUMN "processing_plan" jsonb;
ALTER TABLE "shop_orders" ADD COLUMN "customer_decision" "enum_shop_orders_customer_decision";
ALTER TABLE "shop_orders" ADD COLUMN "decision_at" timestamp(3) with time zone;
ALTER TABLE "shop_orders" ADD COLUMN "decision_revision" numeric DEFAULT 0;
ALTER TABLE "shop_orders" ADD COLUMN "reservation_expires_at" timestamp(3) with time zone;
ALTER TABLE "shop_orders" ADD COLUMN "original_total" numeric;
ALTER TABLE "shop_orders" ADD COLUMN "refund_due" numeric DEFAULT 0;
ALTER TABLE "payments" ADD COLUMN "version" numeric DEFAULT 0;
ALTER TABLE "payments" ADD COLUMN "opening_paid_amount" numeric DEFAULT 0;
ALTER TABLE "payments" ADD COLUMN "refunded_amount" numeric DEFAULT 0;
ALTER TABLE "cross_sell_transfers" ADD COLUMN "workflow_key" varchar;
ALTER TABLE "cross_sell_transfers" ADD COLUMN "remote_refunded_amount" numeric DEFAULT 0;
ALTER TABLE "payload_jobs" ADD COLUMN "notify_order_no" varchar;
ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "commerce_events_id" integer;
ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "commerce_rate_buckets_id" integer;
ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "shop_order_groups_id" integer;
ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "payment_transactions_id" integer;
ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "payment_refunds_id" integer;
ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "cross_sell_cancellations_id" integer;
ALTER TABLE "shop_settings" ADD COLUMN "reservation_minutes" numeric DEFAULT 30;
ALTER TABLE "shop_order_groups" ADD CONSTRAINT "shop_order_groups_order_id_shop_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."shop_orders"("id") ON DELETE set null ON UPDATE no action;
CREATE UNIQUE INDEX "commerce_events_key_idx" ON "commerce_events" USING btree ("key");
CREATE INDEX "commerce_events_order_no_idx" ON "commerce_events" USING btree ("order_no");
CREATE INDEX "commerce_events_next_attempt_at_idx" ON "commerce_events" USING btree ("next_attempt_at");
CREATE INDEX "commerce_events_lease_until_idx" ON "commerce_events" USING btree ("lease_until");
CREATE INDEX "commerce_events_updated_at_idx" ON "commerce_events" USING btree ("updated_at");
CREATE INDEX "commerce_events_created_at_idx" ON "commerce_events" USING btree ("created_at");
CREATE UNIQUE INDEX "commerce_rate_buckets_key_idx" ON "commerce_rate_buckets" USING btree ("key");
CREATE INDEX "commerce_rate_buckets_expires_at_idx" ON "commerce_rate_buckets" USING btree ("expires_at");
CREATE INDEX "commerce_rate_buckets_updated_at_idx" ON "commerce_rate_buckets" USING btree ("updated_at");
CREATE INDEX "commerce_rate_buckets_created_at_idx" ON "commerce_rate_buckets" USING btree ("created_at");
CREATE UNIQUE INDEX "shop_order_groups_key_idx" ON "shop_order_groups" USING btree ("key");
CREATE INDEX "shop_order_groups_order_idx" ON "shop_order_groups" USING btree ("order_id");
CREATE INDEX "shop_order_groups_next_attempt_at_idx" ON "shop_order_groups" USING btree ("next_attempt_at");
CREATE INDEX "shop_order_groups_updated_at_idx" ON "shop_order_groups" USING btree ("updated_at");
CREATE INDEX "shop_order_groups_created_at_idx" ON "shop_order_groups" USING btree ("created_at");
CREATE UNIQUE INDEX "payment_transactions_key_idx" ON "payment_transactions" USING btree ("key");
CREATE INDEX "payment_transactions_order_no_idx" ON "payment_transactions" USING btree ("order_no");
CREATE INDEX "payment_transactions_updated_at_idx" ON "payment_transactions" USING btree ("updated_at");
CREATE INDEX "payment_transactions_created_at_idx" ON "payment_transactions" USING btree ("created_at");
CREATE UNIQUE INDEX "payment_refunds_reference_idx" ON "payment_refunds" USING btree ("reference");
CREATE INDEX "payment_refunds_order_no_idx" ON "payment_refunds" USING btree ("order_no");
CREATE INDEX "payment_refunds_updated_at_idx" ON "payment_refunds" USING btree ("updated_at");
CREATE INDEX "payment_refunds_created_at_idx" ON "payment_refunds" USING btree ("created_at");
CREATE UNIQUE INDEX "cross_sell_cancellations_key_idx" ON "cross_sell_cancellations" USING btree ("key");
CREATE INDEX "cross_sell_cancellations_updated_at_idx" ON "cross_sell_cancellations" USING btree ("updated_at");
CREATE INDEX "cross_sell_cancellations_created_at_idx" ON "cross_sell_cancellations" USING btree ("created_at");
ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_commerce_events_fk" FOREIGN KEY ("commerce_events_id") REFERENCES "public"."commerce_events"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_commerce_rate_buckets_fk" FOREIGN KEY ("commerce_rate_buckets_id") REFERENCES "public"."commerce_rate_buckets"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_shop_order_groups_fk" FOREIGN KEY ("shop_order_groups_id") REFERENCES "public"."shop_order_groups"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_payment_transactions_fk" FOREIGN KEY ("payment_transactions_id") REFERENCES "public"."payment_transactions"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_payment_refunds_fk" FOREIGN KEY ("payment_refunds_id") REFERENCES "public"."payment_refunds"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_cross_sell_cancellations_fk" FOREIGN KEY ("cross_sell_cancellations_id") REFERENCES "public"."cross_sell_cancellations"("id") ON DELETE cascade ON UPDATE no action;
CREATE UNIQUE INDEX "cross_sell_transfers_workflow_key_idx" ON "cross_sell_transfers" USING btree ("workflow_key");
CREATE INDEX "payload_jobs_notify_order_no_idx" ON "payload_jobs" USING btree ("notify_order_no");
CREATE INDEX "payload_locked_documents_rels_commerce_events_id_idx" ON "payload_locked_documents_rels" USING btree ("commerce_events_id");
CREATE INDEX "payload_locked_documents_rels_commerce_rate_buckets_id_idx" ON "payload_locked_documents_rels" USING btree ("commerce_rate_buckets_id");
CREATE INDEX "payload_locked_documents_rels_shop_order_groups_id_idx" ON "payload_locked_documents_rels" USING btree ("shop_order_groups_id");
CREATE INDEX "payload_locked_documents_rels_payment_transactions_id_idx" ON "payload_locked_documents_rels" USING btree ("payment_transactions_id");
CREATE INDEX "payload_locked_documents_rels_payment_refunds_id_idx" ON "payload_locked_documents_rels" USING btree ("payment_refunds_id");
CREATE INDEX "payload_locked_documents_rels_cross_sell_cancellations_i_idx" ON "payload_locked_documents_rels" USING btree ("cross_sell_cancellations_id");
UPDATE payments SET opening_paid_amount = COALESCE(paid_amount, 0);`)
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  throw new Error('Order commands and financial history are forward-only. Restore the pre-upgrade backup to roll back this release.')
}
