import type { CollectionConfig } from 'payload'

/** Khóa sửa (mềm) cho trình dựng: ai đang sửa trang nào. Hết hạn sau ~1 phút không báo còn sửa. Chỉ máy chủ ghi/đọc. */
export const EditLocks: CollectionConfig = {
  slug: 'edit-locks',
  admin: { hidden: true },
  access: { read: () => false, create: () => false, update: () => false, delete: () => false },
  fields: [
    { name: 'key', type: 'text', required: true, unique: true, index: true },
    { name: 'userId', type: 'text', required: true },
    { name: 'email', type: 'text' },
    { name: 'expiresAt', type: 'date', required: true },
  ],
}
