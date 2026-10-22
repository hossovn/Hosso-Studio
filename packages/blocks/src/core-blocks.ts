import type { BlockSchema } from './types'

export const hero: BlockSchema<{ title: string; subtitle: string; ctaLabel: string; ctaHref: string; image: string }> = {
  type: 'Hero',
  label: 'Banner chính',
  fields: {
    title: { type: 'text', label: 'Tiêu đề', contentEditable: true },
    subtitle: { type: 'textarea', label: 'Mô tả', contentEditable: true },
    ctaLabel: { type: 'text', label: 'Nhãn nút', contentEditable: true },
    ctaHref: { type: 'text', label: 'Liên kết nút' },
    image: { type: 'media', label: 'Ảnh nền (tùy chọn)' },
  },
  defaultProps: { title: 'Tiêu đề banner', subtitle: '', ctaLabel: 'Xem ngay', ctaHref: '#', image: '/editor-demo/mountain.jpg' },
}

export const text: BlockSchema<{ heading: string; body: string }> = {
  type: 'Text',
  label: 'Văn bản',
  fields: {
    heading: { type: 'text', label: 'Tiêu đề', contentEditable: true },
    body: { type: 'textarea', label: 'Nội dung (cách đoạn bằng dòng trống; hỗ trợ **đậm**, *nghiêng*, [chữ](liên kết), dòng bắt đầu bằng - là danh sách)' },
  },
  defaultProps: { heading: '', body: '' },
}

export const slider: BlockSchema<{ slides: { image: string; href: string; alt: string }[]; seconds: number }> = {
  type: 'Slider',
  label: 'Băng chuyền banner',
  fields: {
    slides: {
      type: 'array',
      label: 'Các banner',
      arrayFields: { image: { type: 'media', label: 'Ảnh' }, href: { type: 'text', label: 'Liên kết (tùy chọn)' }, alt: { type: 'text', label: 'Mô tả ảnh' } },
      defaultItemProps: { image: '', href: '', alt: '' },
    },
    seconds: { type: 'number', label: 'Tự chuyển sau (giây, 0 là tắt)' },
  },
  defaultProps: { slides: [{ image: '/editor-demo/trail.jpg', href: '#', alt: 'Đường mòn trên núi' }, { image: '/editor-templates/cafe.jpg', href: '#', alt: 'Không gian café' }], seconds: 5 },
}

export const image: BlockSchema<{ src: string; alt: string; caption: string }> = {
  type: 'Image',
  label: 'Hình ảnh',
  fields: {
    src: { type: 'media', label: 'Ảnh' },
    alt: { type: 'text', label: 'Mô tả ảnh' },
    caption: { type: 'text', label: 'Chú thích' },
  },
  defaultProps: { src: '/editor-templates/workspace.jpg', alt: 'Không gian làm việc', caption: '' },
}

export const video: BlockSchema<{ url: string; title: string; caption: string }> = {
  type: 'Video',
  label: 'Video',
  fields: {
    url: { type: 'media', kind: 'video', label: 'Video (link YouTube/Vimeo hoặc tệp tải lên)' },
    title: { type: 'text', label: 'Tiêu đề video (cho người dùng đọc màn hình)' },
    caption: { type: 'text', label: 'Chú thích' },
  },
  defaultProps: { url: '', title: '', caption: '' },
}

export const features: BlockSchema<{ heading: string; items: { title: string; description: string }[] }> = {
  type: 'Features',
  label: 'Lưới tính năng',
  fields: {
    heading: { type: 'text', label: 'Tiêu đề', contentEditable: true },
    items: {
      type: 'array',
      label: 'Mục',
      arrayFields: { title: { type: 'text', label: 'Tên' }, description: { type: 'textarea', label: 'Mô tả' } },
      defaultItemProps: { title: 'Tính năng', description: '' },
    },
  },
  defaultProps: { heading: '', items: [] },
}

export const contactForm: BlockSchema<{ heading: string; description: string; submitLabel: string }> = {
  type: 'ContactForm',
  label: 'Form liên hệ',
  fields: {
    heading: { type: 'text', label: 'Tiêu đề' },
    description: { type: 'textarea', label: 'Mô tả' },
    submitLabel: { type: 'text', label: 'Nhãn nút gửi' },
  },
  defaultProps: { heading: 'Liên hệ', description: '', submitLabel: 'Gửi' },
}

