'use client'
import React, { useEffect, useState } from 'react'
import { BookmarkPlus, Clock3, Copy, ExternalLink, RotateCcw, Save, Trash2 } from 'lucide-react'
import { DEVICE_WIDTH, pageForDevice, resetDeviceLayout, stackDeviceSection, type CanvasDevice } from '@hosso/studio-blocks'
import { cloneBlock, blockId, elsOf, floatOf, type Hist, type PageData, type Sel } from './canvas-model'
import { describeChange } from './editor-tools'
import type { NavCtx } from './SitePanels'
import { normalizeBreakpoints, layoutWidth, type LayoutDevice } from '../../../../../../../packages/blocks/src/responsive-breakpoints'

type Snapshot = { id: string; name: string; date: string; data: PageData }
const validPage = (data: unknown): data is PageData => Boolean(data && typeof data === 'object' && Array.isArray((data as PageData).content))

export function HistoryPanel({ hist, onJump, onRestore, storageKey, nav }: { hist: Hist; onJump: (index: number) => void; onRestore: (data: PageData) => void; storageKey: string; nav?: NavCtx }) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  useEffect(() => {
    try { const saved = JSON.parse(localStorage.getItem(storageKey) || '[]'); if (Array.isArray(saved)) setSnapshots(saved.filter((item) => item?.id && typeof item.name === 'string' && validPage(item.data)).slice(0, 12)) } catch { setMessage('Không đọc được snapshot trên trình duyệt này.') }
  }, [storageKey])
  const persist = (next: Snapshot[]) => {
    try { localStorage.setItem(storageKey, JSON.stringify(next)); setSnapshots(next); setMessage('') }
    catch { setMessage('Bộ nhớ trình duyệt đã đầy. Hãy xóa snapshot cũ hoặc dùng lịch sử trên máy chủ.') }
  }
  const entries = [...hist.past, hist.present, ...hist.future]
  return <div className="cv-workbench-panel">
    <p className="cv-tool-help">Lịch sử thao tác của phiên hiện tại. Tự lưu nháp và lịch sử phiên bản trên máy chủ vẫn hoạt động.</p>
    <h3 className="cv-catalog-heading"><Clock3 size={15} />Các bước chỉnh sửa <span>{entries.length}</span></h3>
    <ol className="cv-history-list">{entries.map((entry, index) => <li key={index}><button type="button" aria-current={index === hist.past.length ? 'step' : undefined} onClick={() => onJump(index)}><span>{index + 1}</span><strong>{describeChange(entries[index - 1], entry)}</strong>{index === hist.past.length && <small>Hiện tại</small>}</button></li>).reverse()}</ol>
    <h3 className="cv-catalog-heading"><Save size={15} />Snapshot trên máy này <span>{snapshots.length}/12</span></h3>
    <form className="cv-tool-inline" onSubmit={(event) => { event.preventDefault(); persist([{ id: crypto.randomUUID(), name: name.trim() || `Snapshot ${snapshots.length + 1}`, date: new Date().toISOString(), data: structuredClone(hist.present) }, ...snapshots].slice(0, 12)); setName('') }}><input aria-label="Tên snapshot" placeholder="Tên bản lưu, ví dụ: trước khi sửa hero" value={name} maxLength={100} onChange={(event) => setName(event.target.value)} /><button type="submit" title="Lưu snapshot"><Save size={16} /></button></form>
    {message && <p role="alert" className="cv-tool-error">{message}</p>}
    {!snapshots.length && <p className="cv-tool-help">Lưu một mốc để quay lại khi thử bố cục khác.</p>}
    {snapshots.map((snapshot) => <article key={snapshot.id} className="cv-saved-row"><div><strong>{snapshot.name}</strong><small>{new Date(snapshot.date).toLocaleString()}</small></div><button type="button" title="Khôi phục snapshot" onClick={() => { onRestore(structuredClone(snapshot.data)); setMessage('Đã khôi phục. Có thể hoàn tác bằng Ctrl+Z.') }}><RotateCcw size={15} /></button><button type="button" title="Xóa snapshot trên máy này" onClick={() => persist(snapshots.filter((item) => item.id !== snapshot.id))}><Trash2 size={15} /></button></article>)}
    {nav && <a className="cv-tool-button" href={nav.collection === 'area' ? '/admin/releases' : `/admin/collections/${nav.collection}/${nav.id}/versions?locale=${nav.locale}`} target="_blank" rel="noreferrer"><ExternalLink size={14} />Lịch sử phiên bản trên máy chủ</a>}
  </div>
}

