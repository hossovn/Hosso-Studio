import { Gutter } from '@payloadcms/ui'
import type { AdminViewServerProps } from 'payload'
import React from 'react'

type Order = { orderNo: string; status: string; total: number; paymentStatus?: string; createdAt: string; items?: { productId: string; name: string; quantity: number; price: number }[] }
type Prod = { id: number | string; name: string; code?: string; stock: number }

const vnd = (n: number) => `${Math.round(n).toLocaleString('vi-VN')} đ`
const day = (d: Date) => d.toISOString().slice(0, 10)

const L = {
  vi: { title: 'Báo cáo bán hàng', days: 'Khoảng thời gian', last: (n: number) => `${n} ngày qua`, revenue: 'Doanh thu', orders: 'Đơn hàng', avg: 'Giá trị trung bình', cancelled: 'Đơn hủy', unpaid: 'Chưa thanh toán', perDay: 'Theo ngày', date: 'Ngày', top: 'Sản phẩm bán chạy', product: 'Sản phẩm', qty: 'Số lượng', sales: 'Doanh thu', byStatus: 'Đơn theo trạng thái', low: 'Hàng sắp hết (tồn ≤ 5)', stock: 'Tồn kho', none: 'Chưa có dữ liệu.', noShop: 'Cần bật plugin Cửa hàng để xem báo cáo.', statuses: { new: 'Mới', confirmed: 'Đã xác nhận', shipping: 'Đang giao', completed: 'Hoàn tất', cancelled: 'Đã hủy' } as Record<string, string>, note: 'Doanh thu tính các đơn chưa hủy.' },
  en: { title: 'Sales reports', days: 'Period', last: (n: number) => `Last ${n} days`, revenue: 'Revenue', orders: 'Orders', avg: 'Average order', cancelled: 'Cancelled', unpaid: 'Unpaid', perDay: 'By day', date: 'Date', top: 'Best sellers', product: 'Product', qty: 'Quantity', sales: 'Revenue', byStatus: 'Orders by status', low: 'Low stock (≤ 5)', stock: 'Stock', none: 'No data yet.', noShop: 'Enable the Shop plugin to see reports.', statuses: { new: 'New', confirmed: 'Confirmed', shipping: 'Shipping', completed: 'Completed', cancelled: 'Cancelled' } as Record<string, string>, note: 'Revenue counts orders that are not cancelled.' },
}

const Card = ({ label, value }: { label: string; value: string | number }) => (
  <div style={{ border: '1px solid var(--theme-elevation-150)', borderRadius: 6, padding: '12px 16px', minWidth: 160 }}>
    <div style={{ opacity: 0.7, fontSize: 13 }}>{label}</div>
    <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
  </div>
)

