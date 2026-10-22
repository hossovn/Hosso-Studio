import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_bookings_status" AS ENUM('new', 'confirmed', 'cancelled');
  CREATE TABLE "bookings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"phone" varchar NOT NULL,
  	"email" varchar,
  	"service" varchar,
  	"date" varchar NOT NULL,
  	"time" varchar,
  	"guests" numeric,
  	"note" varchar,
  	"status" "enum_bookings_status" DEFAULT 'new',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "site_settings" ADD COLUMN "maintenance_mode" boolean DEFAULT false;
  ALTER TABLE "site_settings_locales" ADD COLUMN "maintenance_message" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "bookings_id" integer;
  CREATE INDEX "bookings_updated_at_idx" ON "bookings" USING btree ("updated_at");
  CREATE INDEX "bookings_created_at_idx" ON "bookings" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_bookings_fk" FOREIGN KEY ("bookings_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_bookings_id_idx" ON "payload_locked_documents_rels" USING btree ("bookings_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_bookings_fk";
  DROP INDEX "payload_locked_documents_rels_bookings_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "bookings_id";
  ALTER TABLE "site_settings_locales" DROP COLUMN "maintenance_message";
  ALTER TABLE "site_settings" DROP COLUMN "maintenance_mode";
  DROP TABLE "bookings" CASCADE;
  DROP TYPE "public"."enum_bookings_status";`)
}
