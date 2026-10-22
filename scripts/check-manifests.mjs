// Kiểm tra phiếu thông tin hosso.json của mọi plugin và theme (nguồn cho trang Plugin trong admin và cho Store).
// Validate hosso.json of every plugin and theme (the source for the admin Plugins page and the Store).
import { say } from './lib/say.mjs'
import { existsSync, readFileSync, readdirSync } from 'node:fs'

const errors = []
const read = (p) => JSON.parse(readFileSync(p, 'utf8'))
const pairs = (v) => v && typeof v.vi === 'string' && v.vi && typeof v.en === 'string' && v.en

for (const dir of readdirSync('packages').filter((d) => /^(plugin|theme)-/.test(d) && existsSync(`packages/${d}/package.json`))) {
  const file = `packages/${dir}/hosso.json`
  const fail = (m) => errors.push(`${file}: ${m}`)
  if (!existsSync(file)) { fail('missing / thiếu phiếu'); continue }
  let m
  try { m = read(file) } catch { fail('invalid JSON'); continue }
  const [kind, id] = [dir.split('-')[0], dir.slice(dir.indexOf('-') + 1)]
  if (m.type !== kind) fail(`type must be "${kind}"`)
  if (m.id !== id) fail(`id must be "${id}"`)
  if (!pairs(m.name)) fail('name needs vi and en')
  if (!pairs(m.description)) fail('description needs vi and en')
  if (!/^\d+\.\d+\.\d+$/.test(m.version ?? '')) fail('version must be x.y.z')
  else if (m.version !== read(`packages/${dir}/package.json`).version) fail('version differs from package.json')
  if (typeof m.needsBuild !== 'boolean') fail('needsBuild must be true or false')
}

if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}
console.log(say('OK: phiếu hosso.json hợp lệ.'))
