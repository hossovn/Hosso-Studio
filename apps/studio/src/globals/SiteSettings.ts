import { FONTS } from '@hosso/studio-blocks'
import type { Field, GlobalConfig } from 'payload'

import hosso from '@hosso-config'
import { adminOnly } from '../lib/access'
import { msg } from '../lib/lang'

const hex = (v: unknown, { req }: { req?: { i18n?: { language?: string } } } = {}) => !v || /^#[0-9a-fA-F]{6}$/.test(String(v)) || msg(req, 'Dùng mã màu dạng #rrggbb', 'Use a color code like #rrggbb')
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
  admin: { initCollapsed: true, components: { RowLabel: '/components/admin/MenuRowLabel#MenuRowLabel' } },
  fields: [
    { name: 'label', type: 'text', localized: true, label: 'Tên hiển thị', required: true },
    { name: 'href', type: 'text', label: 'Đường dẫn', required: true, admin: { description: 'Ví dụ /san-pham hoặc https://…' } },
    ...extra,
  ],
})

// Menu dạng cây (JSON theo ngôn ngữ) sửa bằng kéo thả; footer chỉ 1 cấp.
const menu = (name: string, label: string, maxDepth: number): Field => ({
  name,
  type: 'json',
  localized: true,
  label,
  admin: { components: { Field: { path: '/components/admin/MenuTreeField#MenuTreeField', clientProps: { maxDepth } } } },
  validate: (v: unknown, { req }: { req?: { i18n?: { language?: string } } } = {}) =>
    v == null || (Array.isArray(v) && v.every((n) => n && typeof n.label === 'string' && typeof n.href === 'string')) || msg(req, 'Menu không hợp lệ: mỗi mục cần tên hiển thị và đường dẫn', 'Invalid menu: every item needs a display name and a path'),
})

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Cài đặt website',
  admin: { group: 'Hệ thống' },
  access: { read: () => true, update: adminOnly },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Thông tin website',
          fields: [
            { name: 'siteName', type: 'text', localized: true, label: 'Tên site' },
            { name: 'logo', type: 'upload', relationTo: 'media', label: 'Logo' },
            { name: 'favicon', type: 'upload', relationTo: 'media', label: 'Favicon (biểu tượng tab trình duyệt)' },
            { name: 'showSearch', type: 'checkbox', label: 'Hiện ô tìm kiếm trên đầu trang', defaultValue: true },
            { name: 'announcement', type: 'text', localized: true, label: 'Thông báo trên cùng', admin: { description: 'Một dòng ngắn ở đầu site, ví dụ "Ship COD toàn quốc". Để trống để ẩn.' } },
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
          label: 'Menu',
          fields: [menu('headerMenu', 'Menu đầu trang', 4), menu('footerMenu', 'Menu chân trang', 1), { name: 'footerText', type: 'text', localized: true, label: 'Dòng chân trang' }],
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
            {
              name: 'layout',
              type: 'group',
              label: 'Bố cục khung site',
              admin: { description: 'Áp dụng cho theme có hỗ trợ (hiện là theme "Cửa hàng phụ tùng"). Nội dung (menu, chữ, liên hệ) sửa ở các tab khác.' },
              fields: [
                { name: 'logoPosition', type: 'select', label: 'Vị trí logo', defaultValue: 'left', options: [{ label: 'Bên trái', value: 'left' }, { label: 'Ở giữa (tìm kiếm xuống hàng dưới)', value: 'center' }] },
                { name: 'navStyle', type: 'select', label: 'Kiểu thanh menu', defaultValue: 'bar', options: [{ label: 'Thanh ngang (các mục cấp 1 trải ngang)', value: 'bar' }, { label: 'Nút "Danh mục" mở menu cây nhiều cấp có hình', value: 'mega' }] },
                { name: 'barColor', type: 'select', label: 'Màu thanh menu', defaultValue: 'accent', options: [{ label: 'Màu nhấn (cam)', value: 'accent' }, { label: 'Màu chính', value: 'primary' }, { label: 'Đen', value: 'dark' }, { label: 'Trắng', value: 'light' }] },
                { name: 'sticky', type: 'checkbox', label: 'Header dính đầu trang khi cuộn', defaultValue: true },
                { name: 'showHotline', type: 'checkbox', label: 'Hiện hotline trên header', defaultValue: true },
                { name: 'footerStyle', type: 'select', label: 'Màu chân trang', defaultValue: 'dark', options: [{ label: 'Tối', value: 'dark' }, { label: 'Sáng', value: 'light' }, { label: 'Màu nhấn', value: 'accent' }] },
              ],
            },
            {
              name: 'footerColumns',
              type: 'array',
              label: 'Các cột chân trang (tối đa 4, thứ tự từ trái sang phải)',
              localized: true,
              maxRows: 4,
              labels: { singular: 'Cột', plural: 'Cột' },
              admin: { initCollapsed: true, description: 'Để trống để dùng bố cục mặc định (liên hệ, liên kết nhanh, mạng xã hội).' },
              fields: [
                { name: 'title', type: 'text', label: 'Tiêu đề cột' },
                {
                  name: 'kind',
                  type: 'select',
                  label: 'Nội dung cột',
                  required: true,
                  defaultValue: 'text',
                  options: [
                    { label: 'Giới thiệu (tên site và dòng chữ bên dưới)', value: 'about' },
                    { label: 'Menu chân trang', value: 'menu' },
                    { label: 'Thông tin liên hệ', value: 'contact' },
                    { label: 'Mạng xã hội', value: 'social' },
                    { label: 'Chữ tự nhập', value: 'text' },
                  ],
                },
                { name: 'body', type: 'textarea', label: 'Chữ (cho cột Giới thiệu hoặc Chữ tự nhập)' },
              ],
            },
          ],
        },
        {
          label: 'Thông báo & bình luận',
          fields: [
            {
              name: 'notifications',
              type: 'group',
              label: 'Email thông báo cho chủ site',
              admin: { description: 'Cần cấu hình SMTP bằng biến môi trường HOSSO_SMTP_URL (ví dụ smtp://user:pass@host:587). Chưa cấu hình thì nội dung email chỉ ghi ra nhật ký máy chủ.' },
              fields: [
                { name: 'to', type: 'email', label: 'Gửi tới', admin: { description: 'Để trống để dùng email ở tab Thông tin website.' } },
                { name: 'onForm', type: 'checkbox', label: 'Khi có biểu mẫu mới được gửi', defaultValue: true },
                { name: 'onComment', type: 'checkbox', label: 'Khi có bình luận mới', defaultValue: true },
              ],
            },
            { name: 'commentsEnabled', type: 'checkbox', label: 'Bật bình luận trên bài viết', defaultValue: true },
            { name: 'commentsAutoApprove', type: 'checkbox', label: 'Tự động duyệt bình luận (mặc định: chờ duyệt thủ công)', defaultValue: false },
          ],
        },
        {
          label: 'Bảo trì',
          fields: [
            { name: 'maintenanceMode', type: 'checkbox', label: 'Bật chế độ bảo trì', defaultValue: false, admin: { description: 'Khách vãng lai chỉ thấy trang bảo trì. Quản trị viên đã đăng nhập vẫn xem site bình thường.' } },
            { name: 'maintenanceMessage', type: 'textarea', localized: true, label: 'Nội dung trang bảo trì', admin: { placeholder: 'Website đang được bảo trì. Vui lòng quay lại sau.' } },
          ],
        },
      ],
    },
  ],
}
