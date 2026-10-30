import type { CollectionConfig, Field, PayloadRequest } from 'payload'
import { admin, audit, prepareShopOrder, saveShopOrder } from './service'

export const group = { vi: 'Tiếp thị liên kết', en: 'Affiliate marketing' }
const isAdmin = ({ req }: { req: PayloadRequest }) => admin(req.user)
const locked = { read: isAdmin, create: () => false, update: () => false, delete: () => false }
const text = (name: string, required = false): Extract<Field, { type: 'text' }> => ({ name, type: 'text', required })
const number = (name: string): Extract<Field, { type: 'number' }> => ({ name, type: 'number' })
const relation = (name: string, to: string, required = false): Extract<Field, { type: 'relationship' }> => ({ name, type: 'relationship', relationTo: to as any, required })
const date = (name: string): Extract<Field, { type: 'date' }> => ({ name, type: 'date' })
const json = (name: string): Extract<Field, { type: 'json' }> => ({ name, type: 'json' })

export const extraCollections: CollectionConfig[] = [
  { slug: 'affiliate-clicks', admin: { group, defaultColumns: ['affiliate', 'path', 'createdAt', 'expiresAt'] }, access: locked, fields: [relation('affiliate', 'affiliates', true), { ...text('token', true), unique: true, admin: { hidden: true } }, text('path'), date('expiresAt')] },
  { slug: 'affiliate-orders', indexes: [{ fields: ['source', 'orderId'], unique: true }], admin: { group, defaultColumns: ['orderId', 'source', 'orderStatus', 'paymentStatus', 'total'] }, access: locked, fields: [
    { ...text('key', true), unique: true }, text('orderId'), text('source', true), json('policy'), json('items'), text('customerPhone'), number('total'), text('orderStatus'), text('paymentStatus'), number('refundedAmount'), date('completedAt'), text('paymentReference'),
  ] },
  { slug: 'affiliate-payouts', admin: { group, useAsTitle: 'reference', defaultColumns: ['affiliate', 'amount', 'reference', 'paidAt'] }, access: locked, fields: [relation('affiliate', 'affiliates', true), number('amount'), { ...text('reference', true), unique: true }, { name: 'evidence', type: 'textarea', required: true }, { name: 'bankInfo', type: 'textarea', required: true }, date('paidAt')] },
  { slug: 'affiliate-payout-items', admin: { group }, access: locked, fields: [relation('payout', 'affiliate-payouts', true), { ...relation('referral', 'affiliate-referrals', true), unique: true } as Field, number('amount')] },
  { slug: 'affiliate-audit-logs', admin: { group, defaultColumns: ['action', 'subject', 'actor', 'createdAt'] }, access: locked, fields: [text('action', true), text('subject', true), text('actor', true), json('detail')] },
  { slug: 'affiliate-rate-limits', admin: { hidden: true }, access: { ...locked, read: () => false }, fields: [{ ...text('key', true), unique: true }, date('expiresAt')] },
]

export function attachShop(collection: CollectionConfig): CollectionConfig {
  if (collection.slug !== 'shop-orders') return collection
  return { ...collection,
    access: { ...collection.access, delete: async (args) => {
      // Financial history must keep its source order, even after a payout.
      const allowed = collection.access?.delete ? await collection.access.delete(args) : false
      if (!allowed) return false
      return { and: [typeof allowed === 'object' ? allowed : {}, { affiliateSnapshot: { exists: false } }] }
    } },
    fields: [...collection.fields,
      { ...json('affiliateSnapshot'), access: { read: isAdmin }, admin: { hidden: true } },
      { name: 'affiliateRefundedAmount', type: 'number', min: 0, defaultValue: 0, label: { vi: 'Tiền hàng tính hoa hồng đã hoàn (đ)', en: 'Refunded commissionable goods (VND)' }, access: { update: isAdmin }, admin: { description: { vi: 'Nhập lũy kế tiền hàng sau giảm giá đã hoàn, không gồm phí ship.', en: 'Cumulative refunded goods after discounts, excluding shipping.' } } },
      { ...date('affiliateCompletedAt'), admin: { readOnly: true } },
    ],
    hooks: { ...collection.hooks, beforeChange: [...(collection.hooks?.beforeChange ?? []), prepareShopOrder], afterChange: [...(collection.hooks?.afterChange ?? []), saveShopOrder] },
  }
}

export const affiliateAudit: CollectionConfig['hooks'] = { afterChange: [async ({ doc, previousDoc, req }) => {
  const values = (d: any) => d && ({ approval: d.approval, active: d.active, commissionType: d.commissionType, commissionPct: d.commissionPct, commissionFixed: d.commissionFixed, holdDays: d.holdDays })
  if (doc.bankInfo !== previousDoc?.bankInfo) await audit(req, 'payout-details-changed', String(doc.id), { changed: true })
  if (JSON.stringify(values(doc)) !== JSON.stringify(values(previousDoc))) await audit(req, 'affiliate-policy', String(doc.id), { before: values(previousDoc), after: values(doc) })
  return doc
}] }
