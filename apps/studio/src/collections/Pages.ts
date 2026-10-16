import { APIError, type CollectionConfig } from 'payload'

import { isAdmin, loggedIn, adminOnly } from '../lib/access'

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
  versions: { drafts: true, maxPerDoc: 20 },
  hooks: {
    beforeChange: [
      ({ data, req }) => {
        if (req.user && data._status === 'published' && !isAdmin(req.user as { roles?: string[] })) {
          throw new APIError('Chỉ quản trị viên được xuất bản trang.', 403)
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'builderLink',
      type: 'ui',
      admin: { components: { Field: '/components/admin/EditorLink#EditorLink' } },
    },
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
    { name: 'description', type: 'textarea', label: 'Mô tả SEO' },
    // JSON của Puck; chỉnh bằng trình dựng kéo thả.
    { name: 'content', type: 'json', label: 'Cấu trúc trang (JSON)', admin: { hidden: true } },
  ],
}