export function ResponsivePanel({ data, device, layout = device, width = DEVICE_WIDTH[device], onWidth, onLayout, setDevice, sel, setSel, commit }: { data: PageData; device: CanvasDevice; layout?: LayoutDevice; width?: number; onWidth?: (width: number) => void; onLayout?: (key: LayoutDevice) => void; setDevice: (device: CanvasDevice) => void; sel: Sel; setSel: (sel: Sel) => void; commit: (data: PageData) => void }) {
  const [customWidth, setCustomWidth] = useState(900)
  const points = normalizeBreakpoints(data.root?.props?._breakpoints)
  const resolved = pageForDevice(data, layout)
  const errors = resolved.content.flatMap((block) => elsOf(block).filter((el) => !el.props._hidden && el.props._hide !== ({ desktop: 'd', tablet: 't', mobile: 'm' }[device]) && (el.x < 0 || el.x + el.w > 1201 || el.y < 0 || (block.type === 'FreeCanvas' && Number(block.props.height) > 0 && el.y + el.h > Number(block.props.height) + 1))).map((el) => ({ block: blockId(block), el })))
  const floatErrors = floatOf(resolved).filter((el) => !el.props._hidden && el.props._hide !== ({ desktop: 'd', tablet: 't', mobile: 'm' }[device]) && (el.x < 0 || el.x + el.w > 1201 || el.y < 0)).map((el) => ({ block: '@page', el }))
  const issues = [...errors, ...floatErrors]
  const overrides = data.content.flatMap(elsOf).filter((el) => layout !== 'desktop' && el.responsive?.[layout as Exclude<LayoutDevice, 'desktop'>]).length
  return <div className="cv-workbench-panel">
    <div className="cv-tool-segments">{(['desktop', 'tablet', 'mobile'] as const).map((value) => <button type="button" key={value} aria-pressed={device === value} onClick={() => setDevice(value)}>{value === 'desktop' ? 'Desktop' : value === 'tablet' ? 'Tablet' : 'Mobile'}<small>{DEVICE_WIDTH[value]} px</small></button>)}</div>
    <label className="cv-tool-field">Chiều rộng xem trước · {width} px<input type="range" aria-label="Chiều rộng xem trước" min={320} max={1920} step={1} value={width} onChange={(e) => onWidth?.(Number(e.target.value))} /><input type="number" aria-label="Chiều rộng canvas" min={320} max={1920} value={width} onChange={(e) => onWidth?.(Number(e.target.value))} /></label>
    <h3 className="cv-catalog-heading">Breakpoint tùy chỉnh <span>{points.length}/8</span></h3>
    <p className="cv-tool-help">Mỗi breakpoint áp dụng từ mốc nhỏ hơn kế tiếp đến chiều rộng đã chọn. Bố cục riêng được dùng khi xuất bản.</p>
    <form className="cv-tool-inline" onSubmit={(e) => { e.preventDefault(); const next = normalizeBreakpoints([...points, { width: customWidth }]); if (next.length > 8 || next.length === points.length) return; commit({ ...data, root: { ...data.root, props: { ...data.root?.props, _breakpoints: next } } }); onWidth?.(customWidth); onLayout?.(`bp-${customWidth}`) }}><input type="number" aria-label="Chiều rộng breakpoint mới" min={320} max={1920} required value={customWidth} onChange={(e) => setCustomWidth(Number(e.target.value))} /><button type="submit" disabled={points.length >= 8 || [600, 1024].includes(customWidth)}>Thêm</button></form>
    {points.map((point) => <div className="cv-saved-row" key={point.id}><button type="button" aria-pressed={layout === point.id} onClick={() => { onWidth?.(point.width); onLayout?.(point.id) }}>{point.width} px</button><button type="button" aria-label={`Xóa breakpoint ${point.width}`} onClick={() => { const remove = (patch: any) => { const next = { ...patch }; delete next[point.id]; return next }; const clean = (els: any[]) => els.map((el) => ({ ...el, responsive: remove(el.responsive) })); commit({ ...data, root: { ...data.root, props: { ...data.root?.props, _breakpoints: points.filter((p) => p.id !== point.id), _float: clean(floatOf(data)) } }, content: data.content.map((block) => ({ ...block, props: { ...block.props, _responsive: remove(block.props._responsive), _els: clean(elsOf(block)) } })) }); if (layout === point.id) setDevice(device) }}><Trash2 size={14} /></button></div>)}
    <p className="cv-tool-help">Đang sửa bố cục: {layout.startsWith('bp-') ? `${layoutWidth(layout)} px` : layout}.</p>
    <p className="cv-tool-help">Vị trí, kích thước, font và khoảng cách được lưu riêng theo thiết bị. Nội dung chữ và liên kết dùng chung.</p>
    {layout !== 'desktop' && <>
      <p className="cv-tool-help">{overrides} phần tử có điều chỉnh riêng trên thiết bị này.</p>
      <button type="button" className="cv-tool-button is-primary" onClick={() => commit(data.content.reduce((next, block) => stackDeviceSection(next, blockId(block), layout), data))}>Tự xếp dọc toàn trang</button>
      {sel.block && <button type="button" className="cv-tool-button" onClick={() => commit(resetDeviceLayout(data, sel.block, layout, sel.el || undefined))}><RotateCcw size={14} />Bỏ điều chỉnh của mục đang chọn</button>}
    </>}
    <h3 className="cv-catalog-heading">Nội dung ngoài khung <span>{issues.length}</span></h3>
    {!issues.length && <p className="cv-tool-success" role="status">Không phát hiện phần tử tràn khung trên thiết bị này.</p>}
    {issues.map(({ block, el }) => <button type="button" key={el.id} className="cv-issue-row" onClick={() => setSel({ block, el: el.id })}><strong>{String(el.props._name || el.props.text || el.type).slice(0, 70)}</strong><small>{Math.round(el.x)}, {Math.round(el.y)} · {Math.round(el.w)} × {Math.round(el.h)}</small></button>)}
    <p className="cv-tool-help">Chọn cảnh báo để định vị phần tử. Chọn phần tử → Thuộc tính → Thiết bị để chỉnh ẩn/hiện.</p>
  </div>
}