/** Trang báo cáo (server component): doanh thu theo ngày, sản phẩm bán chạy, trạng thái, hàng sắp hết. */
export const ReportsView = async ({ initPageResult, searchParams }: AdminViewServerProps) => {
  const { req } = initPageResult
  const lang = /^en/i.test(req.i18n?.language ?? '') ? 'en' : 'vi'
  const t = L[lang]
  const roles = (req.user as { roles?: string[] } | null)?.roles ?? []
  if (!roles.includes('admin') && !roles.includes('publisher')) return <Gutter><h1>{t.title}</h1></Gutter>
  if (!req.payload.collections['shop-orders' as never]) return <Gutter><h1>{t.title}</h1><p>{t.noShop}</p></Gutter>

  const n = [7, 30, 90].includes(Number(searchParams?.days)) ? Number(searchParams?.days) : 30
  const since = new Date(Date.now() - n * 86400_000)
  const orders = (await req.payload.find({ collection: 'shop-orders' as any, where: { createdAt: { greater_than_equal: since.toISOString() } }, limit: 5000, depth: 0, pagination: false, overrideAccess: true })).docs as unknown as Order[]
  const live = orders.filter((o) => o.status !== 'cancelled')
  const revenue = live.reduce((s, o) => s + o.total, 0)

  const perDay = new Map<string, { orders: number; revenue: number }>()
  for (let i = 0; i < n; i++) perDay.set(day(new Date(Date.now() - i * 86400_000)), { orders: 0, revenue: 0 })
  for (const o of live) {
    const d = perDay.get(o.createdAt.slice(0, 10))
    if (d) { d.orders++; d.revenue += o.total }
  }
  const days = [...perDay.entries()].sort(([a], [b]) => (a < b ? 1 : -1))
  const maxRev = Math.max(1, ...days.map(([, v]) => v.revenue))

  const prod = new Map<string, { name: string; qty: number; sales: number }>()
  for (const o of live) for (const i of o.items ?? []) {
    const p = prod.get(i.productId) ?? { name: i.name, qty: 0, sales: 0 }
    p.qty += i.quantity
    p.sales += i.price * i.quantity
    prod.set(i.productId, p)
  }
  const top = [...prod.values()].sort((a, b) => b.qty - a.qty).slice(0, 10)
  const byStatus: Record<string, number> = {}
  for (const o of orders) byStatus[o.status] = (byStatus[o.status] ?? 0) + 1
  const low = (await req.payload.find({ collection: 'shop-products' as any, where: { and: [{ active: { equals: true } }, { stock: { less_than_equal: 5 } }] }, sort: 'stock', limit: 20, depth: 0, overrideAccess: true })).docs as unknown as Prod[]

  const th = { textAlign: 'left' as const, padding: '6px 8px', borderBottom: '1px solid var(--theme-elevation-150)' }
  const td = { padding: '6px 8px', borderBottom: '1px solid var(--theme-elevation-100)' }
  return (
    <Gutter>
      <h1>{t.title}</h1>
      <p>{t.days}: {[7, 30, 90].map((d) => (<a key={d} href={`?days=${d}`} style={{ marginRight: 12, fontWeight: d === n ? 700 : 400 }}>{t.last(d)}</a>))}</p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '16px 0' }}>
        <Card label={t.revenue} value={vnd(revenue)} />
        <Card label={t.orders} value={live.length} />
        <Card label={t.avg} value={live.length ? vnd(revenue / live.length) : '—'} />
        <Card label={t.cancelled} value={orders.length - live.length} />
        <Card label={t.unpaid} value={live.filter((o) => o.paymentStatus !== 'paid').length} />
      </div>
      <p style={{ opacity: 0.7 }}>{t.note}</p>

      <h2>{t.perDay}</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr><th style={th}>{t.date}</th><th style={th}>{t.orders}</th><th style={th}>{t.revenue}</th><th style={{ ...th, width: '40%' }} /></tr></thead>
        <tbody>
          {days.slice(0, 31).map(([d, v]) => (
            <tr key={d}>
              <td style={td}>{d}</td><td style={td}>{v.orders}</td><td style={td}>{vnd(v.revenue)}</td>
              <td style={td}><div style={{ background: 'var(--hosso-brand, #d71920)', height: 10, borderRadius: 3, width: `${(v.revenue / maxRev) * 100}%` }} /></td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>{t.top}</h2>
      {top.length === 0 ? <p>{t.none}</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={th}>{t.product}</th><th style={th}>{t.qty}</th><th style={th}>{t.sales}</th></tr></thead>
          <tbody>{top.map((p, i) => (<tr key={i}><td style={td}>{p.name}</td><td style={td}>{p.qty}</td><td style={td}>{vnd(p.sales)}</td></tr>))}</tbody>
        </table>
      )}

      <h2>{t.byStatus}</h2>
      <ul>{Object.entries(byStatus).map(([s, c]) => (<li key={s}>{t.statuses[s] ?? s}: <strong>{c}</strong></li>))}</ul>

      <h2>{t.low}</h2>
      {low.length === 0 ? <p>{t.none}</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={th}>{t.product}</th><th style={th}>{t.stock}</th></tr></thead>
          <tbody>{low.map((p) => (<tr key={p.id}><td style={td}><a href={`/admin/collections/shop-products/${p.id}`}>{p.name}{p.code ? ` (${p.code})` : ''}</a></td><td style={td}>{p.stock}</td></tr>))}</tbody>
        </table>
      )}
    </Gutter>
  )
}
