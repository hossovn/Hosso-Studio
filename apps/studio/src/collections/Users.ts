import type { CollectionConfig } from 'payload'

import { adminOnly, adminOnlyField, isAdmin } from '../lib/access'
import { requireTwoFactor, twoFactorEndpoints } from '../lib/two-factor'

export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Người dùng', plural: 'Người dùng' },
  admin: { useAsTitle: 'email', group: 'Hệ thống' },
  // Khóa đăng nhập sai: 5 lần sai liên tiếp thì khóa tài khoản 15 phút (chống dò mật khẩu).
  auth: { maxLoginAttempts: 5, lockTime: 15 * 60 * 1000 },
  endpoints: twoFactorEndpoints,
  access: {
    create: adminOnly,
    delete: adminOnly,
    // Người dùng thường chỉ thấy và sửa chính mình.
    read: ({ req: { user } }) => (isAdmin(user) ? true : user ? { id: { equals: user.id } } : false),
    update: ({ req: { user } }) => (isAdmin(user) ? true : user ? { id: { equals: user.id } } : false),
  },
  hooks: {
    beforeLogin: [requireTwoFactor],
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
    // Xác thực hai lớp (TOTP). Bí mật được mã hóa và không bao giờ trả ra API; bật/tắt qua /api/users/2fa/*.
    { name: 'twoFactorEnabled', type: 'checkbox', defaultValue: false, label: 'Đã bật xác thực hai lớp', admin: { readOnly: true, position: 'sidebar' }, access: { update: () => false } },
    { name: 'twoFactorSecret', type: 'text', hidden: true, access: { read: () => false, create: () => false, update: () => false } },
    { name: 'twoFactorPending', type: 'text', hidden: true, access: { read: () => false, create: () => false, update: () => false } },
    { name: 'twoFactorUi', type: 'ui', admin: { components: { Field: '/components/admin/TwoFactorField#TwoFactorField' } } },
    {
      name: 'roles',
      type: 'select',
      hasMany: true,
      required: true,
      defaultValue: ['editor'],
      saveToJWT: true,
      label: 'Vai trò',
      options: [
        { label: 'Quản trị viên (toàn quyền)', value: 'admin' },
        { label: 'Người xuất bản (xuất bản nội dung, không sửa cài đặt)', value: 'publisher' },
        { label: 'Biên tập viên (sửa trang và bài, chỉ lưu nháp)', value: 'editor' },
        { label: 'Tác giả (chỉ viết bài của mình, lưu nháp)', value: 'author' },
        { label: 'Kiểm duyệt (bình luận và biểu mẫu)', value: 'moderator' },
      ],
      access: { create: adminOnlyField, update: adminOnlyField },
    },
  ],
}
