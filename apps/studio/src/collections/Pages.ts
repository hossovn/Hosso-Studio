import type { CollectionConfig } from 'payload'

export const Pages: CollectionConfig = {
  slug: 'pages',
  labels: { singular: 'Trang', plural: 'Các trang' },
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'slug', '_status', 'updatedAt'], group: 'Nội dung' },
  // Khách chỉ thấy bản đã xuất bản; người đăng nhập thấy cả bản nháp.
  access: {
    read: ({ req: { user } }) => (user ? true : { _status: { equals: 'published' } }),
  },
  versions: { drafts: true, maxPerDoc: 20 },
  fields: [
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
    // JSON theo định dạng của Puck; lát 2 thay ô này bằng trình dựng kéo thả.
    { name: 'content', type: 'json', label: 'Cấu trúc trang (JSON)' },
  ],
}
