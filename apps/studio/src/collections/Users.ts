import type { CollectionConfig } from 'payload'

import { adminOnly, adminOnlyField, isAdmin } from '../lib/access'

export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Người dùng', plural: 'Người dùng' },
  admin: { useAsTitle: 'email', group: 'Hệ thống' },
  auth: true,
  access: {
    create: adminOnly,
    delete: adminOnly,
    // Người dùng thường chỉ thấy và sửa chính mình.
    read: ({ req: { user } }) => (isAdmin(user) ? true : user ? { id: { equals: user.id } } : false),
    update: ({ req: { user } }) => (isAdmin(user) ? true : user ? { id: { equals: user.id } } : false),
  },
  hooks: {
    // Người dùng đầu tiên (tạo ở màn hình khởi tạo) luôn là quản trị viên.
    beforeChange: [
      async ({ data, operation, req }) => {
        if (operation === 'create' && (await req.payload.count({ collection: 'users' })).totalDocs === 0) {
          data.roles = ['admin']
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'roles',
      type: 'select',
      hasMany: true,
      required: true,
      defaultValue: ['editor'],
      saveToJWT: true,
      label: 'Vai trò',
      options: [
        { label: 'Quản trị viên (được xuất bản)', value: 'admin' },
        { label: 'Biên tập viên (chỉ lưu nháp)', value: 'editor' },
      ],
      access: { create: adminOnlyField, update: adminOnlyField },
    },
  ],
}
