import config from '@payload-config'
import hosso from '@hosso-config'
import { zipSync, strToU8 } from 'fflate'
import fs from 'fs'
import path from 'path'
import { getPayload } from 'payload'

// pnpm studio:export [tệp.zip]
// Gói gồm: nội dung và cấu trúc trang, cấu hình theme/site, cấu hình plugin (KHÔNG có khóa/bí mật), media.
// Không gồm: tài khoản người dùng, tin nhắn liên hệ, đơn hàng (do WIM làm chủ).
const out = path.resolve(process.env.INIT_CWD || process.cwd(), process.argv[2] || `hosso-site-${new Date().toISOString().slice(0, 10)}.zip`)

const payload = await getPayload({ config })
const files: Record<string, Uint8Array> = {}
const json = (name: string, data: unknown) => (files[name] = strToU8(JSON.stringify(data, null, 2)))

// Trang: bản đã xuất bản (hoặc bản nháp nếu chưa từng xuất bản).
const pages = await payload.find({ collection: 'pages', limit: 1000, depth: 0, pagination: false, draft: false, overrideAccess: true })
json(
  'data/pages.json',
  pages.docs.map((p) => ({ title: p.title, slug: p.slug, description: p.description, content: p.content, status: p._status ?? 'draft' })),
)

// Cấu hình site (theme + token). Bỏ các trường hệ thống.
const strip = (doc: Record<string, any>) => {
  const { id, createdAt, updatedAt, globalType, ...rest } = doc
  return rest
}
json('data/site-settings.json', strip(await payload.findGlobal({ slug: 'site-settings', overrideAccess: true })))

// Cấu hình plugin: chỉ các global plugin khai báo là "portable"; trường bí mật bị bỏ khỏi gói.
const secretsOmitted: string[] = []
for (const plugin of hosso.plugins) {
  for (const g of plugin.portable?.globals ?? []) {
    const doc = strip((await payload.findGlobal({ slug: g.slug as any, overrideAccess: true, context: {} })) as Record<string, any>)
    for (const f of g.secretFields) {
      if (doc[f]) secretsOmitted.push(`${g.slug}.${f}`)
      delete doc[f]
    }
    json(`data/plugins/${g.slug}.json`, doc)
  }
}

// Media: metadata + tệp.
const media = await payload.find({ collection: 'media', limit: 1000, depth: 0, pagination: false, overrideAccess: true })
const mediaDir = path.resolve(process.env.HOSSO_MEDIA_DIR || path.join(process.cwd(), 'media'))
const mediaMeta = []
for (const m of media.docs) {
  const file = path.join(mediaDir, m.filename ?? '')
  if (m.filename && fs.existsSync(file)) {
    files[`media/${m.filename}`] = new Uint8Array(fs.readFileSync(file))
    mediaMeta.push({ filename: m.filename, alt: m.alt, mimeType: m.mimeType })
  }
}
json('data/media.json', mediaMeta)

json('manifest.json', {
  format: 1,
  product: hosso.brand.name,
  exportedAt: new Date().toISOString(),
  themes: hosso.themes.map((t) => `${t.manifest.name}@${t.manifest.version}`),
  plugins: hosso.plugins.map((p) => p.id),
  counts: { pages: pages.docs.length, media: mediaMeta.length },
  secretsOmitted,
})

fs.writeFileSync(out, zipSync(files))
console.log(`Đã xuất ${pages.docs.length} trang, ${mediaMeta.length} media -> ${out}`)
if (secretsOmitted.length) console.log(`Không kèm bí mật: ${secretsOmitted.join(', ')} (nhập lại trong admin hoặc đặt bằng biến môi trường HOSSO_WIM_*).`)
process.exit(0)
