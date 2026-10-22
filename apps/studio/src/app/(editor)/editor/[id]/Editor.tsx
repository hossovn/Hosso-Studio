'use client'
import hosso from '@hosso-config'
import { AdminLangProvider, CORE_LOADER_TYPES, trLabel, LocaleProvider, buildPuckConfig, coreBlocks, patterns, setLocale, type SiteChrome } from '@hosso/studio-blocks'
import { ActionBar, usePuck } from '@puckeditor/core'
import dynamic from 'next/dynamic'
import { buildBlockPlugins } from './BlockPanels'
import { CanvasApp, CanvasBoundary } from './CanvasApp'
import { useInsertSection, withFreeLayer } from './FreeCanvasEditor'
import '@puckeditor/core/puck.css'
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/500.css'
import '@fontsource/roboto/700.css'
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'

import { makeT, type AdminLang, type AdminT } from '@/lib/admin-i18n'

import { withLiveData } from '@/components/admin/live-data'
import { EditorPreviewProvider, type EditorPreview } from '@hosso/studio-blocks'
import { EditorPreviewControls } from '@/components/admin/EditorPreviewControls'

type Kind = 'pages' | 'posts' | 'reusable-blocks' | 'area'
// Puck's iframe/browser state cannot be reproduced during server rendering.
const Puck = dynamic(() => import('@puckeditor/core').then((m) => m.Puck), { ssr: false })

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
  lang: AdminLang
  /** Header/footer tự dựng của site (vùng siteHeader/siteFooter) để hiện trong trang đang sửa; null nếu dùng của theme. */
  chromeAreas?: { header: any | null; footer: any | null }
  /** Địa chỉ quay lại khi đang sửa vùng dùng chung (từ trang nào mở sang). */
  from?: string
  /** 'canvas' (mặc định): editor Page → Section → Component; 'puck': editor cũ theo block. */
  mode?: 'canvas' | 'puck'
}

// Dịch chuỗi giao diện trình dựng theo ngôn ngữ admin (props.lang); các thành phần con lấy qua context.
const pluginEn: Record<string, string> = Object.assign({}, ...hosso.plugins.map((p) => p.adminEn ?? {}))
const TContext = createContext<AdminT>(makeT('vi'))
const useET = () => useContext(TContext)

