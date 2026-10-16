'use client'
import hosso from '@hosso-config'
import { CORE_LOADER_TYPES, buildPuckConfig, coreBlocks, type SiteChrome } from '@hosso/studio-blocks'
import { Puck, usePuck } from '@puckeditor/core'
import '@puckeditor/core/puck.css'
import React, { useEffect, useMemo, useRef, useState } from 'react'

import { loadBlockData } from './actions'

type Props = {
  collection: 'pages' | 'posts'
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
}

/** Bọc renderer của block có loader: lấy dữ liệu thật qua server action rồi mới hiển thị. */
function withLiveData(type: string, Render: React.ComponentType<any>) {
  return function Live(props: Record<string, any>) {
    const [data, setData] = useState<unknown>(undefined)
    const key = JSON.stringify({ ...props, puck: undefined })
    useEffect(() => {
      let on = true
      const t = setTimeout(() => loadBlockData(type, props).then((d) => on && setData(d)), 300)
      return () => {
        on = false
        clearTimeout(t)
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key])
    return <Render {...props} data={data ?? { status: 'loading' }} />
  }
}

const slugify = (v: string) =>
  v
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9/]+/g, '-')
    .replace(/^-+|-+$/g, '')

const field: React.CSSProperties = { display: 'grid', gap: 4, fontSize: 13 }
const input: React.CSSProperties = { padding: 8, border: '1px solid #c9ccd1', borderRadius: 4, font: 'inherit' }

