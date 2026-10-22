// Admin translation check: every T('...') / L('...') string (and block labels and config labels) must have an English version.
// Kiểm tra bản dịch admin: mọi chuỗi T('...') / L('...') (và nhãn block, nhãn cấu hình) phải có bản tiếng Anh.
// Chạy: node scripts/check-i18n.mjs   (thoát mã 1 nếu thiếu)
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const EN = /^en/i.test(process.env.HOSSO_LANG || process.env.LC_ALL || process.env.LANG || '')
const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? (f === 'node_modules' || f === '.next' ? [] : walk(join(d, f))) : [join(d, f)]))
const unesc = (s) => s.split("\\'").join("'")
const dictKeys = (file) => new Set([...readFileSync(join(root, file), 'utf8').matchAll(/(?:^|,)\s*'((?:[^'\\]|\\.)*)':/gm)].map((m) => unesc(m[1])))
const NON_ASCII = /[^\x00-\x7f]/
const WORDY = /[^\x00-\x7f]|[a-z]{3}/i

const studioDict = new Set()
for (const f of readdirSync(join(root, 'apps/studio/src/lib/admin-en'))) if (f !== 'config.ts') for (const k of dictKeys(`apps/studio/src/lib/admin-en/${f}`)) studioDict.add(k)
const blockDict = dictKeys('packages/blocks/src/labels-en.ts')
let wimDict = new Set()
try {
  wimDict = dictKeys('packages/plugin-wim/src/admin-en.ts')
} catch {
  /* repo công khai không có plugin-wim */
}
const configDict = dictKeys('apps/studio/src/lib/admin-en/config.ts')

const missing = []
// L('vi', 'en') có hai đối số là hàm của máy chủ/CLI (tự mang bản tiếng Anh): bỏ qua; chỉ kiểm L('vi') một đối số và T('vi').
const calls = /\b(T|L)\(\s*'((?:[^'\\]|\\.)*)'\s*(?=[,)])(?!\s*,\s*['`])/g
for (const file of [...walk(join(root, 'apps/studio/src')), ...walk(join(root, 'packages/blocks/src'))].filter((f) => /\.tsx?$/.test(f))) {
  const src = readFileSync(file, 'utf8')
  for (const m of src.matchAll(calls)) {
    const key = unesc(m[2])
    if (!WORDY.test(key)) continue
    const ok = m[1] === 'T' ? studioDict.has(key) || configDict.has(key) || wimDict.has(key) : blockDict.has(key) || studioDict.has(key) || wimDict.has(key)
    if (!ok) missing.push(`${file.replace(root, '')}: ${m[1]}('${key}')`)
  }
}
// Nhãn khai báo trong schema block và cấu hình collection/global
const schemaLabel = /(?:label|placeholder|description)\s*:\s*'((?:[^'\\]|\\.)*)'/g
const blockSrc = readFileSync(join(root, 'packages/blocks/src/core-blocks.ts'), 'utf8')
for (const m of blockSrc.matchAll(schemaLabel)) if (NON_ASCII.test(m[1]) && !blockDict.has(unesc(m[1]))) missing.push(`core-blocks.ts: '${m[1]}'`)
for (const file of [...walk(join(root, 'apps/studio/src/collections')), ...walk(join(root, 'apps/studio/src/globals')), join(root, 'apps/studio/src/lib/content.ts')]) {
  const src = readFileSync(file, 'utf8')
  for (const m of src.matchAll(/(?:label|description|placeholder|singular|plural|group)\s*:\s*'((?:[^'\\]|\\.)*)'/g)) {
    const k = unesc(m[1])
    if (NON_ASCII.test(k) && !configDict.has(k)) missing.push(`${file.replace(root, '')}: '${k}'`)
  }
}
if (missing.length) {
  console.log((EN ? `Missing English text (${missing.length}):\n` : `Thiếu bản tiếng Anh (${missing.length}):\n`) + [...new Set(missing)].join('\n'))
  process.exit(1)
}
console.log(EN ? 'The admin translations are complete.' : 'Bản dịch admin đầy đủ.')
