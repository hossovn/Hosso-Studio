import config from '@payload-config'
import type { MetadataRoute } from 'next'
import { collectSitemap } from '@hosso/studio-blocks'
import { getPayload } from 'payload'

import { getPayloadSiteLocales } from '@/lib/locale'
import { href } from '@/lib/site'

export const dynamic = 'force-dynamic'

/** sitemap.xml: trang và bài viết đã xuất bản (không noindex), kèm liên kết hreflang giữa các ngôn ngữ đang bật. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.HOSSO_PUBLIC_URL || 'http://localhost:3000').replace(/\/$/, '')
  const payload = await getPayload({ config })
  const find = (collection: 'pages' | 'posts') =>
    payload.find({ collection, where: { _status: { equals: 'published' } }, limit: 1000, depth: 0, pagination: false, overrideAccess: true })
  const [{ locales: activeLocales, defaultLocale: activeDefault }, pages, posts, extra] = await Promise.all([
    getPayloadSiteLocales(payload),
    find('pages'),
    find('posts'),
    collectSitemap(payload),
  ])
  const ok = (d: { seo?: { noindex?: boolean | null } | null }) => !d.seo?.noindex
  const entry = (path: string, lastModified: string) =>
    activeLocales.map((l) => ({
      url: base + href(path, l.code, activeDefault),
      lastModified,
      alternates: { languages: Object.fromEntries(activeLocales.map((x) => [x.code, base + href(path, x.code, activeDefault)])) },
    }))
  return [
    ...pages.docs.filter(ok).flatMap((p) => entry(p.slug === 'home' ? '/' : `/${p.slug}`, p.updatedAt)),
    ...posts.docs.filter(ok).flatMap((p) => entry(`/bai-viet/${p.slug}`, p.updatedAt)),
    // Đường dẫn do plugin đóng góp (ví dụ trang chi tiết sản phẩm của plugin Cửa hàng).
    ...extra.flatMap((x) => entry(x.path, x.lastModified ?? new Date().toISOString())),
  ]
}
