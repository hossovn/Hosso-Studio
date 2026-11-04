import hosso from '@hosso-config'
import { zipSync, strToU8 } from 'fflate'
import fs from 'fs'
import path from 'path'
import type { Payload } from 'payload'
import { AREAS } from '../globals/SiteAreas'

/**
 * Gói site (định dạng 2) gồm: trang, bài viết, chuyên mục/thẻ, biểu mẫu, khối dùng lại, vùng giao diện, chuyển hướng, cài đặt site (theme, token, menu),
 * cấu hình plugin (KHÔNG có khóa/bí mật) và media; mọi nội dung dịch được xuất theo từng ngôn ngữ.
 * Không gồm: tài khoản, bình luận, biểu mẫu khách đã gửi, tin nhắn liên hệ, đơn hàng (do WIM làm chủ).
 * Dùng chung cho CLI (studio:export), sao lưu tự động và trang Công cụ trong admin.
 */
export async function buildSitePackage(payload: Payload) {
  const files: Record<string, Uint8Array> = {}
  const referencedMedia = new Set<string>()
  const json = (name: string, data: unknown) => (files[name] = strToU8(JSON.stringify(data, (_key, value) => {
    if (typeof value === 'string' && value.startsWith('/api/media/file/')) {
      const filename = decodeURIComponent(value.slice('/api/media/file/'.length).split(/[?#]/)[0])
      if (!filename || filename === '.' || filename === '..' || /[/\\]/.test(filename)) throw new Error('Invalid media filename: ' + filename)
      referencedMedia.add(filename)
    }
    return value
  }, 2)))

  const LOCALES = hosso.locales.map((l) => l.code)
  const D = LOCALES[0]
  const fileOf = (m: any) => (m && typeof m === 'object' && m.filename ? { filename: m.filename } : null)
  const slugsOf = (list: any) => ((list ?? []) as any[]).filter((x) => x && typeof x === 'object' && x.slug).map((x) => x.slug as string)

  /** Đọc một bản ghi ở từng ngôn ngữ (không dùng bản dự phòng để chỉ lấy phần đã dịch thật). */
  async function forEachLocale<T>(read: (locale: string) => Promise<T>): Promise<Record<string, T>> {
    const res: Record<string, T> = {}
    for (const l of LOCALES) res[l] = await read(l)
    return res
  }
  const pick = (o: any, keys: string[]) => Object.fromEntries(keys.filter((k) => o?.[k] != null && o[k] !== '').map((k) => [k, o[k]]))
  const find = (collection: any, locale: string, extra: Record<string, unknown> = {}) =>
    payload.find({ collection, limit: 2000, depth: 1, pagination: false, locale: locale as any, fallbackLocale: false, overrideAccess: true, ...extra })

  // Rich-text upload IDs are installation-specific. Export filenames for remapping.
  const portableArticle = async (value: any): Promise<any> => {
    if (Array.isArray(value)) return Promise.all(value.map(portableArticle))
    if (!value || typeof value !== 'object') return value
    if (value.type === 'upload' && value.relationTo === 'media' && value.value) {
      const media = typeof value.value === 'object' ? value.value : await payload.findByID({ collection:'media',id:value.value,depth:0,overrideAccess:true })
      return { ...value, value: fileOf(media) }
    }
    return Object.fromEntries(await Promise.all(Object.entries(value).map(async ([key,item]) => [key,await portableArticle(item)])))
  }
  // ---------- Trang, bài viết ----------
  const pagesByLocale = await forEachLocale((l) => find('pages', l, { draft: false }))
  const pages = pagesByLocale[D].docs
  json(
    'data/pages.json',
    pages.map((p: any) => ({
      slug: p.slug,
      cms: p.cms ? { ...p.cms, parent: pages.find((doc: any) => String(doc.id) === String(p.cms.parent))?.slug || '', assignee: '', log: [] } : undefined,
      status: p._status ?? 'draft',
      seo: { noindex: p.seo?.noindex ?? false, image: fileOf(p.seo?.image) },
      translations: Object.fromEntries(
        LOCALES.flatMap((l) => {
          const d: any = pagesByLocale[l].docs.find((x: any) => x.slug === p.slug)
          return d?.title ? [[l, { ...pick(d, ['title', 'description', 'content']), seoTitle: d.seo?.title ?? undefined }]] : []
        }),
      ),
    })),
  )

  const postsByLocale = await forEachLocale((l) => find('posts', l, { draft: false }))
  for (const docs of Object.values(postsByLocale)) for (const post of docs.docs as any[]) if (post.articleBody) post.articleBody = await portableArticle(post.articleBody)
  const posts = postsByLocale[D].docs
  json(
    'data/posts.json',
    posts.map((p: any) => ({
      slug: p.slug,
      writingMode: p.writingMode,
      articleTemplate: p.articleTemplate,
      status: p._status ?? 'draft',
      publishedAt: p.publishedAt,
      commentsEnabled: p.commentsEnabled,
      cover: fileOf(p.cover),
      categories: slugsOf(p.categories),
      tags: slugsOf(p.tags),
      seo: { noindex: p.seo?.noindex ?? false, image: fileOf(p.seo?.image) },
      translations: Object.fromEntries(
        LOCALES.flatMap((l) => {
          const d: any = postsByLocale[l].docs.find((x: any) => x.slug === p.slug)
          return d?.title ? [[l, { ...pick(d, ['title', 'excerpt', 'content', 'articleBody']), seoTitle: d.seo?.title ?? undefined }]] : []
        }),
      ),
    })),
  )

  // ---------- Chuyên mục, thẻ ----------
  const terms = async (collection: 'post-categories' | 'post-tags') => {
    const byLocale = await forEachLocale((l) => find(collection, l))
    return byLocale[D].docs.map((t: any) => ({
      slug: t.slug,
      translations: Object.fromEntries(
        LOCALES.flatMap((l) => {
          const d: any = byLocale[l].docs.find((x: any) => x.slug === t.slug)
          return d?.name ? [[l, pick(d, ['name', 'description'])]] : []
        }),
      ),
    }))
  }
  json('data/terms.json', { categories: await terms('post-categories'), tags: await terms('post-tags') })

  // ---------- Biểu mẫu ----------
  const formsByLocale = await forEachLocale((l) => find('forms', l))
  json(
    'data/forms.json',
    formsByLocale[D].docs.map((f: any) => ({
      slug: f.slug,
      rules: f.rules ?? {},
      fields: (f.fields ?? []).map((fl: any, i: number) => ({
        name: fl.name,
        type: fl.type,
        required: !!fl.required,
        translations: Object.fromEntries(
          LOCALES.flatMap((l) => {
            const x: any = (formsByLocale[l].docs.find((d: any) => d.slug === f.slug)?.fields ?? [])[i]
            return x?.label ? [[l, pick(x, ['label', 'placeholder', 'options'])]] : []
          }),
        ),
      })),
      translations: Object.fromEntries(
        LOCALES.flatMap((l) => {
          const d: any = formsByLocale[l].docs.find((x: any) => x.slug === f.slug)
          return d?.title ? [[l, pick(d, ['title', 'submitLabel', 'successMessage'])]] : []
        }),
      ),
    })),
  )

  // ---------- Khối dùng lại ----------
  const reusableByLocale = await forEachLocale((l) => find('reusable-blocks', l, { draft: false }))
  json(
    'data/reusable-blocks.json',
    reusableByLocale[D].docs.map((b: any) => ({
      slug: b.slug,
      title: b.title,
      status: b._status ?? 'draft',
      translations: Object.fromEntries(
        LOCALES.flatMap((l) => {
          const d: any = reusableByLocale[l].docs.find((x: any) => x.slug === b.slug)
          return d?.content ? [[l, { content: d.content }]] : []
        }),
      ),
    })),
  )

  // ---------- Vùng giao diện ----------
  const AREA_KEYS = AREAS.map(({ name }) => name)
  const areas = await forEachLocale((l) => payload.findGlobal({ slug: 'site-areas', locale: l as any, fallbackLocale: false, depth: 0, overrideAccess: true }) as Promise<any>)
  json('data/site-areas.json', { translations: Object.fromEntries(LOCALES.map((l) => [l, pick(areas[l], AREA_KEYS)])) })

  // ---------- Cài đặt site ----------
  const strip = (doc: Record<string, any>) => {
    const { id, createdAt, updatedAt, globalType, ...rest } = doc
    return rest
  }
  const sites = await forEachLocale((l) => payload.findGlobal({ slug: 'site-settings', locale: l as any, fallbackLocale: false, depth: 1, overrideAccess: true }) as Promise<any>)
  const shared = strip(sites[D])
  const LOCALIZED = ['siteName', 'announcement', 'footerText', 'headerMenu', 'footerMenu', 'social', 'contact']
  for (const k of ['logo', 'favicon']) shared[k] = fileOf(shared[k])
  json('data/site-settings.json', {
    shared: Object.fromEntries(Object.entries(shared).filter(([k]) => !LOCALIZED.includes(k) || k === 'contact')),
    translations: Object.fromEntries(
      LOCALES.map((l) => {
        const s = strip(sites[l])
        return [l, pick(s, ['siteName', 'announcement', 'footerText', 'headerMenu', 'footerMenu', 'social', 'contact'])]
      }),
    ),
  })

  // ---------- Cấu hình plugin (không có bí mật) ----------
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
    for (const d of plugin.portable?.data ?? []) json(`data/plugins/${d.id}.json`, await d.export(payload))
  }

  if (payload.collections?.['content-entries']) {
    const entries = await forEachLocale((locale) => find('content-entries', locale))
    json('data/content-entries.json', entries[D].docs.map((entry: any) => ({ slug: entry.slug, kind: entry.kind, published: entry.published, translations: Object.fromEntries(LOCALES.map((locale) => { const translated: any = entries[locale].docs.find((item: any) => item.slug === entry.slug); return [locale, pick(translated, ['title', 'data'])] })) })))
  }
  // ---------- Media ----------
  const media = await payload.find({ collection: 'media', limit: 2000, depth: 0, pagination: false, overrideAccess: true })
  const mediaDir = path.resolve(process.env.HOSSO_MEDIA_DIR || path.join(process.cwd(), 'media'))
  const mediaMeta = []
  for (const m of media.docs) {
    const file = path.join(mediaDir, m.filename ?? '')
    if (m.filename && fs.existsSync(file)) {
      files[`media/${m.filename}`] = new Uint8Array(fs.readFileSync(file))
      mediaMeta.push({ filename: m.filename, alt: m.alt, cms: (m as any).cms, mimeType: m.mimeType })
    }
  }
  // Canvas content can still reference files whose media records were removed.
  for (const filename of referencedMedia) {
    if (files['media/' + filename]) continue
    const file = path.join(mediaDir, filename)
    if (!fs.existsSync(file)) throw new Error('Referenced media file is missing: ' + filename)
    files['media/' + filename] = new Uint8Array(fs.readFileSync(file))
    mediaMeta.push({ filename, alt: filename, mimeType: null })
  }
  json('data/media.json', mediaMeta)

  json('data/redirects.json', (await payload.find({ collection: 'redirects', limit: 5000, depth: 0, pagination: false, overrideAccess: true })).docs.map((r: any) => ({ from: r.from, to: r.to, permanent: r.permanent !== false })))

  json('manifest.json', {
    format: 2,
    product: hosso.brand.name,
    exportedAt: new Date().toISOString(),
    locales: LOCALES,
    themes: hosso.themes.map((t) => `${t.manifest.name}@${t.manifest.version}`),
    plugins: hosso.plugins.map((p) => p.id),
    counts: { pages: pages.length, posts: posts.length, media: mediaMeta.length },
    secretsOmitted,
  })

  return { data: zipSync(files), pages: pages.length, posts: posts.length, media: mediaMeta.length, locales: LOCALES, secretsOmitted }
}
