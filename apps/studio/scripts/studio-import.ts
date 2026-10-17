import config from '@payload-config'
import hosso from '@hosso-config'
import { unzipSync, strFromU8 } from 'fflate'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { getPayload } from 'payload'

// pnpm studio:import <tệp.zip>
// Khôi phục gói (định dạng 2) lên cài đặt sạch (DB đã chạy migration). Bản ghi trùng slug được cập nhật; media trùng tên bị bỏ qua.
const input = process.argv[2]
if (!input) {
  console.error('Cách dùng: pnpm studio:import <tệp.zip>')
  process.exit(1)
}
const zip = unzipSync(new Uint8Array(fs.readFileSync(path.resolve(process.env.INIT_CWD || process.cwd(), input))))
const read = (name: string) => (zip[name] ? JSON.parse(strFromU8(zip[name])) : undefined)

const manifest = read('manifest.json')
if (manifest?.format !== 2) throw new Error('Gói không hợp lệ hoặc không đúng phiên bản định dạng (cần định dạng 2; xuất lại bằng bản Studio mới).')

const payload = await getPayload({ config })
const LOCALES = hosso.locales.map((l) => l.code)
const D = LOCALES[0]

// Cảnh báo nếu theme/plugin/ngôn ngữ của gói chưa có trên cài đặt này (nội dung vẫn nhập, phần thiếu bị bỏ qua).
for (const t of manifest.themes as string[]) if (!hosso.themes.some((x) => x.manifest.name === t.split('@')[0])) console.warn(`Cảnh báo: theme "${t}" chưa được cài trong hosso.config.ts.`)
for (const p of manifest.plugins as string[]) if (!hosso.plugins.some((x) => x.id === p)) console.warn(`Cảnh báo: plugin "${p}" chưa được cài; block của nó sẽ bị bỏ qua.`)
for (const l of (manifest.locales ?? []) as string[]) if (!LOCALES.includes(l)) console.warn(`Cảnh báo: ngôn ngữ "${l}" chưa khai báo trong hosso.config.ts; bản dịch này bị bỏ qua.`)

// Media trước (nội dung tham chiếu qua URL theo tên tệp).
for (const m of read('data/media.json') ?? []) {
  const exists = await payload.count({ collection: 'media', where: { filename: { equals: m.filename } } })
  if (exists.totalDocs) continue
  const tmp = path.join(os.tmpdir(), m.filename)
  fs.writeFileSync(tmp, zip[`media/${m.filename}`])
  await payload.create({ collection: 'media', data: { alt: m.alt || m.filename }, filePath: tmp })
  fs.rmSync(tmp, { force: true })
}
const mediaId = async (ref: { filename?: string } | null | undefined) => {
  if (!ref?.filename) return null
  const found = await payload.find({ collection: 'media', where: { filename: { equals: ref.filename } }, limit: 1, depth: 0 })
  return found.docs[0]?.id ?? null
}

/** Tạo/cập nhật theo slug ở ngôn ngữ mặc định, rồi ghi từng bản dịch. `extra` tính sau khi biết bản ghi (ví dụ id dòng mảng). */
async function upsert(collection: any, slug: string, shared: Record<string, unknown>, translations: Record<string, Record<string, unknown>>, status?: string) {
  const first = translations[D] ?? translations[Object.keys(translations)[0]] ?? {}
  const existing = await payload.find({ collection, where: { slug: { equals: slug } }, limit: 1, depth: 0, draft: true, locale: D as any })
  const base: any = { ...shared, ...first, slug, ...(status ? { _status: status } : {}) }
  const doc: any = existing.docs[0]
    ? await payload.update({ collection, id: existing.docs[0].id, data: base, locale: D as any })
    : await payload.create({ collection, data: base, locale: D as any })
  for (const l of LOCALES.slice(1)) {
    if (translations[l]) await payload.update({ collection, id: doc.id, data: { ...translations[l], ...(status ? { _status: status } : {}) } as any, locale: l as any })
  }
  return { doc, created: !existing.docs[0] }
}

const stats = { pages: 0, pagesUpdated: 0, posts: 0, terms: 0, forms: 0, blocks: 0 }
const seoOf = async (seo: any, title?: string) => ({ noindex: seo?.noindex ?? false, image: await mediaId(seo?.image), ...(title ? { title } : {}) })

// ---------- Chuyên mục, thẻ ----------
const termDocs = { 'post-categories': new Map<string, string | number>(), 'post-tags': new Map<string, string | number>() }
const terms = read('data/terms.json') ?? { categories: [], tags: [] }
for (const [collection, list] of [['post-categories', terms.categories], ['post-tags', terms.tags]] as const) {
  for (const t of list) {
    const { doc } = await upsert(collection, t.slug, {}, t.translations)
    termDocs[collection].set(t.slug, doc.id)
    stats.terms++
  }
}

