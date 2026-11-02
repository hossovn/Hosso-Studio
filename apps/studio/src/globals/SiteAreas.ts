import type { Field, GlobalConfig } from 'payload'

import { pageEditors, canPublish } from '../lib/access'
import { APIError } from 'payload'
import { lockSiteMutation } from '../lib/site-publication-lock'

export const AREAS = [
  { name: 'siteHeader', label: 'Header của site (thay header của theme; dùng chung mọi trang)' },
  { name: 'siteFooter', label: 'Footer của site (thay footer của theme; dùng chung mọi trang)' },
  { name: 'beforeHeader', label: 'Trên đầu trang (trước header)' },
  { name: 'afterHeader', label: 'Dưới header (trước nội dung)' },
  { name: 'beforeFooter', label: 'Trước chân trang (khối widget, đăng ký nhận tin, liên hệ…)' },
  { name: 'afterFooter', label: 'Sau chân trang' },
  { name: 'postSidebar', label: 'Cột bên cạnh bài viết (widget: danh mục, bài nổi bật, đăng ký nhận tin…)' },
] as const

const area = (name: string): Field => ({ name, type: 'json', localized: true, admin: { hidden: true } })

/** Vùng giao diện kéo thả: khối nội dung chèn vào đầu/cuối header và footer của mọi trang, dựng bằng trình dựng. */
export const SiteAreas: GlobalConfig = {
  slug: 'site-areas',
  label: 'Header và footer (kéo thả)',
  admin: { group: 'Hệ thống' },
  access: { read: pageEditors, readVersions: pageEditors, update: pageEditors },
  versions: { drafts: { autosave: true }, max: 20 },
  hooks: { beforeOperation: [lockSiteMutation], beforeChange: [({ data, req }) => {
    if (req.user && data._status === 'published' && !canPublish(req.user)) throw new APIError('Bạn không có quyền xuất bản.', 403)
    return data
  }] },
  fields: [
    { name: 'editors', type: 'ui', admin: { components: { Field: '/components/admin/AreaLinks#AreaLinks' } } },
    ...AREAS.map((a) => area(a.name)),
  ],
}
