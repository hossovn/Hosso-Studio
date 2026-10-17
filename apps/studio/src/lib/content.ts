import { APIError, type CollectionBeforeChangeHook, type Field } from 'payload'
import { msg } from './lang'

import { canPublish } from './access'

/** Nhóm SEO dùng chung cho trang và bài viết. */
export const seoFields: Field = {
  name: 'seo',
  type: 'group',
  label: 'SEO',
  admin: { description: 'Để trống thì dùng tiêu đề và mô tả của trang.' },
  fields: [
    { name: 'title', type: 'text', localized: true, label: 'Tiêu đề hiển thị trên Google', admin: { description: 'Nên dưới 60 ký tự.' } },
    { name: 'image', type: 'upload', relationTo: 'media', label: 'Ảnh chia sẻ (Facebook, Zalo)' },
    { name: 'noindex', type: 'checkbox', label: 'Không cho công cụ tìm kiếm lập chỉ mục' },
  ],
}

/** Chỉ quản trị viên và người xuất bản được xuất bản; vai trò khác chỉ lưu nháp. */
export const onlyPublishersPublish: CollectionBeforeChangeHook = ({ data, req }) => {
  if (req.user && data._status === 'published' && !canPublish(req.user as { roles?: string[] })) {
    throw new APIError(msg(req, 'Bạn không có quyền xuất bản.', 'You do not have permission to publish.'), 403)
  }
  return data
}

export const builderLinkField: Field = {
  name: 'builderLink',
  type: 'ui',
  admin: { components: { Field: '/components/admin/EditorLink#EditorLink' } },
}
