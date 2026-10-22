'use client'
import React, { useEffect, useRef, useState } from 'react'

import type { BlockRenderer } from './types'

/** Khối tiện ích không cần backend: popup, thanh thông báo, chọn ngôn ngữ, vòng quay may mắn. `_noFree` do canvas editor đặt: khi đó chỉ vẽ bản xem trước, không bật hành vi thật. */
const SAFE = /^(https?:\/\/|\/|#|mailto:|tel:)/i
const safe = (h: unknown) => (typeof h === 'string' && SAFE.test(h.trim()) ? h.trim() : '#')
const lines = (v: unknown) => String(v ?? '').split('\n').map((l) => l.trim()).filter(Boolean)
const store = (kind: 'session' | 'once') => (kind === 'once' ? window.localStorage : window.sessionStorage)

// ---- Popup ----
export const PopupBlock: BlockRenderer = ({ id, title, body, image, ctaLabel, ctaHref, delay, every, _noFree }: any) => {
  const [open, setOpen] = useState(false)
  const key = `hs-popup:${id}`
  const kind = every === 'once' || every === 'session' ? every : null
  useEffect(() => {
    if (_noFree) return
    try { if (kind && store(kind).getItem(key)) return } catch { /* trình duyệt chặn storage: vẫn hiện */ }
    const t = setTimeout(() => setOpen(true), Math.max(0, Number(delay) || 0) * 1000)
    return () => clearTimeout(t)
  }, [_noFree, key, kind, delay])
  const close = () => {
    setOpen(false)
    try { if (kind) store(kind).setItem(key, '1') } catch { /* bỏ qua */ }
  }
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  const card = (
    <div role="dialog" aria-modal={!_noFree} aria-label={title || 'Popup'} onClick={(e) => e.stopPropagation()} style={{ position: 'relative', width: 'min(92vw, 460px)', background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,.35)', font: '16px/1.5 system-ui, sans-serif', color: '#111827' }}>
      {!_noFree && <button type="button" aria-label="Đóng" onClick={close} style={{ position: 'absolute', top: 10, right: 10, width: 34, height: 34, borderRadius: 999, border: 0, background: 'rgba(17,24,39,.7)', color: '#fff', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>}
      {image ? <img src={image} alt="" style={{ width: '100%', maxHeight: 240, objectFit: 'cover', display: 'block' }} /> : null}
      <div style={{ padding: '22px 24px 26px', textAlign: 'center' }}>
        {title ? <h3 style={{ margin: '0 0 8px', fontSize: 24 }}>{title}</h3> : null}
        {body ? <p style={{ margin: '0 0 18px', color: '#4b5563', whiteSpace: 'pre-wrap' }}>{body}</p> : null}
        {ctaLabel ? <a href={safe(ctaHref)} onClick={_noFree ? (e) => e.preventDefault() : close} style={{ display: 'inline-block', padding: '12px 28px', borderRadius: 999, background: '#15803d', color: '#fff', fontWeight: 700, textDecoration: 'none' }}>{ctaLabel}</a> : null}
      </div>
    </div>
  )
  if (_noFree)
    return (
      <div style={{ padding: '28px 12px', background: '#f3f4f6', display: 'grid', justifyItems: 'center', gap: 10 }}>
        <small style={{ color: '#6b7280', font: '12px system-ui' }}>Popup · hiện sau {Number(delay) || 0} giây khi khách vào trang</small>
        {card}
      </div>
    )
  return open ? <div onClick={close} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,.55)', display: 'grid', placeItems: 'center', padding: 16 }}>{card}</div> : null
}

// ---- Thanh thông báo ----
export const NoticeBar: BlockRenderer = ({ id, text, href, bg, color, dismissible, _noFree }: any) => {
  const [gone, setGone] = useState(false)
  const key = `hs-notice:${id}`
  useEffect(() => {
    try { if (!_noFree && dismissible === 'yes' && window.sessionStorage.getItem(key)) setGone(true) } catch { /* bỏ qua */ }
  }, [_noFree, dismissible, key])
  if (gone) return null
  const inner = text || 'Nội dung thông báo'
  return (
    <div role="status" style={{ position: 'relative', background: bg || '#15803d', color: color || '#fff', padding: '10px 44px', textAlign: 'center', font: '600 14px/1.4 system-ui, sans-serif' }}>
      {href ? <a href={safe(href)} style={{ color: 'inherit', textDecoration: 'underline' }}>{inner}</a> : inner}
      {dismissible === 'yes' && !_noFree && (
        <button type="button" aria-label="Đóng thông báo" onClick={() => { setGone(true); try { window.sessionStorage.setItem(key, '1') } catch { /* bỏ qua */ } }} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', border: 0, background: 'transparent', color: 'inherit', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>
      )}
    </div>
  )
}

// ---- Chọn ngôn ngữ ----
/** `locales`: mỗi dòng `mã:Nhãn`, dòng đầu là ngôn ngữ mặc định (URL không có tiền tố), các ngôn ngữ khác có tiền tố /mã như cấu hình site. */
export const LanguageSwitch: BlockRenderer = ({ locales, style, align, _noFree }: any) => {
  const list = lines(locales).map((l) => { const [code, ...r] = l.split(':'); return { code: code.trim(), label: (r.join(':') || code).trim() } })
  const [path, setPath] = useState('/')
  useEffect(() => setPath(window.location.pathname + window.location.search), [])
  if (!list.length) return null
  const def = list[0].code
  const strip = (p: string) => { const m = p.match(/^\/([^/?#]+)(.*)$/); return m && list.some((x) => x.code === m[1] && x.code !== def) ? m[2] || '/' : p }
  const base = strip(path)
  const cur = list.find((x) => path === `/${x.code}` || path.startsWith(`/${x.code}/`) || path.startsWith(`/${x.code}?`))?.code ?? def
  const hrefOf = (code: string) => (code === def ? base : `/${code}${base === '/' ? '' : base}`)
  const justify = align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start'
  if (style === 'select')
    return (
      <div style={{ display: 'flex', justifyContent: justify, padding: 12 }}>
        <select aria-label="Ngôn ngữ" value={cur} onChange={(e) => { if (!_noFree) window.location.href = hrefOf(e.target.value) }} style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid #d1d5db', font: '600 14px system-ui' }}>
          {list.map((x) => <option key={x.code} value={x.code}>{x.label}</option>)}
        </select>
      </div>
    )
  return (
    <nav aria-label="Ngôn ngữ" style={{ display: 'flex', justifyContent: justify, gap: 6, padding: 12, flexWrap: 'wrap' }}>
      {list.map((x) => (
        <a key={x.code} href={_noFree ? '#' : hrefOf(x.code)} hrefLang={x.code} aria-current={x.code === cur ? 'true' : undefined} onClick={_noFree ? (e) => e.preventDefault() : undefined} style={{ padding: '6px 14px', borderRadius: 999, font: '600 14px system-ui', textDecoration: 'none', border: '1px solid #d1d5db', background: x.code === cur ? '#111827' : '#fff', color: x.code === cur ? '#fff' : '#111827' }}>{x.label}</a>
      ))}
    </nav>
  )
}

// ---- Vòng quay may mắn ----
const WHEEL_COLORS = ['#16a34a', '#f59e0b', '#2563eb', '#dc2626', '#7c3aed', '#0891b2', '#ea580c', '#db2777']
/** Kết quả chọn ở trình duyệt (chỉ để tương tác/khuyến mãi mang tính vui); đừng dùng cho giải thưởng có giá trị thật. */
export const LuckyWheel: BlockRenderer = ({ heading, prizes, button, _noFree }: any) => {
  const items = lines(prizes)
  const n = Math.max(2, items.length)
  const names = items.length >= 2 ? items : ['Giảm 10%', 'Chúc may mắn', 'Giảm 20%', 'Quà tặng']
  const [rot, setRot] = useState(0)
  const [busy, setBusy] = useState(false)
  const [won, setWon] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  const seg = 360 / names.length
  const spin = () => {
    if (busy || _noFree) return
    const pick = Math.floor(Math.random() * names.length)
    // Mũi chỉ ở đỉnh; xoay để giữa ô `pick` nằm dưới mũi, cộng 6 vòng cho đẹp.
    const target = 360 * 6 + (360 - (pick * seg + seg / 2))
    setBusy(true)
    setWon('')
    setRot((r) => r - (r % 360) + target)
    timer.current = setTimeout(() => { setBusy(false); setWon(names[pick]) }, 4200)
  }
  const R = 150
  const pt = (deg: number, r = R) => [R + r * Math.sin((deg * Math.PI) / 180), R - r * Math.cos((deg * Math.PI) / 180)]
  return (
    <section style={{ padding: '32px 16px', textAlign: 'center', font: '16px/1.4 system-ui, sans-serif' }}>
      {heading ? <h2 style={{ margin: '0 0 18px', fontSize: 30 }}>{heading}</h2> : null}
      <div style={{ position: 'relative', width: 'min(86vw, 340px)', margin: '0 auto' }}>
        <div aria-hidden="true" style={{ position: 'absolute', left: '50%', top: -8, transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '12px solid transparent', borderRight: '12px solid transparent', borderTop: '26px solid #111827', zIndex: 2 }} />
        <svg viewBox={`0 0 ${R * 2} ${R * 2}`} width="100%" role="img" aria-label="Vòng quay may mắn" style={{ display: 'block', transform: `rotate(${rot}deg)`, transition: busy ? 'transform 4s cubic-bezier(.12,.7,.1,1)' : 'none', filter: 'drop-shadow(0 10px 20px rgba(0,0,0,.25))' }}>
          {names.map((name, i) => {
            const a0 = i * seg
            const a1 = a0 + seg
            const [x0, y0] = pt(a0)
            const [x1, y1] = pt(a1)
            const mid = a0 + seg / 2
            const [tx, ty] = pt(mid, R * 0.62)
            return (
              <g key={i}>
                <path d={`M${R} ${R} L${x0} ${y0} A${R} ${R} 0 ${seg > 180 ? 1 : 0} 1 ${x1} ${y1} Z`} fill={WHEEL_COLORS[i % WHEEL_COLORS.length]} stroke="#fff" strokeWidth="3" />
                <text x={tx} y={ty} fill="#fff" fontSize={n > 6 ? 12 : 14} fontWeight="700" textAnchor="middle" dominantBaseline="middle" transform={`rotate(${mid} ${tx} ${ty})`}>{name.length > 14 ? `${name.slice(0, 13)}…` : name}</text>
              </g>
            )
          })}
          <circle cx={R} cy={R} r="16" fill="#fff" stroke="#111827" strokeWidth="4" />
        </svg>
      </div>
      <button type="button" onClick={spin} disabled={busy} style={{ marginTop: 22, padding: '13px 34px', border: 0, borderRadius: 999, background: busy ? '#9ca3af' : '#15803d', color: '#fff', font: '700 17px system-ui', cursor: busy ? 'default' : 'pointer' }}>{busy ? 'Đang quay…' : button || 'Quay ngay'}</button>
      <div aria-live="polite" style={{ minHeight: 30, marginTop: 14, fontSize: 20, fontWeight: 700, color: '#15803d' }}>{won ? `Bạn trúng: ${won}` : ''}</div>
    </section>
  )
}

// ---- Đặt lịch ----
/** Gửi JSON tới /api/booking (lưu vào collection bookings, quản trị viên xử lý trong admin). */
export const BookingForm: BlockRenderer = ({ heading, services, askGuests, submitLabel, successText, _noFree }: any) => {
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')
  const opts = lines(services)
  const field: React.CSSProperties = { padding: '10px 12px', borderRadius: 10, border: '1px solid #d1d5db', font: '16px system-ui', width: '100%', boxSizing: 'border-box' }
  const lab: React.CSSProperties = { display: 'grid', gap: 4, font: '600 14px system-ui' }
  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (_noFree || state === 'busy') return
    setState('busy')
    const body = Object.fromEntries(new FormData(e.currentTarget))
    try {
      const r = await fetch('/api/booking', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      setState(r.ok ? 'done' : 'error')
    } catch {
      setState('error')
    }
  }
  return (
    <section style={{ padding: '28px 16px', font: '16px/1.5 system-ui, sans-serif', color: '#111827' }}>
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        {heading ? <h2 style={{ margin: '0 0 16px', fontSize: 28 }}>{heading}</h2> : null}
        {state === 'done' ? (
          <p role="status" style={{ padding: 16, borderRadius: 12, background: '#dcfce7', color: '#166534', fontWeight: 600 }}>{successText || 'Đã gửi yêu cầu đặt lịch. Chúng tôi sẽ liên hệ xác nhận sớm.'}</p>
        ) : (
          <form onSubmit={submit} style={{ display: 'grid', gap: 12 }}>
            <label style={lab}>Họ tên<input name="name" required maxLength={120} autoComplete="name" style={field} /></label>
            <label style={lab}>Điện thoại<input name="phone" type="tel" required pattern="(\+?84|0)\d{8,10}" title="Số điện thoại Việt Nam" autoComplete="tel" style={field} /></label>
            <label style={lab}>Email (tùy chọn)<input name="email" type="email" maxLength={120} autoComplete="email" style={field} /></label>
            {opts.length ? (
              <label style={lab}>Dịch vụ<select name="service" required style={field}>{opts.map((o) => <option key={o}>{o}</option>)}</select></label>
            ) : null}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label style={lab}>Ngày<input name="date" type="date" required min={today} style={field} /></label>
              <label style={lab}>Giờ<input name="time" type="time" style={field} /></label>
            </div>
            {askGuests === 'yes' ? <label style={lab}>Số người<input name="guests" type="number" min={1} max={99} defaultValue={1} style={field} /></label> : null}
            <label style={lab}>Ghi chú<textarea name="note" rows={3} maxLength={1000} style={field} /></label>
            <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} />
            {state === 'error' ? <p role="alert" style={{ margin: 0, color: '#b91c1c' }}>Gửi không thành công, vui lòng kiểm tra thông tin và thử lại.</p> : null}
            <button type="submit" disabled={state === 'busy'} style={{ padding: '13px 28px', border: 0, borderRadius: 999, background: '#15803d', color: '#fff', font: '700 16px system-ui', cursor: 'pointer' }}>{state === 'busy' ? 'Đang gửi…' : submitLabel || 'Đặt lịch'}</button>
          </form>
        )}
      </div>
    </section>
  )
}
