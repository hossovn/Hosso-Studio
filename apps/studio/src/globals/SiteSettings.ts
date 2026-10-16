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

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Giao diện site',
  admin: { group: 'Hệ thống' },
  access: { read: () => true, update: adminOnly },
  fields: [
    { name: 'siteName', type: 'text', label: 'Tên site' },
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
}
