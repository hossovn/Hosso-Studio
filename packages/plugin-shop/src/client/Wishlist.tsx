'use client'
import { localizeHref, useLocale } from '@hosso/studio-blocks'
import React, { useEffect, useState } from 'react'
import { vnd } from '../util'

// Danh sách yêu thích lưu ở localStorage (mảng id sản phẩm), không cần tài khoản. ponytail: theo trình duyệt, không đồng bộ giữa thiết bị.
const KEY = 'hs-wishlist'
const EVT = 'hs-wishlist-change'
const read = (): string[] => {
  try {
    const v = JSON.parse(window.localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(v) ? v.map(String).slice(0, 200) : []
  } catch {
    return []
  }
}
const write = (ids: string[]) => {
  try { window.localStorage.setItem(KEY, JSON.stringify(ids)) } catch { /* trình duyệt chặn storage */ }
  window.dispatchEvent(new Event(EVT))
}
const useWishlist = () => {
  const [ids, setIds] = useState<string[]>([])
  useEffect(() => {
    const sync = () => setIds(read())
    sync()
    window.addEventListener(EVT, sync)
    window.addEventListener('storage', sync)
    return () => { window.removeEventListener(EVT, sync); window.removeEventListener('storage', sync) }
  }, [])
  return ids
}

const S = {
  vi: { add: 'Thêm vào yêu thích', remove: 'Bỏ khỏi yêu thích', saved: 'Đã yêu thích', empty: 'Chưa có sản phẩm yêu thích.', loading: 'Đang tải…', drop: 'Bỏ', noId: 'Chọn sản phẩm' },
  en: { add: 'Add to wishlist', remove: 'Remove from wishlist', saved: 'Saved', empty: 'Your wishlist is empty.', loading: 'Loading…', drop: 'Remove', noId: 'Pick a product' },
}

export function WishlistButton({ productId, label, preview }: { productId?: string; label?: string; preview?: boolean }) {
  const t = S[useLocale().locale === 'en' ? 'en' : 'vi']
  const ids = useWishlist()
  const id = String(productId ?? '')
  const on = !!id && ids.includes(id)
  return (
    <button
      type="button"
      className={`sp-wish${on ? ' sp-wish-on' : ''}`}
      aria-pressed={on}
      aria-label={on ? t.remove : t.add}
      disabled={preview || !id}
      onClick={() => write(on ? ids.filter((x) => x !== id) : [...ids, id])}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill={on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M12 21s-7.5-4.6-9.5-9.3C1.2 8.4 3 5 6.3 5c2 0 3.7 1.2 5.7 3.3C14 6.2 15.7 5 17.7 5 21 5 22.8 8.4 21.5 11.7 19.5 16.4 12 21 12 21z" /></svg>
      <span>{on ? t.saved : label || t.add}</span>
    </button>
  )
}

type Item = { id: string; name: string; slug: string; image: string; price: number; salePrice?: number | null; hidePrice?: boolean; priceLabel?: string }

export function WishlistView({ heading, detailPath, preview }: { heading?: string; detailPath?: string; preview?: boolean }) {
  const t = S[useLocale().locale === 'en' ? 'en' : 'vi']
  const ids = useWishlist()
  const [items, setItems] = useState<Item[] | null>(null)
  const key = ids.join(',')
  useEffect(() => {
    if (preview) return
    if (!key) { setItems([]); return }
    let live = true
    fetch(`/api/plugins/shop/wishlist?ids=${encodeURIComponent(key)}`)
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => live && setItems(d.items ?? []))
      .catch(() => live && setItems([]))
    return () => { live = false }
  }, [key, preview])
  const list = preview ? [] : items
  return (
    <section className="sp-section"><div className="sp-wrap">
      {heading && <h2>{heading}</h2>}
      {list === null ? <p className="sp-note">{t.loading}</p> : list.length === 0 ? <p className="sp-note">{t.empty}</p> : (
        <ul className="sp-grid sp-c4">
          {list.map((c) => (
            <li key={c.id} className="sp-card">
              <a href={`${localizeHref(detailPath || '/chi-tiet')}?p=${encodeURIComponent(c.slug)}`} className="sp-card-img">{c.image ? <img src={c.image} alt="" loading="lazy" /> : <span aria-hidden="true" />}</a>
              <div className="sp-card-body">
                <h3><a href={`${localizeHref(detailPath || '/chi-tiet')}?p=${encodeURIComponent(c.slug)}`}>{c.name}</a></h3>
                <p className="sp-price">{c.hidePrice ? c.priceLabel : vnd(c.salePrice || c.price)}</p>
                <button type="button" className="sp-btn" onClick={() => write(ids.filter((x) => x !== c.id))}>{t.drop}</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div></section>
  )
}
