// Chuỗi giao diện storefront (tiếng Việt). Đa ngôn ngữ sau này: thêm file strings.<lang>.ts cùng khóa.
export const strings = {
  'contact.name': 'Họ và tên',
  'contact.phone': 'Số điện thoại',
  'contact.message': 'Nội dung',
  'contact.sent': 'Cảm ơn bạn! Chúng tôi sẽ liên hệ sớm.',
  'contact.error': 'Không gửi được, vui lòng thử lại.',
  'hero.eyebrow': '// PHỤ TÙNG & KỸ THUẬT',
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
