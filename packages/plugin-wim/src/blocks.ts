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
  },
  defaultProps: { heading: 'Phụ tùng', pageSize: 12, category: '', brand: '', condition: 'any', useSelectedVehicle: 'yes', detailPath: '/chi-tiet' },
}

export const productDetail: BlockSchema<{ backPath: string }> = {
  type: 'WimProductDetail',
  label: 'Chi tiết sản phẩm',
  fields: { backPath: { type: 'text', label: 'Trang danh sách (đường dẫn)' } },
  defaultProps: { backPath: '/san-pham' },
}

export const wimBlocks = [vehicleSelector, productSearch, productGrid, productDetail]
