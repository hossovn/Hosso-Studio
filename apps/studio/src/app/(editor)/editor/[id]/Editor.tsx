'use client'
import hosso from '@hosso-config'
import { CORE_LOADER_TYPES, LocaleProvider, buildPuckConfig, coreBlocks, setLocale, type SiteChrome } from '@hosso/studio-blocks'
import { Puck, usePuck } from '@puckeditor/core'
import '@puckeditor/core/puck.css'
import React, { useEffect, useMemo, useRef, useState } from 'react'

import { withLiveData } from '@/components/admin/live-data'

type Kind = 'pages' | 'posts' | 'reusable-blocks' | 'area'

type Props = {
  collection: Kind
  publicHref: string
  id: string
  title: string
  slug: string
  status: string
  data: any
  themeName: string
  css: string
  chrome: SiteChrome
  canPublish: boolean
  fontClass: string
  locale: string
  defaultLocale: string
  locales: { code: string; label: string }[]
}

const NOUN: Record<Kind, string> = { pages: 'trang', posts: 'bài viết', 'reusable-blocks': 'khối dùng lại', area: 'vùng' }
const NEW_LABEL: Record<Kind, string> = { pages: 'Trang mới', posts: 'Bài mới', 'reusable-blocks': 'Khối mới', area: '' }

const slugify = (v: string) =>
  v
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9/]+/g, '-')
    .replace(/^-+|-+$/g, '')

const field: React.CSSProperties = { display: 'grid', gap: 4, fontSize: 13 }
const input: React.CSSProperties = { padding: 8, border: '1px solid #c9ccd1', borderRadius: 4, font: 'inherit' }
const plain: React.CSSProperties = { ...input, cursor: 'pointer', background: '#fff', whiteSpace: 'nowrap' }

const editorUrl = (id: string, collection: Kind, locale: string, defaultLocale: string) => {
  const q = new URLSearchParams()
  if (collection !== 'pages') q.set('c', collection === 'reusable-blocks' ? 'reusable-blocks' : collection)
  if (locale !== defaultLocale) q.set('locale', locale)
  const s = q.toString()
  return `/editor/${id}${s ? `?${s}` : ''}`
}

/** Chọn ngôn ngữ đang chỉnh. Bản dịch chưa có thì mở ra bản ngôn ngữ mặc định để dịch tiếp. */
function LocaleSwitch({ id, collection, locale, defaultLocale, locales }: Pick<Props, 'id' | 'collection' | 'locale' | 'defaultLocale' | 'locales'>) {
  if (locales.length < 2) return null
  return (
    <select aria-label="Ngôn ngữ đang chỉnh" value={locale} onChange={(e) => (window.location.href = editorUrl(id, collection, e.target.value, defaultLocale))} style={{ ...input, padding: '7px 8px' }}>
      {locales.map((l) => (
        <option key={l.code} value={l.code}>
          {l.label}
        </option>
      ))}
    </select>
  )
}

