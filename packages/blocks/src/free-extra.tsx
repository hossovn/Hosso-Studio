'use client'
import React, { useEffect, useRef, useState } from 'react'

import { fontStack, safeCssColor } from './free-style'
import { ICON_BODY } from './icons-data'

/** Phần tử tự do có tương tác hoặc dữ liệu riêng: đếm ngược, tab, accordion, video overlay, menu thu gọn/hamburger, bảng, bản đồ, nhúng, breadcrumb. `u` đổi px thiết kế sang cqw. */
type U = (n: number) => string
const mkU = (unit: number, scale?: number): U => (n) => (scale !== undefined ? `${Number(n) * scale}px` : `${(Number(n) / unit) * 100}cqw`)
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

export function FreeTabs({ p, unit, editing = false }: { p: Record<string, any>; unit: number; editing?: boolean }) {
  const u = mkU(unit)
  const tabs: { label: string; text: string }[] = Array.isArray(p.tabs) && p.tabs.length ? p.tabs : [{ label: 'Tab 1', text: '' }]
  const [i, setI] = useState(0)
  const cur = tabs[Math.min(i, tabs.length - 1)]
  const accent = p.accent ?? '#15803d'
  return (
    <div style={{ width: '100%', height: '100%', background: p.bg ?? '#f9fafb', borderRadius: u(p.radius ?? 12), overflow: 'hidden', display: 'flex', flexDirection: 'column', ...font(p) }}>
      <div style={{ display: 'flex', borderBottom: `${u(1)} solid #e5e7eb` }}>
        {tabs.map((t, k) => {
          const style: React.CSSProperties = { flex: 1, padding: `${u(14)} ${u(8)}`, border: 0, borderBottom: `${u(3)} solid ${k === i ? accent : 'transparent'}`, marginBottom: u(-1), background: 'transparent', color: k === i ? accent : '#6b7280', fontWeight: k === i ? 700 : 500, fontSize: u(p.size ?? 18), fontFamily: 'inherit', cursor: editing ? 'default' : 'pointer', textAlign: 'center' }
          return editing
            ? <span key={k} style={style}>{t.label}</span>
            : <button key={k} type="button" onClick={() => setI(k)} style={style}>{t.label}</button>
        })}
      </div>
      <div style={{ padding: u(20), fontSize: u((p.size ?? 18) * 0.9), color: p.color ?? '#374151', lineHeight: 1.5, whiteSpace: 'pre-wrap', overflow: 'hidden' }}>{cur.text}</div>
    </div>
  )
}

type MItem = { label: string; href: string }
/** Menu thu gọn (dropdown) hoặc nút hamburger mở danh sách. */
export function FreeFoldMenu({ p, unit, hamburger, editing, itemLinkProps }: { p: Record<string, any>; unit: number; hamburger: boolean; editing: boolean; itemLinkProps?: (href: unknown) => Record<string, any> }) {
  const u = mkU(unit)
  const items: MItem[] = Array.isArray(p.items) ? p.items : []
  const [open, setOpen] = useState(false)
  const accent = p.accent ?? '#15803d'
  const link: React.CSSProperties = { display: 'block', padding: `${u(10)} ${u(14)}`, fontSize: u(p.size ?? 16), fontWeight: p.weight ?? 500, color: p.color ?? '#111827', textDecoration: 'none', ...font(p) }
  const list = (
    <ul style={{ margin: 0, padding: 0, listStyle: 'none', background: '#ffffff', borderRadius: u(10), boxShadow: `0 ${u(8)} ${u(24)} rgba(0,0,0,.15)`, overflow: 'hidden' }}>
      {items.map((it, k) => <li key={k}>{editing ? <span style={link}>{it.label}</span> : <a href={href(it.href)} {...(itemLinkProps ? itemLinkProps(it.href) : undefined)} onClick={(e) => { itemLinkProps?.(it.href)?.onClick?.(e); setOpen(false) }} style={link}>{it.label}</a>}</li>)}
    </ul>
  )
  if (hamburger)
    return (
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        {editing ? <span aria-label="Menu" style={{ width: '100%', height: '100%', border: 0, borderRadius: u(10), background: p.bg ?? '#f3f4f6', display: 'grid', placeItems: 'center' }}>
          <svg viewBox="0 0 24 24" width="55%" height="55%" fill="none" stroke={p.color ?? '#111827'} strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        </span> : <button type="button" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)} style={{ width: '100%', height: '100%', border: 0, borderRadius: u(10), background: p.bg ?? '#f3f4f6', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
          <svg viewBox="0 0 24 24" width="55%" height="55%" fill="none" stroke={p.color ?? '#111827'} strokeWidth="2" strokeLinecap="round">{open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}</svg>
        </button>}
        {open && <div style={{ position: 'absolute', top: '105%', left: 0, minWidth: u(220), zIndex: 5 }}>{list}</div>}
      </div>
    )
  const triggerStyle: React.CSSProperties = { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `0 ${u(14)}`, border: 0, borderBottom: `${u(2)} solid ${accent}`, background: p.bg ?? '#ffffff', color: accent, fontWeight: 700, fontSize: u(p.size ?? 16), fontFamily: 'inherit', cursor: editing ? 'default' : 'pointer', boxSizing: 'border-box' }
  const triggerContent = <>{items[0]?.label ?? 'Menu'}<svg viewBox="0 0 24 24" width={u(20)} height={u(20)} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? 'rotate(180deg)' : undefined }}><path d="M6 9l6 6 6-6" /></svg></>
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {editing
        ? <span style={triggerStyle}>{triggerContent}</span>
        : <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} style={triggerStyle}>{triggerContent}</button>}
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

