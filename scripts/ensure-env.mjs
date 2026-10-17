// Creates apps/studio/.env from .env.example when missing and generates random secrets. / Tạo apps/studio/.env từ .env.example nếu chưa có, tự sinh các bí mật ngẫu nhiên.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'

const target = new URL('../apps/studio/.env', import.meta.url)
if (existsSync(target)) process.exit(0)

const fill = { HOSSO_SECRET: 48, HOSSO_ENCRYPTION_KEY: 32, HOSSO_ADMIN_PASSWORD: 12 }
const out = readFileSync(new URL('../.env.example', import.meta.url), 'utf8')
  .split('\n')
  .map((line) => {
    const key = line.split('=')[0]
    if (!(key in fill) || line.slice(key.length + 1) !== '') return line
    return `${key}=${randomBytes(fill[key]).toString('hex').slice(0, key === 'HOSSO_ENCRYPTION_KEY' ? 64 : fill[key] * 2)}`
  })
  .join('\n')

writeFileSync(target, out)
console.log(/^en/i.test(process.env.HOSSO_LANG || process.env.LC_ALL || process.env.LANG || '') ? 'Created apps/studio/.env (the admin account and password are in this file).' : 'Đã tạo apps/studio/.env (tài khoản admin và mật khẩu nằm trong file này).')
