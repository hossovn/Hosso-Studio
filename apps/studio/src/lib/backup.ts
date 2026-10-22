import fs from 'fs'
import path from 'path'
import type { Payload } from 'payload'
import { strFromU8, unzipSync } from 'fflate'
import hosso from '@hosso-config'

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

/**
 * Mẫu site cài một lệnh: các tệp .hosso-site.zip trong HOSSO_TEMPLATES_DIR (mặc định seed/sites của repo)
 * và trong thư mục `templates` của từng package (packages/<tên>/templates, do plugin/theme đi kèm).
 */
export const templatesDirs = () => {
  if (process.env.HOSSO_TEMPLATES_DIR) return [path.resolve(process.env.HOSSO_TEMPLATES_DIR)]
  const root = path.join(process.cwd(), '..', '..')
  const pkgs = path.join(root, 'packages')
  const fromPackages = fs.existsSync(pkgs) ? fs.readdirSync(pkgs).map((n) => path.join(pkgs, n, 'templates')) : []
  return [path.join(root, 'seed', 'sites'), ...fromPackages].filter((d) => fs.existsSync(d))
}

export type WebsiteTemplate = { id: string; size: number; title: string; description: string; category: string; pages: { slug: string; title: string }[]; cover: string | null; missing: string[] }

export function templateDetails(file: string, id: string): WebsiteTemplate {
  const zip = unzipSync(new Uint8Array(fs.readFileSync(file)), { filter: (entry) => ['manifest.json', 'data/pages.json', 'data/site-settings.json'].includes(entry.name) })
  const read = (name: string) => zip[name] ? JSON.parse(strFromU8(zip[name])) : undefined
  const manifest = read('manifest.json')
  if (manifest?.format !== 2) throw new Error('Invalid website template')
  const locale = manifest.locales?.[0] ?? 'vi'
  const pages = read('data/pages.json') ?? []
  const home = pages.find((page: any) => page.slug === 'home')?.translations?.[locale]
  const blocks = home?.content?.content ?? []
  const image = blocks.map((block: any) => block.props?.slides?.[0]?.image || block.props?.image || block.props?._els?.find((element: any) => element.type === 'image')?.props?.src).find((src: unknown) => typeof src === 'string' && src.startsWith('/api/media/file/'))
  const filename = image ? decodeURIComponent(image.slice('/api/media/file/'.length).split(/[?#]/)[0]) : ''
  const cover = filename && !filename.includes('/') && !filename.includes('\\') && /\.(png|jpe?g|webp|gif|svg)$/i.test(filename) ? filename : null
  return {
    id, size: fs.statSync(file).size,
    title: read('data/site-settings.json')?.translations?.[locale]?.siteName || id,
    description: home?.description || '',
    category: manifest.category || ((manifest.plugins ?? []).includes('shop') ? 'Cửa hàng' : 'Khác'),
    pages: pages.map((page: any) => ({ slug: page.slug, title: page.translations?.[locale]?.title || page.slug })),
    cover,
    missing: [
      ...(manifest.themes ?? []).filter((name: string) => !hosso.themes.some((theme) => theme.manifest.name === name.split('@')[0])),
      ...(manifest.plugins ?? []).filter((id: string) => !hosso.plugins.some((plugin) => plugin.id === id)),
    ],
  }
}

export function listTemplates() {
  const seen = new Map<string, WebsiteTemplate>()
  for (const d of templatesDirs())
    for (const f of fs.readdirSync(d).filter((f) => /^[\w-]+\.hosso-site\.zip$/.test(f))) {
      const id = f.replace(/\.hosso-site\.zip$/, '')
      if (seen.has(id)) continue
      try {
        seen.set(id, templateDetails(path.join(d, f), id))
      } catch (error) {
        console.warn('Could not read website template:', id, error)
      }
    }
  return [...seen.values()]
}

export const templatePath = (id: string) => {
  if (!/^[\w-]+$/.test(id)) return null
  return templatesDirs().map((d) => path.join(d, `${id}.hosso-site.zip`)).find((p) => fs.existsSync(p)) ?? null
}
