import { sql, type MigrateUpArgs } from '@payloadcms/db-postgres'
export async function up({ db }: MigrateUpArgs) {
  await db.execute(sql`CREATE TABLE IF NOT EXISTS "managed_plugin_state" ("id" serial PRIMARY KEY, "key" varchar NOT NULL, "token" varchar NOT NULL);
    CREATE UNIQUE INDEX IF NOT EXISTS "managed_plugin_state_key_idx" ON "managed_plugin_state" ("key");`)
}
export async function down() {
  // Retain encrypted settings and the anti-replay checkpoint across an image
  // rollback. An older runtime can ignore this table; dropping it would erase
  // tenant credentials and permit an old lease after a later re-upgrade.
}
