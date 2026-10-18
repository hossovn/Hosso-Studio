import type { HossoPlugin, PluginManifest } from '@hosso/studio-blocks'
import type { Config } from 'payload'
import manifest from '../hosso.json'
import { shopBlocks } from './blocks'
import { Categories, Orders, Products, Reviews, Settings } from './collections'
import { CartLink } from './client/Shop'
import { endpoints } from './endpoints'
import { loadCategories, loadCheckout, loadDetail, loadGrid } from './loaders'
import { fallbackRenderers } from './renderers'
import { css } from './styles'
import { exportCatalog, importCatalog } from './portable'
import { imageOf, priceOf, vnd, type Product } from './util'

/** Plugin cửa hàng: web bán hàng chạy độc lập (không cần WIM). Phát `onOrderPlaced` như WIM nên Tiếp thị liên kết và Giao vận dùng được ngay. */
const plugin: HossoPlugin = {
  id: 'shop',
  manifest: manifest as PluginManifest,
  blocks: shopBlocks,
  fallbackRenderers,
  css,
  headerSlot: CartLink,
  adminNav: [
    { label: 'Sản phẩm', href: '/admin/collections/shop-products', roles: ['admin', 'publisher'] },
    { label: 'Danh mục sản phẩm', href: '/admin/collections/shop-categories', roles: ['admin', 'publisher'] },
    { label: 'Đơn hàng', href: '/admin/collections/shop-orders', roles: ['admin', 'publisher'] },
    { label: 'Đánh giá sản phẩm', href: '/admin/collections/shop-reviews', roles: ['admin', 'publisher'] },
    { label: 'Nhập/xuất CSV', href: '/admin/shop-import', roles: ['admin', 'publisher'] },
    { label: 'Cài đặt cửa hàng', href: '/admin/globals/shop-settings', roles: ['admin'] },
  ],
  adminEn: {
    'Sản phẩm': 'Products',
    'Danh mục sản phẩm': 'Product categories',
    'Đơn hàng': 'Orders',
    'Đánh giá sản phẩm': 'Product reviews',
    'Nhập/xuất CSV': 'Import/export CSV',
    'Cài đặt cửa hàng': 'Shop settings',
    'Lưới sản phẩm (cửa hàng)': 'Product grid (shop)',
    'Số sản phẩm mỗi trang': 'Products per page',
    'Lọc danh mục (đường dẫn danh mục)': 'Filter by category (category slug)',
    'Lọc thương hiệu': 'Filter by brand',
    'Sắp xếp': 'Sort',
    'Mới nhất': 'Newest',
    'Giá tăng dần': 'Price low to high',
    'Giá giảm dần': 'Price high to low',
    'Trang chi tiết sản phẩm (đường dẫn)': 'Product detail page (path)',
    'Hiện phân trang và bộ lọc từ URL': 'Show pagination and URL filters',
    'Không (dùng cho mục sản phẩm nổi bật)': 'No (for featured product sections)',
    'Chi tiết sản phẩm (cửa hàng)': 'Product detail (shop)',
    'Trang danh sách (đường dẫn)': 'List page (path)',
    'Trang giỏ hàng (đường dẫn)': 'Cart page (path)',
    'Lưới danh mục sản phẩm (tự động)': 'Product category grid (automatic)',
    'Danh mục cha (đường dẫn; để trống là danh mục gốc)': 'Parent category (slug; empty for top level)',
    'Trang danh sách sản phẩm (đường dẫn)': 'Product list page (path)',
    'Giỏ hàng (cửa hàng)': 'Cart (shop)',
    'Trang thanh toán (đường dẫn)': 'Checkout page (path)',
    'Trang sản phẩm (đường dẫn)': 'Products page (path)',
    'Thanh toán (cửa hàng)': 'Checkout (shop)',
    'Trang tra cứu đơn (đường dẫn)': 'Order lookup page (path)',
    'Tra cứu đơn hàng (cửa hàng)': 'Order lookup (shop)',
    'Tiêu đề': 'Heading',
    'Có': 'Yes',
    'Không': 'No',
  },
  // Trang chi tiết sản phẩm và danh mục vào sitemap.xml.
  sitemap: async (payload) => {
    const products = (await payload.find({ collection: 'shop-products' as any, where: { active: { equals: true } }, limit: 5000, depth: 0, pagination: false, overrideAccess: true })).docs as unknown as { slug: string; updatedAt: string }[]
    const cats = (await payload.find({ collection: 'shop-categories' as any, limit: 1000, depth: 0, pagination: false, overrideAccess: true })).docs as unknown as { slug: string; updatedAt: string }[]
    return [...products.map((p) => ({ path: `/chi-tiet?p=${p.slug}`, lastModified: p.updatedAt })), ...cats.map((c) => ({ path: `/san-pham?category=${c.slug}`, lastModified: c.updatedAt }))]
  },
  search: async (q, payload) => {
    const r = await payload.find({ collection: 'shop-products' as any, where: { and: [{ active: { equals: true } }, { or: [{ name: { contains: q } }, { code: { contains: q } }] }] }, limit: 8, depth: 1, overrideAccess: true })
    return (r.docs as unknown as Product[]).map((p) => ({ title: p.name, href: `/chi-tiet?p=${p.slug}`, description: [p.brand, p.code, vnd(priceOf(p))].filter(Boolean).join(' · '), image: imageOf(p) })) as { title: string; href: string; description?: string }[]
  },
  payload: (config: Config): Config => {
    const views = (config.admin?.components as { views?: Record<string, unknown> } | undefined)?.views ?? {}
    return {
      ...config,
      collections: [...(config.collections ?? []), Categories, Products, Reviews, Orders],
      globals: [...(config.globals ?? []), Settings],
      endpoints: [...(config.endpoints ?? []), ...endpoints],
      admin: { ...config.admin, components: { ...config.admin?.components, views: { ...views, shopImport: { Component: '@hosso/plugin-shop/admin#ImportView', path: '/shop-import' } } } },
    }
  },
  portable: { globals: [{ slug: 'shop-settings', secretFields: [] }], data: [{ id: 'shop-catalog', export: exportCatalog, import: importCatalog }] },
  hooks: {
    // Plugin thanh toán báo đã nhận tiền: đánh dấu đã thanh toán và tự xác nhận đơn mới.
    onOrderPaid: async ({ payload, orderNo, amount }) => {
      const o = (await payload.find({ collection: 'shop-orders' as any, where: { orderNo: { equals: orderNo } }, limit: 1, depth: 0, overrideAccess: true })).docs[0] as { id: number | string; status: string; paymentStatus: string; total: number } | undefined
      if (!o || o.paymentStatus === 'paid' || amount < o.total) return
      await payload.update({ collection: 'shop-orders' as any, id: o.id, data: { paymentStatus: 'paid', ...(o.status === 'new' && { status: 'confirmed' }) }, overrideAccess: true })
    },
  },
  loaders: { ShopProductGrid: loadGrid, ShopProductDetail: loadDetail, ShopCategories: loadCategories, ShopCheckout: loadCheckout },
}

export default plugin
