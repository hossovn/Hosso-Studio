import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  access: { read: () => true },
  admin: { group: 'Nội dung' },
  labels: { singular: 'Tệp media', plural: 'Media' },
  fields: [{ name: 'alt', type: 'text', label: 'Mô tả ảnh', required: true }],
  upload: true,
}
