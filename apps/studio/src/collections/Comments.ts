import type { CollectionConfig } from 'payload'

import { moderators } from '../lib/access'

/** Bình luận trên bài viết. Khách gửi qua /api/site/comments (có kiểm duyệt); không tạo trực tiếp qua REST. */
export const Comments: CollectionConfig = {
  slug: 'comments',
  labels: { singular: 'Bình luận', plural: 'Bình luận' },
  admin: { useAsTitle: 'authorName', defaultColumns: ['authorName', 'status', 'post', 'createdAt'], group: 'Nội dung' },
  access: { create: () => false, read: moderators, update: moderators, delete: moderators },
  fields: [
    { name: 'post', type: 'relationship', relationTo: 'posts', required: true, label: 'Bài viết' },
    { name: 'authorName', type: 'text', required: true, label: 'Tên', maxLength: 80 },
    { name: 'authorEmail', type: 'email', label: 'Email' },
    { name: 'content', type: 'textarea', required: true, label: 'Nội dung', maxLength: 2000 },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'pending',
      required: true,
      label: 'Trạng thái',
      options: [
        { label: 'Chờ duyệt', value: 'pending' },
        { label: 'Đã duyệt', value: 'approved' },
        { label: 'Spam', value: 'spam' },
      ],
      admin: { position: 'sidebar' },
    },
    { name: 'locale', type: 'text', label: 'Ngôn ngữ trang', admin: { readOnly: true, position: 'sidebar' } },
  ],
}
