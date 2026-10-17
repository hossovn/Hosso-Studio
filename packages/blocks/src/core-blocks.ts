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
  defaultProps: { title: 'Tiêu đề banner', subtitle: '', ctaLabel: 'Xem ngay', ctaHref: '#', image: '' },
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

export const image: BlockSchema<{ src: string; alt: string; caption: string }> = {
  type: 'Image',
  label: 'Hình ảnh',
  fields: {
    src: { type: 'media', label: 'Ảnh' },
    alt: { type: 'text', label: 'Mô tả ảnh' },
    caption: { type: 'text', label: 'Chú thích' },
  },
  defaultProps: { src: '', alt: '', caption: '' },
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

/** Block của lõi cần dữ liệu server (xem lib/core-loaders.ts trong app). */
export const CORE_LOADER_TYPES = ['PostList', 'Form']

export const coreBlocks: BlockSchema<any>[] = [hero, text, image, video, features, categoryGrid, trustBar, postList, contactForm, formBlock, reusable, footer]
