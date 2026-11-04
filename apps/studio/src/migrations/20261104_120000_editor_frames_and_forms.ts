import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "forms" ADD COLUMN IF NOT EXISTS "rules" jsonb;
    CREATE TABLE IF NOT EXISTS "editor_reviews" (
      "id" serial PRIMARY KEY NOT NULL,
      "scope" varchar NOT NULL,
      "target_collection" varchar NOT NULL,
      "target_id" varchar NOT NULL,
      "language" varchar NOT NULL,
      "owner" varchar NOT NULL,
      "element" varchar,
      "x" numeric NOT NULL,
      "y" numeric NOT NULL,
      "parent_id" varchar,
      "body" varchar NOT NULL,
      "author_id" varchar NOT NULL,
      "author_name" varchar NOT NULL,
      "resolved" boolean DEFAULT false,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE INDEX IF NOT EXISTS "editor_reviews_scope_idx" ON "editor_reviews" ("scope");
    CREATE INDEX IF NOT EXISTS "editor_reviews_parent_id_idx" ON "editor_reviews" ("parent_id");
    CREATE INDEX IF NOT EXISTS "editor_reviews_updated_at_idx" ON "editor_reviews" ("updated_at");
    CREATE INDEX IF NOT EXISTS "editor_reviews_created_at_idx" ON "editor_reviews" ("created_at");
  `)
}
export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS "editor_reviews"; ALTER TABLE "forms" DROP COLUMN IF EXISTS "rules";`)
}
