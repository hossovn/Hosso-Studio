import type { CollectionConfig } from 'payload'

import { moderators } from '../lib/access'

// Lịch hẹn từ block Đặt lịch. Tạo qua route /api/booking (Local API), không mở tạo công khai.
export const Bookings: CollectionConfig = {
  slug: 'bookings',
  labels: { singular: 'Lịch hẹn', plural: 'Lịch hẹn' },
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'phone', 'date', 'time', 'service', 'status', 'createdAt'], group: 'Nội dung' },
  defaultSort: '-createdAt',
  access: { create: moderators, read: moderators, update: moderators, delete: moderators },
  fields: [
    { name: 'name', type: 'text', label: 'Họ tên', required: true },
    { name: 'phone', type: 'text', label: 'Điện thoại', required: true },
    { name: 'email', type: 'email', label: 'Email' },
    { name: 'service', type: 'text', label: 'Dịch vụ' },
    { name: 'date', type: 'text', label: 'Ngày hẹn (yyyy-mm-dd)', required: true },
    { name: 'time', type: 'text', label: 'Giờ hẹn' },
    { name: 'guests', type: 'number', label: 'Số người', min: 1 },
    { name: 'note', type: 'textarea', label: 'Ghi chú' },
    {
      name: 'status',
      type: 'select',
      label: 'Trạng thái',
      defaultValue: 'new',
      options: [
        { label: 'Mới', value: 'new' },
        { label: 'Đã xác nhận', value: 'confirmed' },
        { label: 'Đã hủy', value: 'cancelled' },
      ],
    },
  ],
}