const GB_CSS = `.gb:hover{outline:2px dashed #15803d;outline-offset:-2px}.gb-chip{position:absolute;left:8px;top:8px;z-index:60;padding:6px 10px;border-radius:8px;background:#15803d;color:#fff!important;font:600 12px Arial,sans-serif;text-decoration:none;opacity:0;transition:opacity .15s;pointer-events:none}.gb:hover .gb-chip{opacity:1;pointer-events:auto}`
/** Dải header/footer dùng chung trong trang đang sửa: rê chuột hiện nhãn, bấm để mở trình sửa của chính nó. */
function GlobalBand({ label, href, children }: { label: string; href: string; children: React.ReactNode }) {
  return (
    <div className="gb" style={{ position: 'relative' }}>
      <style>{GB_CSS}</style>
      {children}
      <a className="gb-chip" href={href} target="_top">{label}</a>
    </div>
  )
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
  const T = useET()
  if (locales.length < 2) return null
  return (
    <select aria-label={T('Ngôn ngữ đang chỉnh')} value={locale} onChange={(e) => (window.location.href = editorUrl(id, collection, e.target.value, defaultLocale))} style={{ ...input, padding: '7px 8px' }}>
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
  const T = useET()
  const noun = T(NOUN[collection])
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
    if (!body.title || !body.slug) return setError(T('Cần tiêu đề và đường dẫn'))
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
    if (!res.ok) return setError(j?.errors?.[0]?.message ?? T('Không lưu được (đường dẫn có thể đã tồn tại)'))
    window.location.href = editorUrl(mode === 'new' ? j.doc.id : id, collection, locale, defaultLocale)
  }

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', position: 'relative' }}>
      <select aria-label={T('Chuyển {noun}', { noun })} value={id} onChange={(e) => (window.location.href = editorUrl(e.target.value, collection, locale, defaultLocale))} style={{ ...input, padding: '7px 8px', maxWidth: 180 }}>
        {!pages.some((p) => String(p.id) === id) && <option value={id}>{title}</option>}
        {pages.map((p) => (
          <option key={p.id} value={p.id}>
            {p.title} ({p.slug})
          </option>
        ))}
      </select>
      <button type="button" style={plain} onClick={() => open('new')}>
        + {T(NEW_LABEL[collection])}
      </button>
      <button type="button" style={plain} onClick={() => open('edit')}>
        {T('Đổi tên / đường dẫn')}
      </button>
      {mode && (
        <form onSubmit={submit} style={{ position: 'absolute', top: '110%', left: 0, zIndex: 50, background: '#fff', border: '1px solid #c9ccd1', borderRadius: 6, padding: 14, display: 'grid', gap: 10, width: 300, boxShadow: '0 8px 24px rgba(0,0,0,.15)' }}>
          <strong>{mode === 'new' ? T('Tạo {noun} mới', { noun }) : T('Đổi tên / đường dẫn')}</strong>
          <label style={field}>
            {T('Tiêu đề')} {locale !== defaultLocale && `(${locale})`}
            <input style={input} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required autoFocus />
          </label>
          <label style={field}>
            {T('Đường dẫn (dùng chung mọi ngôn ngữ; để trống = tự tạo từ tiêu đề)')}
            <input style={input} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder={slugify(form.title) || 'gioi-thieu'} />
          </label>
          {mode === 'edit' && <span style={{ fontSize: 12, color: '#555' }}>{T('Thay đổi được lưu nháp, có hiệu lực khi xuất bản.')}</span>}
          {error && <span style={{ color: '#b91c1c', fontSize: 13 }}>{error}</span>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" style={plain} onClick={() => setMode('')}>
              {T('Hủy')}
            </button>
            <button type="submit" style={{ ...plain, background: '#15803d', borderColor: '#15803d', color: '#fff', fontWeight: 600 }}>
              {T('Lưu')}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

/** Chèn một mẫu khối (dãy khối điền sẵn) vào cuối trang. */
function PatternPicker({ lang }: { lang: string }) {
  const T = useET()
  const { appState, dispatch } = usePuck()
  const en = lang === 'en'
  return (
    <select
      aria-label={T('Thêm mẫu khối')}
      value=""
      style={{ padding: '8px 10px', borderRadius: 4, border: '1px solid #ccc', background: '#fff', font: 'inherit', cursor: 'pointer' }}
      onChange={(e) => {
        const p = patterns.find((x) => x.id === e.target.value)
        if (!p) return
        const stamp = Math.random().toString(36).slice(2, 6)
        const added = p.blocks.map((b, i) => ({ type: b.type, props: { ...b.props, id: `${b.type}-${stamp}${i}` } }))
        dispatch({ type: 'setData', data: { ...appState.data, content: [...(appState.data.content ?? []), ...added] } } as any)
      }}
    >
      <option value="">{T('+ Thêm mẫu…')}</option>
      {patterns.map((p) => (
        <option key={p.id} value={p.id}>
          {en ? p.en : p.label}
        </option>
      ))}
    </select>
  )
}

function Actions(p: Pick<Props, 'id' | 'collection' | 'publicHref' | 'canPublish' | 'locale'> & { busy: boolean; onSave: (data: unknown, publish: boolean) => void }) {
  const { appState } = usePuck()
  return <ActionsView {...p} getData={() => appState.data} />
}

function ActionsView({ id, collection, publicHref, canPublish, busy, locale, onSave, getData }: Pick<Props, 'id' | 'collection' | 'publicHref' | 'canPublish' | 'locale'> & { busy: boolean; onSave: (data: unknown, publish: boolean) => void; getData: () => unknown }) {
  const T = useET()
  const Ic = ({ d }: { d: string }) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>

  if (collection === 'area') {
    // Vùng giao diện không có bản nháp: lưu là hiển thị ngay trên site.
    return (
      <div className="cv-document-actions" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <a className="cv-act" href={publicHref} target="_blank" rel="noreferrer">
          <Ic d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
          {T('Xem site')}
        </a>
        <button className="cv-act is-primary" disabled={busy || !canPublish} title={canPublish ? T('Lưu và hiển thị ngay trên site') : T('Chỉ quản trị viên và người xuất bản được lưu')} onClick={() => onSave(getData(), true)}>
          {T('Lưu (hiển thị ngay)')}
        </button>
      </div>
    )
  }
  return (
    <div className="cv-document-actions" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      {collection !== 'reusable-blocks' && (
        <a className="cv-act" href={`${publicHref}${publicHref.includes('?') ? '&' : '?'}preview=1`} target="_blank" rel="noreferrer">
          <Ic d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
          {T('Xem trước')}
        </a>
      )}
      <a className="cv-act" href={`/admin/collections/${collection}/${id}/versions?locale=${locale}`} target="_blank" rel="noreferrer">
        <Ic d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2" />
        {T('Lịch sử')}
      </a>
      <button className="cv-act" disabled={busy} onClick={() => onSave(getData(), false)}>
        <Ic d="M5 4h11l3 3v13H5zM8 4v5h7V4M8 20v-6h8v6" />
        {T('Lưu nháp')}
      </button>
      <button className="cv-act is-primary" disabled={busy || !canPublish} title={canPublish ? '' : T('Chỉ quản trị viên và người xuất bản được xuất bản')} onClick={() => onSave(getData(), true)}>
        {T('Xuất bản')}
      </button>
    </div>
  )
}

/** Nhóm nút style nhanh trên thanh nổi của khối đang chọn (kiểu Canva): màu nền, căn lề, khoảng cách, bo góc. Ghi vào các key _* sẵn có. */
function StyleBar() {
  const T = useET()
  const { selectedItem, appState, dispatch } = usePuck()
  const insertSection = useInsertSection()
  const sel = appState.ui.itemSelector
  if (!selectedItem || !sel) return null
  const props = selectedItem.props as Record<string, any>
  const set = (patch: Record<string, unknown>) =>
    dispatch({ type: 'replace', destinationIndex: sel.index, destinationZone: sel.zone ?? 'default-zone', data: { ...selectedItem, props: { ...props, ...patch } } } as any)
  const swatches = ['', '#ffffff', '#f3f4f6', '#111827', hosso.brand.color]
  const spaces: [string, string, string][] = [['Nhỏ', 'sm', 'S'], ['Vừa', 'md', 'M'], ['Lớn', 'lg', 'L']]
  const aligns: [string, string, string][] = [['Căn trái', 'left', '⇤'], ['Căn giữa', 'center', '↔'], ['Căn phải', 'right', '⇥']]
  const radius = props._rd === 'lg' ? '' : props._rd === 'md' ? 'lg' : 'md'
  return (
    <>
      <ActionBar.Separator />
      <ActionBar.Group>
        <ActionBar.Action label={T('Thêm phần bên dưới')} onClick={() => insertSection({ height: 400, els: [] })}>
          ＋
        </ActionBar.Action>
      </ActionBar.Group>
      <ActionBar.Separator />
      <ActionBar.Group>
        {swatches.map((c) => (
          <ActionBar.Action key={c || 'none'} label={c ? `${T('Màu nền')} ${c}` : T('Bỏ màu nền')} active={(props._bgHex ?? '') === c} onClick={() => set({ _bgHex: c })}>
            <span style={{ display: 'block', width: 14, height: 14, borderRadius: '50%', border: '1px solid #9ca3af', background: c || 'linear-gradient(135deg,#fff 45%,#15803d 46%,#15803d 54%,#fff 55%)' }} />
          </ActionBar.Action>
        ))}
      </ActionBar.Group>
      <ActionBar.Separator />
      <ActionBar.Group>
        {aligns.map(([label, v, icon]) => (
          <ActionBar.Action key={v} label={T(label)} active={props._align === v} onClick={() => set({ _align: props._align === v ? '' : v })}>
            {icon}
          </ActionBar.Action>
        ))}
      </ActionBar.Group>
      <ActionBar.Separator />
      <ActionBar.Group>
        {spaces.map(([label, v, icon]) => (
          <ActionBar.Action key={v} label={`${T('Khoảng cách')}: ${T(label)}`} active={props._pt === v && props._pb === v} onClick={() => set({ _pt: v, _pb: v })}>
            {icon}
          </ActionBar.Action>
        ))}
        <ActionBar.Action label={T('Bo góc')} active={Boolean(props._rd)} onClick={() => set({ _rd: radius })}>
          ◜
        </ActionBar.Action>
      </ActionBar.Group>
    </>
  )
}
const BRAND_CSS = `
.cv-act{display:inline-flex;align-items:center;gap:6px;height:38px;padding:0 14px;border:0;border-radius:10px;background:transparent;color:#374151;font:inherit;font-weight:600;white-space:nowrap;cursor:pointer;text-decoration:none;transition:background .15s}
.cv-act:hover:not(:disabled){background:#f1f3f5}
.cv-act.is-primary{background:var(--hosso-brand,#15803d);color:#fff;padding:0 20px;box-shadow:0 6px 14px -6px var(--hosso-brand,#15803d)}
.cv-act.is-primary:hover:not(:disabled){filter:brightness(1.07);background:var(--hosso-brand,#15803d)}
.cv-act:disabled{opacity:.5;cursor:not-allowed}
:root{--puck-color-interactive:var(--hosso-brand,#15803d);--puck-color-interactive-subtle:color-mix(in srgb,var(--hosso-brand,#15803d) 12%,#fff);--puck-pluginbar-color-text-selected:var(--hosso-brand,#15803d);--puck-radius-m:10px;--puck-radius-l:12px;--puck-actionbar-color-bg:#111827;--puck-color-border:#e5e7eb}
:root{--puck-font-family:'Roboto',system-ui,Arial,sans-serif}
:root{--puck-color-azure-04:var(--hosso-brand,#15803d);--puck-color-azure-05:var(--hosso-brand,#15803d);--puck-color-azure-06:var(--hosso-brand,#15803d)}
.he-more{position:relative}.he-more>summary{list-style:none;cursor:pointer;padding:8px 12px;border:1px solid #ccc;border-radius:6px;background:#fff;font-weight:700}
.he-more>summary::-webkit-details-marker{display:none}
.he-more[open]>div{position:absolute;right:0;top:calc(100% + 6px);z-index:50;display:grid;gap:10px;min-width:260px;padding:14px;background:#fff;border:1px solid #e5e7eb;border-radius:10px;box-shadow:0 12px 30px rgba(0,0,0,.15)}
[class*="_Drawer_"]{display:grid!important;grid-template-columns:1fr 1fr;gap:8px}
[class*="_PuckCanvas-root_"]{background:#eef0f3}
[class*="_PuckPreview-frame_"]{background:#fff;border-radius:8px;box-shadow:0 8px 30px rgba(0,0,0,.08)}
.he-card{display:grid;gap:8px;padding:8px;border:1px solid #e5e7eb;border-radius:12px;background:#fff;cursor:grab;font-size:12px;font-weight:600;text-align:center;color:#374151;transition:transform .18s cubic-bezier(.16,1,.3,1),box-shadow .18s,border-color .18s}
.he-card:hover{border-color:var(--hosso-brand,#15803d);transform:translateY(-2px);box-shadow:0 12px 24px -14px rgba(17,24,39,.4)}
.he-card:active{cursor:grabbing;transform:scale(.98)}
[class*="_Nav-list_"]{gap:2px!important;padding-top:10px!important;overflow-x:hidden!important}
[class*="_NavItem-link_"]{width:58px!important;margin:0 4px;padding:8px 2px!important;gap:3px!important;border:0!important;border-radius:12px!important;font-size:12px!important;line-height:1.25;font-weight:500;color:#4b5563;text-wrap:balance;transition:background .18s cubic-bezier(.16,1,.3,1),color .18s cubic-bezier(.16,1,.3,1)}
[class*="_NavItem-link_"]:hover{background:#f3f4f6;color:#111827}
[class*="_NavItem-linkIcon_"]{height:20px!important;width:20px!important}
[class*="_NavItem--active_"]>[class*="_NavItem-link_"]{background:color-mix(in srgb,var(--hosso-brand,#15803d) 10%,#fff)!important;color:var(--hosso-brand,#15803d)!important;font-weight:700;box-shadow:none}
[class*="_Drawer_"]{padding:2px}
@media (prefers-reduced-motion:reduce){.he-card,[class*="_NavItem-link_"]{transition:none}.he-card:hover{transform:none}}
.hf-el:hover{outline:1px solid color-mix(in srgb,var(--hosso-brand,#15803d) 55%,transparent)}
.he-title{margin:0 0 12px;font-size:15px;font-weight:700;letter-spacing:-.01em;color:#111827}
.he-search{width:100%;margin:0 0 12px;padding:9px 12px;border:1px solid #e5e7eb;border-radius:8px;font:inherit}
.he-search:focus{outline:2px solid var(--hosso-brand,#15803d);outline-offset:0}
.he-group{margin:18px 0 6px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;font-weight:700;border-top:1px solid #e5e7eb;padding-top:12px}
`

export function Editor(props: Props) {
  const canvasMode = props.mode !== 'puck'
  const [previewContext, setPreviewContext] = useState<EditorPreview>({ products: { shop: '', wim: '' }, account: 'guest' })
  const [previewOpen, setPreviewOpen] = useState(false)
  const previewSources = hosso.plugins.map((p) => p.id).filter((id): id is 'shop' | 'wim' => id === 'shop' || id === 'wim')
  const previewControls = <EditorPreviewControls value={previewContext} onChange={setPreviewContext} open={previewOpen} onOpenChange={setPreviewOpen} sources={previewSources} locale={props.locale} lang={props.lang} />
  const T = useMemo(() => makeT(props.lang), [props.lang])
  setLocale(props.locale, props.defaultLocale) // chuỗi giao diện trong khung xem trước theo ngôn ngữ đang chỉnh
  const [status, setStatus] = useState(props.collection === 'area' ? T('Vùng giao diện') : props.status === 'published' ? T('Đã xuất bản') : T('Bản nháp'))
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
      setStatus(T('Đang bị khóa: {who} đang sửa', { who: lockedBy }))
      return
    }
    setBusy(true)
    setStatus(auto ? T('Đang tự lưu…') : T('Đang lưu…'))
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
      setStatus(isArea ? T('Đã lưu') : publish ? T('Đã xuất bản') : auto ? T('Đã tự lưu nháp') : T('Đã lưu nháp'))
    } else {
      setStatus(`${T('Lỗi')}: ${body?.errors?.[0]?.message ?? res.status}`)
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

  // Khung xem trước (iframe) không có class font của <html> trang chủ nên biến --font-* không có giá trị: chép sang để chữ giống site thật.
  useEffect(() => {
    const sync = () => {
      const doc = document.querySelector('iframe')?.contentDocument
      if (!doc?.documentElement) return
      for (const c of props.fontClass.split(' ').filter(Boolean)) doc.documentElement.classList.add(c)
    }
    sync()
    const id = window.setInterval(sync, 1000)
    return () => window.clearInterval(id)
  }, [props.fontClass])

  const theme = hosso.themes.find((t) => t.manifest.name === props.themeName) ?? hosso.themes[0]
  const schemas = useMemo(() => [...coreBlocks, ...hosso.plugins.flatMap((p) => p.blocks ?? [])], [])
  const config = useMemo(() => {
    const known = new Set(schemas.map((s) => s.type))
    const extraTypes = (props.data?.content ?? []).map((c: { type: string }) => c.type).filter((t: string) => !known.has(t))
    const built = buildPuckConfig({ schemas, theme, plugins: hosso.plugins, mode: 'editor', extraTypes, label: (vi) => trLabel(props.lang, vi, pluginEn) })
    const liveTypes = [...CORE_LOADER_TYPES, ...hosso.plugins.flatMap((p) => Object.keys(p.loaders ?? {}))]
    for (const type of liveTypes) {
      const c = built.components[type]
      if (c) c.render = withLiveData(type, c.render, props.locale)
    }
    // Mọi block đều có lớp phần tử tự do chỉnh được phủ lên trên (kiểu Webcake: chữ, nút, hình đặt đè lên section).
    if (!canvasMode) for (const [type, c] of Object.entries(built.components)) (c as any).render = withFreeLayer((c as any).render, type)
    // Khung gốc giống site công khai (class .hs-theme + biến font) để xem trước khớp bản thật.
    const Header = theme.layout?.Header
    const Footer = theme.layout?.Footer
    const slots = hosso.plugins.map((p, i) => (p.headerSlot ? React.createElement(p.headerSlot, { key: i }) : null)).filter(Boolean)
    const selfHref = editorUrl(props.id, props.collection, props.locale, props.defaultLocale)
    const fromHref = props.collection === 'area' ? props.from ?? '' : selfHref
    const areaHref = (name: string) => `/editor/${name}?c=area${props.locale !== props.defaultLocale ? `&locale=${props.locale}` : ''}${fromHref ? `&from=${encodeURIComponent(fromHref)}` : ''}`
    const isChromeArea = props.collection === 'area' && (props.id === 'siteHeader' || props.id === 'siteFooter')
    const StaticBlocks = ({ data }: { data: any }) => (
      <>
        {(data?.content ?? []).map((b: any) => {
          const R = (built.components as any)[b.type]?.render
          return R ? <R key={b.props.id} {...b.props} /> : null
        })}
      </>
    )
    const hdrNode = props.chromeAreas?.header ? (
      <GlobalBand label="Header của site · bấm để sửa" href={areaHref('siteHeader')}><StaticBlocks data={props.chromeAreas.header} /></GlobalBand>
    ) : Header ? (
      <GlobalBand label="Header của theme · bấm để tạo header riêng" href={areaHref('siteHeader')}><Header chrome={props.chrome} actions={slots.length ? slots : undefined} /></GlobalBand>
    ) : null
    const ftrNode = props.chromeAreas?.footer ? (
      <GlobalBand label="Footer của site · bấm để sửa" href={areaHref('siteFooter')}><StaticBlocks data={props.chromeAreas.footer} /></GlobalBand>
    ) : Footer ? (
      <GlobalBand label="Footer của theme · bấm để tạo footer riêng" href={areaHref('siteFooter')}><Footer chrome={props.chrome} /></GlobalBand>
    ) : null
    const canvasRoot = ({ children }: { children: React.ReactNode }) => (
      <LocaleProvider locale={props.locale} defaultLocale={props.defaultLocale} preview>
        <div className={`hs-theme ${props.fontClass}`}>
          {!isChromeArea && hdrNode}
          <main>{children}</main>
          {!isChromeArea && ftrNode}
        </div>
      </LocaleProvider>
    )
    return {
      ...built,
      canvasRoot,
      root: {
        fields: {},
        render: ({ children }: { children: React.ReactNode }) => (
          <LocaleProvider locale={props.locale} defaultLocale={props.defaultLocale} preview>
            <div className={`hs-theme ${props.fontClass}`}>
              {Header && <Header chrome={props.chrome} actions={slots.length ? slots : undefined} />}
              <main>{children}</main>
              {Footer && <Footer chrome={props.chrome} />}
            </div>
          </LocaleProvider>
        ),
      },
    }
  }, [schemas, theme, props.lang, props.data, props.fontClass, props.chrome, props.locale, props.defaultLocale, props.chromeAreas, props.from])

  const plugins = useMemo(
    () => buildBlockPlugins(Object.keys((config as any).components), (type) => String((config as any).components[type]?.label ?? type), T, props.lang),
    [config, T],
  )

  const chromeKind = props.collection === 'area' && (props.id === 'siteHeader' || props.id === 'siteFooter') ? props.id : ''
  const selfUrl = editorUrl(props.id, props.collection, props.locale, props.defaultLocale)
  const fromUrl = props.collection === 'area' ? props.from ?? '' : selfUrl
  const areaUrl = (name: string) => `/editor/${name}?c=area${props.locale !== props.defaultLocale ? `&locale=${props.locale}` : ''}${fromUrl ? `&from=${encodeURIComponent(fromUrl)}` : ''}`
  const scopes = props.collection === 'pages' || chromeKind
    ? [
        { label: 'Trang', href: chromeKind ? props.from || '/admin/collections/pages' : selfUrl, active: !chromeKind },
        { label: 'Header', href: areaUrl('siteHeader'), active: chromeKind === 'siteHeader' },
        { label: 'Footer', href: areaUrl('siteFooter'), active: chromeKind === 'siteFooter' },
      ]
    : undefined
  const headerTitle = `${isArea ? T(props.title) : props.title} · ${status}${dirty && !busy ? ` · ${T('chưa lưu')}` : ''}`
  const puckHref = `${editorUrl(props.id, props.collection, props.locale, props.defaultLocale)}${editorUrl(props.id, props.collection, props.locale, props.defaultLocale).includes('?') ? '&' : '?'}v=puck`

  return (
    <EditorPreviewProvider value={previewContext}>
    <TContext.Provider value={T}>
    <AdminLangProvider lang={props.lang} extra={pluginEn}>
      {/* Puck sao chép style của trang chủ vào iframe xem trước (syncHostStyles). */}
      <style>{props.css}</style>
      <style>{BRAND_CSS}</style>
      {lockedBy && (
        <div role="alert" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 99999, background: '#b45309', color: '#fff', padding: '10px 16px', display: 'flex', gap: 12, alignItems: 'center', font: '14px Arial, sans-serif' }}>
          <span>
            <strong>{lockedBy}</strong> {T('đang sửa trang này. Bạn chỉ xem được; lưu bị chặn để tránh ghi đè.')}
          </span>
          <button
            style={{ marginLeft: 'auto', border: 0, borderRadius: 4, padding: '6px 12px', fontWeight: 700, cursor: 'pointer' }}
            onClick={async () => {
              if (!window.confirm(T('Tiếp quản? Thay đổi chưa lưu của {who} có thể bị ghi đè.', { who: lockedBy }))) return
              const j = await lock({ takeover: true })
              if (j.ok) setLockedBy('')
            }}
          >
            {T('Tiếp quản')}
          </button>
        </div>
      )}
      {canvasMode ? (
        <CanvasBoundary fallbackHref={puckHref}>
          <CanvasApp
            config={config}
            data={props.data}
            onChange={(d) => {
              dataRef.current = d
              setDirty(JSON.stringify(d) !== savedJson.current)
            }}
            css={props.css}
            htmlClass={props.fontClass}
            title={headerTitle}
            backHref={props.collection === 'area' && (props.id === 'siteHeader' || props.id === 'siteFooter') ? props.from || '/admin/globals/site-areas' : '/admin'}
            rootRender={(config as any).canvasRoot}
            areaKind={props.collection === 'area' ? (props.id === 'siteHeader' ? 'header' : props.id === 'siteFooter' ? 'footer' : '') : ''}
            siteCtx={{ siteName: props.chrome.siteName, logo: props.chrome.logoUrl, announcement: props.chrome.announcement, menu: props.chrome.headerMenu, footerMenu: props.chrome.footerMenu, contact: props.chrome.contact }}
            nav={{ id: props.id, collection: props.collection, locale: props.locale, defaultLocale: props.defaultLocale }}
            scopes={scopes}
            labelOf={(type) => String((config as any).components[type]?.label ?? type)}
            lang={props.lang}
            menu={
              <details className="he-more">
                <summary aria-label={T('Thêm công cụ')}>⋯</summary>
                <div>
                  <LocaleSwitch id={props.id} collection={props.collection} locale={props.locale} defaultLocale={props.defaultLocale} locales={props.locales} />
                  {!isArea && <PageTools id={props.id} title={props.title} slug={props.slug} collection={props.collection} locale={props.locale} defaultLocale={props.defaultLocale} />}
                  <a href={puckHref} style={{ fontSize: 13 }}>Mở bằng editor cũ (theo block)</a>
                </div>
              </details>
            }
            actions={<>{previewControls}<ActionsView id={props.id} collection={props.collection} publicHref={props.publicHref} canPublish={props.canPublish} busy={busy} locale={props.locale} onSave={(d, publish) => persist(d, publish)} getData={() => dataRef.current} /></>}
          />
        </CanvasBoundary>
      ) : (
      <Puck
        config={config as any}
        data={props.data}
        headerTitle={headerTitle}
        headerPath={props.publicHref}
        onChange={(d) => {
          dataRef.current = d
          setDirty(JSON.stringify(d) !== savedJson.current)
        }}
        viewports={[
          { width: 1280, height: 'auto', label: T('Máy tính'), icon: 'Monitor' },
          { width: 768, height: 'auto', label: T('Máy tính bảng'), icon: 'Tablet' },
          { width: 360, height: 'auto', label: T('Điện thoại'), icon: 'Smartphone' },
        ]}
        iframe={{ enabled: true, syncHostStyles: true }}
        plugins={plugins}
        overrides={{
          actionBar: ({ label, children, parentAction }) => (
            <ActionBar label={label}>
              <ActionBar.Group>{parentAction}</ActionBar.Group>
              <ActionBar.Group>{children}</ActionBar.Group>
              <StyleBar />
            </ActionBar>
          ),
          headerActions: () => (
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {previewControls}
              <details className="he-more">
                <summary aria-label={T('Thêm công cụ')}>⋯</summary>
                <div>
                  <LocaleSwitch id={props.id} collection={props.collection} locale={props.locale} defaultLocale={props.defaultLocale} locales={props.locales} />
                  {!isArea && <PatternPicker lang={props.lang} />}
                  {!isArea && <PageTools id={props.id} title={props.title} slug={props.slug} collection={props.collection} locale={props.locale} defaultLocale={props.defaultLocale} />}
                </div>
              </details>
              <Actions id={props.id} collection={props.collection} publicHref={props.publicHref} canPublish={props.canPublish} busy={busy} locale={props.locale} onSave={(d, publish) => persist(d, publish)} />
            </div>
          ),
        }}
      />
      )}
    </AdminLangProvider>
    </TContext.Provider>
    </EditorPreviewProvider>
  )
}
