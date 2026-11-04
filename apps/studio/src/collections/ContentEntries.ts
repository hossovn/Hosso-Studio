import type { CollectionConfig } from 'payload'
import { pageEditors, publishers, rolesField, canPublish, canEditPages } from '../lib/access'
import { lockSiteMutation } from '../lib/site-publication-lock'
export const ContentEntries: CollectionConfig = {
  slug: 'content-entries', labels: { singular: { vi: 'Mục nội dung', en: 'Content entry' }, plural: { vi: 'Dữ liệu dùng chung', en: 'Shared content' } },
  admin: { group: 'Nội dung', useAsTitle: 'title', defaultColumns: ['title','kind','published','updatedAt'] },
  access: { read: ({ req }) => canEditPages(req.user) ? true : { published: { equals: true } }, create: pageEditors, update: ({req}) => canPublish(req.user) ? true : canEditPages(req.user) ? {published:{equals:false}} : false, delete: publishers },
  hooks: { beforeOperation: [lockSiteMutation] },
  fields: [
    { name: 'title', type: 'text', localized: true, required: true, label: { vi: 'Tiêu đề / câu hỏi', en: 'Title / question' } },
    { name: 'slug', type: 'text', required: true, unique: true, label: { vi: 'Mã nội dung', en: 'Content key' } },
    { name: 'kind', type: 'select', required: true, defaultValue: 'faq', options: [{ label: 'FAQ', value: 'faq' }, { label: { vi: 'Đội ngũ', en: 'Team' }, value: 'team' }, { label: { vi: 'Dự án', en: 'Projects' }, value: 'project' }, { label: { vi: 'Dịch vụ', en: 'Services' }, value: 'service' }] },
    { name: 'data', type: 'json', localized: true, label: { vi: 'Nội dung chi tiết', en: 'Details' }, admin: { components: { Field: '/components/admin/StructuredEntryField#StructuredEntryField' } } },
    { name: 'published', type: 'checkbox', defaultValue: false, label: { vi: 'Hiển thị công khai', en: 'Public' }, access: { create: rolesField('admin','publisher'), update: rolesField('admin','publisher') } },
  ],
}
