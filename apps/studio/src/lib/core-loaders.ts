import type { BlockLoader } from '@hosso/studio-blocks'

import { mediaUrl } from './site'

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

/** Loader của block lõi (plugin có loader riêng trong hosso.config.ts). */
export const coreLoaders: Record<string, BlockLoader> = {
  PostList: async (props, ctx) => {
    const limit = Math.min(24, Math.max(1, Number(props.count) || 6))
    const page = props.paginate === 'yes' ? Math.max(1, Number(first(ctx.searchParams.page)) || 1) : 1
    const res = await ctx.payload.find({
      collection: 'posts',
      where: { _status: { equals: 'published' } },
      sort: '-publishedAt',
      limit,
      page,
      depth: 1,
      overrideAccess: true,
    })
    return {
      status: 'ok',
      items: res.docs.map((p) => ({ title: p.title, slug: p.slug, excerpt: p.excerpt ?? undefined, cover: mediaUrl(p.cover), publishedAt: p.publishedAt ?? undefined })),
      page: res.page ?? 1,
      pages: props.paginate === 'yes' ? res.totalPages : 1,
    }
  },
}
