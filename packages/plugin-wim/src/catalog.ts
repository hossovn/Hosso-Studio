import type { HossoPlugin } from '@hosso/studio-blocks'
import type { Payload } from 'payload'
import { getWimConfig } from './config'
import { WimError, wimFetch, type Availability, type Branch, type Named, type Order, type Product, type ProductPage } from './client'
import { idempotencyKey } from './checkout'

const synced = new WeakMap<Payload, { until: number; promise: Promise<void> }>()
const stockOf = (availability: Availability, branchId?: string) => {
  const branches = availability.branches.filter((b) => !branchId || b.branchId === branchId)
  return { stock: branches.reduce((sum, b) => sum + (b.inStock === false ? 0 : b.available ?? 0), 0), stockUnmanaged: branches.some((b) => b.stockUnmanaged === true && b.inStock === true) }
}

/** WIM keeps upstream identity; each web product receives one ordinary catalog ID. */
export async function syncWimCatalog(payload: Payload, force = false) {
  const previous = synced.get(payload)
  if (!force && previous && previous.until > Date.now()) return previous.promise
  const promise = sync(payload)
  const entry = { until: Date.now() + 30000, promise }
  synced.set(payload, entry)
  try { await promise } catch (error) { if (synced.get(payload) === entry) synced.delete(payload); throw error }
}

async function sync(payload: Payload) {
  const cfg = await getWimConfig(payload)
  if (!cfg) return
  const categories = await wimFetch<{ items: Named[] }>(cfg, '/v1/categories')
  const categoryIds = new Map<string, string | number>()
  for (const category of categories.items) {
    const slug = 'wim-' + category.id
    const found = (await payload.find({ collection: 'shop-categories' as any, where: { slug: { equals: slug } }, limit: 1, depth: 0, overrideAccess: true })).docs[0]
    const data = { slug, name: cfg.categoryMap.find((c) => c.wimCategoryId === category.id)?.label || category.name }
    const doc = found ? await payload.update({ collection: 'shop-categories' as any, id: found.id, data, overrideAccess: true }) : await payload.create({ collection: 'shop-categories' as any, data, overrideAccess: true })
    categoryIds.set(category.id, doc.id)
  }
  const seen = new Set<string>()
  for (let page = 1; ; page++) {
    const result = await wimFetch<ProductPage>(cfg, '/v1/products', { query: { page, pageSize: 100 } })
    if (!Array.isArray(result.items) || !Number.isSafeInteger(result.total) || result.total < 0 || (!result.items.length && seen.size < result.total)) throw new Error('Invalid WIM catalog page')
    for (const product of result.items as (Product & { source?: string })[]) {
      if (seen.has(product.id)) throw new Error('Repeated WIM product across catalog pages')
      seen.add(product.id)
      // Cross-sell owns its local products and supplier orders, including legacy WIM listings.
      if (product.source === 'partner') continue
      await upsertWimProduct(payload, product, categoryIds.get(product.categoryId || ''))
    }
    if (seen.size >= result.total) break
  }
  let page = 1
  for (;;) {
    const existing = await payload.find({ collection: 'shop-products' as any, where: { source: { equals: 'wim' } }, limit: 100, page, depth: 0, overrideAccess: true })
    for (const doc of existing.docs as any[]) if (!seen.has(doc.wimId)) await payload.update({ collection: 'shop-products' as any, id: doc.id, data: { active: false, stock: 0, supplierStockUnmanaged: false }, overrideAccess: true })
    if (!existing.hasNextPage) break
    page++
  }
}

