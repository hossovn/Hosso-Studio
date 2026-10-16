// Chuỗi giao diện storefront (tiếng Việt). Đa ngôn ngữ sau này: thêm file strings.<lang>.ts cùng khóa.
export const strings = {
  'contact.name': 'Họ và tên',
  'contact.phone': 'Số điện thoại',
  'contact.message': 'Nội dung',
  'contact.sent': 'Cảm ơn bạn! Chúng tôi sẽ liên hệ sớm.',
  'contact.error': 'Không gửi được, vui lòng thử lại.',
  'nav.skip': 'Bỏ qua đến nội dung chính',
  'block.missing': 'Thiếu plugin hoặc block không còn được hỗ trợ',
} as const

export type StringKey = keyof typeof strings

export const t = (key: StringKey) => strings[key]
