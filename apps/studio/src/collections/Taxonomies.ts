import type { CollectionConfig } from 'payload'

import { pageEditors, publishers } from '../lib/access'

const taxonomy = (slug: string, singular: string, plural: string): CollectionConfig => ({
  slug,
  labels: { singular, plural },
  admin: { useAsTitle: 'name', group: 'Nội dung' },
  access: { read: () => true, create: pageEditors, update: pageEditors, delete: publishers },
  fields: [
    { name: 'name', type: 'text', label: 'Tên', required: true, localized: true },
    { name: 'slug', type: 'text', label: 'Đường dẫn', required: true, unique: true, index: true },
    { name: 'description', type: 'textarea', label: 'Mô tả', localized: true },
  ],
})

export const PostCategories = taxonomy('post-categories', 'Chuyên mục', 'Chuyên mục')
export const PostTags = taxonomy('post-tags', 'Thẻ', 'Thẻ')
