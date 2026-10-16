import path from 'path'
import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  access: { read: () => true },
  admin: { group: 'Nội dung' },
  labels: { singular: 'Tệp media', plural: 'Media' },
  fields: [{ name: 'alt', type: 'text', label: 'Mô tả ảnh', required: true }],
  // Thư mục lưu tệp: HOSSO_MEDIA_DIR (mặc định ./media). Khi deploy gắn volume vào đây.
  upload: { staticDir: path.resolve(process.env.HOSSO_MEDIA_DIR || path.join(process.cwd(), 'media')) },
}
