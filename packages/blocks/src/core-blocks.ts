import type { BlockSchema } from './types'

export const hero: BlockSchema<{ title: string; subtitle: string; ctaLabel: string; ctaHref: string }> = {
  type: 'Hero',
  label: 'Banner chính',
  fields: {
    title: { type: 'text', label: 'Tiêu đề' },
    subtitle: { type: 'textarea', label: 'Mô tả' },
    ctaLabel: { type: 'text', label: 'Nhãn nút' },
    ctaHref: { type: 'text', label: 'Liên kết nút' },
  },
  defaultProps: { title: 'Tiêu đề banner', subtitle: '', ctaLabel: 'Xem ngay', ctaHref: '#' },
}

export const text: BlockSchema<{ heading: string; body: string }> = {
  type: 'Text',
  label: 'Văn bản',
  fields: {
    heading: { type: 'text', label: 'Tiêu đề' },
    body: { type: 'textarea', label: 'Nội dung (cách đoạn bằng dòng trống)' },
  },
  defaultProps: { heading: '', body: '' },
}

export const image: BlockSchema<{ src: string; alt: string; caption: string }> = {
  type: 'Image',
  label: 'Hình ảnh',
  fields: {
    src: { type: 'text', label: 'Địa chỉ ảnh' },
    alt: { type: 'text', label: 'Mô tả ảnh' },
    caption: { type: 'text', label: 'Chú thích' },
  },
  defaultProps: { src: '', alt: '', caption: '' },
}

export const features: BlockSchema<{ heading: string; items: { title: string; description: string }[] }> = {
  type: 'Features',
  label: 'Lưới tính năng',
  fields: {
    heading: { type: 'text', label: 'Tiêu đề' },
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

export const coreBlocks: BlockSchema<any>[] = [hero, text, image, features, contactForm, footer]
