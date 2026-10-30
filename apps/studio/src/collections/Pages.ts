import type { CollectionConfig } from 'payload'

import { pageEditors, publishers } from '../lib/access'
import { builderLinkField, onlyPublishersPublish, seoFields } from '../lib/content'

export const Pages: CollectionConfig = {
  slug: 'pages',
  labels: { singular: 'Trang', plural: 'Các trang' },
  admin: { useAsTitle: 'title', defaultColumns: ['title', '_status', 'slug', 'updatedAt'], group: 'Nội dung', components: { beforeListTable: ['/components/admin/ContentTabs#ContentTabs'] } },
  // Khách chỉ thấy bản đã xuất bản; người đăng nhập thấy cả bản nháp.
  // Biên tập viên sửa và lưu nháp; chỉ quản trị viên được xuất bản (hook bên dưới).
  access: {
    read: ({ req: { user } }) => (user ? true : { _status: { equals: 'published' } }),
    create: pageEditors,
    update: pageEditors,
    delete: publishers,
  },
  versions: { drafts: { autosave: true, schedulePublish: true }, maxPerDoc: 20 },
  hooks: { beforeChange: [onlyPublishersPublish] },
  fields: [
    { name: 'title', type: 'text', label: 'Tiêu đề', required: true, localized: true },
    builderLinkField,
    {
      name: 'slug',
      type: 'text',
      label: 'Đường dẫn',
      required: true,
      unique: true,
      index: true,
      admin: { position: 'sidebar', description: '"home" là trang chủ.' },
    },
    { name: 'description', type: 'textarea', localized: true, label: 'Mô tả (dùng cho SEO)' },
    { type: 'collapsible', label: 'SEO', admin: { initCollapsed: true }, fields: [seoFields] },
    // JSON của Puck; chỉnh bằng trình dựng kéo thả.
    { name: 'content', type: 'json', localized: true, label: 'Cấu trúc trang (JSON)', admin: { hidden: true } },
  ],
}
