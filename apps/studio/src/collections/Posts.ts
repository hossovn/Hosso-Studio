import type { CollectionConfig } from 'payload'

import { adminOnly, loggedIn } from '../lib/access'
import { builderLinkField, onlyAdminPublishes, seoFields } from '../lib/content'

/** Bài viết / tin tức / cẩm nang. Nội dung dựng bằng cùng trình dựng kéo thả như trang. Địa chỉ công khai: /bai-viet/<slug>. */
export const Posts: CollectionConfig = {
  slug: 'posts',
  labels: { singular: 'Bài viết', plural: 'Bài viết' },
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'slug', 'publishedAt', '_status'], group: 'Nội dung' },
  access: {
    read: ({ req: { user } }) => (user ? true : { _status: { equals: 'published' } }),
    create: loggedIn,
    update: loggedIn,
    delete: adminOnly,
  },
  versions: { drafts: { autosave: true }, maxPerDoc: 20 },
  hooks: { beforeChange: [onlyAdminPublishes] },
  defaultSort: '-publishedAt',
  fields: [
    builderLinkField,
    { name: 'title', type: 'text', label: 'Tiêu đề', required: true },
    { name: 'slug', type: 'text', label: 'Đường dẫn', required: true, unique: true, index: true },
    { name: 'excerpt', type: 'textarea', label: 'Tóm tắt', admin: { description: 'Hiện ở danh sách bài viết và làm mô tả SEO.' } },
    { name: 'cover', type: 'upload', relationTo: 'media', label: 'Ảnh đại diện' },
    {
      name: 'publishedAt',
      type: 'date',
      label: 'Ngày đăng',
      defaultValue: () => new Date().toISOString(),
      admin: { date: { pickerAppearance: 'dayAndTime' } },
    },
    { name: 'content', type: 'json', label: 'Nội dung (JSON)', admin: { hidden: true } },
    seoFields,
  ],
}
