'use client'
import { ICON_CATS, makeElement, type FreeElement, type FreeType } from '@hosso/studio-blocks'
import { Type, MousePointer2, Square, GalleryHorizontal, Video, Image, PanelsTopLeft, LayoutTemplate, Shapes, ShoppingBag, TextCursorInput, Blocks, Library, Ellipsis, Layers as LayersIcon, Search, Plus, X, ChevronUp, ChevronDown, ChevronRight, Trash2 } from 'lucide-react'
import React, { useRef, useState } from 'react'

import { ELEMENT_CATALOG, LIBRARY, Preview, SectionPreview, Wire, sectionTitle } from './BlockPanels'
import { PAGE, blockId, elsOf, floatOf, isSection, moveBlock, orderEl, removeBlock, removeEl, type Block, type PageData, type Sel } from './canvas-model'
import { GlobalPanel, type NavCtx } from './SitePanels'
import { FOOTER_TEMPLATES, HEADER_TEMPLATES, SECTION_TEMPLATES, type SectionTemplate, type SiteCtx } from './SectionTemplates'

export type Tab = 'sections' | 'text' | 'elements' | 'media' | 'store' | 'input' | 'widgets' | 'library' | 'more' | 'layers' | 'global'
const SHOP_WIDGETS = ['ShopProductGrid', 'ShopCategories', 'ShopProductDetail', 'WimProductGrid', 'WimProductDetail', 'WimProductSearch', 'WimVehicleSelector', 'CategoryGrid', 'ShopCart', 'ShopCheckout', 'ShopOrderStatus', 'WimCart', 'WimCheckout', 'WimOrderStatus', 'ShippingTrack']
const INPUT_WIDGETS = ['Form', 'ContactForm', 'SearchBox', 'NavMenu']
const TABS: { id: Tab; title: string; icon: typeof Type; groups?: string[]; widgets?: string[] }[] = [
  { id: 'global', title: 'Phần chung', icon: PanelsTopLeft },
  { id: 'sections', title: 'Phần', icon: LayoutTemplate },
  { id: 'text', title: 'Văn bản', icon: Type, groups: ['Tiêu đề', 'Chữ nghệ thuật', 'Tiêu đề kiểu', 'Văn bản', 'Văn bản kiểu'] },
  { id: 'elements', title: 'Phần tử', icon: Shapes, groups: ['Nút bấm', 'Hình khối', 'Hình học', 'Nền chuyển màu', 'Đường kẻ', ...Object.keys(ICON_CATS).map((k) => `Icon · ${k}`)] },
  { id: 'media', title: 'Ảnh/Video', icon: Image, groups: ['Ảnh và video'] },
  { id: 'store', title: 'Cửa hàng', icon: ShoppingBag, widgets: SHOP_WIDGETS },
  { id: 'input', title: 'Nhập liệu', icon: TextCursorInput, groups: ['Menu'], widgets: INPUT_WIDGETS },
  { id: 'widgets', title: 'Tính năng', icon: Blocks },
  { id: 'library', title: 'Kho mẫu', icon: Library },
  { id: 'more', title: 'Khác', icon: Ellipsis, groups: ['Đếm ngược', 'Số liệu', 'Bảng', 'Bản đồ và nhúng', 'Tab và đường dẫn'] },
  { id: 'layers', title: 'Cấu trúc', icon: LayersIcon },
]

const NAMES: Record<string, string> = { countdown: 'Đếm ngược', number: 'Số liệu', table: 'Bảng', map: 'Bản đồ', embed: 'Nhúng', tabs: 'Tab', breadcrumb: 'Breadcrumb', menu: 'Menu', heading: 'Tiêu đề', text: 'Văn bản', button: 'Nút', shape: 'Hình khối', line: 'Đường kẻ', icon: 'Icon', image: 'Ảnh', video: 'Video' }
export const elLabel = (el: FreeElement) => {
  const t = String(el.props.text ?? '').replace(/\s+/g, ' ').trim()
  return ['heading', 'text', 'button'].includes(el.type) && t ? `${NAMES[el.type]}: ${t.slice(0, 26)}` : NAMES[el.type] ?? el.type
}

