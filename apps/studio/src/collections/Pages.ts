import type { CollectionConfig } from 'payload'

import { loggedIn, adminOnly } from '../lib/access'
import { builderLinkField, onlyAdminPublishes, seoFields } from '../lib/content'

export const Pages: CollectionConfig = {
  slug: 'pages',
  labels: { singular: 'Trang', plural: 'Các trang' },
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'slug', '_status', 'updatedAt'], group: 'Nội dung' },
  // Khách chỉ thấy bản đã xuất bản; người đăng nhập thấy cả bản nháp.
  // Biên tập viên sửa và lưu nháp; chỉ quản trị viên được xuất bản (hook bên dưới).
  access: {
    read: ({ req: { user } }) => (user ? true : { _status: { equals: 'published' } }),
    create: loggedIn,
    update: loggedIn,
    delete: adminOnly,
  },
  versions: { drafts: { autosave: true }, maxPerDoc: 20 },
  hooks: { beforeChange: [onlyAdminPublishes] },
  fields: [
    builderLinkField,
    { name: 'title', type: 'text', label: 'Tiêu đề', required: true },
    {
      name: 'slug',
      type: 'text',
      label: 'Đường dẫn',
      required: true,
      unique: true,
      index: true,
      admin: { description: '"home" là trang chủ.' },
    },
    { name: 'description', type: 'textarea', label: 'Mô tả (dùng cho SEO)' },
    seoFields,
    // JSON của Puck; chỉnh bằng trình dựng kéo thả.
    { name: 'content', type: 'json', label: 'Cấu trúc trang (JSON)', admin: { hidden: true } },
  ],
}