export const footer: BlockSchema<{ text: string; links: { label: string; href: string }[] }> = {
  type: 'Footer',
  label: 'Chân trang',
  fields: {
    text: { type: 'text', label: 'Dòng bản quyền' },
    links: {
      type: 'array',
      label: 'Liên kết',
      arrayFields: { label: { type: 'text', label: 'Nhãn' }, href: { type: 'text', label: 'Địa chỉ' } },
      defaultItemProps: { label: 'Liên kết', href: '#' },
    },
  },
  defaultProps: { text: '', links: [] },
}

export const trustBar: BlockSchema<{ items: { text: string }[] }> = {
  type: 'TrustBar',
  label: 'Thanh cam kết',
  fields: { items: { type: 'array', label: 'Cam kết', arrayFields: { text: { type: 'text', label: 'Nội dung' } }, defaultItemProps: { text: 'Cam kết' } } },
  defaultProps: { items: [{ text: 'Hỗ trợ 24/7' }, { text: 'Giao toàn quốc' }, { text: 'Hàng chính hãng' }] },
}

export const categoryGrid: BlockSchema<{ heading: string; items: { label: string; href: string; image: string }[] }> = {
  type: 'CategoryGrid',
  label: 'Lưới danh mục (có ảnh)',
  fields: {
    heading: { type: 'text', label: 'Tiêu đề' },
    items: {
      type: 'array',
      label: 'Danh mục',
      arrayFields: { label: { type: 'text', label: 'Tên' }, href: { type: 'text', label: 'Liên kết' }, image: { type: 'media', label: 'Ảnh' } },
      defaultItemProps: { label: 'Danh mục', href: '/san-pham', image: '' },
    },
  },
  defaultProps: { heading: 'Danh mục sản phẩm', items: [] },
}

export const formBlock: BlockSchema<{ heading: string; form: string }> = {
  type: 'Form',
  label: 'Biểu mẫu (tùy chỉnh)',
  fields: { heading: { type: 'text', label: 'Tiêu đề' }, form: { type: 'ref', collection: 'forms', label: 'Biểu mẫu' } },
  defaultProps: { heading: '', form: '' },
}

export const reusable: BlockSchema<{ slug: string }> = {
  type: 'Reusable',
  label: 'Khối dùng lại',
  fields: { slug: { type: 'ref', collection: 'reusable-blocks', label: 'Chọn khối' } },
  defaultProps: { slug: '' },
}

export const postList: BlockSchema<{ heading: string; count: number; paginate: string; category: string; tag: string }> = {
  type: 'PostList',
  label: 'Danh sách bài viết',
  fields: {
    heading: { type: 'text', label: 'Tiêu đề' },
    count: { type: 'number', label: 'Số bài mỗi trang' },
    category: { type: 'text', label: 'Chỉ chuyên mục này (mã chuyên mục, để trống = tất cả)' },
    tag: { type: 'text', label: 'Chỉ thẻ này (mã thẻ)' },
    paginate: {
      type: 'radio',
      label: 'Phân trang',
      options: [
        { label: 'Có', value: 'yes' },
        { label: 'Không', value: 'no' },
      ],
    },
  },
  defaultProps: { heading: 'Bài viết mới', count: 6, paginate: 'no', category: '', tag: '' },
}

export const searchBox: BlockSchema<{ heading: string }> = {
  type: 'SearchBox',
  label: 'Ô tìm kiếm (widget)',
  fields: { heading: { type: 'text', label: 'Tiêu đề' } },
  defaultProps: { heading: 'Tìm kiếm' },
}

export const termList: BlockSchema<{ heading: string; kind: string; showCount: string }> = {
  type: 'TermList',
  label: 'Danh sách chuyên mục / thẻ (widget)',
  fields: {
    heading: { type: 'text', label: 'Tiêu đề' },
    kind: {
      type: 'radio',
      label: 'Hiện',
      options: [
        { label: 'Chuyên mục', value: 'categories' },
        { label: 'Thẻ', value: 'tags' },
      ],
    },
    showCount: {
      type: 'radio',
      label: 'Hiện số bài',
      options: [
        { label: 'Có', value: 'yes' },
        { label: 'Không', value: 'no' },
      ],
    },
  },
  defaultProps: { heading: 'Chuyên mục', kind: 'categories', showCount: 'yes' },
}

