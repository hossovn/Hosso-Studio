import { APIError, type CollectionBeforeChangeHook, type Field } from 'payload'

import { isAdmin } from './access'

/** Nhóm SEO dùng chung cho trang và bài viết. */
export const seoFields: Field = {
  name: 'seo',
  type: 'group',
  label: 'SEO',
  admin: { description: 'Để trống thì dùng tiêu đề và mô tả của trang.' },
  fields: [
    { name: 'title', type: 'text', label: 'Tiêu đề hiển thị trên Google', admin: { description: 'Nên dưới 60 ký tự.' } },
    { name: 'image', type: 'upload', relationTo: 'media', label: 'Ảnh chia sẻ (Facebook, Zalo)' },
    { name: 'noindex', type: 'checkbox', label: 'Không cho công cụ tìm kiếm lập chỉ mục' },
  ],
}

/** Chỉ quản trị viên được xuất bản; biên tập viên chỉ lưu nháp. */
export const onlyAdminPublishes: CollectionBeforeChangeHook = ({ data, req }) => {
  if (req.user && data._status === 'published' && !isAdmin(req.user as { roles?: string[] })) {
    throw new APIError('Chỉ quản trị viên được xuất bản.', 403)
  }
  return data
}

export const builderLinkField: Field = {
  name: 'builderLink',
  type: 'ui',
  admin: { components: { Field: '/components/admin/EditorLink#EditorLink' } },
}
