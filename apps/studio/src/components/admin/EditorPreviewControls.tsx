'use client'
import type { EditorPreview } from '@hosso/studio-blocks'
import { SlidersHorizontal } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { listPreviewProducts } from '@/app/(editor)/editor/[id]/actions'

const copy = {
  vi: { title: 'Dữ liệu xem trước', account: 'Trạng thái tài khoản', guest: 'Chưa đăng nhập', member: 'Đã đăng nhập (tài khoản mẫu)', shop: 'Sản phẩm cửa hàng', wim: 'Sản phẩm WIM', search: 'Tìm sản phẩm', choose: 'Chọn sản phẩm', loading: 'Đang tải…', empty: 'Không có sản phẩm', error: 'Không tải được danh sách sản phẩm' },
  en: { title: 'Preview data', account: 'Account state', guest: 'Logged out', member: 'Logged in (sample account)', shop: 'Shop product', wim: 'WIM product', search: 'Search products', choose: 'Choose a product', loading: 'Loading…', empty: 'No products', error: 'Unable to load products' },
}
const control: React.CSSProperties = { width: '100%', minWidth: 0, padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 4, font: 'inherit', background: '#fff', color: '#111827', boxSizing: 'border-box' }

function ProductPicker({ source, locale, value, onChange, text }: { source: 'shop' | 'wim'; locale: string; value: string; onChange: (value: string) => void; text: typeof copy.vi }) {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<{ query: string; items: { value: string; label: string }[]; error?: string }>()
  useEffect(() => {
    let active = true
    const timer = setTimeout(() => {
      void listPreviewProducts(source, query, locale)
        .then((data) => { if (active) setResult({ ...data, query }) })
        .catch(() => { if (active) setResult({ items: [], query, error: 'internal' }) })
    }, 250)
    return () => { active = false; clearTimeout(timer) }
  }, [source, query, locale])
  const loaded = result?.query === query
  const items = loaded ? result.items : []
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <label style={{ display: 'grid', gap: 6 }}><span>{text[source]}</span>
        <input type='search' aria-label={`${text.search} · ${text[source]}`} placeholder={text.search} maxLength={200} value={query} onChange={(e) => setQuery(e.target.value)} style={control} />
      </label>
      <select aria-label={text[source]} value={value} onChange={(e) => onChange(e.target.value)} style={control} aria-busy={!loaded}>
        <option value=''>{!loaded ? text.loading : result.error ? text.error : items.length ? text.choose : text.empty}</option>
        {value && !items.some((p) => p.value === value) && <option value={value}>{value}</option>}
        {items.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
      </select>
      {loaded && result.error && <span role='alert' style={{ color: '#b91c1c', fontSize: 12 }}>{text.error}</span>}
    </div>
  )
}

export function EditorPreviewControls({ value, onChange, open, onOpenChange, sources, locale, lang }: { value: EditorPreview; onChange: (value: EditorPreview) => void; open: boolean; onOpenChange: (open: boolean) => void; sources: ('shop' | 'wim')[]; locale: string; lang: string }) {
  const text = copy[lang === 'en' ? 'en' : 'vi']
  return (
    <div style={{ flexShrink: 0 }}>
      <button type='button' title={text.title} aria-label={text.title} aria-expanded={open} aria-haspopup='dialog' onClick={() => onOpenChange(!open)} style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer', padding: '8px 10px', border: 0, background: '#fff', color: '#111827', font: 'inherit', fontSize: 13, whiteSpace: 'nowrap' }}><SlidersHorizontal size={17} />{text.title}</button>
      {open && <div role='dialog' aria-label={text.title} onKeyDown={(e) => { if (e.key === 'Escape') onOpenChange(false) }} style={{ position: 'fixed', top: 64, right: 16, width: 'min(340px, calc(100vw - 32px))', maxHeight: 'calc(100dvh - 80px)', overflowY: 'auto', boxSizing: 'border-box', zIndex: 1000, background: '#fff', color: '#111827', padding: 16, border: '1px solid #d1d5db', borderRadius: 6, boxShadow: '0 8px 24px #0002', display: 'grid', gap: 16, fontSize: 13 }}>
        <label style={{ display: 'grid', gap: 6 }}><span>{text.account}</span>
          <select value={value.account} onChange={(e) => onChange({ ...value, account: e.target.value as EditorPreview['account'] })} style={control}><option value='guest'>{text.guest}</option><option value='member'>{text.member}</option></select>
        </label>
        {sources.map((source) => <ProductPicker key={source} source={source} locale={locale} value={value.products[source]} onChange={(product) => onChange({ ...value, products: { ...value.products, [source]: product } })} text={text} />)}
      </div>}
    </div>
  )
}
