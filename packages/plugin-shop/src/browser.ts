import type { HossoPlugin, PluginManifest } from '@hosso/studio-blocks'
import manifest from '../hosso.json'
import { shopBlocks } from './blocks'
import { CartLink } from './client/Shop'
import { SavedCartRuntime } from './client/SavedCart'
import { fallbackRenderers } from './renderers'
import { css } from './styles'

// Shared editor/storefront definition; server-only operations stay in index.ts.
const plugin: HossoPlugin = {
  id: 'shop',
  manifest: manifest as PluginManifest,
  blocks: shopBlocks,
  fallbackRenderers,
  css,
  headerSlot: CartLink,
  runtimeSlot: SavedCartRuntime,
  loaderTypes: ['ShopReviewList', 'ShopWishlistButton', 'ShopProductGrid', 'ShopProductDetail', 'ShopCategories', 'ShopCheckout'],
  adminNav: [
    { label: 'Sản phẩm', href: '/admin/collections/shop-products', roles: ['admin', 'publisher'] },
    { label: 'Danh mục sản phẩm', href: '/admin/collections/shop-categories', roles: ['admin', 'publisher'] },
    { label: 'Đơn hàng', href: '/admin/collections/shop-orders', roles: ['admin', 'publisher'] },
    { label: 'Đổi trả', href: '/admin/shop-returns', roles: ['admin'] },
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
}
export default plugin
