import type { CollectionConfig } from 'payload'

import { publishers } from '../lib/access'

/** Chuyển hướng URL cũ sang mới (giữ thứ hạng SEO khi đổi slug hoặc chuyển từ WordPress). */
export const Redirects: CollectionConfig = {
  slug: 'redirects',
  labels: { singular: 'Chuyển hướng', plural: 'Chuyển hướng' },
  admin: { useAsTitle: 'from', defaultColumns: ['from', 'to', 'permanent'], group: 'Công cụ' },
  access: { read: publishers, create: publishers, update: publishers, delete: publishers },
  fields: [
    { name: 'from', type: 'text', required: true, unique: true, index: true, label: 'Từ đường dẫn', admin: { description: 'Ví dụ /bai-cu hoặc /2020/05/bai-cu (không gồm tên miền, không gồm tiền tố ngôn ngữ).' }, validate: (v: unknown) => (typeof v === 'string' && v.startsWith('/') ? true : 'Phải bắt đầu bằng /') },
    { name: 'to', type: 'text', required: true, label: 'Tới', admin: { description: 'Đường dẫn trong site (/bai-moi) hoặc địa chỉ đầy đủ https://…' } },
    { name: 'permanent', type: 'checkbox', defaultValue: true, label: 'Vĩnh viễn (SEO chuyển thứ hạng sang địa chỉ mới)' },
  ],
}
