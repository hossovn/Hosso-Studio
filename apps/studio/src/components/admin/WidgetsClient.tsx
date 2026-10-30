'use client'
import hosso from '@hosso-config'
import { MediaField, RefField, coreBlocks, type BlockField, type BlockSchema } from '@hosso/studio-blocks'
import React, { useMemo, useRef, useState } from 'react'

import { useAdminT } from '@/lib/use-admin-t'
import { useAdminLang } from '@/lib/use-admin-lang'
import { AdminLang } from './AdminLang'
import { WidgetPreview } from './WidgetPreview'

type Item = { type: string; props: Record<string, unknown> & { id?: string } }
type Area = { name: string; label: string; content: Item[] }

// Block hợp làm widget (cột bên, trước/sau header/footer). Block plugin có thể thêm vào đây qua hosso.config.
const WIDGET_TYPES = ['Text', 'Image', 'Video', 'SearchBox', 'TermList', 'NavMenu', 'PostList', 'Form', 'Reusable']

const card: React.CSSProperties = { border: '1px solid var(--theme-elevation-150)', borderRadius: 14, marginBottom: 8, background: 'var(--theme-elevation-0)' }
const input: React.CSSProperties = { width: '100%', padding: '6px 8px', borderRadius: 4, border: '1px solid var(--theme-elevation-200)', background: 'var(--theme-input-bg)', color: 'inherit', font: 'inherit' }
const btn: React.CSSProperties = { background: 'var(--hosso-brand)', color: '#fff', border: 0, borderRadius: 4, padding: '8px 14px', fontWeight: 600, cursor: 'pointer', font: 'inherit', textDecoration: 'none', display: 'inline-block' }
const mini: React.CSSProperties = { border: '1px solid var(--theme-elevation-200)', background: 'transparent', color: 'inherit', borderRadius: 4, width: 28, height: 28, cursor: 'pointer' }
const uid = (type: string) => `${type}-${Math.random().toString(36).slice(2, 8)}`

function FieldInput({ f, value, onChange }: { f: BlockField; value: unknown; onChange: (v: unknown) => void }) {
  const T = useAdminT()
  const L = useAdminLang()
  if (f.type === 'textarea') return <textarea style={{ ...input, minHeight: 80 }} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />
  if (f.type === 'number') return <input style={input} type="number" value={String(value ?? '')} onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))} />
  if (f.type === 'select' || f.type === 'radio')
    return (
      <select style={input} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)}>
        {f.options.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>
            {L(o.label)}
          </option>
        ))}
      </select>
    )
  if (f.type === 'media') return <MediaField value={String(value ?? '')} onChange={onChange as (v: string) => void} kind={f.kind} />
  if (f.type === 'ref') return <RefField value={String(value ?? '')} onChange={onChange as (v: string) => void} collection={f.collection} />
  if (f.type === 'array') {
    const rows = (Array.isArray(value) ? value : []) as Record<string, unknown>[]
    return (
      <div>
        {rows.map((row, i) => (
          <div key={i} style={{ ...card, padding: 8 }}>
            {Object.entries(f.arrayFields).map(([k, sub]) => (
              <label key={k} style={{ display: 'block', marginBottom: 6 }}>
                <span style={{ fontSize: 12, opacity: 0.8 }}>{L((sub as { label?: string }).label ?? k)}</span>
                <FieldInput f={sub as BlockField} value={row[k]} onChange={(v) => onChange(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)))} />
              </label>
            ))}
            <button type="button" style={mini} aria-label={T('Xóa mục')} onClick={() => onChange(rows.filter((_, j) => j !== i))}>
              ✕
            </button>
          </div>
        ))}
        <button type="button" style={{ ...mini, width: 'auto', padding: '0 10px' }} onClick={() => onChange([...rows, { ...(f.defaultItemProps ?? {}) }])}>
          {T('+ Thêm mục')}
        </button>
      </div>
    )
  }
  return <input style={input} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />
}