export const navMenu: BlockSchema<{ heading: string; source: string; links: { label: string; href: string }[] }> = {
  type: 'NavMenu',
  label: 'Menu tùy chọn (widget)',
  fields: {
    heading: { type: 'text', label: 'Tiêu đề' },
    source: {
      type: 'radio',
      label: 'Nguồn menu',
      options: [
        { label: 'Liên kết tự nhập', value: 'custom' },
        { label: 'Menu đầu trang', value: 'header' },
        { label: 'Menu chân trang', value: 'footer' },
      ],
    },
    links: {
      type: 'array',
      label: 'Liên kết (khi chọn "Liên kết tự nhập")',
      arrayFields: { label: { type: 'text', label: 'Tên hiển thị' }, href: { type: 'text', label: 'Đường dẫn' } },
      defaultItemProps: { label: 'Liên kết', href: '/' },
    },
  },
  defaultProps: { heading: 'Liên kết nhanh', source: 'custom', links: [{ label: 'Giới thiệu', href: '/gioi-thieu' }, { label: 'Liên hệ', href: '/lien-he' }] },
}

/** Block của lõi cần dữ liệu server (xem lib/core-loaders.ts trong app). */
export const CORE_LOADER_TYPES = ['PostList', 'Form', 'TermList', 'NavMenu']

export const twoColumns: BlockSchema<{ image: string; imageSide: string; heading: string; body: string; ctaLabel: string; ctaHref: string; imageFit: string }> = {
  type: 'TwoColumns',
  label: 'Hai cột (ảnh và chữ)',
  fields: {
    image: { type: 'media', label: 'Ảnh' },
    imageSide: { type: 'radio', label: 'Vị trí ảnh', options: [{ label: 'Bên trái', value: 'left' }, { label: 'Bên phải', value: 'right' }] },
    imageFit: { type: 'radio', label: 'Cách hiện ảnh', options: [{ label: 'Phủ kín khung', value: 'cover' }, { label: 'Hiện đủ ảnh', value: 'contain' }] },
    heading: { type: 'text', label: 'Tiêu đề', contentEditable: true },
    body: { type: 'textarea', label: 'Nội dung (cách đoạn bằng dòng trống; hỗ trợ **đậm**, dòng bắt đầu bằng - là danh sách)' },
    ctaLabel: { type: 'text', label: 'Nhãn nút (tùy chọn)' },
    ctaHref: { type: 'text', label: 'Liên kết nút' },
  },
  defaultProps: { image: '/editor-templates/workspace.jpg', imageSide: 'left', imageFit: 'cover', heading: 'Tiêu đề', body: 'Nội dung giới thiệu.', ctaLabel: '', ctaHref: '' },
}

export const imageSections: BlockSchema<{ image: string; title: string; sections: { heading: string; body: string }[] }> = {
  type: 'ImageSections',
  label: 'Ảnh dọc và các mục chữ',
  fields: {
    image: { type: 'media', label: 'Ảnh bên trái' },
    title: { type: 'text', label: 'Tiêu đề trên ảnh', contentEditable: true },
    sections: {
      type: 'array',
      label: 'Các mục chữ',
      arrayFields: { heading: { type: 'text', label: 'Tiêu đề mục' }, body: { type: 'textarea', label: 'Nội dung (cách đoạn bằng dòng trống; dòng bắt đầu bằng - là danh sách)' } },
      defaultItemProps: { heading: 'Tiêu đề mục', body: '' },
    },
  },
  defaultProps: { image: '/editor-templates/cafe.jpg', title: 'Về chúng tôi', sections: [{ heading: 'Giới thiệu', body: 'Nội dung giới thiệu.' }] },
}

// Vùng tự do: các phần tử (elements) nằm trong props, chỉnh bằng kéo thả trên canvas nên không khai báo field cho chúng.
export const freeCanvas: BlockSchema<{ height: number; bgImage: string }> = {
  type: 'FreeCanvas',
  label: 'Phần trống (kéo thả)',
  fields: { height: { type: 'number', label: 'Chiều cao phần (px, trên khung 1200px)' }, bgImage: { type: 'media', label: 'Ảnh nền' } },
  defaultProps: { height: 400, bgImage: '', _els: [] } as any,
}


