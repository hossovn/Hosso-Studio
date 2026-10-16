// Lõi, blocks và theme không được tham chiếu plugin-wim.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const roots = ['apps/studio', 'packages/blocks', ...readdirSync('packages').filter((d) => d.startsWith('theme-')).map((d) => `packages/${d}`)]
const skip = new Set(['node_modules', '.next', 'data', 'media'])
const bad = []

const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    if (skip.has(name)) continue
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p)
    else if (/\.(tsx?|jsx?|mjs|json)$/.test(name) && /plugin-wim/.test(readFileSync(p, 'utf8'))) bad.push(p)
  }
}
roots.forEach(walk)

if (bad.length) {
  console.error('Vi phạm ranh giới (nhắc đến plugin-wim):\n' + bad.join('\n'))
  process.exit(1)
}
console.log('OK: lõi, blocks, theme không tham chiếu plugin-wim.')
