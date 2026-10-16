import config from '@payload-config'
import type { MetadataRoute } from 'next'
import { getPayload } from 'payload'

export const dynamic = 'force-dynamic'

/** sitemap.xml: các trang và bài viết đã xuất bản, không đánh dấu noindex. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.HOSSO_PUBLIC_URL || 'http://localhost:3000').replace(/\/$/, '')
  const payload = await getPayload({ config })
  const find = (collection: 'pages' | 'posts') =>
    payload.find({ collection, where: { _status: { equals: 'published' } }, limit: 1000, depth: 0, pagination: false, overrideAccess: true })
  const [pages, posts] = await Promise.all([find('pages'), find('posts')])
  const ok = (d: { seo?: { noindex?: boolean | null } | null }) => !d.seo?.noindex
  return [
    ...pages.docs.filter(ok).map((p) => ({ url: p.slug === 'home' ? base + '/' : `${base}/${p.slug}`, lastModified: p.updatedAt })),
    ...posts.docs.filter(ok).map((p) => ({ url: `${base}/bai-viet/${p.slug}`, lastModified: p.updatedAt })),
  ]
}
