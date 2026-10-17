import { FONTS } from '@hosso/studio-blocks'
import type { Field, GlobalConfig } from 'payload'

import hosso from '@hosso-config'
import { adminOnly } from '../lib/access'

const hex = (v: unknown) => !v || /^#[0-9a-fA-F]{6}$/.test(String(v)) || 'Dùng mã màu dạng #rrggbb'
const fontOptions = Object.entries(FONTS).map(([value, label]) => ({ label, value }))

// Mỗi theme có một nhóm token riêng (hiện khi theme đó được chọn). Để trống = dùng mặc định của theme.
const tokenGroup = (theme: (typeof hosso.themes)[number]): Field => {
  const { colors, fonts, radius, spacing } = theme.manifest.tokens
  const name = theme.manifest.name
  return {
    name: `tokens_${name}`,
    type: 'group',
    label: `Tùy chỉnh theme "${theme.manifest.title}"`,
    admin: { condition: (data) => (data?.theme ?? hosso.themes[0].manifest.name) === name },
    fields: [
      ...Object.entries(colors).map(([k, v]): Field => ({
        name: `color_${k}`,
        type: 'text',
        label: `Màu: ${k}`,
        validate: hex,
        admin: { placeholder: v, description: `Mặc định: ${v}` },
      })),
      { name: 'fontBody', type: 'select', label: 'Font nội dung', options: fontOptions, admin: { description: `Mặc định: ${FONTS[fonts.body]}` } },
      { name: 'fontHeading', type: 'select', label: 'Font tiêu đề', options: fontOptions, admin: { description: `Mặc định: ${FONTS[fonts.heading]}` } },
      { name: 'radius', type: 'text', label: 'Bo góc', admin: { placeholder: radius } },
      { name: 'spacing', type: 'text', label: 'Khoảng cách cơ bản', admin: { placeholder: spacing } },
    ],
  }
}

const link = (name: string, label: string, extra: Field[] = []): Field => ({
  name,
  type: 'array',
  label,
  labels: { singular: 'Mục', plural: 'Mục' },
  fields: [
    { name: 'label', type: 'text', localized: true, label: 'Tên hiển thị', required: true },
    { name: 'href', type: 'text', label: 'Đường dẫn', required: true, admin: { description: 'Ví dụ /san-pham hoặc https://…' } },
    ...extra,
  ],
})

const submenu = link('children', 'Menu con (dropdown)')

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Giao diện site',
  admin: { group: 'Hệ thống' },
  access: { read: () => true, update: adminOnly },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Thương hiệu',
          fields: [
            { name: 'siteName', type: 'text', localized: true, label: 'Tên site' },
            { name: 'logo', type: 'upload', relationTo: 'media', label: 'Logo' },
            { name: 'favicon', type: 'upload', relationTo: 'media', label: 'Favicon (biểu tượng tab trình duyệt)' },
            { name: 'showSearch', type: 'checkbox', label: 'Hiện ô tìm kiếm trên đầu trang', defaultValue: true },
            { name: 'announcement', type: 'text', localized: true, label: 'Thông báo trên cùng', admin: { description: 'Một dòng ngắn ở đầu site, ví dụ "Ship COD toàn quốc". Để trống để ẩn.' } },
          ],
        },
        {
          label: 'Menu',
          fields: [link('headerMenu', 'Menu đầu trang', [submenu]), link('footerMenu', 'Menu chân trang'), { name: 'footerText', type: 'text', localized: true, label: 'Dòng chân trang' }],
        },
        {
          label: 'Liên hệ',
          fields: [
            {
              name: 'contact',
              type: 'group',
              label: 'Thông tin liên hệ',
              fields: [
                { name: 'phone', type: 'text', label: 'Điện thoại' },
                { name: 'email', type: 'email', label: 'Email' },
                { name: 'address', type: 'textarea', localized: true, label: 'Địa chỉ' },
                { name: 'zalo', type: 'text', label: 'Zalo (số điện thoại hoặc liên kết)' },
              ],
            },
            link('social', 'Mạng xã hội'),
          ],
        },
        {
          label: 'Thông báo',
          fields: [
            {
              name: 'notifications',
              type: 'group',
              label: 'Email thông báo cho chủ site',
              admin: { description: 'Cần cấu hình SMTP bằng biến môi trường HOSSO_SMTP_URL (ví dụ smtp://user:pass@host:587). Chưa cấu hình thì nội dung email chỉ ghi ra nhật ký máy chủ.' },
              fields: [
                { name: 'to', type: 'email', label: 'Gửi tới', admin: { description: 'Để trống để dùng email ở tab Liên hệ.' } },
                { name: 'onForm', type: 'checkbox', label: 'Khi có biểu mẫu mới được gửi', defaultValue: true },
                { name: 'onComment', type: 'checkbox', label: 'Khi có bình luận mới', defaultValue: true },
              ],
            },
          ],
        },
        {
          label: 'Bình luận',
          fields: [
            { name: 'commentsEnabled', type: 'checkbox', label: 'Bật bình luận trên bài viết', defaultValue: true },
            { name: 'commentsAutoApprove', type: 'checkbox', label: 'Tự động duyệt bình luận (mặc định: chờ duyệt thủ công)', defaultValue: false },
          ],
        },
        {
          label: 'Giao diện',
          fields: [
            {
              name: 'theme',
              type: 'select',
              label: 'Theme',
              required: true,
              defaultValue: hosso.themes[0].manifest.name,
              options: hosso.themes.map((t) => ({ label: t.manifest.title, value: t.manifest.name })),
            },
            ...hosso.themes.map(tokenGroup),
          ],
        },
      ],
    },
  ],
}
