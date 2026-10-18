import hosso from '@hosso-config'
import { unzipSync, strFromU8 } from 'fflate'
import fs from 'fs'
import os from 'os'
import path from 'path'
import type { Payload } from 'payload'

import type { AdminLang } from './admin-i18n'
import { serverLang } from './lang'

/**
 * Khôi phục gói (định dạng 2) lên cài đặt sạch (DB đã chạy migration). Bản ghi trùng slug được cập nhật; media trùng tên bị bỏ qua.
 * Dùng chung cho CLI (studio:import) và trang Công cụ trong admin.
 */
export async function importSitePackage(payload: Payload, bytes: Uint8Array, log: (msg: string) => void = console.log, lang: AdminLang = serverLang()) {
  const M = (vi: string, en: string) => (lang === 'en' ? en : vi)
const zip = unzipSync(bytes)
const read = (name: string) => (zip[name] ? JSON.parse(strFromU8(zip[name])) : undefined)

const manifest = read('manifest.json')
  if (manifest?.format !== 2) throw new Error(M('Gói không hợp lệ hoặc không đúng phiên bản định dạng (cần định dạng 2; xuất lại bằng bản Studio mới).', 'Invalid package or wrong format version (format 2 is required; export again with a current Studio).'))

  const LOCALES = hosso.locales.map((l) => l.code)
  const D = LOCALES[0]

  // Cảnh báo nếu theme/plugin/ngôn ngữ của gói chưa có trên cài đặt này (nội dung vẫn nhập, phần thiếu bị bỏ qua).
  for (const t of manifest.themes as string[]) if (!hosso.themes.some((x) => x.manifest.name === t.split('@')[0])) log(M(`Cảnh báo: theme "${t}" chưa được cài trong hosso.config.ts.`, `Warning: theme "${t}" is not installed in hosso.config.ts.`))
  for (const p of manifest.plugins as string[]) if (!hosso.plugins.some((x) => x.id === p)) log(M(`Cảnh báo: plugin "${p}" chưa được cài; block của nó sẽ bị bỏ qua.`, `Warning: plugin "${p}" is not installed; its blocks will be skipped.`))
  for (const l of (manifest.locales ?? []) as string[]) if (!LOCALES.includes(l)) log(M(`Cảnh báo: ngôn ngữ "${l}" chưa khai báo trong hosso.config.ts; bản dịch này bị bỏ qua.`, `Warning: language "${l}" is not declared in hosso.config.ts; this translation is skipped.`))

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
    try {
    const q = { collection, where: { slug: { equals: slug } }, limit: 1, depth: 0, locale: D as any }
    // Tìm cả bản nháp; nếu bảng phiên bản chưa có thì tìm trong bảng chính để không tạo trùng slug.
    const existing = (await payload.find({ ...q, draft: true })).docs.length ? await payload.find({ ...q, draft: true }) : await payload.find(q)
    const base: any = { ...shared, ...first, slug, ...(status ? { _status: status } : {}) }
    const doc: any = existing.docs[0]
      ? await payload.update({ collection, id: existing.docs[0].id, data: base, locale: D as any })
      : await payload.create({ collection, data: base, locale: D as any })
    for (const l of LOCALES.slice(1)) {
      if (translations[l]) await payload.update({ collection, id: doc.id, data: { ...translations[l], ...(status ? { _status: status } : {}) } as any, locale: l as any })
    }
    return { doc, created: !existing.docs[0] }
  } catch (e: any) {
    throw new Error(`${collection}/${slug}: ${e?.message}${e?.data?.errors ? " " + JSON.stringify(e.data.errors) : ""}`)
  }
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
    const fieldsFor = (l: string, rows?: any[]) => f.fields.map((fl: any, i: number) => ({ ...(rows?.[i]?.id ? { id: rows[i].id } : {}), name: fl.name, type: fl.type, required: fl.required, label: fl.name, ...(fl.translations[l] ?? fl.translations[D] ?? {}) }))
    const { doc } = await upsert('forms', f.slug, { fields: fieldsFor(D) }, { [D]: tr[D] ?? {} })
    // Bản dịch của dòng trường cần đúng id dòng đã tạo ở ngôn ngữ mặc định.
    for (const l of LOCALES.slice(1)) if (tr[l] || f.fields.some((fl: any) => fl.translations[l])) await payload.update({ collection: 'forms', id: doc.id, data: { ...(tr[l] ?? {}), fields: fieldsFor(l, doc.fields) }, locale: l as any })
    stats.forms++
  }

  // ---------- Khối dùng lại ----------
  for (const b of read('data/reusable-blocks.json') ?? []) {
    await upsert('reusable-blocks', b.slug, { title: b.title }, b.translations, b.status)
    stats.blocks++
  }

  // ---------- Chuyển hướng ----------
  for (const r of read('data/redirects.json') ?? []) {
    const ex = await payload.find({ collection: 'redirects', where: { from: { equals: r.from } }, limit: 1, depth: 0 })
    if (ex.docs[0]) await payload.update({ collection: 'redirects', id: ex.docs[0].id, data: r })
    else await payload.create({ collection: 'redirects', data: r })
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
          data: { ...t, social: withIds(saved.social, t.social) },
        })
      }
    } catch (e: any) {
      log(M('Không nhập được cài đặt site: ', 'Could not import the site settings: ') + JSON.stringify(e?.data?.errors ?? e?.message))
      throw e
    }
  }
  for (const plugin of hosso.plugins) {
    for (const g of plugin.portable?.globals ?? []) {
      const data = read(`data/plugins/${g.slug}.json`)
      if (data) await payload.updateGlobal({ slug: g.slug as any, data })
    }
    for (const d of plugin.portable?.data ?? []) {
      const data = read(`data/plugins/${d.id}.json`)
      if (data) await d.import(payload, data)
    }
  }

  log(M(`Đã nhập: ${stats.pages} trang mới, ${stats.pagesUpdated} trang cập nhật, ${stats.posts} bài viết, ${stats.terms} chuyên mục/thẻ, ${stats.forms} biểu mẫu, ${stats.blocks} khối dùng lại.`, `Imported: ${stats.pages} new pages, ${stats.pagesUpdated} updated pages, ${stats.posts} posts, ${stats.terms} categories/tags, ${stats.forms} forms, ${stats.blocks} reusable blocks.`))
  if (manifest.secretsOmitted?.length) {
    log(M(`Cần nhập lại bí mật (gói không chứa): ${manifest.secretsOmitted.join(', ')}. Dùng admin hoặc biến môi trường HOSSO_WIM_API_KEY, HOSSO_WIM_WEBHOOK_SECRET.`, `Secrets must be entered again (the package does not contain them): ${manifest.secretsOmitted.join(', ')}. Use the admin or the environment variables HOSSO_WIM_API_KEY, HOSSO_WIM_WEBHOOK_SECRET.`))
  }
  return { stats, secretsOmitted: (manifest.secretsOmitted ?? []) as string[] }
}
