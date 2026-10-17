import type { CollectionConfig } from 'payload'

import { pageEditors, publishers } from '../lib/access'
import { builderLinkField, onlyPublishersPublish } from '../lib/content'

/** Khối dùng lại (giống widget/pattern của WordPress): dựng một lần, chèn vào nhiều trang bằng block "Khối dùng lại". */
export const ReusableBlocks: CollectionConfig = {
  slug: 'reusable-blocks',
  labels: { singular: 'Khối dùng lại', plural: 'Khối dùng lại' },
  admin: { useAsTitle: 'title', group: 'Nội dung' },
  access: {
    read: ({ req: { user } }) => (user ? true : { _status: { equals: 'published' } }),
    create: pageEditors,
    update: pageEditors,
    delete: publishers,
  },
  versions: { drafts: { autosave: true }, maxPerDoc: 20 },
  hooks: { beforeChange: [onlyPublishersPublish] },
  fields: [
    builderLinkField,
    { name: 'title', type: 'text', required: true, label: 'Tên khối' },
    { name: 'slug', type: 'text', required: true, unique: true, index: true, label: 'Mã' },
    { name: 'content', type: 'json', localized: true, label: 'Nội dung (JSON)', admin: { hidden: true } },
  ],
}
