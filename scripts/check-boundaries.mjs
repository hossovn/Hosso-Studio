// Lõi, blocks và theme không được tham chiếu plugin-wim.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, sep } from 'node:path'

const roots = ['apps/studio', 'packages/blocks', ...readdirSync('packages').filter((d) => d.startsWith('theme-')).map((d) => `packages/${d}`)]
const skip = new Set(['node_modules', '.next', 'data', 'media', 'importMap.js'])
// Hai nơi duy nhất được nhắc plugin: khai báo cấu hình site và phụ thuộc của app.
const allowed = new Set(['apps/studio/hosso.config.ts', 'apps/studio/package.json'])
const bad = []

const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    if (skip.has(name)) continue
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p)
    else if (/\.(tsx?|jsx?|mjs|json)$/.test(name) && !allowed.has(p.split(sep).join('/')) && /plugin-wim/.test(readFileSync(p, 'utf8'))) bad.push(p)
  }
}
roots.forEach(walk)

if (bad.length) {
  console.error('Vi phạm ranh giới (nhắc đến plugin-wim):\n' + bad.join('\n'))
  process.exit(1)
}
console.log('OK: lõi, blocks, theme không tham chiếu plugin-wim.')