// ---------- Trang ----------
for (const p of read('data/pages.json') ?? []) {
  const tr: Record<string, any> = {}
  for (const [l, v] of Object.entries<any>(p.translations)) tr[l] = { title: v.title, description: v.description, content: v.content, seo: await seoOf(p.seo, v.seoTitle) }
  const { created } = await upsert('pages', p.slug, { seo: await seoOf(p.seo) }, tr, p.status)
  created ? stats.pages++ : stats.pagesUpdated++
}

// ---------- Bài viết ----------
for (const p of read('data/posts.json') ?? []) {
  const tr: Record<string, any> = {}
  for (const [l, v] of Object.entries<any>(p.translations)) tr[l] = { title: v.title, excerpt: v.excerpt, content: v.content, seo: await seoOf(p.seo, v.seoTitle) }
  await upsert(
    'posts',
    p.slug,
    {
      publishedAt: p.publishedAt,
      commentsEnabled: p.commentsEnabled,
      cover: await mediaId(p.cover),
      categories: (p.categories as string[]).map((s) => termDocs['post-categories'].get(s)).filter((x) => x != null),
      tags: (p.tags as string[]).map((s) => termDocs['post-tags'].get(s)).filter((x) => x != null),
      seo: await seoOf(p.seo),
    },
    tr,
    p.status,
  )
  stats.posts++
}

// ---------- Biểu mẫu ----------
for (const f of read('data/forms.json') ?? []) {
  const tr = f.translations as Record<string, any>
  const fieldsFor = (l: string, rows?: any[]) => f.fields.map((fl: any, i: number) => ({ ...(rows?.[i]?.id ? { id: rows[i].id } : {}), name: fl.name, type: fl.type, required: fl.required, ...(fl.translations[l] ?? fl.translations[D] ?? {}) }))
  const { doc } = await upsert('forms', f.slug, { fields: fieldsFor(D) }, tr)
  // Bản dịch của dòng trường cần đúng id dòng đã tạo ở ngôn ngữ mặc định.
  for (const l of LOCALES.slice(1)) if (f.fields.some((fl: any) => fl.translations[l])) await payload.update({ collection: 'forms', id: doc.id, data: { fields: fieldsFor(l, doc.fields) }, locale: l as any })
  stats.forms++
}

// ---------- Khối dùng lại ----------
for (const b of read('data/reusable-blocks.json') ?? []) {
  await upsert('reusable-blocks', b.slug, { title: b.title }, b.translations, b.status)
  stats.blocks++
}

// ---------- Vùng giao diện ----------
const areas = read('data/site-areas.json')
if (areas) for (const l of LOCALES) if (areas.translations[l]) await payload.updateGlobal({ slug: 'site-areas', data: areas.translations[l], locale: l as any })

// ---------- Cài đặt site ----------
const site = read('data/site-settings.json')
if (site) {
  const shared = { ...site.shared }
  for (const k of ['logo', 'favicon']) shared[k] = await mediaId(shared[k])
  const first = site.translations[D] ?? {}
  try {
    const saved: any = await payload.updateGlobal({ slug: 'site-settings', data: { ...shared, ...first, contact: { ...shared.contact, ...first.contact } }, locale: D as any })
    // Mảng menu có chữ dịch được: bản dịch dùng lại id dòng vừa tạo.
    const withIds = (rows: any[] | undefined, src: any[] | undefined): any[] => (src ?? []).map((r, i) => ({ ...r, ...(rows?.[i]?.id ? { id: rows[i].id } : {}), ...(r.children ? { children: withIds(rows?.[i]?.children, r.children) } : {}) }))
    for (const l of LOCALES.slice(1)) {
      const t = site.translations[l]
      if (!t) continue
      await payload.updateGlobal({
        slug: 'site-settings',
        locale: l as any,
        data: { ...t, headerMenu: withIds(saved.headerMenu, t.headerMenu), footerMenu: withIds(saved.footerMenu, t.footerMenu), social: withIds(saved.social, t.social) },
      })
    }
  } catch (e: any) {
    console.error('Không nhập được cài đặt site:', JSON.stringify(e?.data?.errors ?? e?.message))
    throw e
  }
}
for (const plugin of hosso.plugins) {
  for (const g of plugin.portable?.globals ?? []) {
    const data = read(`data/plugins/${g.slug}.json`)
    if (data) await payload.updateGlobal({ slug: g.slug as any, data })
  }
}

console.log(`Đã nhập: ${stats.pages} trang mới, ${stats.pagesUpdated} trang cập nhật, ${stats.posts} bài viết, ${stats.terms} chuyên mục/thẻ, ${stats.forms} biểu mẫu, ${stats.blocks} khối dùng lại.`)
if (manifest.secretsOmitted?.length) {
  console.log(`Cần nhập lại bí mật (gói không chứa): ${manifest.secretsOmitted.join(', ')}. Dùng admin hoặc biến môi trường HOSSO_WIM_API_KEY, HOSSO_WIM_WEBHOOK_SECRET.`)
}
process.exit(0)
