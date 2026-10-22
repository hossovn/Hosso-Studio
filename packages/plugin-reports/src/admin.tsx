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


  const box = { background: 'var(--theme-elevation-0)', border: '1px solid var(--theme-elevation-100)', borderRadius: 12, padding: '18px 20px' } as const
  const h2 = { margin: '0 0 12px', fontSize: 16 } as const
  const td = { padding: '8px 4px', borderBottom: '1px solid var(--theme-elevation-100)' }
  const brand = 'var(--hosso-brand, #15803d)'
  // Biểu đồ cột doanh thu theo ngày (cũ → mới); mỗi cột có tooltip ngày, doanh thu, số đơn.
  const series = [...days].reverse()
  const W = 900
  const H = 200
  const gap = 3
  const bw = Math.max(2, (W - gap * (series.length - 1)) / series.length)
  const statusColor: Record<string, string> = { new: '#2563eb', confirmed: '#0891b2', shipping: '#d97706', completed: '#16a34a', cancelled: '#9ca3af' }
  const statusMax = Math.max(1, ...Object.values(byStatus))
  return (
    <Gutter>
      <div className="sr-page">
      <div className="sr-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, margin: '8px 0 16px' }}>
        <h1 style={{ margin: 0 }}>{t.title}</h1>
        <div className="sr-periods" role="tablist" style={{ display: 'flex', gap: 6, background: 'var(--theme-elevation-50)', padding: 4, borderRadius: 10 }}>
          {[7, 30, 90].map((d) => (
            <a key={d} role="tab" aria-selected={d === n} href={`?days=${d}`} style={{ padding: '6px 14px', borderRadius: 8, textDecoration: 'none', fontWeight: 600, color: d === n ? '#fff' : 'inherit', background: d === n ? brand : 'transparent' }}>{t.last(d)}</a>
          ))}
        </div>
      </div>
      <div className="sr-kpis" style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', marginBottom: 16 }}>
        {[
          [t.revenue, vnd(revenue)],
          [t.orders, live.length],
          [t.avg, live.length ? vnd(revenue / live.length) : '—'],
          [t.cancelled, orders.length - live.length],
          [t.unpaid, live.filter((o) => o.paymentStatus !== 'paid').length],
        ].map(([label, value]) => (
          <div className="sr-kpi" key={String(label)} style={box}>
            <div style={{ opacity: 0.7, fontSize: 13 }}>{label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{value}</div>
          </div>
        ))}
      </div>

      <section className="sr-panel sr-chart" style={{ ...box, marginBottom: 16 }}>
        <h2 style={h2}>{t.perDay}</h2>
        <svg viewBox={`0 0 ${W} ${H + 22}`} width="100%" role="img" aria-label={t.perDay}>
          {series.map(([d, v], k) => {
            const h = Math.round((v.revenue / maxRev) * H)
            return (
              <g key={d}>
                <title>{`${d}: ${vnd(v.revenue)} · ${v.orders} ${t.orders.toLowerCase()}`}</title>
                <rect x={k * (bw + gap)} y={H - Math.max(h, 2)} width={bw} height={Math.max(h, 2)} rx={2} fill={v.revenue ? brand : 'var(--theme-elevation-150)'} />
              </g>
            )
          })}
          <text x={0} y={H + 16} fontSize={11} fill="currentColor" opacity={0.6}>{series[0]?.[0]}</text>
          <text x={W} y={H + 16} fontSize={11} fill="currentColor" opacity={0.6} textAnchor="end">{series[series.length - 1]?.[0]}</text>
        </svg>
        <div style={{ opacity: 0.7, fontSize: 13 }}>{t.note}</div>
      </section>

      <div className="sr-panels" style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))' }}>
        <section className="sr-panel" style={box}>
          <h2 style={h2}>{t.top}</h2>
          {top.length === 0 ? <p>{t.none}</p> : (
            <table className="sr-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {top.map((p, i) => (
                  <tr key={i}>
                    <td style={{ ...td, width: 24, opacity: 0.5 }}>{i + 1}</td>
                    <td style={td}>{p.name}</td>
                    <td style={{ ...td, textAlign: 'right' }}>{p.qty}</td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>{vnd(p.sales)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="sr-panel" style={box}>
          <h2 style={h2}>{t.byStatus}</h2>
          {Object.keys(byStatus).length === 0 ? <p>{t.none}</p> : Object.entries(byStatus).map(([s, c]) => (
            <div key={s} style={{ margin: '10px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}><span>{t.statuses[s] ?? s}</span><strong>{c}</strong></div>
              <div style={{ height: 8, borderRadius: 999, background: 'var(--theme-elevation-100)', marginTop: 4 }}>
                <div style={{ height: '100%', width: `${(c / statusMax) * 100}%`, borderRadius: 999, background: statusColor[s] ?? brand }} />
              </div>
            </div>
          ))}
        </section>

        <section className="sr-panel" style={box}>
          <h2 style={h2}>{t.low}</h2>
          {low.length === 0 ? <p>{t.none}</p> : (
            <table className="sr-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {low.map((p) => (
                  <tr key={p.id}>
                    <td style={td}><a href={`/admin/collections/shop-products/${p.id}`}>{p.name}{p.code ? ` (${p.code})` : ''}</a></td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: p.stock <= 0 ? '#dc2626' : 'inherit' }}>{p.stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
      </div>
    </Gutter>
  )
}