export async function upsertWimProduct(payload: Payload, product: Product, category?: string | number) {
  const cfg = await getWimConfig(payload)
  if (!cfg) throw new Error('WIM is not configured')
  const found = await payload.find({ collection: 'shop-products' as any, where: { wimId: { equals: product.id } }, limit: 2, depth: 0, overrideAccess: true })
  if (found.docs.length > 1) throw new Error('Duplicate WIM product mappings; reconcile the catalog')
  let local = found.docs[0] as any
  if (!local) {
    const legacy = (await payload.find({ collection: 'shop-products' as any, where: { code: { equals: 'WIM-' + product.id } }, limit: 1, depth: 0, overrideAccess: true })).docs[0] as any
    if (legacy) {
      if (legacy.wimId || !['shop', undefined, null].includes(legacy.source) || legacy.name !== product.name) throw new Error('Legacy WIM product code is already owned; reconcile the catalog')
      local = legacy
    }
  }
  if (local?.source === 'cross-sell') return local
  const availability = await wimFetch<Availability>(cfg, '/v1/products/' + encodeURIComponent(product.id) + '/availability')
  if (availability.productId !== product.id || !Number.isSafeInteger(availability.price) || availability.price < 0) throw new Error('Invalid WIM availability')
  const stock = stockOf(availability)
  const data = { name: product.name, code: local?.code || 'WIM-' + product.id, wimId: product.id, source: 'wim',
    price: availability.price, salePrice: null, stock: stock.stock, supplierStockUnmanaged: stock.stockUnmanaged,
    brand: product.brand, makes: [...new Set((product.compatibility ?? []).map((c) => c.make))], ...(category !== undefined && { category }),
    active: local ? local.active : true,
    supplierContent: { ...local?.supplierContent, images: product.images?.length ? ['/api/plugins/wim/image?id=' + encodeURIComponent(product.id)] : [],
      attributes: [{ name: 'SKU', value: product.code }, ...(product.oemCodes?.length ? [{ name: 'OEM', value: product.oemCodes.join(', ') }] : []),
        ...(product.warrantyMonths > 0 ? [{ name: 'Bảo hành / Warranty', value: product.warrantyMonths + ' tháng / months' }] : []),
        ...(product.compatibility ?? []).map((c) => ({ name: 'Xe tương thích / Compatible vehicle', value: `${c.make} ${c.model} ${c.yearFrom}–${c.yearTo}${c.engine ? ' ' + c.engine : ''}` }))],
      compatibility: product.compatibility, condition: product.condition },
  }
  return local ? payload.update({ collection: 'shop-products' as any, id: local.id, data, overrideAccess: true }) : payload.create({ collection: 'shop-products' as any, data, overrideAccess: true })
}

export const commerce: NonNullable<HossoPlugin['commerce']> = {
  syncCatalog: syncWimCatalog,
  resolveProduct: async (payload, product, _quantity, fulfillment) => {
    if (!product.wimId || product.source === 'cross-sell') return
    if (product.variants?.length) throw new Error('WIM products cannot use local variants')
    const cfg = await getWimConfig(payload)
    if (!cfg) throw new Error('WIM is not configured')
    if (fulfillment.type === 'pickup') {
      const branches = await wimFetch<{ items: Branch[] }>(cfg, '/v1/branches')
      if (!branches.items.some((b) => b.id === fulfillment.branchId)) throw new Error('Select a WIM pickup branch')
    }
    const availability = await wimFetch<Availability>(cfg, '/v1/products/' + encodeURIComponent(product.wimId) + '/availability')
    if (availability.productId !== product.wimId || !Number.isSafeInteger(availability.price) || availability.price < 0) throw new Error('Invalid WIM price')
    return { source: 'wim', remoteId: product.wimId, price: availability.price, ...stockOf(availability, fulfillment.type === 'pickup' ? fulfillment.branchId : undefined) }
  },
  submitOrder: async (payload, order) => {
    const cfg = await getWimConfig(payload)
    if (!cfg) throw new Error('WIM is not configured')
    const body = { items: order.items.map((i) => ({ productId: i.remoteId!, quantity: i.quantity })), customer: order.customer, fulfillment: order.fulfillment }
    const key = await idempotencyKey(order.checkoutKey || order.id, body)
    let created: Order
    try { created = await wimFetch<Order>(cfg, '/v1/orders', { method: 'POST', body, headers: { 'Idempotency-Key': key } }) }
    catch (error) {
      if (error instanceof WimError && [400, 404, 409, 422].includes(error.status || 0) && ['out_of_stock', 'product_not_found', 'validation_error'].includes(error.code || '')) Object.assign(error, { definitive: true })
      throw error
    }
    const expected = order.items.reduce((sum, i) => sum + i.price * i.quantity, 0)
    if (created.total !== expected || !created.id || !created.items || created.items.length !== body.items.length || !order.items.every((i) => created.items.some((l) => l.productId === i.remoteId && l.quantity === i.quantity && l.unitPrice === i.price))) throw new Error('WIM order differs; reconcile before confirming checkout')
    return { id: created.id, total: created.total, status: created.status }
  },
  checkoutData: async (payload) => {
    const cfg = await getWimConfig(payload)
    if (!cfg) return { branches: [] }
    return wimFetch<{ items: Branch[] }>(cfg, '/v1/branches').then((r) => ({ branches: r.items.map(({ id, name }) => ({ id, name })) }))
  },
  cancelOrder: async (payload, order) => {
    const cfg = await getWimConfig(payload)
    if (!cfg) throw new Error('WIM is not configured')
    await wimFetch(cfg, '/v1/orders/' + encodeURIComponent(order.id) + '/cancel', { method: 'POST', body: {} })
  },
}
