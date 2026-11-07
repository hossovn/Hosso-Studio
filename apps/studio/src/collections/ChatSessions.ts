import type { CollectionConfig } from 'payload'

import { moderators } from '../lib/access'

// Phiên trò chuyện trực tuyến (Live Chat) từ khách truy cập.
// Khách gửi/nhận tin qua các endpoint bảo mật /api/site/chat/* (xác thực SHA-256 token); không mở quyền REST trực tiếp.
export const ChatSessions: CollectionConfig = {
  slug: 'chat-sessions',
  labels: { singular: 'Phiên trò chuyện', plural: 'Trò chuyện trực tuyến' },
  admin: {
    useAsTitle: 'visitorName',
    defaultColumns: ['visitorName', 'visitorPhone', 'status', 'unreadByStaff', 'lastMessageAt'],
    group: 'Nội dung',
  },
  access: {
    create: moderators,
    read: moderators,
    update: moderators,
    delete: moderators,
  },
  fields: [
    { name: 'visitorName', type: 'text', label: 'Tên khách', required: true },
    { name: 'visitorPhone', type: 'text', label: 'Điện thoại' },
    { name: 'visitorEmail', type: 'email', label: 'Email' },
    { name: 'locale', type: 'text', label: 'Ngôn ngữ trang', defaultValue: 'vi' },
    { name: 'pagePath', type: 'text', label: 'Trang bắt đầu' },
    {
      name: 'status',
      type: 'select',
      label: 'Trạng thái',
      defaultValue: 'open',
      index: true,
      options: [
        { label: 'Đang chờ phản hồi', value: 'open' },
        { label: 'Đã phản hồi', value: 'replied' },
        { label: 'Đã đóng', value: 'closed' },
      ],
    },
    { name: 'unreadByStaff', type: 'number', label: 'Tin chưa đọc (nhân viên)', defaultValue: 0, index: true },
    { name: 'unreadByVisitor', type: 'number', label: 'Tin chưa đọc (khách)', defaultValue: 0 },
    { name: 'lastMessageAt', type: 'date', label: 'Tin nhắn cuối', index: true },
    { name: 'lastMessagePreview', type: 'text', label: 'Nội dung gần nhất' },
    {
      name: 'tokenHash',
      type: 'text',
      required: true,
      index: true,
      access: { read: () => false },
      admin: { hidden: true },
    },
    { name: 'messages', type: 'json', label: 'Lịch sử tin nhắn', defaultValue: [] },
  ],
}
