'use client'
import React, { useEffect, useState } from 'react'

import { fontStack } from './free-style'

/** Phần tử tự do có tương tác hoặc dữ liệu riêng: đếm ngược, tab, menu thu gọn/hamburger, bảng, bản đồ, nhúng, breadcrumb. `u` đổi px thiết kế sang cqw. */
type U = (n: number) => string
const mkU = (unit: number): U => (n) => `${(Number(n) / unit) * 100}cqw`
const SAFE_HREF = /^(https?:\/\/|\/|#|mailto:|tel:)/i
const href = (h: unknown) => (typeof h === 'string' && SAFE_HREF.test(h.trim()) ? h.trim() : '#')
const font = (p: Record<string, any>): React.CSSProperties => ({ fontFamily: fontStack(p.font) ?? 'inherit' })

export function FreeCountdown({ p, unit }: { p: Record<string, any>; unit: number }) {
  const u = mkU(unit)
  const end = Date.parse(String(p.end ?? '')) || 0
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const left = now == null ? 0 : Math.max(0, end - now)
  const parts: [string, number][] = [['Ngày', Math.floor(left / 864e5)], ['Giờ', Math.floor(left / 36e5) % 24], ['Phút', Math.floor(left / 6e4) % 60], ['Giây', Math.floor(left / 1e3) % 60]]
  return (
    <div style={{ width: '100%', height: '100%', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: u(p.gap ?? 14), ...font(p) }}>
      {parts.map(([label, v]) => (
        <div key={label} style={{ display: 'grid', placeContent: 'center', textAlign: 'center', background: p.bg ?? '#111827', color: p.color ?? '#ffffff', borderRadius: u(p.radius ?? 16), lineHeight: 1.1 }}>
          <span style={{ fontSize: u(p.size ?? 44), fontWeight: 800 }}>{String(v).padStart(2, '0')}</span>
          <span style={{ fontSize: u((p.size ?? 44) * 0.3), opacity: 0.8, marginTop: u(4) }}>{label}</span>
        </div>
      ))}
    </div>
  )
}

export function FreeTabs({ p, unit }: { p: Record<string, any>; unit: number }) {
  const u = mkU(unit)
  const tabs: { label: string; text: string }[] = Array.isArray(p.tabs) && p.tabs.length ? p.tabs : [{ label: 'Tab 1', text: '' }]
  const [i, setI] = useState(0)
  const cur = tabs[Math.min(i, tabs.length - 1)]
  const accent = p.accent ?? '#15803d'
  return (
    <div style={{ width: '100%', height: '100%', background: p.bg ?? '#f9fafb', borderRadius: u(p.radius ?? 12), overflow: 'hidden', display: 'flex', flexDirection: 'column', ...font(p) }}>
      <div style={{ display: 'flex', borderBottom: `${u(1)} solid #e5e7eb` }}>
        {tabs.map((t, k) => (
          <button key={k} type="button" onClick={() => setI(k)} style={{ flex: 1, padding: `${u(14)} ${u(8)}`, border: 0, borderBottom: `${u(3)} solid ${k === i ? accent : 'transparent'}`, marginBottom: u(-1), background: 'transparent', color: k === i ? accent : '#6b7280', fontWeight: k === i ? 700 : 500, fontSize: u(p.size ?? 18), fontFamily: 'inherit', cursor: 'pointer' }}>{t.label}</button>
        ))}
      </div>
      <div style={{ padding: u(20), fontSize: u((p.size ?? 18) * 0.9), color: p.color ?? '#374151', lineHeight: 1.5, whiteSpace: 'pre-wrap', overflow: 'hidden' }}>{cur.text}</div>
    </div>
  )
}

type MItem = { label: string; href: string }
/** Menu thu gọn (dropdown) hoặc nút hamburger mở danh sách. */
export function FreeFoldMenu({ p, unit, hamburger, editing }: { p: Record<string, any>; unit: number; hamburger: boolean; editing: boolean }) {
  const u = mkU(unit)
  const items: MItem[] = Array.isArray(p.items) ? p.items : []
  const [open, setOpen] = useState(false)
  const accent = p.accent ?? '#15803d'
  const link: React.CSSProperties = { display: 'block', padding: `${u(10)} ${u(14)}`, fontSize: u(p.size ?? 16), fontWeight: p.weight ?? 500, color: p.color ?? '#111827', textDecoration: 'none', ...font(p) }
  const list = (
    <ul style={{ margin: 0, padding: 0, listStyle: 'none', background: '#ffffff', borderRadius: u(10), boxShadow: `0 ${u(8)} ${u(24)} rgba(0,0,0,.15)`, overflow: 'hidden' }}>
      {items.map((it, k) => <li key={k}>{editing ? <span style={link}>{it.label}</span> : <a href={href(it.href)} style={link}>{it.label}</a>}</li>)}
    </ul>
  )
  if (hamburger)
    return (
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <button type="button" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)} style={{ width: '100%', height: '100%', border: 0, borderRadius: u(10), background: p.bg ?? '#f3f4f6', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
          <svg viewBox="0 0 24 24" width="55%" height="55%" fill="none" stroke={p.color ?? '#111827'} strokeWidth="2" strokeLinecap="round">{open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}</svg>
        </button>
        {open && <div style={{ position: 'absolute', top: '105%', left: 0, minWidth: u(220), zIndex: 5 }}>{list}</div>}
      </div>
    )
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `0 ${u(14)}`, border: 0, borderBottom: `${u(2)} solid ${accent}`, background: p.bg ?? '#ffffff', color: accent, fontWeight: 700, fontSize: u(p.size ?? 16), fontFamily: 'inherit', cursor: 'pointer' }}>
        {items[0]?.label ?? 'Menu'}
        <svg viewBox="0 0 24 24" width={u(20)} height={u(20)} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? 'rotate(180deg)' : undefined }}><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {open && <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 5 }}>{list}</div>}
    </div>
  )
}