export type LeftOps = {
  addEls: (els: FreeElement[]) => void
  addSection: (tpl: { height: number; bg?: string; els: FreeElement[] }) => void
  addWidget: (type: string, props?: Record<string, unknown>) => void
}

export function CanvasLeft({
  tab,
  setTab,
  config,
  data,
  sel,
  setSel,
  commit,
  labelOf,
  ops,
  lang,
  areaKind = '',
  siteCtx = {},
  nav,
  onOpen,
  onClose,
  open,
}: {
  nav?: NavCtx
  tab: Tab
  setTab: (t: Tab) => void
  config: any
  data: PageData
  sel: Sel
  setSel: (s: Sel) => void
  commit: (d: PageData, key?: string) => void
  labelOf: (type: string) => string
  ops: LeftOps
  lang: string
  areaKind?: 'header' | 'footer' | ''
  siteCtx?: SiteCtx
  onOpen: () => void
  onClose: () => void
  open: boolean
}) {
  const [q, setQ] = useState('')
  const dragging = useRef(false)
  const m = q.trim().toLowerCase()
  const cur = TABS.find((t) => t.id === tab)!
  const CurrentIcon = cur.icon
  const [kind, setKind] = useState<'all' | 'section' | 'container'>('all')
  const showTab = (id: Tab) => {
    if (tab !== id) setQ('')
    setTab(id)
    onOpen()
  }
  const search = (
    <label className="cv-search">
      <Search size={16} aria-hidden="true" />
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm kiếm…" aria-label="Tìm kiếm" />
      {q && <button type="button" aria-label="Xóa tìm kiếm" onClick={() => setQ('')}><X size={14} /></button>}
    </label>
  )

  let body: React.ReactNode = null
  if (tab === 'sections') {
    const source: SectionTemplate[] = areaKind ? (areaKind === 'header' ? HEADER_TEMPLATES : FOOTER_TEMPLATES).map((t) => ({ ...t, build: () => t.build(siteCtx) })) : SECTION_TEMPLATES
    const isBox = (t: SectionTemplate) => t.id.startsWith('container-')
    const tpls = source.filter((t) => t.label.toLowerCase().includes(m) && (kind === 'all' || (kind === 'container') === isBox(t)))
    body = (
      <>
        {search}
        {!areaKind && (
          <div className="cv-seg" role="tablist" aria-label="Loại mẫu">
            {([['all', 'Tất cả'], ['section', 'Phần'], ['container', 'Container']] as const).map(([k, l]) => (
              <button key={k} type="button" role="tab" aria-selected={kind === k} onClick={() => setKind(k)}>{l}</button>
            ))}
          </div>
        )}
        {!m && kind !== 'container' && (
          <button type="button" className="cv-create" draggable onDragStart={(e) => { e.dataTransfer.setData('text/plain', 'hosso-section:blank'); e.dataTransfer.effectAllowed = 'copy' }} onClick={() => ops.addSection({ height: 400, els: [] })}>
            <Plus size={18} />
            Tạo phần trống
          </button>
        )}
        <h3 className="cv-catalog-heading">{areaKind === 'header' ? 'Mẫu header' : areaKind === 'footer' ? 'Mẫu footer' : kind === 'container' ? 'Container' : 'Mẫu'}<span>{tpls.length}</span></h3>
        <div style={{ display: 'grid', gap: 10 }}>
          {tpls.map((tpl: SectionTemplate) => (
            <button key={tpl.id} type="button" className="he-card" draggable aria-label={tpl.label} onDragStart={(e) => { e.dataTransfer.setData('text/plain', 'hosso-section:' + tpl.id); e.dataTransfer.effectAllowed = 'copy' }} onClick={() => ops.addSection({ height: tpl.height, bg: tpl.bg, els: tpl.build() })} style={{ cursor: 'pointer', font: 'inherit' }}>
              <SectionPreview tpl={tpl} />
              <span className="cv-item-label"><span>{tpl.label}</span><Plus size={14} aria-hidden="true" /></span>
            </button>
          ))}
        </div>
      </>
    )
  } else if (cur.groups || cur.widgets) {
    const groups = LIBRARY.filter((g) => (cur.groups ?? []).includes(g.title))
      .map((g) => ({ ...g, items: g.items.filter((it) => `${g.title} ${it.label}`.toLowerCase().includes(m)) }))
      .filter((g) => g.items.length)
    const widgetList = (cur.widgets ?? []).filter((t) => t in config.components && `${t} ${labelOf(t)}`.toLowerCase().includes(m))
    body = (
      <>
        {search}
        {groups.map((g) => (
          <section key={g.title} className="cv-catalog-group">
            <h3 className="cv-catalog-heading">{g.title}<span>{g.items.length}</span></h3>
            <div data-compact={g.cols >= 5} style={{ display: 'grid', gridTemplateColumns: g.cols >= 5 ? 'repeat(auto-fill, minmax(36px, 1fr))' : `repeat(${g.cols}, minmax(0, 1fr))`, gap: 8 }}>
              {g.items.map((it) => (
                <button key={it.label} type="button" className="he-card" draggable aria-label={it.label} title={it.label} onDragStart={(e) => { e.dataTransfer.setData('text/plain', 'hosso-library:' + g.title + '/' + it.label); e.dataTransfer.effectAllowed = 'copy' }} onClick={() => ops.addEls([it.make()])} style={{ cursor: 'pointer', font: 'inherit', ...(g.cols >= 5 ? { padding: 4 } : null) }}>
                  <Preview el={it.make()} compact={g.cols >= 5} />
                  {g.cols < 5 && <span className="cv-item-label"><span>{it.label}</span><Plus size={14} aria-hidden="true" /></span>}
                </button>
              ))}
            </div>
          </section>
        ))}
        {widgetList.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <h3 className="cv-catalog-heading">{cur.groups ? 'Biểu mẫu và tìm kiếm' : 'Khối cửa hàng'}<span>{widgetList.length}</span></h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {widgetList.map((t) => (
                <button key={t} type="button" className="he-card" onClick={() => ops.addWidget(t)} style={{ cursor: 'pointer', font: 'inherit' }}>
                  <Wire type={t} />
                  <span className="cv-item-label"><span>{labelOf(t)}</span><Plus size={14} aria-hidden="true" /></span>
                </button>
              ))}
            </div>
          </div>
        )}
        {!groups.length && !widgetList.length && <div className="cv-empty"><Search size={28} aria-hidden="true" /><p>Không có kết quả.</p></div>}
      </>
    )
  } else if (tab === 'widgets') {
    const types = Object.keys(config.components).filter((t) => t !== 'FreeCanvas' && !SHOP_WIDGETS.includes(t) && !INPUT_WIDGETS.includes(t) && `${t} ${labelOf(t)}`.toLowerCase().includes(m))
    body = (
      <>
        {search}
        <h3 className="cv-catalog-heading">Tính năng<span>{types.length}</span></h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {types.map((t) => (
            <button key={t} type="button" className="he-card" onClick={() => ops.addWidget(t)} style={{ cursor: 'pointer', font: 'inherit' }}>
              <Wire type={t} />
              <span className="cv-item-label"><span>{labelOf(t)}</span><Plus size={14} aria-hidden="true" /></span>
            </button>
          ))}
        </div>
      </>
    )
  } else if (tab === 'library') {
    body = <div className="cv-empty"><Library size={32} strokeWidth={1.5} aria-hidden="true" /><p>Chưa có mẫu.</p></div>
  } else if (tab === 'global') {
    body = !nav ? null : <GlobalPanel ctx={nav} data={data} addReusable={(slug) => ops.addWidget('Reusable', { slug })} />
  } else if (tab === 'layers') {
    body = <Layers data={data} sel={sel} setSel={setSel} commit={commit} labelOf={labelOf} />
  }

  return (
    <div
      className="cv-left"
      onDragStart={() => { dragging.current = true }}
      onDragEnd={(e) => { dragging.current = false; if (!e.currentTarget.matches(':hover')) onClose() }}
      onPointerLeave={(e) => {
        const active = e.currentTarget.ownerDocument.activeElement
        if (!dragging.current && e.pointerType === 'mouse' && !(active?.matches('input, textarea, select, [contenteditable]') && e.currentTarget.contains(active))) onClose()
      }}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget) && !e.currentTarget.matches(':hover')) onClose() }}
      onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose() } }}
      style={{ display: 'flex', flex: '0 0 auto' }}
    >
      <nav className="cv-rail" aria-label="Công cụ">
        {TABS.map((t) => {
          const on = open && t.id === tab
          const ToolIcon = t.icon
          return (
            <button
              key={t.id}
              type="button"
              title={t.title}
              data-module={t.id}
              aria-label={t.title}
              aria-pressed={on}
              aria-expanded={on}
              onPointerEnter={(e) => { if (e.pointerType === 'mouse') showTab(t.id) }}
              onFocus={() => showTab(t.id)}
              onClick={() => showTab(t.id)}
            >
              <span className="cv-chip" aria-hidden="true">
                <ToolIcon size={25} strokeWidth={1.7} />
              </span>
              {t.title}
            </button>
          )
        })}
      </nav>
      {open && <div className="cv-panel" data-module={tab}>
        <div className="cv-panel-heading">
          <span className="cv-panel-title"><span className="cv-module-icon"><CurrentIcon size={18} /></span>{cur.title}</span>
          <button
            type="button"
            title="Đóng bảng công cụ"
            aria-label="Thu gọn bảng công cụ"
            onClick={onClose}
            className="cv-ib"
          >
            <X size={16} />
          </button>
        </div>
        <div className="cv-panel-body">
        {['sections', 'text', 'elements', 'media'].includes(tab) && <div className="cv-quick-add tw:grid tw:grid-cols-3 tw:gap-2 tw:mb-4" aria-label="Thêm phần tử">
          {([{ type: 'text', label: 'Văn bản', Icon: Type }, { type: 'button', label: 'Nút bấm', Icon: MousePointer2 }, { type: 'container', label: 'Nhóm', Icon: Square }, { type: 'image', label: 'Hình ảnh', Icon: Image }, { type: 'swiper', label: 'Trình chiếu', Icon: GalleryHorizontal }, { type: 'video', label: 'Video', Icon: Video }] satisfies { type: FreeType; label: string; Icon: typeof Type }[]).map(({ type, label, Icon }) => (
            <button key={type} type="button" draggable title={label} onDragStart={(e) => { e.dataTransfer.setData('text/plain', 'hosso-widget:' + type); e.dataTransfer.effectAllowed = 'copy' }} onClick={() => ops.addEls([ELEMENT_CATALOG.find((item) => item.type === type)?.create() ?? makeElement(type)])}><span className="cv-quick-icon"><Icon size={20} strokeWidth={1.6} /></span>{label}</button>
          ))}
        </div>}
        {body}
        </div>
      </div>}
    </div>
  )
}

