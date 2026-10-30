'use client'
import React, { useEffect, useMemo, useRef, useState } from 'react'

import { useAdminT } from '@/lib/use-admin-t'

type Theme = { name: string; title: string; colors: Record<string, string>; fonts: { body: string; heading: string }; radius: string; spacing: string }
type Ov = Record<string, string | undefined | null>

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)
const fontStack = (id: string) => `var(--font-${id}), ${id === 'jetbrains-mono' ? 'ui-monospace, monospace' : 'system-ui, sans-serif'}`
const VIEW = { desktop: '100%', tablet: '768px', mobile: '390px' } as const

const input: React.CSSProperties = { width: '100%', padding: '6px 8px', borderRadius: 4, border: '1px solid var(--theme-elevation-200)', background: 'var(--theme-input-bg)', color: 'inherit', font: 'inherit' }
const btn: React.CSSProperties = { background: 'var(--hosso-brand)', color: '#fff', border: 0, borderRadius: 10, padding: '8px 14px', minHeight: 44, fontWeight: 600, cursor: 'pointer', font: 'inherit' }
const ghost: React.CSSProperties = { ...btn, background: 'transparent', color: 'inherit', border: '1px solid var(--theme-elevation-300)' }

export function CustomizeClient({ themes, current, overrides, fonts }: { themes: Theme[]; current: string; overrides: Record<string, Ov>; fonts: Record<string, string> }) {
  const T = useAdminT()
  const [theme, setTheme] = useState(current)
  const [all, setAll] = useState(overrides)
  const [path, setPath] = useState('/')
  const [view, setView] = useState<keyof typeof VIEW>('desktop')
  const [msg, setMsg] = useState('')
  const frame = useRef<HTMLIFrameElement>(null)
  const t = themes.find((x) => x.name === theme) ?? themes[0]
  const ov = all[t.name] ?? {}
  const set = (k: string, v: string) => setAll({ ...all, [t.name]: { ...ov, [k]: v } })

  // Biến CSS đang chỉnh, gửi sang khung xem trước để thấy ngay (không cần lưu).
  const vars = useMemo(() => {
    const o: Record<string, string> = {}
    for (const [k, v] of Object.entries(t.colors)) o[`--hs-${kebab(k)}`] = ov[`color_${k}`] || v
    o['--hs-font-body'] = fontStack(ov.fontBody || t.fonts.body)
    o['--hs-font-heading'] = fontStack(ov.fontHeading || t.fonts.heading)
    o['--hs-radius'] = ov.radius || t.radius
    o['--hs-space'] = ov.spacing || t.spacing
    return o
  }, [t, ov])
  const push = () => frame.current?.contentWindow?.postMessage({ hossoVars: vars }, location.origin)
  useEffect(push, [vars]) // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    setMsg(T('Đang lưu…'))
    const clean = Object.fromEntries(Object.entries(ov).filter(([, v]) => v))
    const r = await fetch('/api/globals/site-settings', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ theme: t.name, [`tokens_${t.name}`]: clean }) })
    setMsg(r.ok ? T('Đã lưu. Site công khai dùng giao diện mới.') : T('Lỗi lưu ({status}): kiểm tra mã màu dạng #rrggbb.', { status: r.status }))
    if (r.ok && t.name !== current) frame.current?.contentWindow?.location.reload()
  }

  return (
    <div className="ha-customizer">
      <aside style={{ overflowY: 'auto', padding: 16, borderRight: '1px solid var(--theme-elevation-150)' }}>
        <h1 style={{ marginTop: 0, fontSize: 22 }}>{T('Tùy biến giao diện')}</h1>
        <label style={{ display: 'block', marginBottom: 12 }}>
          Theme
          <select style={input} value={theme} onChange={(e) => setTheme(e.target.value)}>
            {themes.map((x) => (
              <option key={x.name} value={x.name}>
                {x.title}
              </option>
            ))}
          </select>
        </label>
        {theme !== current && <p style={{ fontSize: 12, opacity: 0.8 }}>{T('Đổi theme cần bấm Lưu rồi khung bên phải tải lại để xem.')}</p>}

        <h3>{T('Màu sắc')}</h3>
        {Object.entries(t.colors).map(([k, def]) => (
          <label key={k} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 90px', gap: 8, alignItems: 'center', marginBottom: 6 }}>
            <input type="color" value={/^#[0-9a-f]{6}$/i.test(ov[`color_${k}`] ?? '') ? (ov[`color_${k}`] as string) : /^#[0-9a-f]{6}$/i.test(def) ? def : '#000000'} onChange={(e) => set(`color_${k}`, e.target.value)} aria-label={T('Màu {k}', { k })} style={{ width: 40, height: 30, padding: 0, border: 0, background: 'none' }} />
            <span>{k}</span>
            <input style={input} placeholder={def} value={ov[`color_${k}`] ?? ''} onChange={(e) => set(`color_${k}`, e.target.value)} aria-label={T('Mã màu {k}', { k })} />
          </label>
        ))}

        <h3>{T('Chữ')}</h3>
        {(['fontBody', 'fontHeading'] as const).map((k) => (
          <label key={k} style={{ display: 'block', marginBottom: 8 }}>
            {k === 'fontBody' ? T('Font nội dung') : T('Font tiêu đề')}
            <select style={input} value={ov[k] ?? ''} onChange={(e) => set(k, e.target.value)}>
              <option value="">{T('Mặc định ({name})', { name: fonts[k === 'fontBody' ? t.fonts.body : t.fonts.heading] })}</option>
              {Object.entries(fonts).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        ))}

        <h3>{T('Hình dạng')}</h3>
        <label style={{ display: 'block', marginBottom: 8 }}>
          {T('Bo góc')}
          <input style={input} placeholder={t.radius} value={ov.radius ?? ''} onChange={(e) => set('radius', e.target.value)} />
        </label>
        <label style={{ display: 'block', marginBottom: 16 }}>
          {T('Khoảng cách cơ bản')}
          <input style={input} placeholder={t.spacing} value={ov.spacing ?? ''} onChange={(e) => set('spacing', e.target.value)} />
        </label>

        <div style={{ display: 'flex', gap: 8, position: 'sticky', bottom: 0, background: 'var(--theme-bg)', padding: '8px 0' }}>
          <button style={btn} onClick={save}>
            {T('Lưu')}
          </button>
          <button style={ghost} onClick={() => setAll({ ...all, [t.name]: {} })}>
            {T('Về mặc định')}
          </button>
        </div>
        {msg && <p role="status" style={{ fontSize: 13 }}>{msg}</p>}
      </aside>

      <section style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: 12, alignItems: 'center', borderBottom: '1px solid var(--theme-elevation-150)' }}>
          {(Object.keys(VIEW) as (keyof typeof VIEW)[]).map((v) => (
            <button key={v} aria-pressed={view === v} style={view === v ? btn : ghost} onClick={() => setView(v)}>
              {v === 'desktop' ? T('Máy tính') : v === 'tablet' ? T('Máy tính bảng') : T('Điện thoại')}
            </button>
          ))}
          <input style={{ ...input, maxWidth: 260, marginLeft: 'auto' }} value={path} onChange={(e) => setPath(e.target.value.startsWith('/') ? e.target.value : `/${e.target.value}`)} aria-label={T('Trang xem trước')} />
          <button style={ghost} onClick={() => frame.current?.contentWindow?.location.reload()}>
            {T('Tải lại')}
          </button>
        </div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', background: 'var(--theme-elevation-100)', overflow: 'auto' }}>
          <iframe ref={frame} title={T('Xem trước site')} src={path} onLoad={push} style={{ width: VIEW[view], maxWidth: '100%', height: '100%', border: 0, background: '#fff' }} />
        </div>
      </section>
    </div>
  )
}
