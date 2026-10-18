import type { BlockSchema } from '@hosso/studio-blocks'

export const productGrid: BlockSchema<{ heading: string; pageSize: number; category: string; brand: string; sort: string; detailPath: string; pager: string }> = {
  type: 'ShopProductGrid',
  label: 'Lưới sản phẩm (cửa hàng)',
  fields: {
    heading: { type: 'text', label: 'Tiêu đề' },
    pageSize: { type: 'number', label: 'Số sản phẩm mỗi trang' },
    category: { type: 'text', label: 'Lọc danh mục (đường dẫn danh mục)' },
    brand: { type: 'text', label: 'Lọc thương hiệu' },
    sort: {
      type: 'select',
      label: 'Sắp xếp',
      options: [
        { label: 'Mới nhất', value: 'new' },
        { label: 'Giá tăng dần', value: 'priceAsc' },
        { label: 'Giá giảm dần', value: 'priceDesc' },
      ],
    },
    detailPath: { type: 'text', label: 'Trang chi tiết sản phẩm (đường dẫn)' },
    pager: {
      type: 'radio',
      label: 'Hiện phân trang và bộ lọc từ URL',
      options: [
        { label: 'Có', value: 'yes' },
        { label: 'Không (dùng cho mục sản phẩm nổi bật)', value: 'no' },
      ],
    },
  },
  defaultProps: { heading: 'Sản phẩm', pageSize: 12, category: '', brand: '', sort: 'new', detailPath: '/chi-tiet', pager: 'yes' },
}

export const productDetail: BlockSchema<{ backPath: string; cartPath: string }> = {
  type: 'ShopProductDetail',
  label: 'Chi tiết sản phẩm (cửa hàng)',
  fields: {
    backPath: { type: 'text', label: 'Trang danh sách (đường dẫn)' },
    cartPath: { type: 'text', label: 'Trang giỏ hàng (đường dẫn)' },
  },
  defaultProps: { backPath: '/san-pham', cartPath: '/gio-hang' },
}

export const categories: BlockSchema<{ heading: string; parent: string; listPath: string }> = {
  type: 'ShopCategories',
  label: 'Lưới danh mục sản phẩm (tự động)',
  fields: {
    heading: { type: 'text', label: 'Tiêu đề' },
    parent: { type: 'text', label: 'Danh mục cha (đường dẫn; để trống là danh mục gốc)' },
    listPath: { type: 'text', label: 'Trang danh sách sản phẩm (đường dẫn)' },
  },
  defaultProps: { heading: 'Danh mục sản phẩm', parent: '', listPath: '/san-pham' },
}

export const cart: BlockSchema<{ heading: string; checkoutPath: string; shopPath: string }> = {
  type: 'ShopCart',
  label: 'Giỏ hàng (cửa hàng)',
  fields: {
    heading: { type: 'text', label: 'Tiêu đề' },
    checkoutPath: { type: 'text', label: 'Trang thanh toán (đường dẫn)' },
    shopPath: { type: 'text', label: 'Trang sản phẩm (đường dẫn)' },
  },
  defaultProps: { heading: 'Giỏ hàng', checkoutPath: '/thanh-toan', shopPath: '/san-pham' },
}

export const checkout: BlockSchema<{ heading: string; statusPath: string; cartPath: string }> = {
  type: 'ShopCheckout',
  label: 'Thanh toán (cửa hàng)',
  fields: {
    heading: { type: 'text', label: 'Tiêu đề' },
    statusPath: { type: 'text', label: 'Trang tra cứu đơn (đường dẫn)' },
    cartPath: { type: 'text', label: 'Trang giỏ hàng (đường dẫn)' },
  },
  defaultProps: { heading: 'Đặt hàng', statusPath: '/trang-thai-don', cartPath: '/gio-hang' },
}

export const orderStatus: BlockSchema<{ heading: string }> = {
  type: 'ShopOrderStatus',
  label: 'Tra cứu đơn hàng (cửa hàng)',
  fields: { heading: { type: 'text', label: 'Tiêu đề' } },
  defaultProps: { heading: 'Tra cứu đơn hàng' },
}

export const shopBlocks = [productGrid, productDetail, categories, cart, checkout, orderStatus]