export type AccordionItem = { question: string; answer: string; defaultOpen?: boolean }

const ACCORDION_CSS = `
.hs-acc summary{list-style:none;cursor:pointer;user-select:none}
.hs-acc summary::-webkit-details-marker{display:none}
.hs-acc summary:focus-visible{outline:2px solid currentColor;outline-offset:2px;border-radius:8px}
.hs-acc details[open][data-open-bg="1"]{background:var(--hs-acc-open-bg)!important;border-color:var(--hs-acc-accent)!important}
.hs-acc[data-icon="plus"] details[open] .hs-acc-icon{transform:rotate(45deg)}
.hs-acc[data-icon="chevron"] details[open] .hs-acc-icon{transform:rotate(180deg)}
@media(prefers-reduced-motion:no-preference){
  .hs-acc .hs-acc-icon{transition:transform 180ms cubic-bezier(.23,1,.32,1)}
  .hs-acc summary:active{transform:scale(.99)}
  .hs-acc details[open] .hs-acc-body{animation:hsAccReveal 180ms cubic-bezier(.23,1,.32,1)}
}
@keyframes hsAccReveal{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
`

export function FreeAccordion({ elId, p, unit, scale, editing = false }: { elId: string; p: Record<string, any>; unit: number; scale?: number; editing?: boolean }) {
  const u = mkU(unit, scale)
  const items: AccordionItem[] = Array.isArray(p.items) && p.items.length
    ? p.items
    : [{ question: 'Câu hỏi thường gặp?', answer: 'Nội dung giải đáp chi tiết.', defaultOpen: true }]
  const iconStyle = p.iconStyle === 'chevron' ? 'chevron' : 'plus'
  const bg = safeCssColor(p.bg, '#ffffff')
  const openBg = safeCssColor(p.openBg, '')
  const borderColor = safeCssColor(p.borderColor, '#e5e7eb')
  const qColor = safeCssColor(p.color, '#111827')
  const aColor = safeCssColor(p.answerColor, '#4b5563')
  const accent = safeCssColor(p.accent, '#15803d')
  const radius = u(p.radius ?? 14)
  const padX = u(p.padX ?? 22)
  const padY = u(p.padY ?? 18)
  const qSize = u(p.size ?? 18)
  const aSize = u(p.answerSize ?? Math.round((Number(p.size) || 18) * 0.88))
  const groupName = p.exclusive !== false ? `hs-acc-${elId.replace(/[^a-zA-Z0-9_-]/g, '')}` : undefined

  return (
    <div
      className="hs-acc"
      data-icon={iconStyle}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: u(p.gap ?? 12),
        overflowY: 'auto',
        boxSizing: 'border-box',
        ['--hs-acc-open-bg' as string]: openBg || bg,
        ['--hs-acc-accent' as string]: accent,
        ...font(p),
      }}
    >
      <style>{ACCORDION_CSS}</style>
      {items.map((it, idx) => (
        <details
          key={idx}
          name={groupName}
          open={Boolean(it.defaultOpen)}
          data-open-bg={openBg ? '1' : undefined}
          onClick={editing ? (e) => e.preventDefault() : undefined}
          style={{
            background: bg,
            border: `${u(p.borderW ?? 1)} solid ${borderColor}`,
            borderRadius: radius,
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          <summary
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: u(14),
              padding: `${padY} ${padX}`,
              color: qColor,
              fontSize: qSize,
              fontWeight: p.weight ?? 700,
              lineHeight: 1.35,
            }}
          >
            <span>{it.question}</span>
            <span
              className="hs-acc-icon"
              aria-hidden="true"
              style={{
                width: u(28),
                height: u(28),
                borderRadius: '50%',
                background: safeCssColor(p.iconBg, '#f3f4f6'),
                color: accent,
                display: 'inline-grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              <svg viewBox="0 0 24 24" width={u(16)} height={u(16)} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                {iconStyle === 'chevron' ? <path d="m6 9 6 6 6-6" /> : <><path d="M5 12h14" /><path d="M12 5v14" /></>}
              </svg>
            </span>
          </summary>
          <div
            className="hs-acc-body"
            style={{
              padding: `0 ${padX} ${padY}`,
              color: aColor,
              fontSize: aSize,
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
            }}
          >
            {it.answer}
          </div>
        </details>
      ))}
    </div>
  )
}

