import type { BlockLoader } from '@hosso/studio-blocks'

import { href, loadSite, mediaUrl } from './site'

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

/** Điều kiện lọc bài viết đã xuất bản, tùy chọn theo chuyên mục/thẻ (mã). Trả null nếu mã không tồn tại. */
export async function publishedPostsWhere(payload: import('payload').Payload, opts: { category?: string; tag?: string }) {
  const and: any[] = [{ _status: { equals: 'published' } }]
  if (opts.category) {
    const c = await payload.find({ collection: 'post-categories', where: { slug: { equals: opts.category } }, limit: 1, depth: 0, overrideAccess: true })
    if (!c.docs[0]) return null
    and.push({ categories: { contains: c.docs[0].id } })
  }
  if (opts.tag) {
    const t = await payload.find({ collection: 'post-tags', where: { slug: { equals: opts.tag } }, limit: 1, depth: 0, overrideAccess: true })
    if (!t.docs[0]) return null
    and.push({ tags: { contains: t.docs[0].id } })
  }
  return { and }
}

/** Loader của block lõi (plugin có loader riêng trong hosso.config.ts). */
export const coreLoaders: Record<string, BlockLoader> = {
  PostList: async (props, ctx) => {
    const limit = Math.min(24, Math.max(1, Number(props.count) || 6))
    const page = props.paginate === 'yes' ? Math.max(1, Number(first(ctx.searchParams.page)) || 1) : 1
    const where = await publishedPostsWhere(ctx.payload, { category: props.category || undefined, tag: props.tag || undefined })
    if (!where) return { status: 'ok', items: [], page: 1, pages: 1 }
    const res = await ctx.payload.find({ collection: 'posts', where, sort: '-publishedAt', limit, page, depth: 1, locale: ctx.locale as any, overrideAccess: true })
    return {
      status: 'ok',
      items: res.docs.map((p) => ({
        title: p.title,
        slug: p.slug,
        href: href(`/bai-viet/${p.slug}`, ctx.locale),
        excerpt: p.excerpt ?? undefined,
        cover: mediaUrl(p.cover),
        publishedAt: p.publishedAt ?? undefined,
      })),
      page: res.page ?? 1,
      pages: props.paginate === 'yes' ? res.totalPages : 1,
    }
  },

  NavMenu: async (props, ctx) => {
    if (props.source !== 'header' && props.source !== 'footer') return { status: 'ok', items: [] }
    const { chrome } = await loadSite(ctx.locale)
    return { status: 'ok', items: props.source === 'header' ? chrome.headerMenu : chrome.footerMenu }
  },

  TermList: async (props, ctx) => {
    const tags = props.kind === 'tags'
    const field = tags ? 'tags' : 'categories'
    const res = await ctx.payload.find({ collection: tags ? 'post-tags' : 'post-categories', limit: 100, depth: 0, sort: 'name', locale: ctx.locale as any, overrideAccess: true })
    const items = await Promise.all(
      res.docs.map(async (term) => {
        const count = props.showCount === 'no' ? undefined : (await ctx.payload.count({ collection: 'posts', where: { and: [{ _status: { equals: 'published' } }, { [field]: { contains: term.id } }] }, overrideAccess: true })).totalDocs
        return { name: term.name, href: href(`/bai-viet/${tags ? 'the' : 'danh-muc'}/${term.slug}`, ctx.locale), count }
      }),
    )
    return { status: 'ok', items: items.filter((i) => i.count !== 0) }
  },

  Form: async (props, ctx) => {
    if (!props.form) return { status: 'error' }
    const found = await ctx.payload.find({ collection: 'forms', where: { slug: { equals: props.form } }, limit: 1, depth: 0, locale: ctx.locale as any, overrideAccess: true })
    const f = found.docs[0]
    if (!f) return { status: 'error' }
    return {
      status: 'ok',
      form: {
        slug: f.slug,
        title: f.title,
        submitLabel: f.submitLabel ?? undefined,
        successMessage: f.successMessage ?? undefined,
        fields: (f.fields ?? []).map((x) => ({ label: x.label, name: x.name ?? '', type: x.type, options: x.options, required: x.required, placeholder: x.placeholder })),
      },
    }
  },
}
