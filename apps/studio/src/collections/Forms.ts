import type { CollectionConfig } from 'payload'

import { moderators, publishers } from '../lib/access'

const slugify = (v: string) =>
  v
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

/** Biểu mẫu tùy chỉnh (liên hệ, đăng ký, báo giá…). Chèn vào trang bằng block "Biểu mẫu"; dữ liệu gửi lưu ở "Biểu mẫu đã gửi". */
export const Forms: CollectionConfig = {
  slug: 'forms',
  labels: { singular: 'Biểu mẫu', plural: 'Biểu mẫu' },
  admin: { useAsTitle: 'title', group: 'Nội dung' },
  access: { read: () => true, create: publishers, update: publishers, delete: publishers },
  fields: [
    { name: 'title', type: 'text', required: true, localized: true, label: 'Tên biểu mẫu' },
    { name: 'slug', type: 'text', required: true, unique: true, index: true, label: 'Mã (dùng khi chèn vào trang)' },
    {
      name: 'fields',
      type: 'array',
      required: true,
      minRows: 1,
      label: 'Các trường',
      fields: [
        { name: 'label', type: 'text', required: true, localized: true, label: 'Nhãn' },
        { name: 'name', type: 'text', label: 'Tên trường (tự tạo từ nhãn nếu để trống)', admin: { description: 'Chữ thường, số, gạch dưới (dùng chung mọi ngôn ngữ).' } },
        {
          name: 'type',
          type: 'select',
          required: true,
          defaultValue: 'text',
          label: 'Loại',
          options: [
            { label: 'Một dòng', value: 'text' },
            { label: 'Email', value: 'email' },
            { label: 'Điện thoại', value: 'tel' },
            { label: 'Số', value: 'number' },
            { label: 'Nhiều dòng', value: 'textarea' },
            { label: 'Danh sách chọn', value: 'select' },
            { label: 'Ô đánh dấu', value: 'checkbox' },
          ],
        },
        { name: 'options', type: 'text', localized: true, label: 'Lựa chọn (cách nhau bằng dấu phẩy)', admin: { condition: (_, s) => s?.type === 'select' } },
        { name: 'required', type: 'checkbox', label: 'Bắt buộc' },
        { name: 'placeholder', type: 'text', localized: true, label: 'Gợi ý trong ô' },
      ],
    },
    { name: 'submitLabel', type: 'text', localized: true, label: 'Nhãn nút gửi' },
    { name: 'successMessage', type: 'text', localized: true, label: 'Thông báo sau khi gửi' },
    {
      name: 'exportLink',
      type: 'ui',
      admin: { components: { Field: '/components/admin/FormExportLink#FormExportLink' } },
    },
  ],
  hooks: {
    // Xóa biểu mẫu thì xóa luôn dữ liệu đã gửi của nó.
    beforeDelete: [
      async ({ id, req }) => {
        await req.payload.delete({ collection: 'form-submissions', where: { form: { equals: id } }, overrideAccess: true, req })
      },
    ],
    beforeValidate: [
      ({ data }) => {
        for (const f of data?.fields ?? []) if (!f.name && f.label) f.name = slugify(f.label)
        return data
      },
    ],
  },
}

/** Dữ liệu khách gửi qua biểu mẫu. Chỉ người kiểm duyệt trở lên xem được. */
export const FormSubmissions: CollectionConfig = {
  slug: 'form-submissions',
  labels: { singular: 'Biểu mẫu đã gửi', plural: 'Biểu mẫu đã gửi' },
  admin: { useAsTitle: 'formTitle', defaultColumns: ['formTitle', 'createdAt'], group: 'Nội dung' },
  access: { create: () => false, read: moderators, update: () => false, delete: moderators },
  fields: [
    { name: 'form', type: 'relationship', relationTo: 'forms', required: true, label: 'Biểu mẫu' },
    { name: 'formTitle', type: 'text', label: 'Tên biểu mẫu' },
    { name: 'data', type: 'json', required: true, label: 'Dữ liệu' },
    { name: 'locale', type: 'text', label: 'Ngôn ngữ trang' },
  ],
}
