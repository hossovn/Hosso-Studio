// Gói site đi từ SQLite sang Postgres: xuất từ SQLite (có dữ liệu mẫu) -> nhập vào Postgres -> xuất lại; hai gói phải cùng nội dung.
// Site package from SQLite to Postgres: export from SQLite (sample data) -> import into Postgres -> export again; both packages must match.
// Chạy: PG_URL=postgres://user:pass@host:5432/db node scripts/check-package-roundtrip.mjs   (DB Postgres phải trống / the Postgres DB must be empty)
import { say } from './lib/say.mjs'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const PG = process.env.PG_URL
if (!PG) throw new Error('PG_URL is required')
const { unzipSync } = createRequire(new URL('../apps/studio/package.json', import.meta.url))('fflate')
const tmp = mkdtempSync(join(tmpdir(), 'hosso-roundtrip-'))
const base = { ...process.env, HOSSO_SECRET: randomBytes(24).toString('hex'), HOSSO_ENCRYPTION_KEY: randomBytes(32).toString('hex'), HOSSO_ADMIN_EMAIL: 'rt@example.com', HOSSO_ADMIN_PASSWORD: randomBytes(9).toString('hex'), HOSSO_PUBLIC_URL: 'http://localhost:3000', HOSSO_MEDIA_DIR: join(tmp, 'media') }
const studio = (script, args, env) => execFileSync('pnpm', ['--filter', '@hosso/studio', script, ...args], { stdio: 'inherit', shell: true, env: { ...base, ...env } })

const sqlite = { HOSSO_DATABASE_URL: `file:${join(tmp, 'a.db').split('\\').join('/')}` }
const postgres = { HOSSO_DATABASE_URL: PG, HOSSO_SEED: 'false', NODE_ENV: 'production' } // chỉ có dữ liệu từ gói / only the package's data
const [a, b] = [join(tmp, 'a.zip'), join(tmp, 'b.zip')]

try {
  studio('studio:export', [a], sqlite)
  studio('migrate', [], postgres)
  studio('studio:import', [a], postgres)
  studio('studio:export', [b], postgres)

  const read = (f) => unzipSync(new Uint8Array(readFileSync(f)))
  const [za, zb] = [read(a), read(b)]
  assert.deepEqual(Object.keys(zb).sort(), Object.keys(za).sort(), 'the packages hold different files')
  // Xếp bản ghi theo slug để không phụ thuộc thứ tự trả về của từng DB. / Sort records by slug so DB ordering does not matter.
  const norm = (v) => (Array.isArray(v) ? v.map(norm).sort((x, y) => JSON.stringify(x).localeCompare(JSON.stringify(y))) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).filter(([, x]) => x !== null).sort(([x], [y]) => x.localeCompare(y)).map(([k, x]) => [k, norm(x)])) : v) // null và vắng mặt coi như nhau / null and absent are the same
  const diffs = []
  for (const name of Object.keys(za).filter((n) => n.endsWith('.json') && n !== 'manifest.json')) {
    const [x, y] = [norm(JSON.parse(Buffer.from(za[name]).toString())), norm(JSON.parse(Buffer.from(zb[name]).toString()))]
    try { assert.deepEqual(y, x) } catch (e) { diffs.push(`${name}\n${e.message.split('\n').slice(0, 90).join('\n')}`) }
  }
  for (const name of Object.keys(za).filter((n) => n.startsWith('media/'))) if (Buffer.compare(Buffer.from(za[name]), Buffer.from(zb[name])) !== 0) diffs.push(`${name} differs`)
  if (diffs.length) throw new Error(diffs.join('\n\n'))
  console.log(say('OK: gói site SQLite -> Postgres giữ nguyên nội dung.'))
} finally {
  if (process.env.KEEP_TMP) console.log(tmp)
  else rmSync(tmp, { recursive: true, force: true })
}