// ---------- Cây cấu trúc: Trang → Phần → Component ----------
const rowBtn: React.CSSProperties = { border: 0, background: 'transparent', cursor: 'pointer', padding: '2px 5px', borderRadius: 6, font: 'inherit', fontSize: 12, color: '#6b7280' }

const LAYER_ICONS: Record<string, typeof Type> = { section: LayoutTemplate, heading: Type, text: Type, button: MousePointer2, image: Image, video: Video, shape: Square, container: Square }
const LayerIcon = ({ type }: { type: string }) => {
  const Icon = LAYER_ICONS[type] ?? Blocks
  return <Icon size={15} aria-hidden="true" style={{ flex: '0 0 auto', color: '#626b76' }} />
}

function Layers({ data, sel, setSel, commit, labelOf }: { data: PageData; sel: Sel; setSel: (s: Sel) => void; commit: (d: PageData, key?: string) => void; labelOf: (type: string) => string }) {
  const [q, setQ] = useState('')
  const [shut, setShut] = useState<Record<string, boolean>>({})
  const blocks = data.content ?? []
  const floating = floatOf(data)
  const m = q.trim().toLowerCase()
  if (!blocks.length && !floating.length) return <p style={{ opacity: 0.6, fontSize: 13 }}>Trang chưa có phần nào.</p>
  // Tên dễ đọc: phần trống lấy theo chữ của tiêu đề/văn bản đầu tiên, khối khác lấy theo tên khối.
  const nameOf = (b: Block, i: number) => {
    if (!isSection(b)) return labelOf(b.type)
    const t = elsOf(b).find((e) => ['heading', 'text', 'button'].includes(e.type) && String(e.props.text ?? '').trim())
    return t ? `Phần ${i + 1}: ${String(t.props.text).replace(/\s+/g, ' ').trim().slice(0, 22)}` : `Phần ${i + 1}`
  }
  const elRows = (bid: string, els: FreeElement[]) =>
    [...els].reverse().filter((el) => !m || elLabel(el).toLowerCase().includes(m)).map((el) => {
      const eon = sel.el === el.id
      return (
        <div key={el.id} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 6px', borderRadius: 6, background: eon ? 'color-mix(in srgb, var(--hosso-brand, #15803d) 10%, #fff)' : 'transparent', fontSize: 13 }}>
          <LayerIcon type={el.type} />
          <button type="button" onClick={() => setSel({ block: bid, el: el.id })} style={{ ...rowBtn, flex: 1, minWidth: 0, textAlign: 'left', color: eon ? 'var(--hosso-brand, #15803d)' : '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {elLabel(el)}
          </button>
          <button type="button" title="Lên một lớp" aria-label="Lên một lớp" style={rowBtn} onClick={() => commit(orderEl(data, el.id, 1))}><ChevronUp size={14} /></button>
          <button type="button" title="Xuống một lớp" aria-label="Xuống một lớp" style={rowBtn} onClick={() => commit(orderEl(data, el.id, -1))}><ChevronDown size={14} /></button>
          <button type="button" title="Xóa" aria-label="Xóa lớp" style={rowBtn} onClick={() => { commit(removeEl(data, el.id)); setSel({ block: bid, el: '' }) }}><Trash2 size={14} /></button>
        </div>
      )
    })
  return (
    <div style={{ display: 'grid', gap: 4 }}>
      <input className="he-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm lớp…" aria-label="Tìm lớp" />
      {floating.length > 0 && elRows(PAGE, floating).length > 0 && (
        <div>
          <div style={{ padding: '6px 8px', borderRadius: 8, background: '#f3f4f6', fontWeight: 700, fontSize: 13 }}>Lớp nổi (toàn trang)</div>
          <div style={{ display: 'grid', gap: 2, padding: '2px 0 4px 14px' }}>{elRows(PAGE, floating)}</div>
        </div>
      )}
      {blocks.map((b: Block, i) => {
        const id = blockId(b)
        const on = sel.block === id && !sel.el
        const rows = elRows(id, elsOf(b))
        const name = nameOf(b, i)
        if (m && !rows.length && !name.toLowerCase().includes(m)) return null
        const closed = !m && shut[id]
        return (
          <div key={id}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '6px 8px', borderRadius: 8, background: on ? 'color-mix(in srgb, var(--hosso-brand, #15803d) 10%, #fff)' : '#f3f4f6', fontWeight: 700, fontSize: 13 }}>
              {rows.length > 0 ? (
                <button type="button" aria-expanded={!closed} aria-label={closed ? 'Mở' : 'Thu gọn'} style={rowBtn} onClick={() => setShut((s) => ({ ...s, [id]: !s[id] }))}>{closed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}</button>
              ) : (
                <span style={{ width: 22 }} />
              )}
              <LayerIcon type={isSection(b) ? 'section' : b.type} />
              <button type="button" onClick={() => setSel({ block: id, el: '' })} style={{ ...rowBtn, flex: 1, minWidth: 0, textAlign: 'left', color: '#111827', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {name}
              </button>
              <button type="button" title="Lên" aria-label="Di chuyển phần lên" style={rowBtn} disabled={i === 0} onClick={() => commit(moveBlock(data, id, -1))}><ChevronUp size={14} /></button>
              <button type="button" title="Xuống" aria-label="Di chuyển phần xuống" style={rowBtn} disabled={i === blocks.length - 1} onClick={() => commit(moveBlock(data, id, 1))}><ChevronDown size={14} /></button>
              <button type="button" title="Xóa" aria-label="Xóa phần" style={rowBtn} onClick={() => { commit(removeBlock(data, id)); setSel({ block: '', el: '' }) }}><Trash2 size={14} /></button>
            </div>
            {!closed && <div style={{ display: 'grid', gap: 2, padding: '2px 0 4px 14px' }}>{rows}</div>}
          </div>
        )
      })}
    </div>
  )
}
