import type { Payload } from 'payload'

/** Page slugs can change independently of a checkout block's saved link. */
export async function orderLookupPath(payload: Payload, configured = '/trang-thai-don') {
  if (!payload.collections.pages) return configured
  const pages = await payload.find({ collection: 'pages', where: { _status: { equals: 'published' } }, depth: 0, pagination: false, limit: 0, overrideAccess: true })
  const candidates = (pages.docs as any[]).filter((page) => page.content?.content?.some((block: any) => ['ShopOrderStatus', 'WimOrderStatus'].includes(block.type)))
  const selected = candidates.find((page) => '/' + page.slug === configured) ?? candidates[0]
  return selected ? '/' + selected.slug : configured
}
