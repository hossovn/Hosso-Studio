import path from 'path'
import type { CollectionConfig } from 'payload'

import { publishers, rolesAccess } from '../lib/access'

const uploaders = rolesAccess('admin', 'publisher', 'editor', 'author')

export const Media: CollectionConfig = {
  slug: 'media',
  access: { read: () => true, create: uploaders, update: uploaders, delete: publishers },
  admin: { group: 'Nội dung' },
  labels: { singular: 'Tệp media', plural: 'Media' },
  fields: [
    { name: 'imageEditor', type: 'ui', admin: { components: { Field: '/components/admin/MediaImageEditor#MediaImageEditor' } } },
    { name: 'alt', type: 'text', label: 'Mô tả ảnh', required: true },
  ],
  // Thư mục lưu tệp: HOSSO_MEDIA_DIR (mặc định ./media). Khi deploy gắn volume vào đây.
  // Không dùng sharp nên tắt cắt/điểm lấy nét tích hợp của Payload; sửa ảnh dùng trình sửa ảnh riêng (chạy trên trình duyệt).
  upload: { crop: false, focalPoint: false, staticDir: path.resolve(process.env.HOSSO_MEDIA_DIR || path.join(process.cwd(), 'media')) },
}
