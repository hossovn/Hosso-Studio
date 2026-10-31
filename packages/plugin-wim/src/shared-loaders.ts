import type { BlockLoader } from '@hosso/studio-blocks'
import { loadGrid, loadDetail, loadCheckout } from '@hosso/plugin-shop/loaders'
import { loadOrderStatus, vehicleFrom } from './loaders'
import { syncWimCatalog } from './catalog'
import { getWimConfig } from './config'
import { wimFetch, type ProductPage } from './client'

export const loadSharedGrid: BlockLoader = async (props, ctx) => {
  const raw = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value
  await syncWimCatalog(ctx.payload).catch(() => undefined)
  let category = raw(ctx.searchParams.category) || props.category
  if (category && !(await ctx.payload.find({ collection: 'shop-categories' as any, where: { slug: { equals: category } }, depth: 0, limit: 1, overrideAccess: true })).docs.length) category = 'wim-' + category
  const vehicle = props.useSelectedVehicle === 'no' ? {} : vehicleFrom(ctx)
  const condition = raw(ctx.searchParams.condition) || (props.condition !== 'any' ? props.condition : undefined)
  let productIds: (string | number)[] | undefined
  if (vehicle.model || vehicle.year || condition) {
    const cfg = await getWimConfig(ctx.payload)
    if (!cfg) return { status: 'error', kind: 'unconfigured' }
    const ids = new Set<string>()
    for (let page = 1; ; page++) {
      const result = await wimFetch<ProductPage>(cfg, '/v1/products', { query: { ...vehicle, condition, page, pageSize: 100 } })
      if (!Array.isArray(result.items) || !Number.isSafeInteger(result.total) || result.total < 0 || (!result.items.length && ids.size < result.total)) throw new Error('Invalid WIM catalog page')
      for (const product of result.items) {
        if (ids.has(product.id)) throw new Error('Repeated WIM product across catalog pages')
        ids.add(product.id)
      }
      if (ids.size >= result.total) break
    }
    productIds = []
    const remoteIds = [...ids]
    for (let offset = 0; offset < remoteIds.length; offset += 100) {
      const local = await ctx.payload.find({ collection: 'shop-products' as any, where: { wimId: { in: remoteIds.slice(offset, offset + 100) } }, limit: 100, depth: 0, overrideAccess: true })
      productIds.push(...local.docs.map((p) => p.id))
    }
  }
  const sort = raw(ctx.searchParams.sort)
  return loadGrid({ ...props, productIds, category, pager: props.pager === 'no' ? 'no' : 'yes' }, {
    ...ctx, searchParams: { ...ctx.searchParams, ...vehicle, ...(vehicle.year && { year: String(vehicle.year) }), ...(category && { category }), ...(sort && { sort: sort === 'price-asc' ? 'priceAsc' : sort === 'price-desc' ? 'priceDesc' : sort }) },
  })
}
export const loadSharedDetail: BlockLoader = async (props, ctx) => {
  await syncWimCatalog(ctx.payload).catch(() => undefined)
  const key = Array.isArray(ctx.searchParams.p) ? ctx.searchParams.p[0] : ctx.searchParams.p
  if (key) {
    const local = (await ctx.payload.find({ collection: 'shop-products' as any, where: { wimId: { equals: key } }, limit: 1, depth: 0, overrideAccess: true })).docs[0] as any
    if (local) return loadDetail(props, { ...ctx, searchParams: { ...ctx.searchParams, p: local.slug || String(local.id) } })
  }
  return loadDetail(props, ctx)
}
export const loadSharedOrder: BlockLoader = async (props, ctx) => {
  const id = Array.isArray(ctx.searchParams.id) ? ctx.searchParams.id[0] : ctx.searchParams.id
  if (id && !id.startsWith('SO-')) return { ...(await loadOrderStatus(props, ctx) as object), legacy: true }
  return { status: 'ok' }
}
export { loadCheckout }
