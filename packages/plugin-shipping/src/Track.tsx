'use client'
import { useLocale } from '@hosso/studio-blocks'
import React, { useState } from 'react'

const S = {
  vi: { title: 'Tra cứu vận đơn', order: 'Mã đơn hàng', phone: '4 số cuối điện thoại', go: 'Tra cứu', none: 'Không tìm thấy vận đơn. Kiểm tra lại mã đơn và 4 số cuối điện thoại.', carrier: 'Đơn vị vận chuyển', code: 'Mã vận đơn', status: 'Trạng thái', open: 'Theo dõi trên trang đơn vị vận chuyển', wait: 'Đơn chưa được giao cho đơn vị vận chuyển.' },
  en: { title: 'Track shipment', order: 'Order number', phone: 'Last 4 digits of phone', go: 'Track', none: 'Shipment not found. Check the order number and the last 4 digits of the phone.', carrier: 'Carrier', code: 'Tracking number', status: 'Status', open: "Track on the carrier's site", wait: 'The order has not been handed to a carrier yet.' },
}
const STATUS = {
  vi: { pending: 'Chờ lấy hàng', handed_over: 'Đã bàn giao vận chuyển', delivering: 'Đang giao', delivered: 'Đã giao', returned: 'Hoàn hàng', cancelled: 'Đã hủy' },
  en: { pending: 'Awaiting pickup', handed_over: 'Handed to carrier', delivering: 'Out for delivery', delivered: 'Delivered', returned: 'Returned', cancelled: 'Cancelled' },
}
type Result = { status: keyof typeof STATUS.vi; carrier?: string; trackingCode?: string; url?: string }

export function Track({ heading }: { heading?: string }) {
  const lang = useLocale().locale === 'en' ? 'en' : 'vi'
  const t = S[lang]
  const [res, setRes] = useState<Result | null | undefined>(undefined)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const q = new URLSearchParams({ orderId: String(f.get('orderId')).trim(), phone4: String(f.get('phone4')).trim() })
    const r = await fetch(`/api/plugins/shipping/track?${q}`).catch(() => null)
    setRes(r?.ok ? await r.json() : null)
  }

  return (
    <section className="wp-ship">
      <h2>{heading || t.title}</h2>
      <form className="wp-ship-form" onSubmit={submit}>
        <label>{t.order}<input name="orderId" required maxLength={40} /></label>
        <label>{t.phone}<input name="phone4" required inputMode="numeric" pattern="\d{4}" maxLength={4} /></label>
        <button>{t.go}</button>
      </form>
      {res === null && <p role="alert">{t.none}</p>}
      {res && (
        <dl>
          <dt>{t.status}</dt><dd>{STATUS[lang][res.status] ?? res.status}</dd>
          {res.carrier ? (
            <>
              <dt>{t.carrier}</dt><dd>{res.carrier}</dd>
              <dt>{t.code}</dt><dd>{res.trackingCode || '-'}</dd>
              {res.url && <dd><a href={res.url} target="_blank" rel="noopener noreferrer">{t.open}</a></dd>}
            </>
          ) : (
            <dd>{t.wait}</dd>
          )}
        </dl>
      )}
    </section>
  )
}
