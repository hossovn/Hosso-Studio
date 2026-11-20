import type { CollectionConfig } from 'payload'
import { pageEditors, publishers, rolesField, canPublish, canEditPages } from '../lib/access'
import { lockSiteMutation } from '../lib/site-publication-lock'
import { validateContentEntry, protectLinkedEntry } from '../lib/content-types'
import { scopedContentAccess, enforceContentScope } from '../lib/content-permissions'
import {cmsField,cmsBeforeChange} from '../lib/cms-hooks'
import { searchText } from '../../../../packages/blocks/src/repeater-query'
export const ContentEntries: CollectionConfig = {
  slug: 'content-entries', labels: { singular: { vi: 'Mục nội dung', en: 'Content entry' }, plural: { vi: 'Dữ liệu dùng chung', en: 'Shared content' } },
  admin: { group: 'Nội dung', useAsTitle: 'title', defaultColumns: ['title','kind','published','updatedAt'] },
  access: { read: scopedContentAccess('content-entries','read',({ req }) => canEditPages(req.user) ? true : { published: { equals: true } }), create: pageEditors, update: scopedContentAccess('content-entries','edit',({req}) => canPublish(req.user) ? true : canEditPages(req.user) ? {published:{equals:false}} : false), delete: scopedContentAccess('content-entries','publish',publishers) },
  hooks: { beforeOperation: [lockSiteMutation], beforeChange:[enforceContentScope,cmsBeforeChange,validateContentEntry, ({ data, originalDoc }) => ({ ...data, searchText: searchText([data.title ?? originalDoc?.title, ...Object.values(data.data ?? originalDoc?.data ?? {})].filter((value) => typeof value === 'string' || typeof value === 'number').join(' ')) })], beforeDelete:[protectLinkedEntry] },
  fields: [
    cmsField,
    { name: 'searchText', type: 'textarea', localized: true, index: true, admin: { hidden: true }, access: { read: () => false } },
    { name: 'title', type: 'text', localized: true, required: true, label: { vi: 'Tiêu đề / câu hỏi', en: 'Title / question' } },
    { name: 'slug', type: 'text', required: true, unique: true, label: { vi: 'Mã nội dung', en: 'Content key' } },
    { name: 'kind', type: 'text', label:{vi:'Loại nội dung',en:'Content type'}, required: true, defaultValue: 'faq', admin:{components:{Field:'/components/admin/ContentKindField#ContentKindField'}} },
    { name: 'data', type: 'json', localized: true, label: { vi: 'Nội dung chi tiết', en: 'Details' }, admin: { components: { Field: '/components/admin/StructuredEntryField#StructuredEntryField' } } },
    { name: 'published', type: 'checkbox', defaultValue: false, label: { vi: 'Hiển thị công khai', en: 'Public' }, access: { create: rolesField('admin','publisher'), update: rolesField('admin','publisher') } },
  ],
}
