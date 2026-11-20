import type { Payload } from 'payload'
import { findAll } from './find-all'

export async function contentSitemap(payload: Payload) {
  const types = await findAll(payload, { collection: 'content-types', where: { detailTemplate: { exists: true } }, depth: 1, overrideAccess: true })
  const kinds = (types.docs as any[]).filter((type) => type.detailTemplate?._status === 'published' && !type.detailTemplate?.seo?.noindex).map((type) => type.slug)
  if (!kinds.length) return []
  const links: { path: string; lastModified: string }[] = []
  let page = 1
  for (;;) {
    const entries = await payload.find({ collection: 'content-entries', where: { and: [{ kind: { in: kinds } }, { published: { equals: true } }] }, sort: 'id', page, limit: 500, depth: 0, overrideAccess: true })
    links.push(...entries.docs.map((entry) => ({ path: `/noi-dung/${encodeURIComponent(entry.kind)}/${encodeURIComponent(entry.slug)}`, lastModified: entry.updatedAt })))
    if (!entries.hasNextPage) return links
    page++
  }
}