export const popup: BlockSchema<any> = {
  type: 'Popup',
  label: 'Popup',
  fields: {
    title: { type: 'text', label: 'Tiêu đề' },
    body: { type: 'textarea', label: 'Nội dung' },
    image: { type: 'media', label: 'Ảnh (tùy chọn)' },
    ctaLabel: { type: 'text', label: 'Nhãn nút' },
    ctaHref: { type: 'text', label: 'Liên kết nút' },
    delay: { type: 'number', label: 'Hiện sau (giây)' },
    every: { type: 'radio', label: 'Tần suất hiện', options: [{ label: 'Mỗi lần vào trang', value: 'always' }, { label: 'Một lần mỗi phiên', value: 'session' }, { label: 'Chỉ một lần', value: 'once' }] },
  },
  defaultProps: { title: 'Ưu đãi dành cho bạn', body: 'Đăng ký hôm nay để nhận giảm 10% cho đơn đầu tiên.', image: '', ctaLabel: 'Nhận ưu đãi', ctaHref: '#', delay: 5, every: 'session' },
}

export const noticeBar: BlockSchema<any> = {
  type: 'NoticeBar',
  label: 'Thanh thông báo',
  fields: {
    text: { type: 'text', label: 'Nội dung' },
    href: { type: 'text', label: 'Liên kết (tùy chọn)' },
    bg: { type: 'text', label: 'Màu nền (hex)' },
    color: { type: 'text', label: 'Màu chữ (hex)' },
    dismissible: { type: 'radio', label: 'Cho khách tắt', options: [{ label: 'Có', value: 'yes' }, { label: 'Không', value: 'no' }] },
  },
  defaultProps: { text: 'Miễn phí vận chuyển cho đơn từ 500.000₫', href: '', bg: '#15803d', color: '#ffffff', dismissible: 'yes' },
}

export const languageSwitch: BlockSchema<any> = {
  type: 'LanguageSwitch',
  label: 'Chọn ngôn ngữ',
  fields: {
    locales: { type: 'textarea', label: 'Ngôn ngữ (mỗi dòng mã:Nhãn; dòng đầu là mặc định, khớp cấu hình site)' },
    style: { type: 'radio', label: 'Kiểu', options: [{ label: 'Nút', value: 'buttons' }, { label: 'Danh sách chọn', value: 'select' }] },
    align: { type: 'radio', label: 'Căn lề', options: [{ label: 'Trái', value: 'left' }, { label: 'Giữa', value: 'center' }, { label: 'Phải', value: 'right' }] },
  },
  defaultProps: { locales: 'vi:Tiếng Việt\nen:English', style: 'buttons', align: 'right' },
}

export const luckyWheel: BlockSchema<any> = {
  type: 'LuckyWheel',
  label: 'Vòng quay may mắn',
  fields: {
    heading: { type: 'text', label: 'Tiêu đề' },
    prizes: { type: 'textarea', label: 'Các ô giải (mỗi dòng một ô, tối thiểu 2)' },
    button: { type: 'text', label: 'Nhãn nút quay' },
  },
  defaultProps: { heading: 'Quay để nhận quà', prizes: 'Giảm 10%\nChúc may mắn\nGiảm 20%\nQuà tặng\nFreeship\nThử lại', button: 'Quay ngay' },
}


export const booking: BlockSchema<any> = {
  type: 'Booking',
  label: 'Đặt lịch hẹn',
  fields: {
    heading: { type: 'text', label: 'Tiêu đề' },
    services: { type: 'textarea', label: 'Danh sách dịch vụ (mỗi dòng một dịch vụ; để trống là không hỏi dịch vụ)' },
    askGuests: { type: 'radio', label: 'Hỏi số người', options: [{ label: 'Có', value: 'yes' }, { label: 'Không', value: 'no' }] },
    submitLabel: { type: 'text', label: 'Nhãn nút gửi' },
    successText: { type: 'text', label: 'Lời cảm ơn sau khi gửi' },
  },
  defaultProps: { heading: 'Đặt lịch hẹn', services: '', askGuests: 'no', submitLabel: 'Đặt lịch', successText: 'Đã gửi yêu cầu đặt lịch. Chúng tôi sẽ liên hệ xác nhận sớm.' },
}

export const coreBlocks: BlockSchema<any>[] = [freeCanvas, popup, noticeBar, languageSwitch, luckyWheel, booking, hero, slider, text, twoColumns, imageSections, image, video, features, categoryGrid, trustBar, postList, searchBox, termList, navMenu, contactForm, formBlock, reusable, footer]
