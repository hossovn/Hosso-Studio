import type { Payload } from 'payload'

/** Complete exports and sitemaps must not silently stop at a collection's first page. */
export async function findAll(payload: Payload, options: Parameters<Payload['find']>[0]) {
  const docs: any[] = []
  let page = 1
  while (true) {
    const result = await payload.find({ ...options, sort: options.sort || 'id', limit: 500, pagination: true, page })
    docs.push(...result.docs)
    if (!result.hasNextPage) return { ...result, docs }
    page++
  }
}
