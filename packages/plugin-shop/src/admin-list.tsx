'use client'
import { useTranslation } from '@payloadcms/ui'
import React, { useEffect, useState } from 'react'

const thumbs = new Map<string, string>()

/** Ô ảnh nhỏ trong danh sách sản phẩm: lấy ảnh đầu tiên từ Media (có nhớ tạm để khỏi gọi lại). */
export const ThumbCell = ({ rowData }: { rowData?: { images?: { image?: unknown }[] } }) => {
  const first = rowData?.images?.[0]?.image as { id?: string | number; thumbnailURL?: string; url?: string } | string | number | undefined
  const id = typeof first === 'object' ? first?.id : first
  const [src, setSrc] = useState<string>(typeof first === 'object' ? (first?.thumbnailURL ?? first?.url ?? '') : thumbs.get(String(id)) ?? '')
  useEffect(() => {
    if (src || id == null) return
    fetch(`/api/media/${id}?depth=0`)
      .then((r) => r.json())
      .then((m) => {
        const u = m?.sizes?.thumbnail?.url ?? m?.thumbnailURL ?? m?.url ?? ''
        thumbs.set(String(id), u)
        setSrc(u)
      })
      .catch(() => {})
  }, [id, src])
  const box = { width: 40, height: 40, borderRadius: 6, background: 'var(--theme-elevation-100)', objectFit: 'cover' as const, display: 'block' }
  return src ? <img src={src} alt="" style={box} /> : <span style={box} />
}

/** Công tắc "Đang bán" ngay trong danh sách: bấm là lưu, lỗi thì hoàn lại. */
export const ActiveCell = ({ rowData, cellData }: { rowData?: { id?: string | number }; cellData?: boolean }) => {
  const [on, setOn] = useState(Boolean(cellData))
  const [busy, setBusy] = useState(false)
  const toggle = async () => {
    if (busy || rowData?.id == null) return
    setBusy(true)
    const next = !on
    setOn(next)
    const res = await fetch(`/api/shop-products/${rowData.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: next }) }).catch(() => null)
    if (!res?.ok) setOn(!next)
    setBusy(false)
  }
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={toggle}
      disabled={busy}
      title={on ? 'Đang bán' : 'Đang ẩn'}
      style={{ width: 40, height: 22, borderRadius: 999, border: 0, padding: 2, cursor: 'pointer', background: on ? '#16a34a' : 'var(--theme-elevation-200)', display: 'flex', justifyContent: on ? 'flex-end' : 'flex-start', transition: 'background .15s' }}
    >
      <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff' }} />
    </button>
  )
}

const STATUS_TABS: [string, string][] = [['', 'Tất cả'], ['new', 'Mới'], ['confirmed', 'Đã xác nhận'], ['shipping', 'Đang giao'], ['completed', 'Hoàn tất'], ['cancelled', 'Đã hủy']]
const EN: Record<string, string> = { 'Tất cả': 'All', 'Mới': 'New', 'Đã xác nhận': 'Confirmed', 'Đang giao': 'Shipping', 'Hoàn tất': 'Completed', 'Đã hủy': 'Cancelled' }

/** Thanh tab trạng thái phía trên danh sách đơn hàng, có số đếm; bấm để lọc. */
export const OrderTabs = () => {
  const en = /^en/i.test(useTranslation().i18n.language)
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [current, setCurrent] = useState('')
  useEffect(() => {
    setCurrent(new URLSearchParams(window.location.search).get('where[status][equals]') ?? '')
    STATUS_TABS.forEach(([v]) => {
      const q = v ? `&where[status][equals]=${v}` : ''
      fetch(`/api/shop-orders?limit=1&depth=0${q}`)
        .then((r) => r.json())
        .then((j) => setCounts((c) => ({ ...c, [v]: j.totalDocs ?? 0 })))
        .catch(() => {})
    })
  }, [])
  return (
    <nav className="ha-filters ha-content-tabs" aria-label={en ? 'Order status' : 'Trạng thái đơn hàng'}>
      {STATUS_TABS.map(([v, label]) => {
        const active = v === current
        return (
          <a key={v} aria-current={active ? 'page' : undefined} href={v ? `?where[status][equals]=${v}` : '?'}>
            {en ? EN[label] : label}
            <span style={{ fontSize: 12, opacity: active ? 0.9 : 0.6 }}>{counts[v] ?? ''}</span>
          </a>
        )
      })}
    </nav>
  )
}