type SavedSection = { id: string | number; title: string; slug: string; content?: PageData; _status?: string }
export function ReusableLibraryPanel({ data, sel, nav, onInsert, onLink }: { data: PageData; sel: Sel; nav?: NavCtx; onInsert: (blocks: PageData['content']) => void; onLink: (slug: string) => void }) {
  const [docs, setDocs] = useState<SavedSection[]>([])
  const [busy, setBusy] = useState(false)
  const [title, setTitle] = useState('')
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const block = data.content.find((item) => blockId(item) === sel.block)
  const load = async () => {
    setBusy(true); setError('')
    try { const res = await fetch(`/api/reusable-blocks?draft=true&limit=100&depth=0&locale=${nav?.locale ?? 'vi'}`); const value = await res.json(); if (!res.ok) throw new Error(value?.errors?.[0]?.message || 'Không tải được thư viện.'); setDocs(value.docs ?? []) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Không tải được thư viện.') }
    finally { setBusy(false) }
  }
  useEffect(() => { if (nav) load() }, [nav?.locale])
  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!block || !title.trim()) return
    setBusy(true); setError('')
    try {
      const slug = `${title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section'}-${crypto.randomUUID().slice(0, 8)}`
      const res = await fetch(`/api/reusable-blocks?locale=${nav?.locale ?? 'vi'}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: title.trim(), slug, _status: 'draft', content: { root: { props: {} }, content: [cloneBlock(block)] } }) })
      const value = await res.json(); if (!res.ok) throw new Error(value?.errors?.[0]?.message || 'Không lưu được mẫu.')
      setDocs((current) => [value.doc, ...current]); setTitle('')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không lưu được mẫu.') }
    finally { setBusy(false) }
  }
  return <div className="cv-workbench-panel">
    <h3 className="cv-catalog-heading"><BookmarkPlus size={16} />Lưu phần đang chọn</h3>
    <p className="cv-tool-help">Mẫu được lưu nháp trong kho dùng chung. Chèn bản sao để chỉnh độc lập hoặc liên kết để đồng bộ sau khi xuất bản mẫu.</p>
    <form className="cv-tool-inline" onSubmit={save}><input aria-label="Tên mẫu section" placeholder={block ? 'Tên mẫu section' : 'Chọn một section trước'} required disabled={!block || !nav} value={title} onChange={(event) => setTitle(event.target.value)} /><button type="submit" disabled={busy || !block || !nav || !title.trim()} title="Lưu mẫu"><Save size={16} /></button></form>
    {!nav && <p className="cv-tool-help">Mở một trang đã đăng nhập để lưu mẫu dùng chung.</p>}
    <input className="he-search" type="search" aria-label="Tìm mẫu đã lưu" placeholder="Tìm mẫu đã lưu…" value={query} onChange={(event) => setQuery(event.target.value)} />
    {busy && <p role="status" className="cv-tool-help">Đang tải…</p>}
    {error && <div className="cv-tool-error" role="alert">{error}<button type="button" onClick={load}>Thử lại</button></div>}
    {!busy && !docs.length && <p className="cv-tool-help">Chưa có mẫu đã lưu.</p>}
    {docs.filter((doc) => `${doc.title} ${doc.slug}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())).map((doc) => <article key={doc.id} className="cv-reusable-item"><strong>{doc.title}</strong><small>{doc._status === 'published' ? 'Đã xuất bản' : 'Bản nháp'}</small><div><button type="button" disabled={!validPage(doc.content)} onClick={() => { if (validPage(doc.content)) onInsert(doc.content.content.map(cloneBlock)) }}><Copy size={14} />Chèn bản sao</button><button type="button" disabled={nav?.collection === 'reusable-blocks' && String(doc.id) === nav.id} onClick={() => onLink(doc.slug)}>Liên kết</button><a href={`/editor/${doc.id}?c=reusable-blocks&locale=${nav?.locale ?? 'vi'}`} target="_blank" rel="noreferrer" title="Sửa mẫu"><ExternalLink size={14} /></a></div></article>)}
  </div>
}
