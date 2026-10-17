import type { CollectionConfig } from 'payload'

import { moderators } from '../lib/access'

// Tin nhắn từ form liên hệ. Tạo qua route /api/contact (Local API), không mở tạo công khai.
export const ContactMessages: CollectionConfig = {
  slug: 'contact-messages',
  labels: { singular: 'Tin nhắn liên hệ', plural: 'Tin nhắn liên hệ' },
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'phone', 'createdAt'], group: 'Nội dung' },
  access: { create: moderators, read: moderators, update: moderators, delete: moderators },
  fields: [
    { name: 'name', type: 'text', label: 'Họ tên', required: true },
    { name: 'phone', type: 'text', label: 'Điện thoại', required: true },
    { name: 'message', type: 'textarea', label: 'Nội dung', required: true },
  ],
}
