import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const base = (process.env.HOSSO_PUBLIC_URL || 'http://localhost:3000').replace(/\/$/, '')
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/editor', '/api/'] },
    sitemap: `${base}/sitemap.xml`,
  }
}
