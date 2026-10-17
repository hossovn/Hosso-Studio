import config from '@payload-config'
import hosso from '@hosso-config'
import { unzipSync, strFromU8 } from 'fflate'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { getPayload } from 'payload'

// pnpm studio:import <tệp.zip>
// Khôi phục gói đã xuất lên cài đặt sạch (DB đã chạy migration). Trang trùng slug được cập nhật; media trùng tên bị bỏ qua.
const input = process.argv[2]
if (!input) {
  console.error('Cách dùng: pnpm studio:import <tệp.zip>')
  process.exit(1)
}
const zip = unzipSync(new Uint8Array(fs.readFileSync(path.resolve(process.env.INIT_CWD || process.cwd(), input))))
const read = (name: string) => (zip[name] ? JSON.parse(strFromU8(zip[name])) : undefined)

const manifest = read('manifest.json')
if (manifest?.format !== 1) throw new Error('Gói không hợp lệ hoặc không đúng phiên bản định dạng.')

const payload = await getPayload({ config })

// Cảnh báo nếu theme/plugin của gói chưa có trên cài đặt này (nội dung vẫn nhập, block thiếu plugin sẽ bị bỏ qua).
for (const t of manifest.themes as string[]) {
  if (!hosso.themes.some((x) => x.manifest.name === t.split('@')[0])) console.warn(`Cảnh báo: theme "${t}" chưa được cài trong hosso.config.ts.`)
}
for (const p of manifest.plugins as string[]) {
  if (!hosso.plugins.some((x) => x.id === p)) console.warn(`Cảnh báo: plugin "${p}" chưa được cài; block của nó sẽ bị bỏ qua.`)
}

// Media trước (nội dung trang tham chiếu qua URL theo tên tệp).
const mediaDir = path.resolve(process.env.HOSSO_MEDIA_DIR || path.join(process.cwd(), 'media'))
for (const m of read('data/media.json') ?? []) {
  const exists = await payload.count({ collection: 'media', where: { filename: { equals: m.filename } } })
  if (exists.totalDocs) continue
  const tmp = path.join(os.tmpdir(), m.filename)
  fs.writeFileSync(tmp, zip[`media/${m.filename}`])
  await payload.create({ collection: 'media', data: { alt: m.alt || m.filename }, filePath: tmp })
  fs.rmSync(tmp, { force: true })
}
void mediaDir

// Tên tệp -> id media (đã nhập ở bước trên).
const mediaId = async (ref: { filename?: string } | null | undefined) => {
  if (!ref?.filename) return null
  const found = await payload.find({ collection: 'media', where: { filename: { equals: ref.filename } }, limit: 1, depth: 0 })
  return found.docs[0]?.id ?? null
}
const seoIn = async (seo: any) => (seo ? { title: seo.title, noindex: seo.noindex, image: await mediaId(seo.image) } : undefined)

// Trang.
let created = 0
let updated = 0
for (const p of read('data/pages.json') ?? []) {
  const existing = await payload.find({ collection: 'pages', where: { slug: { equals: p.slug } }, limit: 1, draft: true })
  const data = { title: p.title, slug: p.slug, description: p.description, content: p.content, seo: await seoIn(p.seo), _status: p.status }
  if (existing.docs[0]) {
    await payload.update({ collection: 'pages', id: existing.docs[0].id, data })
    updated++
  } else {
    await payload.create({ collection: 'pages', data })
    created++
  }
}

// Bài viết.
let postsDone = 0
for (const p of read('data/posts.json') ?? []) {
  const existing = await payload.find({ collection: 'posts', where: { slug: { equals: p.slug } }, limit: 1, draft: true })
  const data = { title: p.title, slug: p.slug, excerpt: p.excerpt, publishedAt: p.publishedAt, content: p.content, cover: await mediaId(p.cover), seo: await seoIn(p.seo), _status: p.status }
  if (existing.docs[0]) await payload.update({ collection: 'posts', id: existing.docs[0].id, data })
  else await payload.create({ collection: 'posts', data })
  postsDone++
}

// Cấu hình site (theme, token) và cấu hình plugin (không có bí mật).
const site = read('data/site-settings.json')
if (site) {
  for (const k of ['logo', 'favicon']) {
    const filename = site[k]?.filename
    const found = filename ? await payload.find({ collection: 'media', where: { filename: { equals: filename } }, limit: 1, depth: 0 }) : null
    site[k] = found?.docs[0]?.id ?? null
  }
  try {
    await payload.updateGlobal({ slug: 'site-settings', data: site })
  } catch (e: any) {
    console.error('Không nhập được cài đặt site:', JSON.stringify(e?.data?.errors ?? e?.message), 'giá trị theme =', site.theme)
    throw e
  }
}
for (const plugin of hosso.plugins) {
  for (const g of plugin.portable?.globals ?? []) {
    const data = read(`data/plugins/${g.slug}.json`)
    if (data) await payload.updateGlobal({ slug: g.slug as any, data })
  }
}

console.log(`Đã nhập: ${created} trang mới, ${updated} trang cập nhật, ${postsDone} bài viết.`)
if (manifest.secretsOmitted?.length) {
  console.log(`Cần nhập lại bí mật (gói không chứa): ${manifest.secretsOmitted.join(', ')}. Dùng admin hoặc biến môi trường HOSSO_WIM_API_KEY, HOSSO_WIM_WEBHOOK_SECRET.`)
}
process.exit(0)
