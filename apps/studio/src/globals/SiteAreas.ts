import type { Field, GlobalConfig } from 'payload'

import { publishers } from '../lib/access'

export const AREAS = [
  { name: 'beforeHeader', label: 'Trên đầu trang (trước header)' },
  { name: 'afterHeader', label: 'Dưới header (trước nội dung)' },
  { name: 'beforeFooter', label: 'Trước chân trang (khối widget, đăng ký nhận tin, liên hệ…)' },
  { name: 'afterFooter', label: 'Sau chân trang' },
] as const

const area = (name: string): Field => ({ name, type: 'json', localized: true, admin: { hidden: true } })

/** Vùng giao diện kéo thả: khối nội dung chèn vào đầu/cuối header và footer của mọi trang, dựng bằng trình dựng. */
export const SiteAreas: GlobalConfig = {
  slug: 'site-areas',
  label: 'Header và footer (kéo thả)',
  admin: { group: 'Hệ thống' },
  access: { read: () => true, update: publishers },
  fields: [
    { name: 'editors', type: 'ui', admin: { components: { Field: '/components/admin/AreaLinks#AreaLinks' } } },
    ...AREAS.map((a) => area(a.name)),
  ],
}
