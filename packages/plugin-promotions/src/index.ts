import { withLicense } from '@hosso/studio-blocks'
import type { HossoPlugin, PluginManifest } from '@hosso/studio-blocks'
import type { CollectionConfig, Config } from 'payload'
import manifest from '../hosso.json'

type Roled = { roles?: string[] | null } | null | undefined
const manager = ({ req }: { req: { user?: unknown } }) => {
  const r = (req.user as Roled)?.roles
  return Boolean(r?.includes('admin') || r?.includes('publisher'))
}
const bi = (vi: string, en: string) => ({ vi, en })

const Vouchers: CollectionConfig = {
  slug: 'vouchers',
  labels: { singular: bi('Mã giảm giá', 'Discount code'), plural: bi('Mã giảm giá', 'Discount codes') },
  admin: { group: bi('Khuyến mãi', 'Promotions'), useAsTitle: 'code', defaultColumns: ['code', 'type', 'value', 'usedCount', 'maxUses', 'active'] },
  access: { read: manager, create: manager, update: manager, delete: manager },
  hooks: { beforeValidate: [({ data }) => (data?.code ? { ...data, code: String(data.code).trim().toUpperCase() } : data)] },
  fields: [
    { name: 'code', type: 'text', required: true, unique: true, index: true, label: bi('Mã', 'Code'), admin: { description: bi('Khách nhập mã này ở bước thanh toán (không phân biệt hoa thường).', 'Customers enter this at checkout (case-insensitive).') } },
    {
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: 'percent',
      label: bi('Loại', 'Type'),
      options: [
        { value: 'percent', label: bi('Giảm theo phần trăm', 'Percentage off') },
        { value: 'fixed', label: bi('Giảm số tiền cố định', 'Fixed amount off') },
        { value: 'freeship', label: bi('Miễn phí vận chuyển', 'Free shipping') },
      ],
    },
    { name: 'value', type: 'number', min: 0, label: bi('Giá trị (% hoặc đ)', 'Value (% or VND)'), admin: { condition: (d) => d?.type !== 'freeship' } },
    { name: 'minTotal', type: 'number', min: 0, defaultValue: 0, label: bi('Đơn tối thiểu (đ)', 'Minimum order (VND)') },
    { name: 'maxUses', type: 'number', min: 0, defaultValue: 0, label: bi('Số lần dùng tối đa', 'Maximum uses'), admin: { description: bi('0 là không giới hạn.', '0 means unlimited.') } },
    { name: 'usedCount', type: 'number', defaultValue: 0, label: bi('Đã dùng', 'Used'), admin: { readOnly: true } },
    { name: 'startsAt', type: 'date', label: bi('Bắt đầu', 'Starts') },
    { name: 'endsAt', type: 'date', label: bi('Kết thúc', 'Ends') },
    { name: 'active', type: 'checkbox', defaultValue: true, label: bi('Đang bật', 'Active') },
  ],
}

type V = { id: number | string; code: string; type: 'percent' | 'fixed' | 'freeship'; value?: number; minTotal?: number; maxUses?: number; usedCount?: number; startsAt?: string; endsAt?: string; active?: boolean }

const M = {
  vi: { invalid: 'Mã giảm giá không đúng.', expired: 'Mã giảm giá đã hết hạn hoặc chưa đến thời gian dùng.', min: 'Đơn hàng chưa đủ giá trị tối thiểu để dùng mã này.', used: 'Mã giảm giá đã hết lượt dùng.', label: 'Mã giảm giá' },
  en: { invalid: 'Invalid discount code.', expired: 'The discount code has expired or is not valid yet.', min: 'The order does not reach the minimum amount for this code.', used: 'The discount code has been used up.', label: 'Discount code' },
}

const codeOf = (meta: Record<string, unknown>) => String(meta.voucher ?? '').trim().toUpperCase()

/** Plugin khuyến mãi: mã giảm giá cho mọi plugin bán hàng dùng `beforeOrder` (Cửa hàng). Đặt SAU plugin Giao vận trong hosso.config để mã miễn phí ship thấy phí ship. */
const plugin: HossoPlugin = {
  id: 'promotions',
  manifest: manifest as PluginManifest,
  adminNav: [{ label: 'Khuyến mãi', href: '/admin/collections/vouchers', roles: ['admin', 'publisher'] }],
  adminEn: { 'Khuyến mãi': 'Promotions' },
  payload: (config: Config): Config => ({ ...config, collections: [...(config.collections ?? []), Vouchers] }),
  hooks: {
    beforeOrder: async ({ payload, draft }) => {
      const code = codeOf(draft.meta)
      if (!code) return
      const m = M[draft.meta.locale === 'en' ? 'en' : 'vi']
      const v = (await payload.find({ collection: 'vouchers' as any, where: { code: { equals: code } }, limit: 1, depth: 0, overrideAccess: true })).docs[0] as unknown as V | undefined
      if (!v || v.active === false) return { reject: { code: 'voucher_invalid', message: m.invalid } }
      const now = Date.now()
      if ((v.startsAt && new Date(v.startsAt).getTime() > now) || (v.endsAt && new Date(v.endsAt).getTime() < now)) return { reject: { code: 'voucher_expired', message: m.expired } }
      if (draft.subtotal < (v.minTotal ?? 0)) return { reject: { code: 'voucher_min', message: m.min } }
      // ponytail: số lần dùng chỉ đếm khi đặt thành công và không khóa; hai người dùng mã cuối cùng cùng lúc có thể cùng qua.
      if (v.maxUses && (v.usedCount ?? 0) >= v.maxUses) return { reject: { code: 'voucher_used', message: m.used } }
      const discount =
        v.type === 'percent'
          ? Math.round((draft.subtotal * Math.min(100, v.value ?? 0)) / 100)
          : v.type === 'fixed'
            ? Math.min(v.value ?? 0, draft.subtotal)
            : draft.adjustments.filter((a) => a.amount > 0 && a.source === 'shipping').reduce((s, a) => s + a.amount, 0)
      if (discount > 0) draft.adjustments.push({ label: `${m.label} ${v.code}`, amount: -discount, source: 'promotions', scope: v.type === 'freeship' ? 'shipping' : 'goods' })
    },
    onOrderPlaced: async ({ payload, adjustments, meta }) => {
      if (!adjustments?.some((a) => a.source === 'promotions')) return
      const v = (await payload.find({ collection: 'vouchers' as any, where: { code: { equals: codeOf(meta ?? {}) } }, limit: 1, depth: 0, overrideAccess: true })).docs[0] as unknown as V | undefined
      if (v) await payload.update({ collection: 'vouchers' as any, id: v.id, data: { usedCount: (v.usedCount ?? 0) + 1 }, overrideAccess: true })
    },
  },
}

export default withLicense(plugin)
