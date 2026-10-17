import config from '@payload-config'
import hosso from '@hosso-config'
import type { MetadataRoute } from 'next'
import { getPayload } from 'payload'

import { href } from '@/lib/site'

export const dynamic = 'force-dynamic'

/** sitemap.xml: trang và bài viết đã xuất bản (không noindex), kèm liên kết hreflang giữa các ngôn ngữ. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.HOSSO_PUBLIC_URL || 'http://localhost:3000').replace(/\/$/, '')
  const payload = await getPayload({ config })
  const find = (collection: 'pages' | 'posts') =>
    payload.find({ collection, where: { _status: { equals: 'published' } }, limit: 1000, depth: 0, pagination: false, overrideAccess: true })
  const [pages, posts] = await Promise.all([find('pages'), find('posts')])
  const ok = (d: { seo?: { noindex?: boolean | null } | null }) => !d.seo?.noindex
  const entry = (path: string, lastModified: string) =>
    hosso.locales.map((l) => ({
      url: base + href(path, l.code),
      lastModified,
      alternates: { languages: Object.fromEntries(hosso.locales.map((x) => [x.code, base + href(path, x.code)])) },
    }))
  return [
    ...pages.docs.filter(ok).flatMap((p) => entry(p.slug === 'home' ? '/' : `/${p.slug}`, p.updatedAt)),
    ...posts.docs.filter(ok).flatMap((p) => entry(`/bai-viet/${p.slug}`, p.updatedAt)),
  ]
}
