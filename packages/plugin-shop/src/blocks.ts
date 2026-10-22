import type { BlockField, BlockSchema } from '@hosso/studio-blocks'

const WIDTH: BlockField = { type: 'radio', label: 'Độ rộng nội dung', options: [{ label: 'Hẹp', value: 'narrow' }, { label: 'Thường', value: 'normal' }, { label: 'Rộng', value: 'wide' }] }

export const productGrid: BlockSchema<{ heading: string; pageSize: number; category: string; brand: string; sort: string; detailPath: string; pager: string; layout: string; columns: number; cardStyle: string; imageRatio: string; showCode: string; showBrand: string }> = {
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
    // Bố cục thẻ và danh sách (chọn ngay trong trình dựng)
    layout: { type: 'radio', label: 'Kiểu danh sách', options: [{ label: 'Lưới', value: 'grid' }, { label: 'Băng chuyền có mũi tên', value: 'carousel' }] },
    columns: { type: 'select', label: 'Số cột trên máy tính', options: [2, 3, 4, 5, 6].map((n) => ({ label: String(n), value: n })) },
    cardStyle: { type: 'select', label: 'Kiểu thẻ sản phẩm', options: [{ label: 'Dọc (ảnh trên)', value: 'vertical' }, { label: 'Ngang (ảnh bên trái)', value: 'horizontal' }, { label: 'Gọn (không khung)', value: 'plain' }] },
    imageRatio: { type: 'select', label: 'Tỉ lệ ảnh thẻ', options: [{ label: 'Vuông', value: 'square' }, { label: 'Dọc 3:4', value: 'portrait' }, { label: 'Ngang 4:3', value: 'wide' }] },
    showCode: { type: 'radio', label: 'Hiện mã sản phẩm', options: [{ label: 'Có', value: 'yes' }, { label: 'Không', value: 'no' }] },
    showBrand: { type: 'radio', label: 'Hiện thương hiệu', options: [{ label: 'Có', value: 'yes' }, { label: 'Không', value: 'no' }] },
  },
  defaultProps: { heading: 'Sản phẩm', pageSize: 12, category: '', brand: '', sort: 'new', detailPath: '/chi-tiet', pager: 'yes', layout: 'grid', columns: 5, cardStyle: 'vertical', imageRatio: 'square', showCode: 'yes', showBrand: 'no' },
}

