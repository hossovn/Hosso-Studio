import type { CollectionConfig, Config } from 'payload'
import type { BlockSchema, HossoPlugin, PluginManifest } from '@hosso/studio-blocks'
import manifest from '../hosso.json'
import React from 'react'
import { endpoints } from './endpoints'
import { Portal } from './Portal'
import { REF_COOKIE } from './constants'
import { RefCapture } from './RefCapture'
import { css } from './styles'

const isAdmin = ({ req }: { req: { user?: unknown } }) => Boolean((req.user as { roles?: string[] } | null)?.roles?.includes('admin'))
const adminOnly = { read: isAdmin, create: isAdmin, update: isAdmin, delete: isAdmin }
const bi = (vi: string, en: string) => ({ vi, en })

const Affiliates: CollectionConfig = {
  slug: 'affiliates',
  labels: { singular: bi('Đối tác affiliate', 'Affiliate'), plural: bi('Đối tác affiliate', 'Affiliates') },
  admin: { group: bi('Tiếp thị liên kết', 'Affiliate marketing'), useAsTitle: 'name', defaultColumns: ['name', 'code', 'commissionPct', 'active'] },
  access: adminOnly,
  fields: [
    { name: 'name', type: 'text', required: true, label: bi('Tên', 'Name') },
    { name: 'code', type: 'text', required: true, unique: true, label: bi('Mã giới thiệu', 'Referral code'), admin: { description: bi('Link giới thiệu: https://site-cua-ban/?ref=MÃ', 'Referral link: https://your-site/?ref=CODE') } },
    { name: 'email', type: 'email', required: true, unique: true, label: 'Email' },
    { name: 'passwordHash', type: 'text', admin: { hidden: true } },
    { name: 'bankInfo', type: 'textarea', label: bi('Thông tin nhận tiền', 'Payout details') },
    {
      name: 'picks',
      type: 'array',
      label: bi('Sản phẩm đã chọn bán', 'Picked products'),
      admin: { description: bi('Do cộng tác viên tự chọn ở cổng cộng tác viên.', 'Picked by the partner in the partner portal.') },
      fields: [
        { name: 'title', type: 'text', required: true, label: bi('Tên', 'Name') },
        { name: 'href', type: 'text', required: true, label: bi('Đường dẫn', 'Path') },
      ],
    },
    { name: 'commissionPct', type: 'number', defaultValue: 10, min: 0, max: 100, label: bi('Hoa hồng (%)', 'Commission (%)') },
    { name: 'active', type: 'checkbox', defaultValue: true, label: bi('Đang hoạt động', 'Active') },
  ],
}

const Referrals: CollectionConfig = {
  slug: 'affiliate-referrals',
  labels: { singular: bi('Lượt giới thiệu', 'Referral'), plural: bi('Lượt giới thiệu', 'Referrals') },
  admin: { group: bi('Tiếp thị liên kết', 'Affiliate marketing'), defaultColumns: ['orderId', 'affiliate', 'commission', 'status', 'createdAt'] },
  access: adminOnly,
  fields: [
    { name: 'affiliate', type: 'relationship', relationTo: 'affiliates' as any, required: true, label: bi('Đối tác', 'Affiliate') },
    { name: 'orderId', type: 'text', required: true, unique: true, label: bi('Mã đơn', 'Order ID') },
    { name: 'orderTotal', type: 'number', label: bi('Giá trị đơn', 'Order total') },
    { name: 'commission', type: 'number', label: bi('Hoa hồng', 'Commission') },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'pending',
      label: bi('Trạng thái', 'Status'),
      options: [
        { value: 'pending', label: bi('Chờ duyệt', 'Pending') },
        { value: 'approved', label: bi('Đã duyệt', 'Approved') },
        { value: 'paid', label: bi('Đã trả', 'Paid') },
        { value: 'cancelled', label: bi('Hủy', 'Cancelled') },
      ],
    },
  ],
}

const portalBlock: BlockSchema<{ heading: string }> = {
  type: 'AffiliatePortal',
  label: 'Cổng cộng tác viên',
  fields: { heading: { type: 'text', label: 'Tiêu đề' } },
  defaultProps: { heading: 'Cổng cộng tác viên' },
}

const cookie = (headers: Headers, name: string) => headers.get('cookie')?.split(/;\s*/).find((c) => c.startsWith(`${name}=`))?.slice(name.length + 1)

/** Plugin affiliate: lấy mã từ `?ref=`, gắn hoa hồng vào mọi đơn do plugin bán hàng nào phát `onOrderPlaced`. Dữ liệu nằm ở Studio. */
const plugin: HossoPlugin = {
  id: 'affiliate',
  manifest: manifest as PluginManifest,
  headerSlot: RefCapture,
  blocks: [portalBlock],
  fallbackRenderers: { AffiliatePortal: (props) => React.createElement(Portal, { heading: props.heading }) },
  css,
  adminEn: { 'Tiếp thị liên kết': 'Affiliate marketing', 'Cổng cộng tác viên': 'Partner portal', 'Tiêu đề': 'Heading' },
  payload: (config: Config): Config => ({ ...config, collections: [...(config.collections ?? []), Affiliates, Referrals], endpoints: [...(config.endpoints ?? []), ...endpoints] }),
  hooks: {
    onOrderPlaced: async ({ payload, headers, order }) => {
      const code = cookie(headers, REF_COOKIE)
      if (!code) return
      const found = await payload.find({ collection: 'affiliates' as any, where: { code: { equals: code }, active: { equals: true } }, limit: 1, depth: 0, overrideAccess: true })
      const aff = found.docs[0] as { id: number | string; commissionPct?: number } | undefined
      if (!aff) return
      try {
        await payload.create({
          collection: 'affiliate-referrals' as any,
          overrideAccess: true,
          data: { affiliate: aff.id, orderId: order.id, orderTotal: order.total, commission: Math.round((order.total * (aff.commissionPct ?? 0)) / 100) },
        })
      } catch {
        // orderId đã có: bỏ qua, không ghi trùng.
      }
    },
  },
}

export default plugin