export function FreeTable({ p, unit }: { p: Record<string, any>; unit: number }) {
  const u = mkU(unit)
  const rows: string[][] = Array.isArray(p.rows) ? p.rows : []
  const size = u(p.size ?? 16)
  const cell: React.CSSProperties = { padding: `${u(10)} ${u(14)}`, fontSize: size, borderBottom: `${u(1)} solid ${p.line ?? '#e5e7eb'}`, textAlign: 'left' }
  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden', borderRadius: u(p.radius ?? 12), border: `${u(1)} solid ${p.line ?? '#e5e7eb'}`, boxSizing: 'border-box', ...font(p) }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', color: p.color ?? '#374151' }}>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={i === 0 && p.head !== false ? { background: p.headBg ?? '#15803d', color: p.headColor ?? '#ffffff', fontWeight: 700 } : p.stripe !== false && i % 2 === 0 ? { background: '#f9fafb' } : undefined}>
              {r.map((c, j) => (i === 0 && p.head !== false ? <th key={j} style={cell}>{c}</th> : <td key={j} style={cell}>{c}</td>))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function FreeMap({ p }: { p: Record<string, any> }) {
  const q = String(p.query ?? '').trim()
  if (!q) return <div style={{ width: '100%', height: '100%', background: '#e5e7eb', display: 'grid', placeItems: 'center', color: '#6b7280' }}>Bản đồ — nhập địa chỉ ở bảng bên phải</div>
  return <iframe title={q} src={`https://www.google.com/maps?q=${encodeURIComponent(q)}&z=${Number(p.zoom) || 15}&output=embed`} style={{ width: '100%', height: '100%', border: 0 }} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
}

/** Nhúng trang ngoài bằng iframe (chỉ https). Không nhận mã HTML thô để tránh chèn script. */
export function FreeEmbed({ p }: { p: Record<string, any> }) {
  const url = String(p.url ?? '').trim()
  if (!/^https:\/\//i.test(url)) return <div style={{ width: '100%', height: '100%', background: '#f3f4f6', display: 'grid', placeItems: 'center', color: '#6b7280', textAlign: 'center', padding: 12 }}>Nhúng — dán đường dẫn https://… ở bảng bên phải</div>
  return <iframe title="Nhúng" src={url} style={{ width: '100%', height: '100%', border: 0 }} loading="lazy" sandbox="allow-scripts allow-same-origin allow-popups allow-forms" referrerPolicy="no-referrer" />
}

export function FreeBreadcrumb({ p, unit, editing }: { p: Record<string, any>; unit: number; editing: boolean }) {
  const u = mkU(unit)
  const items: MItem[] = Array.isArray(p.items) ? p.items : []
  const st: React.CSSProperties = { fontSize: u(p.size ?? 16), color: p.color ?? '#6b7280', textDecoration: 'none', ...font(p) }
  return (
    <nav aria-label="Breadcrumb" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: u(10) }}>
      {items.map((it, i) => {
        const last = i === items.length - 1
        const s = { ...st, color: last ? (p.accent ?? '#15803d') : st.color, fontWeight: last ? 700 : 400 }
        return (
          <React.Fragment key={i}>
            {editing || last ? <span style={s}>{it.label}</span> : <a href={href(it.href)} style={s}>{it.label}</a>}
            {!last && <svg viewBox="0 0 24 24" width={u((p.size ?? 16) * 0.9)} height={u((p.size ?? 16) * 0.9)} fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>}
          </React.Fragment>
        )
      })}
    </nav>
  )
}
