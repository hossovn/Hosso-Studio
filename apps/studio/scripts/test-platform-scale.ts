import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { getPayload } from 'payload'
import config from '../src/payload.config'
import { loadEntryRepeater } from '../src/lib/entry-repeater'

const url = process.env.HOSSO_DATABASE_URL || ''
assert.ok(url.startsWith('file:') && url.includes('hosso-studio-cms-'), 'Disposable SQLite fixture required')
const settings = await config
settings.jobs!.autoRun = []
const payload = await getPayload({ config: settings, disableOnInit: true })
try {
  const db = new DatabaseSync(url.slice(5))
  try {
    const entry = db.prepare('INSERT INTO content_entries (id, slug, kind, published) VALUES (?, ?, ?, ?)')
    const locale = db.prepare('INSERT INTO content_entries_locales (id, title, data, search_text, _locale, _parent_id) VALUES (?, ?, ?, ?, ?, ?)')
    db.exec('BEGIN')
    for (let id = 1; id <= 10000; id++) {
      entry.run(id, `scale-${id}`, 'team', 1)
      locale.run(id, `Member ${String(id).padStart(5, '0')}`, JSON.stringify({ role: 'Engineer', years: id }), 'engineer', 'vi', id)
    }
    db.exec('COMMIT')
  } finally { db.close() }
  const original = payload.find.bind(payload), reads: { collection: string; returned: number; limit: number | undefined }[] = []
  payload.find = (async (options: any) => { const result = await original(options); reads.push({ collection: options.collection, returned: result.docs.length, limit: options.limit }); return result }) as typeof payload.find
  const started = performance.now()
  const result = await loadEntryRepeater(payload, { entryKind: 'team', paginate: 'yes' }, { q: 'engineer', category: '', sort: 'title', page: 1667, size: 6 }, 'vi')
  const durationMs = Math.round(performance.now() - started)
  assert.equal(result.total, 10000)
  assert.equal(result.items.length, 4)
  assert.equal(result.items[0].title, 'Member 09997')
  assert.ok(reads.length <= 2)
  assert.equal(reads.filter((read) => read.collection === 'content-entries').reduce((sum, read) => sum + read.returned, 0), 4)
  console.log('PASS real 10,000-entry database: ' + JSON.stringify({ page: result.page, total: result.total, returned: result.items.length, durationMs, reads }))
} finally { await payload.destroy() }
process.exit(0)
