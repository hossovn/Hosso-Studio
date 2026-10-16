// Chuỗi giao diện storefront (tiếng Việt). Đa ngôn ngữ sau này: thêm file strings.<lang>.ts cùng khóa.
export const strings = {
  'contact.name': 'Họ và tên',
  'contact.phone': 'Số điện thoại',
  'contact.message': 'Nội dung',
  'contact.sent': 'Cảm ơn bạn! Chúng tôi sẽ liên hệ sớm.',
  'contact.error': 'Không gửi được, vui lòng thử lại.',
  'hero.eyebrow': '// PHỤ TÙNG & KỸ THUẬT',
  'post.loading': 'Đang tải bài viết…',
  'post.empty': 'Chưa có bài viết.',
  'post.pager': 'Phân trang',
  'post.prev': 'Trang trước',
  'post.next': 'Trang sau',
  'search.title': 'Tìm kiếm',
  'search.label': 'Từ khóa',
  'search.placeholder': 'Tìm trang, bài viết, sản phẩm…',
  'search.submit': 'Tìm',
  'search.empty': 'Không có kết quả phù hợp.',
  'search.pages': 'Trang',
  'search.posts': 'Bài viết',
  'search.products': 'Sản phẩm',
  'notfound.title': 'Không tìm thấy trang',
  'notfound.text': 'Trang bạn tìm không tồn tại hoặc đã được chuyển đi.',
  'notfound.home': 'Về trang chủ',
  'shop.hotline': 'Hotline',
  'shop.quicklinks': 'Liên kết nhanh',
  'nav.skip': 'Bỏ qua đến nội dung chính',
  'nav.main': 'Menu chính',
  'nav.menu': 'Menu',
  'footer.contact': 'Liên hệ',
  'footer.follow': 'Theo dõi',
  'contact.call': 'Gọi điện',
  'contact.zalo': 'Zalo',
  'block.missing': 'Thiếu plugin hoặc block không còn được hỗ trợ',
} as const

export type StringKey = keyof typeof strings

export const t = (key: StringKey) => strings[key]
