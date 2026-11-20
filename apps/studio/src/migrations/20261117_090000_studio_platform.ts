import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'
import { backfillEntrySearch } from '../lib/platform-search-backfill'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`CREATE TYPE "public"."enum_form_submissions_lead_status" AS ENUM('new', 'contacted', 'qualified', 'won', 'lost');
CREATE TYPE "public"."enum_form_deliveries_channel" AS ENUM('email', 'webhook');
CREATE TYPE "public"."enum_form_deliveries_status" AS ENUM('pending', 'sending', 'retry', 'sent', 'failed');
CREATE TYPE "public"."enum_shop_returns_resolution" AS ENUM('refund', 'exchange');
CREATE TYPE "public"."enum_shop_returns_state" AS ENUM('requested', 'approved', 'rejected', 'received', 'closed');
ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE 'form-delivery-sweep' BEFORE 'commerce-event-delivery';
ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE 'shop-return-retention' BEFORE 'shop-order-recovery';
ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE 'analytics-record-event' BEFORE 'schedulePublish';
ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE 'analytics-retention' BEFORE 'schedulePublish';
ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'form-delivery-sweep' BEFORE 'commerce-event-delivery';
ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'shop-return-retention' BEFORE 'shop-order-recovery';
ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'analytics-record-event' BEFORE 'schedulePublish';
ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'analytics-retention' BEFORE 'schedulePublish';
CREATE TABLE "form_deliveries" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar NOT NULL,
	"submission_id" integer NOT NULL,
	"channel" "enum_form_deliveries_channel" NOT NULL,
	"destination" varchar NOT NULL,
	"status" "enum_form_deliveries_status" DEFAULT 'pending',
	"attempts" numeric DEFAULT 0,
	"next_at" timestamp(3) with time zone,
	"lease_until" timestamp(3) with time zone,
	"lease_token" varchar,
	"sent_at" timestamp(3) with time zone,
	"last_error" varchar,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "shop_saved_carts" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner" varchar NOT NULL,
	"generation" varchar,
	"lines" jsonb DEFAULT '[]'::jsonb,
	"revision" numeric DEFAULT 0,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "shop_returns" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_key" varchar NOT NULL,
	"order_id" integer NOT NULL,
	"order_no" varchar NOT NULL,
	"items" jsonb NOT NULL,
	"reason" varchar NOT NULL,
	"resolution" "enum_shop_returns_resolution" DEFAULT 'refund',
	"state" "enum_shop_returns_state" DEFAULT 'requested',
	"revision" numeric DEFAULT 0,
	"evidence" jsonb DEFAULT '[]'::jsonb,
	"refund_amount" numeric DEFAULT 0,
	"restocked" boolean DEFAULT false,
	"refund_reference" varchar,
	"history" jsonb DEFAULT '[]'::jsonb,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "analytics_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar NOT NULL,
	"event" varchar NOT NULL,
	"page_path" varchar,
	"campaign" varchar,
	"source" varchar,
	"session" varchar,
	"value" numeric,
	"reference" varchar,
	"experiments" jsonb,
	"experiment_key" varchar,
	"variant" varchar,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "content_entries_locales" ADD COLUMN "search_text" varchar;
ALTER TABLE "content_types" ADD COLUMN "detail_template_id" integer;
ALTER TABLE "form_submissions" ADD COLUMN "submission_key" varchar;
ALTER TABLE "form_submissions" ADD COLUMN "lead_status" "enum_form_submissions_lead_status" DEFAULT 'new';
ALTER TABLE "form_submissions" ADD COLUMN "assigned_to_id" integer;
ALTER TABLE "form_submissions" ADD COLUMN "notes" jsonb DEFAULT '[]'::jsonb;
ALTER TABLE "form_submissions" ADD COLUMN "attribution" jsonb;
ALTER TABLE "form_submissions" ADD COLUMN "experiments" jsonb;
ALTER TABLE "form_submissions" ADD COLUMN "revision" numeric DEFAULT 0;
ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "form_deliveries_id" integer;
ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "shop_saved_carts_id" integer;
ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "shop_returns_id" integer;
ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "analytics_events_id" integer;
ALTER TABLE "form_deliveries" ADD CONSTRAINT "form_deliveries_submission_id_form_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."form_submissions"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "shop_returns" ADD CONSTRAINT "shop_returns_order_id_shop_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."shop_orders"("id") ON DELETE set null ON UPDATE no action;
CREATE UNIQUE INDEX "form_deliveries_key_idx" ON "form_deliveries" USING btree ("key");
CREATE INDEX "form_deliveries_submission_idx" ON "form_deliveries" USING btree ("submission_id");
CREATE INDEX "form_deliveries_status_idx" ON "form_deliveries" USING btree ("status");
CREATE INDEX "form_deliveries_next_at_idx" ON "form_deliveries" USING btree ("next_at");
CREATE INDEX "form_deliveries_lease_until_idx" ON "form_deliveries" USING btree ("lease_until");
CREATE INDEX "form_deliveries_updated_at_idx" ON "form_deliveries" USING btree ("updated_at");
CREATE INDEX "form_deliveries_created_at_idx" ON "form_deliveries" USING btree ("created_at");
CREATE UNIQUE INDEX "shop_saved_carts_owner_idx" ON "shop_saved_carts" USING btree ("owner");
CREATE INDEX "shop_saved_carts_updated_at_idx" ON "shop_saved_carts" USING btree ("updated_at");
CREATE INDEX "shop_saved_carts_created_at_idx" ON "shop_saved_carts" USING btree ("created_at");
CREATE UNIQUE INDEX "shop_returns_request_key_idx" ON "shop_returns" USING btree ("request_key");
CREATE INDEX "shop_returns_order_idx" ON "shop_returns" USING btree ("order_id");
CREATE INDEX "shop_returns_state_idx" ON "shop_returns" USING btree ("state");
CREATE INDEX "shop_returns_updated_at_idx" ON "shop_returns" USING btree ("updated_at");
CREATE INDEX "shop_returns_created_at_idx" ON "shop_returns" USING btree ("created_at");
CREATE UNIQUE INDEX "analytics_events_key_idx" ON "analytics_events" USING btree ("key");
CREATE INDEX "analytics_events_event_idx" ON "analytics_events" USING btree ("event");
CREATE INDEX "analytics_events_page_path_idx" ON "analytics_events" USING btree ("page_path");
CREATE INDEX "analytics_events_campaign_idx" ON "analytics_events" USING btree ("campaign");
CREATE INDEX "analytics_events_session_idx" ON "analytics_events" USING btree ("session");
CREATE INDEX "analytics_events_experiment_key_idx" ON "analytics_events" USING btree ("experiment_key");
CREATE INDEX "analytics_events_variant_idx" ON "analytics_events" USING btree ("variant");
CREATE INDEX "analytics_events_updated_at_idx" ON "analytics_events" USING btree ("updated_at");
CREATE INDEX "analytics_events_created_at_idx" ON "analytics_events" USING btree ("created_at");
ALTER TABLE "content_types" ADD CONSTRAINT "content_types_detail_template_id_pages_id_fk" FOREIGN KEY ("detail_template_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_form_deliveries_fk" FOREIGN KEY ("form_deliveries_id") REFERENCES "public"."form_deliveries"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_shop_saved_carts_fk" FOREIGN KEY ("shop_saved_carts_id") REFERENCES "public"."shop_saved_carts"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_shop_returns_fk" FOREIGN KEY ("shop_returns_id") REFERENCES "public"."shop_returns"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_analytics_events_fk" FOREIGN KEY ("analytics_events_id") REFERENCES "public"."analytics_events"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "content_entries_search_text_idx" ON "content_entries_locales" USING btree ("search_text","_locale");
CREATE INDEX "content_types_detail_template_idx" ON "content_types" USING btree ("detail_template_id");
CREATE UNIQUE INDEX "form_submissions_submission_key_idx" ON "form_submissions" USING btree ("submission_key");
CREATE INDEX "form_submissions_lead_status_idx" ON "form_submissions" USING btree ("lead_status");
CREATE INDEX "form_submissions_assigned_to_idx" ON "form_submissions" USING btree ("assigned_to_id");
CREATE INDEX "payload_locked_documents_rels_form_deliveries_id_idx" ON "payload_locked_documents_rels" USING btree ("form_deliveries_id");
CREATE INDEX "payload_locked_documents_rels_shop_saved_carts_id_idx" ON "payload_locked_documents_rels" USING btree ("shop_saved_carts_id");
CREATE INDEX "payload_locked_documents_rels_shop_returns_id_idx" ON "payload_locked_documents_rels" USING btree ("shop_returns_id");
CREATE INDEX "payload_locked_documents_rels_analytics_events_id_idx" ON "payload_locked_documents_rels" USING btree ("analytics_events_id");`)
  await backfillEntrySearch(db)
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  throw new Error('Platform leads, returns and analytics history are forward-only. Restore the pre-upgrade database backup to roll back.')
}