export function WidgetsClient({ locale, defaultLocale, themeName, css, fontClass, locales, areas: initial }: { locale: string; defaultLocale: string; themeName: string; css: string; fontClass: string; locales: { code: string; label: string }[]; areas: Area[] }) {
  const T = useAdminT()
  const L = useAdminLang()
  const schemas = useMemo(() => {
    const all: BlockSchema<any>[] = [...coreBlocks, ...hosso.plugins.flatMap((p) => p.blocks ?? [])]
    return Object.fromEntries(all.map((s) => [s.type, s])) as Record<string, BlockSchema<any>>
  }, [])
  const [areas, setAreas] = useState(initial)
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [msg, setMsg] = useState('')
  const [dirty, setDirty] = useState<Record<string, boolean>>({})
  const drag = useRef<{ area: string; i: number } | null>(null)

  const patch = (name: string, fn: (list: Item[]) => Item[]) => {
    setAreas((a) => a.map((x) => (x.name === name ? { ...x, content: fn(x.content) } : x)))
    setDirty((d) => ({ ...d, [name]: true }))
  }
  const move = (name: string, from: number, to: number) =>
    patch(name, (list) => {
      const next = [...list]
      const [it] = next.splice(from, 1)
      next.splice(to > from ? to - 1 : to, 0, it)
      return next
    })

  const save = async (a: Area) => {
    setMsg(T('Đang lưu "{label}"…', { label: T(a.label) }))
    const r = await fetch(`/api/globals/site-areas?locale=${locale}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [a.name]: a.content.length ? { root: { props: {} }, content: a.content } : null }),
    })
    setMsg(r.ok ? T('Đã lưu "{label}" ({locale}). Site công khai hiển thị ngay.', { label: T(a.label), locale }) : T('Lỗi lưu ({status}).', { status: r.status }))
    if (r.ok) setDirty((d) => ({ ...d, [a.name]: false }))
  }

  return (
    <AdminLang>
    <div className="ha-workspace ha-widgets">
      <h1 style={{ marginTop: 0 }}>{T('Widget')}</h1>
      <p>
        {T('Mỗi vùng là một khu vực hiện trên mọi trang (hoặc cạnh bài viết). Thêm widget, kéo thả (⠿) để đổi thứ tự rồi bấm Lưu. Cần dựng bố cục phức tạp? Dùng "Trình dựng đầy đủ" của từng vùng.')}
      </p>
      <p>
        {T('Ngôn ngữ:')}{' '}
        {locales.map((l) => (
          <a key={l.code} href={`/admin/widgets?locale=${l.code}`} style={{ marginRight: 10, fontWeight: l.code === locale ? 700 : 400 }}>
            {l.label}
          </a>
        ))}
      </p>

      {areas.map((a) => (
        <section key={a.name} style={{ ...card, padding: 16, marginBottom: 24 }}>
          <header style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, fontSize: 18, flex: 1 }}>{T(a.label)}</h2>
            <a href={`/editor/${a.name}?c=area&locale=${locale}`} style={{ fontSize: 13 }}>
              {T('Trình dựng đầy đủ')}
            </a>
            <button type="button" style={{ ...btn, opacity: dirty[a.name] ? 1 : 0.5 }} disabled={!dirty[a.name]} onClick={() => save(a)}>
              {dirty[a.name] ? T('Lưu') : T('Đã lưu')}
            </button>
          </header>

          <details open style={{ marginBottom: 12 }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600, marginBottom: 8 }}>{T('Xem trước (cập nhật ngay khi sửa)')}</summary>
            <WidgetPreview content={a.content} themeName={themeName} css={css} fontClass={fontClass} locale={locale} defaultLocale={defaultLocale} layout={a.name === 'postSidebar' ? 'sidebar' : 'full'} />
          </details>
          {a.content.length === 0 && <p style={{ opacity: 0.7 }}>{T('Chưa có widget nào.')}</p>}
          {a.content.map((it, i) => {
            const schema = schemas[it.type]
            const key = it.props.id ?? `${it.type}-${i}`
            const isOpen = open[`${a.name}:${key}`]
            return (
              <div
                key={key}
                style={card}
                onDragOver={(e) => drag.current?.area === a.name && e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  if (drag.current?.area === a.name) move(a.name, drag.current.i, i)
                  drag.current = null
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8 }}>
                  <span draggable onDragStart={() => (drag.current = { area: a.name, i })} title={T('Kéo để di chuyển')} aria-label={T('Kéo để di chuyển')} style={{ cursor: 'grab', opacity: 0.6, padding: '0 6px' }}>
                    ⠿
                  </span>
                  <button type="button" style={{ background: 'none', border: 0, color: 'inherit', font: 'inherit', fontWeight: 600, cursor: 'pointer', textAlign: 'left', flex: 1 }} aria-expanded={!!isOpen} onClick={() => setOpen({ ...open, [`${a.name}:${key}`]: !isOpen })}>
                    {L(schema?.label ?? it.type)}
                    {typeof it.props.heading === 'string' && it.props.heading ? <span style={{ opacity: 0.6, fontWeight: 400 }}> — {it.props.heading}</span> : null}
                  </button>
                  <button type="button" style={mini} aria-label={T('Lên')} disabled={i === 0} onClick={() => move(a.name, i, i - 1)}>
                    ↑
                  </button>
                  <button type="button" style={mini} aria-label={T('Xuống')} disabled={i === a.content.length - 1} onClick={() => move(a.name, i, i + 2)}>
                    ↓
                  </button>
                  <button type="button" style={{ ...mini, color: '#d63638' }} aria-label={T('Xóa widget')} onClick={() => window.confirm(T('Xóa widget này?')) && patch(a.name, (l) => l.filter((_, j) => j !== i))}>
                    ✕
                  </button>
                </div>
                {isOpen && schema && (
                  <div style={{ padding: '0 12px 12px' }}>
                    {Object.entries(schema.fields).map(([k, f]) => (
                      <label key={k} style={{ display: 'block', marginBottom: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{L((f as { label?: string }).label ?? k)}</span>
                        <FieldInput f={f as BlockField} value={it.props[k]} onChange={(v) => patch(a.name, (l) => l.map((x, j) => (j === i ? { ...x, props: { ...x.props, [k]: v } } : x)))} />
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          <select
            style={{ ...input, maxWidth: 320 }}
            value=""
            aria-label={T('Thêm widget vào {label}', { label: T(a.label) })}
            onChange={(e) => {
              const s = schemas[e.target.value]
              if (s) patch(a.name, (l) => [...l, { type: s.type, props: { ...s.defaultProps, id: uid(s.type) } }])
            }}
          >
            <option value="">{T('+ Thêm widget…')}</option>
            {WIDGET_TYPES.filter((t) => schemas[t]).map((t) => (
              <option key={t} value={t}>
                {L(schemas[t].label)}
              </option>
            ))}
          </select>
        </section>
      ))}
      {msg && (
        <p role="status" style={{ position: 'sticky', bottom: 16, background: 'var(--theme-elevation-100)', padding: 12, borderRadius: 6 }}>
          {msg}
        </p>
      )}
    </div>
    </AdminLang>
  )
}
