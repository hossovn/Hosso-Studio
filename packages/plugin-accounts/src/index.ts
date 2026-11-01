import { withLicense } from '@hosso/studio-blocks'
import type { BlockSchema, HossoPlugin, PluginManifest } from '@hosso/studio-blocks'
import type { CollectionConfig, Config } from 'payload'
import React from 'react'
import manifest from '../hosso.json'
import { AccountLink, AccountPortal } from './Account'
import { endpoints, session } from './endpoints'
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

const portalBlock: BlockSchema<{ heading: string; navigation: string; showGarage: string }> = {
  type: 'AccountPortal',
  label: 'Tài khoản khách hàng',
  fields: { heading: { type: 'text', label: 'Tiêu đề' }, navigation: { type: 'radio', label: 'Điều hướng', options: [{ label: 'Thanh bên', value: 'sidebar' }, { label: 'Menu ngang', value: 'tabs' }] }, showGarage: { type: 'radio', label: 'Hồ sơ gara', options: [{ label: 'Hiện', value: 'yes' }, { label: 'Ẩn', value: 'no' }] } },
  defaultProps: { heading: 'Tài khoản của tôi', navigation: 'sidebar', showGarage: 'yes' },
}

const css = `
.ac-section{padding:calc(var(--hs-space)*2) 0}.ac-wrap{max-width:60rem;margin:0 auto;padding:0 var(--hs-space)}
.ac-wrap h2,.ac-wrap h3{font-family:var(--hs-font-heading)}
.ac-btn{background:var(--hs-primary);color:var(--hs-on-primary);border:0;border-radius:var(--hs-radius);padding:.7rem 1.25rem;font:inherit;font-weight:600;cursor:pointer}
.ac-link{background:none;border:0;color:var(--hs-text);font:inherit;text-decoration:underline;cursor:pointer;padding:.3rem 0}
.ac-form{display:grid;gap:var(--hs-space);max-width:32rem;margin:1rem 0}.ac-form label{display:grid;gap:.25rem;font-weight:600}
.ac-wrap input:not(.ac-hp){font:inherit;padding:.65rem .75rem;border:1px solid var(--hs-border);border-radius:var(--hs-radius);background:var(--hs-bg);color:var(--hs-text);min-width:0}
.ac-addr{display:grid;gap:.5rem;grid-template-columns:1fr 2fr auto;align-items:center}
.ac-error{border:1px solid var(--hs-border);background:var(--hs-surface);padding:1rem;border-radius:var(--hs-radius)}
.ac-table{border-collapse:collapse;width:100%}.ac-table th,.ac-table td{text-align:left;padding:.5rem;border-bottom:1px solid var(--hs-border)}
.ac-hp{position:absolute;left:-999px}
.ac-preview-boundary{border:0;margin:0;padding:0;min-width:0}.ac-wrap{max-width:72rem;letter-spacing:0}.ac-wrap h2{font-size:1.75rem;margin:0 0 2rem;padding-bottom:1.5rem;border-bottom:1px solid var(--hs-border)}.ac-shell{display:grid;grid-template-columns:200px minmax(0,1fr);gap:2.5rem}.ac-nav{display:flex;flex-direction:column;gap:.35rem}.ac-nav button{display:flex;align-items:center;gap:.65rem;text-align:left;min-height:44px;border:0;border-radius:4px;background:transparent;color:var(--hs-text);font:inherit;padding:.75rem;cursor:pointer}.ac-nav button[aria-current=page]{background:var(--hs-text);color:var(--hs-bg)}.ac-nav button:hover:not([aria-current]){background:var(--hs-surface)}.ac-content{min-width:0}.ac-content [hidden]{display:none!important}.ac-content h3{font-size:1.2rem;margin:0 0 1rem}.ac-account-email{color:var(--hs-muted);margin:0 0 1.25rem}.ac-table-scroll{overflow:auto}.ac-table th{background:var(--hs-surface);white-space:nowrap}.ac-table th,.ac-table td{padding:1rem .75rem}.ac-wrap .ac-action{display:inline-flex;align-items:center;gap:.5rem}.ac-icon{display:grid;place-items:center;width:40px;height:40px;border:1px solid var(--hs-border);border-radius:4px;background:var(--hs-bg);color:inherit;cursor:pointer}.ac-consent-token{width:100%;min-height:100px;overflow-wrap:anywhere;font:inherit;color:var(--hs-text);background:var(--hs-surface);padding:1rem;border:1px solid var(--hs-border);box-sizing:border-box}.ac-wrap :is(button,a,input,textarea):focus-visible{outline:2px solid var(--hs-text);outline-offset:3px}.ac-navigation-tabs .ac-shell{grid-template-columns:1fr}.ac-navigation-tabs .ac-nav{flex-direction:row;flex-wrap:wrap}
@media(max-width:800px){.ac-shell{grid-template-columns:1fr;gap:1.5rem}.ac-nav{flex-direction:row;flex-wrap:wrap}.ac-addr{grid-template-columns:minmax(0,1fr) 40px}.ac-addr input:first-child{grid-column:1}.ac-addr input:nth-child(2){grid-column:1;grid-row:2}.ac-addr button{grid-column:2;grid-row:2}.ac-wrap input{box-sizing:border-box;max-width:100%}}
`

/** Plugin tài khoản khách: đăng ký/đăng nhập riêng (không phải người dùng admin), lịch sử đơn, địa chỉ đã lưu, tự điền khi thanh toán. */
const plugin: HossoPlugin = {
  id: 'accounts',
  manifest: manifest as PluginManifest,
  headerSlot: AccountLink,
  blocks: [portalBlock],
  fallbackRenderers: { AccountPortal: (props) => React.createElement(AccountPortal, { ...props, canvasPreview: Boolean(props._noFree) }) },
  css,
  commerce: { customerPrice, assistedCustomer: async (payload, headers, token) => {
    const c = await pricingCustomer(payload, headers, token)
    return c ? { name: c.name, phone: c.phone || '', email: c.email, address: c.addresses?.[0]?.address || '' } : undefined
  } },
  adminEn: { 'Khách hàng': 'Customers', 'Tài khoản khách hàng': 'Customer accounts', 'Tiêu đề': 'Heading' },
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
