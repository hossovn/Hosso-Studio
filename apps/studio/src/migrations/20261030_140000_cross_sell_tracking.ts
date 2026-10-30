import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE IF NOT EXISTS 'cross-sell-sync' BEFORE 'schedulePublish';
ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE IF NOT EXISTS 'cross-sell-sync' BEFORE 'schedulePublish';
CREATE TABLE "cross_sell_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar NOT NULL,
	"purchase_key" varchar NOT NULL,
	"transfer_id" integer,
	"partner_id" integer NOT NULL,
	"kind" varchar NOT NULL,
	"source" varchar NOT NULL,
	"actor" varchar NOT NULL,
	"occurred_at" timestamp(3) with time zone NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "cross_sell_partners" ADD COLUMN "webhook_secret_env" varchar;
ALTER TABLE "cross_sell_transfers" ADD COLUMN "local_status" varchar;
ALTER TABLE "cross_sell_transfers" ADD COLUMN "local_payment_status" varchar;
ALTER TABLE "cross_sell_transfers" ADD COLUMN "remote_paid" boolean;
ALTER TABLE "cross_sell_transfers" ADD COLUMN "remote_updated_at" timestamp(3) with time zone;
ALTER TABLE "cross_sell_transfers" ADD COLUMN "remote_changed_at" timestamp(3) with time zone;
ALTER TABLE "cross_sell_transfers" ADD COLUMN "sync_error" varchar;
ALTER TABLE "cross_sell_transfers" ADD COLUMN "dispatch_started_at" timestamp(3) with time zone;
ALTER TABLE "cross_sell_transfers" ADD COLUMN "sync_attempt_at" timestamp(3) with time zone;
ALTER TABLE "cross_sell_transfers" ADD COLUMN "next_sync_at" timestamp(3) with time zone;
ALTER TABLE "payload_jobs" ADD COLUMN "meta" jsonb;
ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "cross_sell_events_id" integer;
ALTER TABLE "cross_sell_events" ADD CONSTRAINT "cross_sell_events_transfer_id_cross_sell_transfers_id_fk" FOREIGN KEY ("transfer_id") REFERENCES "public"."cross_sell_transfers"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "cross_sell_events" ADD CONSTRAINT "cross_sell_events_partner_id_cross_sell_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."cross_sell_partners"("id") ON DELETE set null ON UPDATE no action;
CREATE UNIQUE INDEX "cross_sell_events_key_idx" ON "cross_sell_events" USING btree ("key");
CREATE INDEX "cross_sell_events_purchase_key_idx" ON "cross_sell_events" USING btree ("purchase_key");
CREATE INDEX "cross_sell_events_transfer_idx" ON "cross_sell_events" USING btree ("transfer_id");
CREATE INDEX "cross_sell_events_partner_idx" ON "cross_sell_events" USING btree ("partner_id");
CREATE INDEX "cross_sell_events_updated_at_idx" ON "cross_sell_events" USING btree ("updated_at");
CREATE INDEX "cross_sell_events_created_at_idx" ON "cross_sell_events" USING btree ("created_at");
CREATE INDEX "transfer_occurredAt_idx" ON "cross_sell_events" USING btree ("transfer_id","occurred_at");
ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_cross_sell_events_fk" FOREIGN KEY ("cross_sell_events_id") REFERENCES "public"."cross_sell_events"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "cross_sell_transfers_next_sync_at_idx" ON "cross_sell_transfers" USING btree ("next_sync_at");
CREATE INDEX "payload_locked_documents_rels_cross_sell_events_id_idx" ON "payload_locked_documents_rels" USING btree ("cross_sell_events_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // PostgreSQL enum values stay valid for any jobs retained after rollback.
  await db.execute(sql`ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_cross_sell_events_fk";
ALTER TABLE "cross_sell_events" DISABLE ROW LEVEL SECURITY;
DROP TABLE "cross_sell_events" CASCADE;

DROP INDEX "cross_sell_transfers_next_sync_at_idx";
DROP INDEX "payload_locked_documents_rels_cross_sell_events_id_idx";
ALTER TABLE "cross_sell_partners" DROP COLUMN "webhook_secret_env";
ALTER TABLE "cross_sell_transfers" DROP COLUMN "local_status";
ALTER TABLE "cross_sell_transfers" DROP COLUMN "local_payment_status";
ALTER TABLE "cross_sell_transfers" DROP COLUMN "remote_paid";
ALTER TABLE "cross_sell_transfers" DROP COLUMN "remote_updated_at";
ALTER TABLE "cross_sell_transfers" DROP COLUMN "remote_changed_at";
ALTER TABLE "cross_sell_transfers" DROP COLUMN "sync_error";
ALTER TABLE "cross_sell_transfers" DROP COLUMN "dispatch_started_at";
ALTER TABLE "cross_sell_transfers" DROP COLUMN "sync_attempt_at";
ALTER TABLE "cross_sell_transfers" DROP COLUMN "next_sync_at";
ALTER TABLE "payload_jobs" DROP COLUMN "meta";
ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "cross_sell_events_id";`)
}
