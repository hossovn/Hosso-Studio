import fs from 'fs'
import path from 'path'
import type { Payload } from 'payload'

/** Tạo tài khoản quản trị đầu tiên từ HOSSO_ADMIN_EMAIL / HOSSO_ADMIN_PASSWORD khi DB chưa có người dùng. */
export async function ensureAdmin(payload: Payload) {
  const email = process.env.HOSSO_ADMIN_EMAIL
  const password = process.env.HOSSO_ADMIN_PASSWORD
  if (email && password && (await payload.count({ collection: 'users' })).totalDocs === 0) {
    await payload.create({ collection: 'users', data: { email, password, roles: ['admin'] } })
    payload.logger.info(`Đã tạo tài khoản quản trị: ${email}`)
  }
}

/** Nạp trang mẫu trong seed/pages khi chưa có trang nào. */
export async function seedIfEmpty(payload: Payload) {

  if ((await payload.count({ collection: 'pages' })).totalDocs > 0) return

  const dir = path.resolve(process.env.HOSSO_SEED_DIR || path.join(process.cwd(), '../../seed'), 'pages')
  if (!fs.existsSync(dir)) return
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
    const page = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'))
    await payload.create({ collection: 'pages', data: { ...page, _status: 'published' } })
    payload.logger.info(`Đã nạp trang mẫu: ${page.slug}`)
  }
}
