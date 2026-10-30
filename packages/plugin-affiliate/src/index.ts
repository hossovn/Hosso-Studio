import type { CollectionConfig, Config } from 'payload'
import type { HossoPlugin } from '@hosso/studio-blocks'
import client from './client'
import { endpoints } from './endpoints'
import { attachShop, extraCollections, affiliateAudit } from './collections'
import { beforeWimOrder, placedWimOrder, changedWimOrder } from './wim'

const isAdmin = ({ req }: { req: { user?: unknown } }) => Boolean((req.user as { roles?: string[] } | null)?.roles?.includes('admin'))
const adminOnly = { read: isAdmin, create: isAdmin, update: isAdmin, delete: isAdmin }
const bi = (vi: string, en: string) => ({ vi, en })

const Affiliates: CollectionConfig = {
  slug: 'affiliates',
  labels: { singular: bi('Đối tác affiliate', 'Affiliate'), plural: bi('Đối tác affiliate', 'Affiliates') },
  admin: { group: bi('Tiếp thị liên kết', 'Affiliate marketing'), useAsTitle: 'name', defaultColumns: ['name', 'code', 'commissionPct', 'active'] },
  access: { ...adminOnly, delete: () => false },
  hooks: affiliateAudit,
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
    { name: 'approval', type: 'select', defaultValue: 'pending', options: ['pending', 'approved', 'rejected'], label: bi('Duyệt đối tác', 'Partner approval') },
    { name: 'commissionType', type: 'select', defaultValue: 'percent', options: ['percent', 'fixed'], label: bi('Cách tính hoa hồng', 'Commission type') },
    { name: 'commissionFixed', type: 'number', min: 0, defaultValue: 0, label: bi('Hoa hồng cố định mỗi đơn (đ)', 'Fixed commission per order (VND)'), validate: (v: any) => Number.isSafeInteger(v) || 'Use whole VND' },
    { name: 'holdDays', type: 'number', min: 0, max: 365, defaultValue: 14, label: bi('Số ngày giữ sau hoàn tất', 'Holding days after completion'), validate: (v: any) => Number.isInteger(v) || 'Use whole days' },
    { name: 'active', type: 'checkbox', defaultValue: true, label: bi('Đang hoạt động', 'Active') },
  ],
}

const Referrals: CollectionConfig = {
  slug: 'affiliate-referrals',
  labels: { singular: bi('Lượt giới thiệu', 'Referral'), plural: bi('Lượt giới thiệu', 'Referrals') },
  admin: { group: bi('Tiếp thị liên kết', 'Affiliate marketing'), defaultColumns: ['orderId', 'affiliate', 'commission', 'status', 'createdAt'] },
  access: { ...adminOnly, create: () => false, update: () => false, delete: () => false },
  fields: [
    { name: 'sourceKey', type: 'text', unique: true },
    { name: 'source', type: 'text' },
    { name: 'policy', type: 'json' },
    { name: 'eligibleAt', type: 'date' },
    { name: 'rejectionReason', type: 'text' },
    { name: 'parent', type: 'relationship', relationTo: 'affiliate-referrals' as any },
    { name: 'affiliate', type: 'relationship', relationTo: 'affiliates' as any, required: true, label: bi('Đối tác', 'Affiliate') },
    { name: 'orderId', type: 'text', required: true, label: bi('Mã đơn', 'Order ID') },
    { name: 'orderTotal', type: 'number', label: bi('Giá trị đơn', 'Order total') },
    { name: 'commission', type: 'number', label: bi('Hoa hồng', 'Commission') },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'pending',
      label: bi('Trạng thái', 'Status'),
      options: [
        { value: 'holding', label: bi('Đang giữ', 'Holding') },
        { value: 'eligible', label: bi('Đủ điều kiện', 'Eligible') },
        { value: 'review', label: bi('Cần đối soát', 'Review') },
        { value: 'pending', label: bi('Chờ duyệt', 'Pending') },
        { value: 'approved', label: bi('Đã duyệt', 'Approved') },
        { value: 'paid', label: bi('Đã trả', 'Paid') },
        { value: 'cancelled', label: bi('Hủy', 'Cancelled') },
      ],
    },
  ],
}

/** CPS attribution and settlement for native Shop orders and verified WIM receipts. */
const plugin: HossoPlugin = {
  ...client,
  payload: (config: Config): Config => ({ ...config,
    collections: [...(config.collections ?? []).map(attachShop), Affiliates, Referrals, ...extraCollections],
    endpoints: [...(config.endpoints ?? []), ...endpoints],
    admin: { ...config.admin, components: { ...config.admin?.components, views: { ...(config.admin?.components?.views ?? {}), affiliate: { Component: '@hosso/plugin-affiliate/admin#AffiliateAdmin', path: '/affiliate' } } } },
  }),
  hooks: { beforeOrder: beforeWimOrder, onOrderPlaced: placedWimOrder, onOrderStatusChanged: changedWimOrder },
}

export default plugin
