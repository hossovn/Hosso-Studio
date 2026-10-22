import { withLicense } from '@hosso/studio-blocks'
import type { BlockSchema, HossoPlugin, PluginManifest } from '@hosso/studio-blocks'
import type { CollectionConfig, Config } from 'payload'
import React from 'react'
import manifest from '../hosso.json'
import { AccountLink, AccountPortal } from './Account'
import { endpoints, session } from './endpoints'

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

const portalBlock: BlockSchema<{ heading: string }> = {
  type: 'AccountPortal',
  label: 'Tài khoản khách hàng',
  fields: { heading: { type: 'text', label: 'Tiêu đề' } },
  defaultProps: { heading: 'Tài khoản của tôi' },
}

const css = `
.ac-section{padding:calc(var(--hs-space)*2) 0}.ac-wrap{max-width:60rem;margin:0 auto;padding:0 var(--hs-space)}
.ac-wrap h2,.ac-wrap h3{font-family:var(--hs-font-heading)}
.ac-btn{background:var(--hs-primary);color:var(--hs-on-primary);border:0;border-radius:var(--hs-radius);padding:.7rem 1.25rem;font:inherit;font-weight:600;cursor:pointer}
.ac-link{background:none;border:0;color:var(--hs-primary);font:inherit;text-decoration:underline;cursor:pointer;padding:.3rem 0}
.ac-form{display:grid;gap:var(--hs-space);max-width:32rem;margin:1rem 0}.ac-form label{display:grid;gap:.25rem;font-weight:600}
.ac-wrap input:not(.ac-hp){font:inherit;padding:.65rem .75rem;border:1px solid var(--hs-border);border-radius:var(--hs-radius);background:var(--hs-bg);color:var(--hs-text);min-width:0}
.ac-addr{display:grid;gap:.5rem;grid-template-columns:1fr 2fr auto;align-items:center}
.ac-error{border:1px solid var(--hs-border);background:var(--hs-surface);padding:1rem;border-radius:var(--hs-radius)}
.ac-table{border-collapse:collapse;width:100%}.ac-table th,.ac-table td{text-align:left;padding:.5rem;border-bottom:1px solid var(--hs-border)}
.ac-hp{position:absolute;left:-999px}
`

/** Plugin tài khoản khách: đăng ký/đăng nhập riêng (không phải người dùng admin), lịch sử đơn, địa chỉ đã lưu, tự điền khi thanh toán. */
const plugin: HossoPlugin = {
  id: 'accounts',
  manifest: manifest as PluginManifest,
  headerSlot: AccountLink,
  blocks: [portalBlock],
  fallbackRenderers: { AccountPortal: (props) => React.createElement(AccountPortal, { heading: props.heading }) },
  css,
  adminEn: { 'Khách hàng': 'Customers', 'Tài khoản khách hàng': 'Customer accounts', 'Tiêu đề': 'Heading' },
  payload: (config: Config): Config => ({ ...config, collections: [...(config.collections ?? []), Customers, CustomerOrders], endpoints: [...(config.endpoints ?? []), ...endpoints] }),
  hooks: {
    // Khách đang đăng nhập đặt hàng: gắn đơn vào tài khoản để hiện trong lịch sử.
    onOrderPlaced: async ({ payload, headers, order }) => {
      const id = await session.read(payload.secret, headers)
      if (!id) return
      await payload.create({ collection: 'customer-orders' as any, data: { customer: /^\d+$/.test(id) ? Number(id) : id, orderNo: order.id }, overrideAccess: true }).catch((e) => payload.logger.error(e, '[accounts] customer-orders'))
    },
  },
}

export default withLicense(plugin)