export const productDetail: BlockSchema<{ backPath: string; cartPath: string; layout: string; imageSize: string; showTabs: string; showReviews: string; showRelated: string; relatedLayout: string }> = {
  type: 'ShopProductDetail',
  label: 'Chi tiết sản phẩm (cửa hàng)',
  fields: {
    backPath: { type: 'text', label: 'Trang danh sách (đường dẫn)' },
    cartPath: { type: 'text', label: 'Trang giỏ hàng (đường dẫn)' },
    layout: { type: 'select', label: 'Bố cục trang chi tiết', options: [{ label: 'Ảnh bên trái, thông tin bên phải', value: 'left' }, { label: 'Ảnh bên phải, thông tin bên trái', value: 'right' }, { label: 'Xếp dọc (ảnh trên, thông tin dưới)', value: 'stack' }] },
    imageSize: { type: 'select', label: 'Độ rộng cột ảnh', options: [{ label: 'Hẹp (1/3)', value: 's' }, { label: 'Vừa (1/2)', value: 'm' }, { label: 'Rộng (3/5)', value: 'l' }] },
    showTabs: { type: 'radio', label: 'Hiện tab mô tả và thông tin bổ sung', options: [{ label: 'Có', value: 'yes' }, { label: 'Không', value: 'no' }] },
    showReviews: { type: 'radio', label: 'Hiện đánh giá', options: [{ label: 'Có', value: 'yes' }, { label: 'Không', value: 'no' }] },
    showRelated: { type: 'radio', label: 'Hiện sản phẩm tương tự', options: [{ label: 'Có', value: 'yes' }, { label: 'Không', value: 'no' }] },
    relatedLayout: { type: 'radio', label: 'Sản phẩm tương tự dạng', options: [{ label: 'Lưới', value: 'grid' }, { label: 'Băng chuyền có mũi tên', value: 'carousel' }] },
  },
  defaultProps: { backPath: '/san-pham', cartPath: '/gio-hang', layout: 'left', imageSize: 'm', showTabs: 'yes', showReviews: 'yes', showRelated: 'yes', relatedLayout: 'carousel' },
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

export const cart: BlockSchema<{ heading: string; checkoutPath: string; shopPath: string; width: string }> = {
  type: 'ShopCart',
  label: 'Giỏ hàng (cửa hàng)',
  fields: {
    heading: { type: 'text', label: 'Tiêu đề' },
    checkoutPath: { type: 'text', label: 'Trang thanh toán (đường dẫn)' },
    shopPath: { type: 'text', label: 'Trang sản phẩm (đường dẫn)' },
    width: WIDTH,
  },
  defaultProps: { heading: 'Giỏ hàng', checkoutPath: '/thanh-toan', shopPath: '/san-pham', width: 'normal' },
}

export const checkout: BlockSchema<{ heading: string; statusPath: string; cartPath: string; width: string; layout: string }> = {
  type: 'ShopCheckout',
  label: 'Thanh toán (cửa hàng)',
  fields: {
    heading: { type: 'text', label: 'Tiêu đề' },
    statusPath: { type: 'text', label: 'Trang tra cứu đơn (đường dẫn)' },
    cartPath: { type: 'text', label: 'Trang giỏ hàng (đường dẫn)' },
    width: WIDTH,
    layout: { type: 'radio', label: 'Bố cục', options: [{ label: 'Một cột', value: 'single' }, { label: 'Hai cột (biểu mẫu trái, đơn hàng phải)', value: 'split' }] },
  },
  defaultProps: { heading: 'Đặt hàng', statusPath: '/trang-thai-don', cartPath: '/gio-hang', width: 'normal', layout: 'single' },
}

export const orderStatus: BlockSchema<{ heading: string }> = {
  type: 'ShopOrderStatus',
  label: 'Tra cứu đơn hàng (cửa hàng)',
  fields: { heading: { type: 'text', label: 'Tiêu đề' } },
  defaultProps: { heading: 'Tra cứu đơn hàng' },
}



export const reviewList: BlockSchema<{ heading: string; limit: number; minRating: number; product: string }> = {
  type: 'ShopReviewList',
  label: 'Danh sách đánh giá (cửa hàng)',
  fields: {
    heading: { type: 'text', label: 'Tiêu đề' },
    limit: { type: 'number', label: 'Số đánh giá tối đa' },
    minRating: { type: 'select', label: 'Chỉ hiện từ số sao', options: [1, 2, 3, 4, 5].map((n) => ({ label: `${n} sao trở lên`, value: n })) },
    product: { type: 'text', label: 'Chỉ của sản phẩm (đường dẫn hoặc id; để trống là mọi sản phẩm)' },
  },
  defaultProps: { heading: 'Khách hàng nói gì', limit: 6, minRating: 4, product: '' },
}

export const wishlistButton: BlockSchema<{ productId: string; label: string }> = {
  type: 'ShopWishlistButton',
  label: 'Nút yêu thích (trái tim)',
  fields: {
    productId: { type: 'text', label: 'Id sản phẩm (để trống: lấy từ trang chi tiết đang xem)' },
    label: { type: 'text', label: 'Nhãn nút' },
  },
  defaultProps: { productId: '', label: 'Yêu thích' },
}

export const wishlist: BlockSchema<{ heading: string; detailPath: string }> = {
  type: 'ShopWishlist',
  label: 'Trang sản phẩm yêu thích',
  fields: {
    heading: { type: 'text', label: 'Tiêu đề' },
    detailPath: { type: 'text', label: 'Trang chi tiết sản phẩm (đường dẫn)' },
  },
  defaultProps: { heading: 'Sản phẩm yêu thích', detailPath: '/chi-tiet' },
}
export const shopBlocks = [productGrid, productDetail, categories, cart, checkout, orderStatus, reviewList, wishlistButton, wishlist]