/** Danh sách trang, tạo trang mới, đổi tên/đường dẫn: làm ngay trong trình dựng. */
function PageTools({ id, title, slug, collection }: Pick<Props, 'id' | 'title' | 'slug' | 'collection'>) {
  const noun = collection === 'posts' ? 'bài viết' : 'trang'
  const [pages, setPages] = useState<{ id: string | number; title: string; slug: string }[]>([])
  const [mode, setMode] = useState<'' | 'new' | 'edit'>('')
  const [error, setError] = useState('')
  const [form, setForm] = useState({ title: '', slug: '', description: '' })

  useEffect(() => {
    fetch(`/api/${collection}?limit=100&depth=0&sort=title&draft=true`)
      .then((r) => r.json())
      .then((j) => setPages(j.docs ?? []))
      .catch(() => {})
  }, [])

  const open = (m: 'new' | 'edit') => {
    setError('')
    setForm(m === 'edit' ? { title, slug, description: '' } : { title: '', slug: '', description: '' })
    setMode(m)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const body = { title: form.title.trim(), slug: slugify(form.slug || form.title) }
    if (!body.title || !body.slug) return setError('Cần tiêu đề và đường dẫn')
    const res =
      mode === 'new'
        ? await fetch(`/api/${collection}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...body, _status: 'draft', content: { root: { props: {} }, content: [] } }),
          })
        : await fetch(`/api/${collection}/${id}?draft=true`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...body, _status: 'draft' }),
          })
    const j = await res.json().catch(() => ({}))
    if (!res.ok) return setError(j?.errors?.[0]?.message ?? 'Không lưu được (đường dẫn có thể đã tồn tại)')
    window.location.href = `/editor/${mode === 'new' ? j.doc.id : id}${collection === 'posts' ? '?c=posts' : ''}`
  }

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', position: 'relative' }}>
      <select
        aria-label={`Chuyển ${noun}`}
        value={id}
        onChange={(e) => (window.location.href = `/editor/${e.target.value}${collection === 'posts' ? '?c=posts' : ''}`)}
        style={{ ...input, padding: '7px 8px', maxWidth: 180 }}
      >
        {!pages.some((p) => String(p.id) === id) && <option value={id}>{title}</option>}
        {pages.map((p) => (
          <option key={p.id} value={p.id}>
            {p.title} ({p.slug})
          </option>
        ))}
      </select>
      <button type="button" style={{ ...input, cursor: 'pointer', background: '#fff' }} onClick={() => open('new')}>
        + {collection === 'posts' ? 'Bài mới' : 'Trang mới'}
      </button>
      <button type="button" style={{ ...input, cursor: 'pointer', background: '#fff' }} onClick={() => open('edit')}>
        Đổi tên / đường dẫn
      </button>
      {mode && (
        <form
          onSubmit={submit}
          style={{ position: 'absolute', top: '110%', left: 0, zIndex: 50, background: '#fff', border: '1px solid #c9ccd1', borderRadius: 6, padding: 14, display: 'grid', gap: 10, width: 300, boxShadow: '0 8px 24px rgba(0,0,0,.15)' }}
        >
          <strong>{mode === 'new' ? `Tạo ${noun} mới` : 'Đổi tên / đường dẫn'}</strong>
          <label style={field}>
            Tiêu đề
            <input style={input} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required autoFocus />
          </label>
          <label style={field}>
            Đường dẫn (để trống = tự tạo từ tiêu đề)
            <input style={input} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder={slugify(form.title) || 'gioi-thieu'} />
          </label>
          {mode === 'edit' && <span style={{ fontSize: 12, color: '#555' }}>Thay đổi được lưu nháp, có hiệu lực khi xuất bản.</span>}
          {error && <span style={{ color: '#b91c1c', fontSize: 13 }}>{error}</span>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" style={{ ...input, cursor: 'pointer', background: '#fff' }} onClick={() => setMode('')}>
              Hủy
            </button>
            <button type="submit" style={{ ...input, cursor: 'pointer', background: '#d71920', borderColor: '#d71920', color: '#fff', fontWeight: 600 }}>
              Lưu
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

function Actions({
  id,
  collection,
  publicHref,
  canPublish,
  busy,
  onSave,
}: Pick<Props, 'id' | 'collection' | 'publicHref' | 'canPublish'> & { busy: boolean; onSave: (data: unknown, publish: boolean) => void }) {
  const { appState } = usePuck()

  const btn: React.CSSProperties = { padding: '8px 14px', borderRadius: 4, border: '1px solid #ccc', background: '#fff', cursor: 'pointer', font: 'inherit' }
  const primary: React.CSSProperties = { ...btn, background: '#d71920', borderColor: '#d71920', color: '#fff', fontWeight: 600 }
  const href = publicHref
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <a style={{ ...btn, textDecoration: 'none', color: 'inherit' }} href={`${href}?preview=1`} target="_blank" rel="noreferrer">
        Xem trước
      </a>
      <a style={{ ...btn, textDecoration: 'none', color: 'inherit' }} href={`/admin/collections/${collection}/${id}/versions`} target="_blank" rel="noreferrer">
        Lịch sử
      </a>
      <button style={btn} disabled={busy} onClick={() => onSave(appState.data, false)}>
        Lưu nháp
      </button>
      <button
        style={canPublish ? primary : { ...btn, opacity: 0.5, cursor: 'not-allowed' }}
        disabled={busy || !canPublish}
        title={canPublish ? '' : 'Chỉ quản trị viên được xuất bản'}
        onClick={() => onSave(appState.data, true)}
      >
        Xuất bản
      </button>
    </div>
  )
}

export function Editor(props: Props) {
  const [status, setStatus] = useState(props.status === 'published' ? 'Đã xuất bản' : 'Bản nháp')
  const [busy, setBusy] = useState(false)
  const [dirty, setDirty] = useState(false)
  const dataRef = useRef<unknown>(props.data)
  const savedJson = useRef(JSON.stringify(props.data ?? null))

  const persist = async (data: unknown, publish: boolean, auto = false) => {
    setBusy(true)
    setStatus(auto ? 'Đang tự lưu…' : 'Đang lưu…')
    const query = publish ? '' : auto ? '?draft=true&autosave=true' : '?draft=true'
    const res = await fetch(`/api/${props.collection}/${props.id}${query}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: data, _status: publish ? 'published' : 'draft' }),
    })
    const body = await res.json().catch(() => ({}))
    if (res.ok) {
      savedJson.current = JSON.stringify(data)
      setDirty(JSON.stringify(dataRef.current) !== savedJson.current)
      setStatus(publish ? 'Đã xuất bản' : auto ? 'Đã tự lưu nháp' : 'Đã lưu nháp')
    } else {
      setStatus(`Lỗi: ${body?.errors?.[0]?.message ?? res.status}`)
    }
    setBusy(false)
  }

  // Tự lưu nháp 4 giây sau thay đổi cuối; cảnh báo khi rời trang lúc còn thay đổi chưa lưu.
  useEffect(() => {
    if (!dirty || busy) return
    const t = setTimeout(() => persist(dataRef.current, false, true), 4000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, busy, status])
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
      if (c) c.render = withLiveData(type, c.render)
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
          <div className={`hs-theme ${props.fontClass}`}>
            {Header && <Header chrome={props.chrome} actions={slots.length ? slots : undefined} />}
            <main>{children}</main>
            {Footer && <Footer chrome={props.chrome} />}
          </div>
        ),
      },
    }
  }, [schemas, theme, props.data, props.fontClass, props.chrome])

  return (
    <>
      {/* Puck sao chép style của trang chủ vào iframe xem trước (syncHostStyles). */}
      <style>{props.css}</style>
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
          { width: 360, height: 'auto', label: 'Điện thoại', icon: 'Smartphone' },
          { width: 768, height: 'auto', label: 'Máy tính bảng', icon: 'Tablet' },
          { width: 1280, height: 'auto', label: 'Máy tính', icon: 'Monitor' },
        ]}
        iframe={{ enabled: true, syncHostStyles: true }}
        overrides={{
          headerActions: () => (
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <PageTools id={props.id} title={props.title} slug={props.slug} collection={props.collection} />
              <Actions id={props.id} collection={props.collection} publicHref={props.publicHref} canPublish={props.canPublish} busy={busy} onSave={(d, publish) => persist(d, publish)} />
            </div>
          ),
        }}
      />
    </>
  )
}
