import type { CollectionConfig } from 'payload'

import { ownOrEditor, postWriters, publishers } from '../lib/access'
import { builderLinkField, onlyPublishersPublish, seoFields } from '../lib/content'

/** Bài viết / tin tức / cẩm nang. Nội dung dựng bằng cùng trình dựng kéo thả như trang. Địa chỉ công khai: /bai-viet/<slug>. */
export const Posts: CollectionConfig = {
  slug: 'posts',
  labels: { singular: 'Bài viết', plural: 'Bài viết' },
  admin: { useAsTitle: 'title', defaultColumns: ['title', '_status', 'categories', 'createdBy', 'publishedAt'], group: 'Nội dung', components: { beforeListTable: ['/components/admin/ContentTabs#ContentTabs'] } },
  access: {
    read: ({ req: { user } }) => (user ? true : { _status: { equals: 'published' } }),
    create: postWriters,
    update: ownOrEditor,
    delete: publishers,
  },
  versions: { drafts: { autosave: true, schedulePublish: true }, maxPerDoc: 20 },
  hooks: {
    // Xóa bài thì xóa luôn bình luận của bài (tránh vướng khóa ngoại).
    beforeDelete: [
      async ({ id, req }) => {
        await req.payload.delete({ collection: 'comments', where: { post: { equals: id } }, overrideAccess: true, req })
      },
    ],
    beforeChange: [
      onlyPublishersPublish,
      ({ data, operation, req }) => {
        if (operation === 'create' && req.user && !data.createdBy) data.createdBy = req.user.id
        return data
      },
    ],
  },
  defaultSort: '-publishedAt',
  fields: [
    { name: 'title', type: 'text', label: 'Tiêu đề', required: true, localized: true },
    builderLinkField,
    { name: 'slug', type: 'text', label: 'Đường dẫn', required: true, unique: true, index: true, admin: { position: 'sidebar' } },
    { name: 'excerpt', type: 'textarea', localized: true, label: 'Tóm tắt', admin: { description: 'Hiện ở danh sách bài viết và làm mô tả SEO.' } },
    { name: 'cover', type: 'upload', relationTo: 'media', label: 'Ảnh đại diện', admin: { position: 'sidebar' } },
    { name: 'categories', type: 'relationship', relationTo: 'post-categories', hasMany: true, label: 'Chuyên mục', admin: { position: 'sidebar' } },
    { name: 'tags', type: 'relationship', relationTo: 'post-tags', hasMany: true, label: 'Thẻ', admin: { position: 'sidebar' } },
    {
      name: 'publishedAt',
      type: 'date',
      label: 'Ngày đăng',
      defaultValue: () => new Date().toISOString(),
      admin: { position: 'sidebar', date: { pickerAppearance: 'dayAndTime' } },
    },
    { name: 'commentsEnabled', type: 'checkbox', label: 'Cho phép bình luận', defaultValue: true, admin: { position: 'sidebar' } },
    { name: 'content', type: 'json', localized: true, label: 'Nội dung (JSON)', admin: { hidden: true } },
    { name: 'createdBy', type: 'relationship', relationTo: 'users', label: 'Tác giả', admin: { position: 'sidebar', readOnly: true } },
    { type: 'collapsible', label: 'SEO', admin: { initCollapsed: true }, fields: [seoFields] },
  ],
}
