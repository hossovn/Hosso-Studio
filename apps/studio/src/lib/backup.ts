import fs from 'fs'
import path from 'path'
import type { Payload } from 'payload'

import { buildSitePackage } from './site-package'

const dir = () => path.resolve(process.env.HOSSO_BACKUP_DIR || path.join(process.cwd(), 'backups'))

/** Sao lưu gói site (nội dung + media + cấu hình, không bí mật) vào thư mục sao lưu; giữ HOSSO_BACKUP_KEEP bản mới nhất (mặc định 14). */
export async function createBackup(payload: Payload) {
  fs.mkdirSync(dir(), { recursive: true })
  const r = await buildSitePackage(payload)
  const name = `hosso-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.zip`
  fs.writeFileSync(path.join(dir(), name), r.data)
  const keep = Math.max(1, Number(process.env.HOSSO_BACKUP_KEEP ?? 14))
  for (const old of listBackups().slice(keep)) fs.rmSync(path.join(dir(), old.name), { force: true })
  return { name, size: r.data.length, pages: r.pages, posts: r.posts, media: r.media }
}

export function listBackups() {
  if (!fs.existsSync(dir())) return []
  return fs
    .readdirSync(dir())
    .filter((f) => /^hosso-backup-.*\.zip$/.test(f))
    .map((name) => ({ name, size: fs.statSync(path.join(dir(), name)).size }))
    .sort((a, b) => b.name.localeCompare(a.name))
}

export const backupPath = (name: string) => (/^hosso-backup-[\w-]+\.zip$/.test(name) ? path.join(dir(), name) : null)

/** Mẫu site cài một lệnh: các tệp .hosso-site.zip trong HOSSO_TEMPLATES_DIR (mặc định seed/sites của repo). */
export const templatesDir = () => path.resolve(process.env.HOSSO_TEMPLATES_DIR || path.join(process.cwd(), '..', '..', 'seed', 'sites'))

export function listTemplates() {
  const d = templatesDir()
  if (!fs.existsSync(d)) return []
  return fs
    .readdirSync(d)
    .filter((f) => f.endsWith('.hosso-site.zip'))
    .map((f) => ({ id: f.replace(/\.hosso-site\.zip$/, ''), size: fs.statSync(path.join(d, f)).size }))
}

export const templatePath = (id: string) => (/^[\w-]+$/.test(id) ? path.join(templatesDir(), `${id}.hosso-site.zip`) : null)
