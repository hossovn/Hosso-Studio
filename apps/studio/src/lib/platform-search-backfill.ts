import { sql, type MigrateUpArgs } from '@payloadcms/db-postgres'
import { searchText } from '../../../../packages/blocks/src/repeater-query'

// Payload discovers every TypeScript file inside migrations as an executable migration.
// Keep this shared helper outside that directory.
export async function backfillEntrySearch(db: MigrateUpArgs['db']) {
  let last = 0
  for (;;) {
    const result = await db.execute(sql`SELECT id, title, data FROM content_entries_locales WHERE id > ${last} ORDER BY id LIMIT 500`)
    if (!result.rows.length) break
    for (const row of result.rows as { id: number; title: string; data: Record<string, unknown> | null }[]) {
      const value = searchText([row.title, ...Object.values(row.data || {})].filter((item) => typeof item === 'string' || typeof item === 'number').join(' '))
      await db.execute(sql`UPDATE content_entries_locales SET search_text = ${value} WHERE id = ${row.id}`)
      last = Number(row.id)
    }
  }
}
