import type { BlockSchema } from '@hosso/studio-blocks'

// Block thương mại của plugin WIM (không thuộc lõi). Dữ liệu động đến qua loader (xem loaders.ts).
export const vehicleSelector: BlockSchema<{ heading: string; targetPath: string }> = {
  type: 'WimVehicleSelector',
  label: 'Bộ chọn xe',
  fields: {
    heading: { type: 'text', label: 'Tiêu đề' },
    targetPath: { type: 'text', label: 'Trang hiện kết quả (đường dẫn)' },
  },
  defaultProps: { heading: 'Chọn xe của bạn', targetPath: '/san-pham' },
}

export const productSearch: BlockSchema<{ heading: string; targetPath: string }> = {
  type: 'WimProductSearch',
  label: 'Ô tìm theo mã hoặc tên',
  fields: {
    heading: { type: 'text', label: 'Tiêu đề' },
    targetPath: { type: 'text', label: 'Trang hiện kết quả (đường dẫn)' },
  },
  defaultProps: { heading: '', targetPath: '/san-pham' },
}

export const productGrid: BlockSchema<{
  heading: string
  pageSize: number
  category: string
  brand: string
  condition: string
  useSelectedVehicle: string
  detailPath: string
  pager: string
}> = {
  type: 'WimProductGrid',
  label: 'Lưới sản phẩm',
  fields: {
    heading: { type: 'text', label: 'Tiêu đề' },
    pageSize: { type: 'number', label: 'Số sản phẩm mỗi trang' },
    category: { type: 'text', label: 'Lọc danh mục (mã danh mục WIM)' },
    brand: { type: 'text', label: 'Lọc thương hiệu' },
    condition: {
      type: 'select',
      label: 'Tình trạng',
      options: [
        { label: 'Tất cả', value: 'any' },
        { label: 'Chính hãng', value: 'genuine' },
        { label: 'Thay thế', value: 'aftermarket' },
      ],
    },
    useSelectedVehicle: {
      type: 'radio',
      label: 'Lọc theo xe khách đã chọn',
      options: [
        { label: 'Có', value: 'yes' },
        { label: 'Không', value: 'no' },
      ],
    },
    detailPath: { type: 'text', label: 'Trang chi tiết sản phẩm (đường dẫn)' },
    pager: {
      type: 'radio',
      label: 'Hiện phân trang',
      options: [
        { label: 'Có', value: 'yes' },
        { label: 'Không (dùng cho mục sản phẩm nổi bật)', value: 'no' },
      ],
    },
  },
  defaultProps: { heading: 'Phụ tùng', pageSize: 12, category: '', brand: '', condition: 'any', useSelectedVehicle: 'yes', detailPath: '/chi-tiet', pager: 'yes' },
}

export const productDetail: BlockSchema<{ backPath: string; cartPath: string }> = {
  type: 'WimProductDetail',
  label: 'Chi tiết sản phẩm',
  fields: {
    backPath: { type: 'text', label: 'Trang danh sách (đường dẫn)' },
    cartPath: { type: 'text', label: 'Trang giỏ hàng (đường dẫn)' },
  },
  defaultProps: { backPath: '/san-pham', cartPath: '/gio-hang' },
}

export const cart: BlockSchema<{ heading: string; checkoutPath: string; shopPath: string }> = {
  type: 'WimCart',
  label: 'Giỏ hàng',
  fields: {
    heading: { type: 'text', label: 'Tiêu đề' },
    checkoutPath: { type: 'text', label: 'Trang thanh toán (đường dẫn)' },
    shopPath: { type: 'text', label: 'Trang sản phẩm (đường dẫn)' },
  },
  defaultProps: { heading: 'Giỏ hàng', checkoutPath: '/thanh-toan', shopPath: '/san-pham' },
}

export const checkout: BlockSchema<{ heading: string; statusPath: string; cartPath: string }> = {
  type: 'WimCheckout',
  label: 'Thanh toán (COD hoặc nhận tại chi nhánh)',
  fields: {
    heading: { type: 'text', label: 'Tiêu đề' },
    statusPath: { type: 'text', label: 'Trang trạng thái đơn (đường dẫn)' },
    cartPath: { type: 'text', label: 'Trang giỏ hàng (đường dẫn)' },
  },
  defaultProps: { heading: 'Đặt hàng', statusPath: '/trang-thai-don', cartPath: '/gio-hang' },
}

export const orderStatus: BlockSchema<{ heading: string }> = {
  type: 'WimOrderStatus',
  label: 'Trạng thái đơn',
  fields: { heading: { type: 'text', label: 'Tiêu đề' } },
  defaultProps: { heading: 'Trạng thái đơn hàng' },
}

export const wimBlocks = [vehicleSelector, productSearch, productGrid, productDetail, cart, checkout, orderStatus]
