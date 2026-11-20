import definition from './browser'
import type { HossoPlugin } from '@hosso/studio-blocks'
import type { Config } from 'payload'
import { Categories, Orders, Products, Reviews, Settings } from './collections'
import { endpoints, recoverOrders } from './endpoints'
import { loadCategories, loadCheckout, loadDetail, loadGrid, loadReviewList, loadWishlistButton, syncSources } from './loaders'
import { exportCatalog, importCatalog } from './portable'
import { imageOf, priceOf, vnd, type Product } from './util'
import { withCommerceEvents } from '@hosso/studio-blocks/durable-events'
import { OrderGroups } from './order-workflow'
import { SavedCarts, savedCartEndpoints, ownerOf } from './saved-cart'
import { Returns, returnEndpoints, cleanReturnEvidence } from './returns'

/** Plugin cửa hàng: web bán hàng chạy độc lập (không cần WIM). Phát `onOrderPlaced` nên Tiếp thị liên kết và Giao vận dùng được ngay. */
const plugin: HossoPlugin = {
  ...definition,
  // Trang chi tiết sản phẩm và danh mục vào sitemap.xml.
  sitemap: async (payload) => {
    const products = (await payload.find({ collection: 'shop-products' as any, where: { active: { equals: true } }, limit: 5000, depth: 0, pagination: false, overrideAccess: true })).docs as unknown as { slug: string; updatedAt: string }[]
    const cats = (await payload.find({ collection: 'shop-categories' as any, limit: 1000, depth: 0, pagination: false, overrideAccess: true })).docs as unknown as { slug: string; updatedAt: string }[]
    return [...products.map((p) => ({ path: `/chi-tiet?p=${p.slug}`, lastModified: p.updatedAt })), ...cats.map((c) => ({ path: `/san-pham?category=${c.slug}`, lastModified: c.updatedAt }))]
  },
  search: async (q, payload) => {
    await syncSources(payload)
    const r = await payload.find({ collection: 'shop-products' as any, where: { and: [{ active: { equals: true } }, { or: [{ name: { contains: q } }, { code: { contains: q } }] }] }, limit: 8, depth: 1, overrideAccess: true })
    return (r.docs as unknown as Product[]).map((p) => ({ title: p.name, href: `/chi-tiet?p=${p.slug}`, description: [p.brand, p.code, vnd(priceOf(p))].filter(Boolean).join(' · '), image: imageOf(p) })) as { title: string; href: string; description?: string }[]
  },
  payload: (config: Config): Config => {
    config = withCommerceEvents(config)
    const views = (config.admin?.components as { views?: Record<string, unknown> } | undefined)?.views ?? {}
    return {
      ...config,
      jobs: { ...config.jobs, tasks: [...(config.jobs?.tasks ?? []), { slug: 'shop-return-retention', schedule: [{ cron: '40 3 * * *', queue: 'default' }], handler: async ({ req }) => { await cleanReturnEvidence(req); return { output: {} } } }, { slug: 'shop-order-recovery', schedule: [{ cron: '* * * * *', queue: 'default' }], handler: async ({ req }) => { await recoverOrders(req); return { output: {} } } }] },
      collections: [...(config.collections ?? []), Categories, Products, Reviews, Orders, OrderGroups, SavedCarts, Returns],
      globals: [...(config.globals ?? []), Settings],
      endpoints: [...(config.endpoints ?? []), ...endpoints, ...savedCartEndpoints, ...returnEndpoints],
      admin: { ...config.admin, components: { ...config.admin?.components, views: { ...views, shopReturns: { Component: '@hosso/plugin-shop/admin#ReturnsView', path: '/shop-returns' }, shopImport: { Component: '@hosso/plugin-shop/admin#ImportView', path: '/shop-import' } } } },
    }
  },
  portable: { globals: [{ slug: 'shop-settings', secretFields: [] }], data: [{ id: 'shop-catalog', export: exportCatalog, import: importCatalog }] },
  hooks: {
    beforeOrder: async ({ payload, headers, draft }) => { draft.meta.cartOwner = await ownerOf({ payload, headers }) || null },
    onOrderReceived: async ({ payload, meta, request }) => {
      if (typeof meta?.cartOwner !== 'string' || typeof meta?.cartGeneration !== 'string') return
      const cart = (await payload.find({ collection: 'shop-saved-carts' as any, where: { and: [{ owner: { equals: meta.cartOwner } }, { generation: { equals: meta.cartGeneration } }] }, limit: 1, depth: 0, overrideAccess: true, req: request })).docs[0] as any
      if (cart) await payload.db.updateOne({ collection: 'shop-saved-carts', req: request, where: { and: [{ id: { equals: cart.id } }, { revision: { equals: cart.revision } }] }, data: { lines: [], generation: '', revision: cart.revision + 1 }, options: { atomic: true } })
    },
    // Plugin thanh toán báo đã nhận tiền: đánh dấu đã thanh toán và tự xác nhận đơn mới.
    onOrderPaid: async ({ payload, orderNo, amount, request }) => {
      const o = (await payload.find({ collection: 'shop-orders' as any, where: { orderNo: { equals: orderNo } }, limit: 1, depth: 0, overrideAccess: true })).docs[0] as { id: number | string; status: string; paymentStatus: string; total: number } | undefined
      if (!o || o.paymentStatus === 'paid' || amount < o.total) return
      await payload.update({ collection: 'shop-orders' as any, id: o.id, req: request, data: { paymentStatus: 'paid' }, overrideAccess: true })
    },
  },
  loaders: { ShopReviewList: loadReviewList, ShopWishlistButton: loadWishlistButton, ShopProductGrid: loadGrid, ShopProductDetail: loadDetail, ShopCategories: loadCategories, ShopCheckout: loadCheckout },
}

export default plugin
