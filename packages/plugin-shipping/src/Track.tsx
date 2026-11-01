'use client'
import { useLocale } from '@hosso/studio-blocks'
import React, { useState } from 'react'

const S = {
  vi: { title: 'Tra cứu vận đơn', order: 'Mã đơn hàng', phone: 'mã truy cập riêng của đơn', go: 'Tra cứu', none: 'Không tìm thấy vận đơn. Kiểm tra lại mã đơn và mã truy cập riêng của đơn.', carrier: 'Đơn vị vận chuyển', code: 'Mã vận đơn', status: 'Trạng thái', open: 'Theo dõi trên trang đơn vị vận chuyển', wait: 'Đơn chưa được giao cho đơn vị vận chuyển.' },
  en: { title: 'Track shipment', order: 'Order number', phone: 'Private order access code', go: 'Track', none: 'Shipment not found. Check the order number and the private order access code.', carrier: 'Carrier', code: 'Tracking number', status: 'Status', open: "Track on the carrier's site", wait: 'The order has not been handed to a carrier yet.' },
}
const STATUS = {
  vi: { pending: 'Chờ lấy hàng', handed_over: 'Đã bàn giao vận chuyển', delivering: 'Đang giao', delivered: 'Đã giao', returned: 'Hoàn hàng', cancelled: 'Đã hủy' },
  en: { pending: 'Awaiting pickup', handed_over: 'Handed to carrier', delivering: 'Out for delivery', delivered: 'Delivered', returned: 'Returned', cancelled: 'Cancelled' },
}
type ShipmentResult = { label?: string; status: keyof typeof STATUS.vi; carrier?: string; trackingCode?: string; url?: string }
type Result = ShipmentResult & { shipments?: ShipmentResult[] }

export function Track({ heading }: { heading?: string }) {
  const lang = useLocale().locale === 'en' ? 'en' : 'vi'
  const t = S[lang]
  const [res, setRes] = useState<Result | null | undefined>(undefined)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    const f = new FormData(e.currentTarget)
    const q = new URLSearchParams({ orderId: String(f.get('orderId')).trim(), token: String(f.get('token')).trim() })
    const r = await fetch(`/api/plugins/shipping/track?${q}`).catch(() => null)
    setRes(r?.ok ? await r.json() : null)
    setBusy(false)
  }

  return (
    <section className="wp-ship">
      <h2>{heading || t.title}</h2>
      <form className="wp-ship-form" onSubmit={submit}>
        <label>{t.order}<input name="orderId" required maxLength={40} /></label>
        <label>{lang === 'vi' ? 'Mã truy cập đơn hàng' : 'Private order access code'}<input name="token" required autoComplete="off" pattern="[a-fA-F0-9]{64}" maxLength={64} /></label>
        <button disabled={busy}>{busy ? (lang === 'vi' ? 'Đang tra cứu…' : 'Looking up…') : t.go}</button>
      </form>
      {res === null && <p role="alert">{t.none}</p>}
      {res && (res.shipments || [res]).map((shipment, i) => (
        <section key={i} aria-label={shipment.label || `${lang === 'vi' ? 'Kiện hàng' : 'Shipment'} ${i + 1}`}>
        {shipment.label && <h3>{shipment.label}</h3>}
        <dl>
          <dt>{t.status}</dt><dd>{STATUS[lang][shipment.status] ?? shipment.status}</dd>
          {shipment.carrier ? (
            <>
              <dt>{t.carrier}</dt><dd>{shipment.carrier}</dd>
              <dt>{t.code}</dt><dd>{shipment.trackingCode || '-'}</dd>
              {shipment.url && <dd><a href={shipment.url} target="_blank" rel="noopener noreferrer">{t.open}</a></dd>}
            </>
          ) : (
            <dd>{t.wait}</dd>
          )}
        </dl>
        </section>
      ))}
    </section>
  )
}