/** Danh sách, tạo mới, đổi tên/đường dẫn: làm ngay trong trình dựng. */
function PageTools({ id, title, slug, collection, locale, defaultLocale }: Pick<Props, 'id' | 'title' | 'slug' | 'collection' | 'locale' | 'defaultLocale'>) {
  const noun = NOUN[collection]
  const [pages, setPages] = useState<{ id: string | number; title: string; slug: string }[]>([])
  const [mode, setMode] = useState<'' | 'new' | 'edit'>('')
  const [error, setError] = useState('')
  const [form, setForm] = useState({ title: '', slug: '' })

  useEffect(() => {
    fetch(`/api/${collection}?limit=100&depth=0&sort=title&draft=true&locale=${locale}`)
      .then((r) => r.json())
      .then((j) => setPages(j.docs ?? []))
      .catch(() => {})
  }, [collection, locale])

  const open = (m: 'new' | 'edit') => {
    setError('')
    setForm(m === 'edit' ? { title, slug } : { title: '', slug: '' })
    setMode(m)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const body = { title: form.title.trim(), slug: slugify(form.slug || form.title) }
    if (!body.title || !body.slug) return setError('Cần tiêu đề và đường dẫn')
    const res =
      mode === 'new'
        ? await fetch(`/api/${collection}?locale=${locale}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...body, _status: 'draft', content: { root: { props: {} }, content: [] } }),
          })
        : await fetch(`/api/${collection}/${id}?draft=true&locale=${locale}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...body, _status: 'draft' }),
          })
    const j = await res.json().catch(() => ({}))
    if (!res.ok) return setError(j?.errors?.[0]?.message ?? 'Không lưu được (đường dẫn có thể đã tồn tại)')
    window.location.href = editorUrl(mode === 'new' ? j.doc.id : id, collection, locale, defaultLocale)
  }

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', position: 'relative' }}>
      <select aria-label={`Chuyển ${noun}`} value={id} onChange={(e) => (window.location.href = editorUrl(e.target.value, collection, locale, defaultLocale))} style={{ ...input, padding: '7px 8px', maxWidth: 180 }}>
        {!pages.some((p) => String(p.id) === id) && <option value={id}>{title}</option>}
        {pages.map((p) => (
          <option key={p.id} value={p.id}>
            {p.title} ({p.slug})
          </option>
        ))}
      </select>
      <button type="button" style={plain} onClick={() => open('new')}>
        + {NEW_LABEL[collection]}
      </button>
      <button type="button" style={plain} onClick={() => open('edit')}>
        Đổi tên / đường dẫn
      </button>
      {mode && (
        <form onSubmit={submit} style={{ position: 'absolute', top: '110%', left: 0, zIndex: 50, background: '#fff', border: '1px solid #c9ccd1', borderRadius: 6, padding: 14, display: 'grid', gap: 10, width: 300, boxShadow: '0 8px 24px rgba(0,0,0,.15)' }}>
          <strong>{mode === 'new' ? `Tạo ${noun} mới` : 'Đổi tên / đường dẫn'}</strong>
          <label style={field}>
            Tiêu đề {locale !== defaultLocale && `(${locale})`}
            <input style={input} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required autoFocus />
          </label>
          <label style={field}>
            Đường dẫn (dùng chung mọi ngôn ngữ; để trống = tự tạo từ tiêu đề)
            <input style={input} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder={slugify(form.title) || 'gioi-thieu'} />
          </label>
          {mode === 'edit' && <span style={{ fontSize: 12, color: '#555' }}>Thay đổi được lưu nháp, có hiệu lực khi xuất bản.</span>}
          {error && <span style={{ color: '#b91c1c', fontSize: 13 }}>{error}</span>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" style={plain} onClick={() => setMode('')}>
              Hủy
            </button>
            <button type="submit" style={{ ...plain, background: '#d71920', borderColor: '#d71920', color: '#fff', fontWeight: 600 }}>
              Lưu
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

function Actions({ id, collection, publicHref, canPublish, busy, locale, onSave }: Pick<Props, 'id' | 'collection' | 'publicHref' | 'canPublish' | 'locale'> & { busy: boolean; onSave: (data: unknown, publish: boolean) => void }) {
  const { appState } = usePuck()
  const btn: React.CSSProperties = { padding: '8px 14px', borderRadius: 4, border: '1px solid #ccc', background: '#fff', cursor: 'pointer', font: 'inherit', whiteSpace: 'nowrap' }
  const primary: React.CSSProperties = { ...btn, background: '#d71920', borderColor: '#d71920', color: '#fff', fontWeight: 600 }

  if (collection === 'area') {
    // Vùng giao diện không có bản nháp: lưu là hiển thị ngay trên site.
    return (
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <a style={{ ...btn, textDecoration: 'none', color: 'inherit' }} href={publicHref} target="_blank" rel="noreferrer">
          Xem site
        </a>
        <button style={canPublish ? primary : { ...btn, opacity: 0.5, cursor: 'not-allowed' }} disabled={busy || !canPublish} title={canPublish ? 'Lưu và hiển thị ngay trên site' : 'Chỉ quản trị viên và người xuất bản được lưu'} onClick={() => onSave(appState.data, true)}>
          Lưu (hiển thị ngay)
        </button>
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      {collection !== 'reusable-blocks' && (
        <a style={{ ...btn, textDecoration: 'none', color: 'inherit' }} href={`${publicHref}${publicHref.includes('?') ? '&' : '?'}preview=1`} target="_blank" rel="noreferrer">
          Xem trước
        </a>
      )}
      <a style={{ ...btn, textDecoration: 'none', color: 'inherit' }} href={`/admin/collections/${collection}/${id}/versions?locale=${locale}`} target="_blank" rel="noreferrer">
        Lịch sử
      </a>
      <button style={btn} disabled={busy} onClick={() => onSave(appState.data, false)}>
        Lưu nháp
      </button>
      <button style={canPublish ? primary : { ...btn, opacity: 0.5, cursor: 'not-allowed' }} disabled={busy || !canPublish} title={canPublish ? '' : 'Chỉ quản trị viên và người xuất bản được xuất bản'} onClick={() => onSave(appState.data, true)}>
        Xuất bản
      </button>
    </div>
  )
}

export function Editor(props: Props) {
  setLocale(props.locale, props.defaultLocale) // chuỗi giao diện trong khung xem trước theo ngôn ngữ đang chỉnh
  const [status, setStatus] = useState(props.collection === 'area' ? 'Vùng giao diện' : props.status === 'published' ? 'Đã xuất bản' : 'Bản nháp')
  const [busy, setBusy] = useState(false)
  const [dirty, setDirty] = useState(false)
  const dataRef = useRef<unknown>(props.data)
  const savedJson = useRef(JSON.stringify(props.data ?? null))
  const isArea = props.collection === 'area'

  // Khóa sửa mềm: nếu người khác đang sửa cùng trang/ngôn ngữ thì chặn lưu để không ghi đè lẫn nhau (có thể tiếp quản).
  const lockKey = `${props.collection}:${props.id}:${props.locale}`
  const [lockedBy, setLockedBy] = useState('')
  const lock = (extra: Record<string, unknown> = {}) =>
    fetch('/api/site/lock', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: lockKey, ...extra }) })
      .then((r) => r.json())
      .catch(() => ({ ok: true }))
  useEffect(() => {
    let alive = true
    const beat = async () => {
      const j = await lock()
      if (alive) setLockedBy(j.ok ? '' : String(j.holder))
    }
    beat()
    const timer = setInterval(beat, 25000)
    const release = () => navigator.sendBeacon('/api/site/lock', new Blob([JSON.stringify({ key: lockKey, release: true })], { type: 'application/json' }))
    window.addEventListener('pagehide', release)
    return () => {
      alive = false
      clearInterval(timer)
      window.removeEventListener('pagehide', release)
      release()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockKey])

  const persist = async (data: unknown, publish: boolean, auto = false) => {
    if (lockedBy) {
      setStatus(`Đang bị khóa: ${lockedBy} đang sửa`)
      return
    }
    setBusy(true)
    setStatus(auto ? 'Đang tự lưu…' : 'Đang lưu…')
    const res = isArea
      ? await fetch(`/api/globals/site-areas?locale=${props.locale}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [props.id]: data }) })
      : await fetch(`/api/${props.collection}/${props.id}${publish ? `?locale=${props.locale}` : `?draft=true${auto ? '&autosave=true' : ''}&locale=${props.locale}`}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: data, _status: publish ? 'published' : 'draft' }),
        })
    const body = await res.json().catch(() => ({}))
    if (res.ok) {
      savedJson.current = JSON.stringify(data)
      setDirty(JSON.stringify(dataRef.current) !== savedJson.current)
      setStatus(isArea ? 'Đã lưu' : publish ? 'Đã xuất bản' : auto ? 'Đã tự lưu nháp' : 'Đã lưu nháp')
    } else {
      setStatus(`Lỗi: ${body?.errors?.[0]?.message ?? res.status}`)
    }
    setBusy(false)
  }

  // Tự lưu nháp 4 giây sau thay đổi cuối (không áp dụng cho vùng giao diện vì lưu là hiển thị ngay); cảnh báo khi rời trang chưa lưu.
  useEffect(() => {
    if (isArea || !dirty || busy || lockedBy) return
    const t = setTimeout(() => persist(dataRef.current, false, true), 4000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, busy, status, lockedBy])
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const theme = hosso.themes.find((t) => t.manifest.name === props.themeName) ?? hosso.themes[0]
  const schemas = useMemo(() => [...coreBlocks, ...hosso.plugins.flatMap((p) => p.blocks ?? [])], [])
  const config = useMemo(() => {
    const known = new Set(schemas.map((s) => s.type))
    const extraTypes = (props.data?.content ?? []).map((c: { type: string }) => c.type).filter((t: string) => !known.has(t))
    const built = buildPuckConfig({ schemas, theme, plugins: hosso.plugins, mode: 'editor', extraTypes })
    const liveTypes = [...CORE_LOADER_TYPES, ...hosso.plugins.flatMap((p) => Object.keys(p.loaders ?? {}))]
    for (const type of liveTypes) {
      const c = built.components[type]
      if (c) c.render = withLiveData(type, c.render, props.locale)
    }
    // Khung gốc giống site công khai (class .hs-theme + biến font) để xem trước khớp bản thật.
    const Header = theme.layout?.Header
    const Footer = theme.layout?.Footer
    const slots = hosso.plugins.map((p, i) => (p.headerSlot ? React.createElement(p.headerSlot, { key: i }) : null)).filter(Boolean)
    return {
      ...built,
      root: {
        fields: {},
        render: ({ children }: { children: React.ReactNode }) => (
          <LocaleProvider locale={props.locale} defaultLocale={props.defaultLocale}>
            <div className={`hs-theme ${props.fontClass}`}>
              {Header && <Header chrome={props.chrome} actions={slots.length ? slots : undefined} />}
              <main>{children}</main>
              {Footer && <Footer chrome={props.chrome} />}
            </div>
          </LocaleProvider>
        ),
      },
    }
  }, [schemas, theme, props.data, props.fontClass, props.chrome, props.locale, props.defaultLocale])

  return (
    <>
      {/* Puck sao chép style của trang chủ vào iframe xem trước (syncHostStyles). */}
      <style>{props.css}</style>
      {lockedBy && (
        <div role="alert" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 99999, background: '#b45309', color: '#fff', padding: '10px 16px', display: 'flex', gap: 12, alignItems: 'center', font: '14px Arial, sans-serif' }}>
          <span>
            <strong>{lockedBy}</strong> đang sửa trang này. Bạn chỉ xem được; lưu bị chặn để tránh ghi đè.
          </span>
          <button
            style={{ marginLeft: 'auto', border: 0, borderRadius: 4, padding: '6px 12px', fontWeight: 700, cursor: 'pointer' }}
            onClick={async () => {
              if (!window.confirm(`Tiếp quản? Thay đổi chưa lưu của ${lockedBy} có thể bị ghi đè.`)) return
              const j = await lock({ takeover: true })
              if (j.ok) setLockedBy('')
            }}
          >
            Tiếp quản
          </button>
        </div>
      )}
      <Puck
        config={config as any}
        data={props.data}
        headerTitle={`${props.title} · ${status}${dirty && !busy ? ' · chưa lưu' : ''}`}
        headerPath={props.publicHref}
        onChange={(d) => {
          dataRef.current = d
          setDirty(JSON.stringify(d) !== savedJson.current)
        }}
        viewports={[
          { width: 1280, height: 'auto', label: 'Máy tính', icon: 'Monitor' },
          { width: 768, height: 'auto', label: 'Máy tính bảng', icon: 'Tablet' },
          { width: 360, height: 'auto', label: 'Điện thoại', icon: 'Smartphone' },
        ]}
        iframe={{ enabled: true, syncHostStyles: true }}
        overrides={{
          headerActions: () => (
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <LocaleSwitch id={props.id} collection={props.collection} locale={props.locale} defaultLocale={props.defaultLocale} locales={props.locales} />
              {!isArea && <PageTools id={props.id} title={props.title} slug={props.slug} collection={props.collection} locale={props.locale} defaultLocale={props.defaultLocale} />}
              <Actions id={props.id} collection={props.collection} publicHref={props.publicHref} canPublish={props.canPublish} busy={busy} locale={props.locale} onSave={(d, publish) => persist(d, publish)} />
            </div>
          ),
        }}
      />
    </>
  )
}
