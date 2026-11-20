import definition from './browser'
import { withLicense } from '@hosso/studio-blocks'
import type { HossoPlugin } from '@hosso/studio-blocks'
import type { CollectionConfig, Config } from 'payload'

import { endpoints } from './endpoints'
import { customerPrice, pricingCustomer } from './pricing'

type Roled = { roles?: string[] | null } | null | undefined
const isAdmin = ({ req }: { req: { user?: unknown } }) => Boolean((req.user as Roled)?.roles?.includes('admin'))
const adminOnly = { read: isAdmin, create: isAdmin, update: isAdmin, delete: isAdmin }
const bi = (vi: string, en: string) => ({ vi, en })
const GROUP = bi('Khách hàng', 'Customers')

const Customers: CollectionConfig = {
  slug: 'customers',
  labels: { singular: bi('Khách hàng', 'Customer'), plural: bi('Khách hàng', 'Customers') },
  admin: { group: GROUP, useAsTitle: 'email', defaultColumns: ['name', 'email', 'phone', 'createdAt'] },
  access: adminOnly,
  fields: [
    { name: 'name', type: 'text', required: true, label: bi('Họ tên', 'Name') },
    { name: 'email', type: 'email', required: true, unique: true, label: 'Email' },
    { name: 'phone', type: 'text', label: bi('Điện thoại', 'Phone') },
    { name: 'garageStatus', type: 'select', defaultValue: 'retail', options: [{ label: 'Khách lẻ', value: 'retail' }, { label: 'Chờ duyệt gara', value: 'pending' }, { label: 'Gara đã duyệt', value: 'approved' }, { label: 'Từ chối', value: 'rejected' }, { label: 'Tạm khóa', value: 'suspended' }], label: bi('Duyệt gara', 'Garage approval') },
    { name: 'garageName', type: 'text', label: bi('Tên gara', 'Garage name') },
    { name: 'garageTaxId', type: 'text', label: bi('Mã số thuế', 'Tax ID') },
    { name: 'garageAddress', type: 'textarea', label: bi('Địa chỉ gara', 'Garage address') },
    { name: 'garageReason', type: 'textarea', label: bi('Lý do xử lý hồ sơ', 'Review reason') },
    { name: 'priceGroup', type: 'relationship', relationTo: 'garage-price-groups' as any, label: bi('Nhóm giá đã xác minh', 'Verified price group') },
    { name: 'passwordHash', type: 'text', admin: { hidden: true } },
    {
      name: 'addresses',
      type: 'array',
      label: bi('Địa chỉ đã lưu', 'Saved addresses'),
      fields: [
        { name: 'label', type: 'text', label: bi('Tên gợi nhớ', 'Label') },
        { name: 'address', type: 'textarea', required: true, label: bi('Địa chỉ', 'Address') },
      ],
    },
  ],
}

const CustomerOrders: CollectionConfig = {
  slug: 'customer-orders',
  labels: { singular: bi('Đơn của khách', 'Customer order'), plural: bi('Đơn của khách', 'Customer orders') },
  admin: { group: GROUP, useAsTitle: 'orderNo', defaultColumns: ['orderNo', 'customer', 'createdAt'] },
  access: { ...adminOnly, create: () => false },
  fields: [
    { name: 'customer', type: 'relationship', relationTo: 'customers' as any, required: true, label: bi('Khách hàng', 'Customer') },
    { name: 'orderNo', type: 'text', required: true, unique: true, index: true, label: bi('Mã đơn', 'Order number') },
  ],
}

const GaragePriceGroups: CollectionConfig = { slug: 'garage-price-groups', labels: { singular: bi('Nhóm giá gara', 'Garage price group'), plural: bi('Nhóm giá gara', 'Garage price groups') }, admin: { group: GROUP, useAsTitle: 'name' }, access: adminOnly, fields: [{ name: 'name', type: 'text', required: true }, { name: 'active', type: 'checkbox', defaultValue: true }, { name: 'wimPriceListId', type: 'text', label: bi('Mã bảng giá WIM (cần adapter hỗ trợ)', 'WIM price list ID (requires adapter support)') }] }

/** Plugin tài khoản khách: đăng ký/đăng nhập riêng (không phải người dùng admin), lịch sử đơn, địa chỉ đã lưu, tự điền khi thanh toán. */
const plugin: HossoPlugin = {
  ...definition,

  commerce: { customerPrice, customerIdentity: async (payload, headers) => { const customer = await pricingCustomer(payload, headers); return customer ? `accounts:${customer.id}` : undefined }, assistedCustomer: async (payload, headers, token) => {
    const c = await pricingCustomer(payload, headers, token)
    return c ? { name: c.name, phone: c.phone || '', email: c.email, address: c.addresses?.[0]?.address || '' } : undefined
  } },

  payload: (config: Config): Config => ({ ...config, collections: [...(config.collections ?? []).map((collection) => collection.slug !== 'shop-products' ? collection : { ...collection, fields: [...collection.fields, { name: 'garagePrices', type: 'array', label: bi('Giá gara ghi đè tại Studio', 'Studio garage price overrides'), access: { read: isAdmin, create: isAdmin, update: isAdmin }, fields: [{ name: 'group', type: 'relationship', relationTo: 'garage-price-groups' as any, required: true }, { name: 'variantId', type: 'text' }, { name: 'overrideEnabled', type: 'checkbox', defaultValue: false, label: bi('Bật ghi đè', 'Enable override') }, { name: 'price', type: 'number', min: 0, required: true, validate: (n: any) => Number.isSafeInteger(n) || 'Use whole VND' }] }] } as CollectionConfig), Customers, CustomerOrders, GaragePriceGroups], endpoints: [...(config.endpoints ?? []), ...endpoints] }),
  hooks: {
    beforeOrder: async ({ payload, headers, draft }) => {
      draft.meta.customerAccountId = null
      const token = typeof draft.meta.assistedCustomerToken === 'string' ? draft.meta.assistedCustomerToken : undefined
      try {
        const c = token === 'retail' ? null : await pricingCustomer(payload, headers, token)
        if (token && c && ((draft.customer.phone && draft.customer.phone.replace(/[\s.\-()]/g, '') !== (c.phone || '').replace(/[\s.\-()]/g, '')) || (draft.customer.email && draft.customer.email.toLowerCase() !== c.email.toLowerCase()))) return { reject: { code: 'customer_changed', message: 'Thông tin người nhận không khớp khách đã đồng ý. Vui lòng xác minh lại.' } }
        if (c) draft.meta.customerAccountId = String(c.id)
      } catch { return { reject: { code: 'customer_consent_expired', message: 'Mã đồng ý đã hết hạn. Vui lòng xác minh lại khách.' } } }
    },
    // Khách đang đăng nhập đặt hàng: gắn đơn vào tài khoản để hiện trong lịch sử.
    onOrderPlaced: async ({ payload, order, meta, request }) => {
      // beforeOrder overwrites this value from the authenticated session before the draft is persisted.
      const id = typeof meta?.customerAccountId === 'string' ? meta.customerAccountId : null
      if (!id) return
      const existing = await payload.find({ collection: 'customer-orders' as any, where: { orderNo: { equals: order.id } }, limit: 1, depth: 0, overrideAccess: true, req: request })
      if (!existing.docs.length) await payload.create({ collection: 'customer-orders' as any, data: { customer: /^\d+$/.test(id) ? Number(id) : id, orderNo: order.id }, overrideAccess: true, req: request })
    },
  },
}

export default withLicense(plugin)
