import hosso from '@hosso-config'
import fs from 'fs'
import path from 'path'
import type { Payload } from 'payload'

import { L } from './lang'

/** Tạo tài khoản quản trị đầu tiên từ HOSSO_ADMIN_EMAIL / HOSSO_ADMIN_PASSWORD khi DB chưa có người dùng. */
export async function ensureAdmin(payload: Payload) {
  const email = process.env.HOSSO_ADMIN_EMAIL
  const password = process.env.HOSSO_ADMIN_PASSWORD
  if (email && password && (await payload.count({ collection: 'users' })).totalDocs === 0) {
    await payload.create({ collection: 'users', data: { email, password, roles: ['admin'] } })
    payload.logger.info(`${L('Đã tạo tài khoản quản trị', 'Created the admin account')}: ${email}`)
  }
}

const readJson = (file: string) => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null)

/**
 * Nạp trang mẫu trong seed/pages khi chưa có trang nào. Ngôn ngữ đầu tiên của site lấy từ seed/pages/*.json và
 * seed/site-settings.json; các ngôn ngữ khác (ví dụ en) từ seed/pages/<mã>/*.json và seed/site-settings.<mã>.json nếu có.
 */
export async function seedIfEmpty(payload: Payload) {
  if ((await payload.count({ collection: 'pages' })).totalDocs > 0) return

  const seedRoot = path.resolve(process.env.HOSSO_SEED_DIR || path.join(process.cwd(), '../../seed'))
  const dir = path.join(seedRoot, 'pages')
  if (!fs.existsSync(dir)) return
  const [, ...otherLocales] = hosso.locales

  const settings = readJson(path.join(seedRoot, 'site-settings.json'))
  if (settings) await payload.updateGlobal({ slug: 'site-settings', data: settings })
  for (const l of otherLocales) {
    const tr = readJson(path.join(seedRoot, `site-settings.${l.code}.json`))
    if (tr) await payload.updateGlobal({ slug: 'site-settings', data: tr, locale: l.code as any })
  }

  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
    const page = readJson(path.join(dir, file))
    const created = await payload.create({ collection: 'pages', data: { ...page, _status: 'published' } })
    for (const l of otherLocales) {
      const tr = readJson(path.join(dir, l.code, file))
      if (tr) await payload.update({ collection: 'pages', id: created.id, data: { ...tr, _status: 'published' }, locale: l.code as any })
    }
    payload.logger.info(`${L('Đã nạp trang mẫu', 'Loaded sample page')}: ${page.slug}`)
  }
}