const VIDEO_OVERLAY_CSS = `
.hs-vid-btn{border:0;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px;color:#fff;background:rgba(17,24,39,.76);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
.hs-vid-btn:focus-visible{outline:2px solid #fff;outline-offset:2px}
@media(prefers-reduced-motion:no-preference){
  .hs-vid-btn{transition:transform 160ms cubic-bezier(.23,1,.32,1),opacity 160ms cubic-bezier(.23,1,.32,1)}
  .hs-vid-btn:hover{transform:scale(1.04)}
  .hs-vid-btn:active{transform:scale(.97)}
}
@media(prefers-reduced-transparency:reduce){
  .hs-vid-btn{backdrop-filter:none;-webkit-backdrop-filter:none;background:#111827}
}
`

export function FreeVideoPlayer({ p, unit, scale, editing = false }: { p: Record<string, any>; unit: number; scale?: number; editing?: boolean }) {
  const u = mkU(unit, scale)
  const ref = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const radius = u(p.radius ?? 0)
  const playLabel = String(p.playLabel || 'Phát video')
  const pauseLabel = String(p.pauseLabel || 'Tạm dừng video')
  const toggle = () => {
    if (editing || !ref.current) return
    if (ref.current.paused) {
      ref.current.play().catch(() => {})
    } else {
      ref.current.pause()
    }
  }
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: radius, overflow: 'hidden', background: '#0f172a' }}>
      <style>{VIDEO_OVERLAY_CSS}</style>
      <video
        ref={ref}
        src={p.url}
        poster={p.poster || undefined}
        loop={Boolean(p.loop)}
        muted={Boolean(p.muted)}
        autoPlay={!editing && Boolean(p.autoplay) && Boolean(p.muted)}
        playsInline
        preload="metadata"
        onClick={toggle}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        style={{ width: '100%', height: '100%', display: 'block', objectFit: p.fit === 'contain' ? 'contain' : 'cover', cursor: editing ? 'default' : 'pointer' }}
      />
      <button
        type="button"
        className="hs-vid-btn"
        aria-label={playing ? pauseLabel : playLabel}
        aria-pressed={playing}
        disabled={editing}
        onClick={toggle}
        style={
          playing
            ? { position: 'absolute', right: u(14), bottom: u(14), width: u(42), height: u(42), borderRadius: '50%', opacity: 0.86 }
            : { position: 'absolute', inset: 0, margin: 'auto', width: u(68), height: u(68), borderRadius: '50%', boxShadow: '0 12px 28px rgba(0,0,0,.32)' }
        }
      >
        <svg
          viewBox="0 0 24 24"
          width={playing ? u(18) : u(26)}
          height={playing ? u(18) : u(26)}
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: playing ? ICON_BODY.pause : ICON_BODY.play }}
        />
      </button>
    </div>
  )
}
