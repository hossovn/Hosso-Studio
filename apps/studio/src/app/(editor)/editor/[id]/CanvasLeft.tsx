'use client'
import { ICON_CATS, makeElement, type FreeElement, type FreeType, type Pattern } from '@hosso/studio-blocks'
import { Type, MousePointer2, Square, GalleryHorizontal, Video, Image, PanelsTopLeft, LayoutTemplate, Shapes, ShoppingBag, TextCursorInput, Blocks, Library, Ellipsis, Layers as LayersIcon, Search, Plus, X } from 'lucide-react'
import { Palette } from 'lucide-react'
import React, { useState } from 'react'
import { PageTemplatePicker } from './PageTemplatePicker'
import { SectionLibrary } from './SectionLibrary'
import { LayersPanel } from './LayersPanel'
import { MediaLibraryPanel } from './MediaLibraryPanel'
import { ReusableLibraryPanel } from './WorkbenchPanels'
import { FloatingDock } from './FloatingDock'
import { FrameLibrary, InputPresetPreview } from './FrameLibrary'
import { Clock3, MonitorSmartphone, CheckCheck, Ruler, AppWindow } from 'lucide-react'

import { ELEMENT_CATALOG, LIBRARY, Preview, Wire, sectionTitle } from './BlockPanels'
import { type Block, type PageData, type Sel } from './canvas-model'
import { GlobalPanel, type NavCtx } from './SitePanels'
import { FOOTER_TEMPLATES, HEADER_TEMPLATES, SECTION_TEMPLATES, type SectionTemplate, type SiteCtx } from './SectionTemplates'

export type Tab = 'sections' | 'frames' | 'text' | 'elements' | 'media' | 'store' | 'input' | 'widgets' | 'library' | 'more' | 'layers' | 'global' | 'brand' | 'history' | 'responsive' | 'publish' | 'drawing' | 'popup'
const SHOP_WIDGETS = ['ShopProductGrid', 'ShopCategories', 'ShopProductDetail', 'WimProductGrid', 'WimProductDetail', 'WimProductSearch', 'WimVehicleSelector', 'CategoryGrid', 'ShopCart', 'ShopCheckout', 'ShopOrderStatus', 'WimCart', 'WimCheckout', 'WimOrderStatus', 'ShippingTrack']
const INPUT_WIDGETS = ['Form', 'ContactForm', 'SearchBox', 'NavMenu']
const INPUT_PRESETS = [
  { id: 'contact', type: 'ContactForm', label: 'Form liên hệ', props: { heading: 'Liên hệ với chúng tôi', description: 'Để lại thông tin, chúng tôi sẽ phản hồi sớm nhất.', submitLabel: 'Gửi liên hệ' } },
  { id: 'consulting', type: 'ContactForm', label: 'Form nhận tư vấn', props: { heading: 'Nhận tư vấn miễn phí', description: 'Điền thông tin để đội ngũ tư vấn liên hệ trong ngày.', submitLabel: 'Nhận tư vấn' } },
  { id: 'quotation', type: 'ContactForm', label: 'Form yêu cầu báo giá', props: { heading: 'Yêu cầu báo giá', description: 'Cho chúng tôi biết nhu cầu của bạn để nhận báo giá phù hợp.', submitLabel: 'Nhận báo giá' } },
  { id: 'custom', type: 'Form', label: 'Biểu mẫu tùy chỉnh', props: { heading: 'Đăng ký thông tin' } },
  { id: 'search', type: 'SearchBox', label: 'Ô tìm kiếm', props: {} },
  { id: 'nav', type: 'NavMenu', label: 'Menu điều hướng', props: {} },
] as const
const TABS: { id: Tab; title: string; icon: typeof Type; groups?: string[]; widgets?: string[] }[] = [
  { id: 'global', title: 'Phần chung', icon: PanelsTopLeft },
  { id: 'sections', title: 'Phần', icon: LayoutTemplate },
  { id: 'frames', title: 'Chia ô', icon: PanelsTopLeft },
  { id: 'text', title: 'Văn bản', icon: Type, groups: ['Tiêu đề', 'Chữ nghệ thuật', 'Tiêu đề kiểu', 'Văn bản', 'Văn bản kiểu'] },
  { id: 'elements', title: 'Phần tử', icon: Shapes, groups: ['Nút bấm', 'Hình khối', 'Hình học', 'Nền chuyển màu', 'Đường kẻ', ...Object.keys(ICON_CATS).map((k) => `Icon · ${k}`)] },
  { id: 'media', title: 'Ảnh/Video', icon: Image, groups: ['Ảnh và video'] },
  { id: 'store', title: 'Cửa hàng', icon: ShoppingBag, widgets: SHOP_WIDGETS },
  { id: 'input', title: 'Nhập liệu', icon: TextCursorInput, groups: ['Menu'], widgets: INPUT_WIDGETS },
  { id: 'widgets', title: 'Tính năng', icon: Blocks },
  { id: 'library', title: 'Kho mẫu', icon: Library },
  { id: 'brand', title: 'Thương hiệu', icon: Palette },
  { id: 'more', title: 'Khác', icon: Ellipsis, groups: ['Đếm ngược', 'Số liệu', 'Bảng', 'Bản đồ và nhúng', 'Tab và đường dẫn'] },
  { id: 'layers', title: 'Cấu trúc', icon: LayersIcon },
  { id: 'responsive', title: 'Thiết bị', icon: MonitorSmartphone },
  { id: 'history', title: 'Lịch sử', icon: Clock3 },
  { id: 'publish', title: 'Kiểm tra', icon: CheckCheck },
  { id: 'drawing', title: 'Căn chỉnh', icon: Ruler },
  { id: 'popup', title: 'Popup', icon: AppWindow },
]

const NAMES: Record<string, string> = { countdown: 'Đếm ngược', number: 'Số liệu', table: 'Bảng', map: 'Bản đồ', embed: 'Nhúng', tabs: 'Tab', breadcrumb: 'Breadcrumb', menu: 'Menu', heading: 'Tiêu đề', text: 'Văn bản', button: 'Nút', shape: 'Hình khối', line: 'Đường kẻ', icon: 'Icon', image: 'Ảnh', video: 'Video' }
export const elLabel = (el: FreeElement) => {
  if (el.props._name) return String(el.props._name)
  const t = String(el.props.text ?? '').replace(/\s+/g, ' ').trim()
  return ['heading', 'text', 'button'].includes(el.type) && t ? `${NAMES[el.type]}: ${t.slice(0, 26)}` : NAMES[el.type] ?? el.type
}

export type LeftOps = {
  addEls: (els: FreeElement[]) => void
  addSection: (tpl: { height: number; bg?: string; els: FreeElement[] }) => void
  addWidget: (type: string, props?: Record<string, unknown>) => void
  addPattern: (pattern: Pattern) => void
  addBlocks: (blocks: Block[]) => void
}

export function CanvasLeft({
  tab,
  setTab,
  config,
  data,
  templateData = data,
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
  brandPanel,
  drawingPanel,
  popupPanel,
  historyPanel,
  responsivePanel,
  formPanel,
  repeaterPanel,
  floating = false,
  publishPanel,
  canvasDoc,
}: {
  nav?: NavCtx
  tab: Tab
  setTab: (t: Tab) => void
  config: any
  data: PageData
  templateData?: PageData
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
  brandPanel?: React.ReactNode
  drawingPanel?: React.ReactNode
  popupPanel?: React.ReactNode
  historyPanel?: React.ReactNode
  responsivePanel?: React.ReactNode
  formPanel?: React.ReactNode
  repeaterPanel?: React.ReactNode
  floating?: boolean
  publishPanel?: React.ReactNode
  canvasDoc?: Document
}) {
  const [q, setQ] = useState('')
  const [group, setGroup] = useState('')
  const m = q.trim().toLowerCase()
  const cur = TABS.find((t) => t.id === tab)!
  const CurrentIcon = cur.icon
  const showTab = (id: Tab) => {
    if (tab !== id) { setQ(''); setGroup('') }
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
    body = <>{search}<SectionLibrary templates={source} query={m} areaKind={areaKind} onInsert={ops.addSection} /></>
  } else if (tab === 'frames') {
    body = <><FrameLibrary onInsert={ops.addEls} />{repeaterPanel}</>
  } else if (tab === 'media') {
    body = <MediaLibraryPanel onInsert={ops.addEls} />
  } else if (tab === 'input') {
    body = <>{formPanel}<section className="cv-catalog-group"><h3 className="cv-catalog-heading">Mẫu nhanh<span>6 mẫu</span></h3><p className="cv-tool-help">Chọn mẫu để chèn vào ô đang chọn hoặc trang.</p><div className="cv-input-presets">{INPUT_PRESETS.filter((preset) => preset.type in config.components).map((preset) => <button className="cv-input-preset" type="button" key={preset.id} draggable onDragStart={(event) => { event.dataTransfer.setData("text/plain", "hosso-block:" + JSON.stringify({ type: preset.type, props: preset.props })); event.dataTransfer.effectAllowed = "copy" }} aria-label={`Chèn ${preset.label}`} onClick={() => ops.addWidget(preset.type, preset.props)}><InputPresetPreview type={preset.type} {...preset.props} /><span className="cv-item-label"><span>{preset.label}</span><Plus size={14} aria-hidden="true" /></span></button>)}</div></section></>
  } else if (cur.groups || cur.widgets) {
    const availableGroups = LIBRARY.filter((g) => (cur.groups ?? []).includes(g.title))
    const groups = availableGroups.filter((g) => !group || g.title === group)
      .map((g) => ({ ...g, items: g.items.filter((it) => `${g.title} ${it.label}`.toLowerCase().includes(m)) }))
      .filter((g) => g.items.length)
    const presets: typeof INPUT_PRESETS[number][] = []
    const widgetList = (cur.widgets ?? []).filter((t) => t in config.components && `${t} ${labelOf(t)}`.toLowerCase().includes(m))
    body = (
      <>
        {search}
        {availableGroups.length > 1 && (
          <label className="cv-catalog-filter">
            <span>Loại nội dung</span>
            <select value={group} onChange={(e) => setGroup(e.target.value)} aria-label="Lọc loại nội dung">
              <option value="">Tất cả</option>
              {availableGroups.map((g) => <option key={g.title} value={g.title}>{g.title}</option>)}
            </select>
          </label>
        )}
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
                <button key={t} type="button" className="he-card" draggable onDragStart={(event) => { event.dataTransfer.setData("text/plain", "hosso-block:" + JSON.stringify({ type: t })); event.dataTransfer.effectAllowed = "copy" }} onClick={() => ops.addWidget(t)} style={{ cursor: 'pointer', font: 'inherit' }}>
                  <Wire type={t} />
                  <span className="cv-item-label"><span>{labelOf(t)}</span><Plus size={14} aria-hidden="true" /></span>
                </button>
              ))}
            </div>
          </div>
        )}
        {presets.length > 0 && (
          <section className="cv-catalog-group">
            <h3 className="cv-catalog-heading">Mẫu biểu mẫu và điều hướng<span>{presets.length}</span></h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {presets.map((preset) => (
                <button key={preset.id} type="button" className="he-card" onClick={() => ops.addWidget(preset.type, preset.props)} style={{ cursor: 'pointer', font: 'inherit' }}>
                  <Wire type={preset.type} />
                  <span className="cv-item-label"><span>{preset.label}</span><Plus size={14} aria-hidden="true" /></span>
                </button>
              ))}
            </div>
          </section>
        )}
        {!groups.length && !widgetList.length && !presets.length && <div className="cv-empty"><Search size={28} aria-hidden="true" /><p>Không có kết quả.</p></div>}
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
            <button key={t} type="button" className="he-card" draggable onDragStart={(event) => { event.dataTransfer.setData("text/plain", "hosso-block:" + JSON.stringify({ type: t })); event.dataTransfer.effectAllowed = "copy" }} onClick={() => ops.addWidget(t)} style={{ cursor: 'pointer', font: 'inherit' }}>
              <Wire type={t} />
              <span className="cv-item-label"><span>{labelOf(t)}</span><Plus size={14} aria-hidden="true" /></span>
            </button>
          ))}
        </div>
      </>
    )
  } else if (tab === 'library') {
    body = <><ReusableLibraryPanel data={templateData} sel={sel} nav={nav} onInsert={ops.addBlocks} onLink={(slug) => ops.addWidget('Reusable', { slug })} />{areaKind ? <p className="cv-panel-note">Mở một trang để thêm mẫu trang hoàn chỉnh. Dùng mục Phần để chọn mẫu đầu trang hoặc chân trang.</p> : <details className="cv-built-in-templates"><summary>Mẫu trang có sẵn</summary>{search}<PageTemplatePicker query={m} onInsert={ops.addPattern} /></details>}</>
  } else if (tab === 'brand') {
    body = brandPanel
  } else if (tab === 'global') {
    body = !nav ? null : <GlobalPanel ctx={nav} data={data} addReusable={(slug) => ops.addWidget('Reusable', { slug })} />
  } else if (tab === 'layers') {
    body = <LayersPanel canvasDoc={canvasDoc} data={data} sel={sel} setSel={setSel} commit={commit} labelOf={labelOf} elLabel={elLabel} />
  } else if (tab === 'drawing') {
    body = drawingPanel
  } else if (tab === 'popup') {
    body = popupPanel
  } else if (tab === 'history') {
    body = historyPanel
  } else if (tab === 'responsive') {
    body = responsivePanel
  } else if (tab === 'publish') {
    body = publishPanel
  }

  return (
    <div
      className="cv-left"
      onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose() } }}
      style={{ display: 'flex', flex: '0 0 auto' }}
    >
      <FloatingDock enabled={floating} title="Kéo bộ công cụ"><nav className="cv-rail" aria-label="Công cụ">
        {TABS.map((t) => {
          const on = open && t.id === tab
          return (
            <button
              key={t.id}
              type="button"
              title={t.title}
              data-module={t.id}
              aria-label={t.title}
              aria-pressed={on}
              aria-expanded={on}
              onClick={() => { if (on) onClose(); else showTab(t.id) }}
            >
              <span className="cv-chip" aria-hidden="true">
                <t.icon size={22} strokeWidth={1.6} />
              </span>
              {t.title}
            </button>
          )
        })}
      </nav></FloatingDock>
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
        <div className="cv-panel-body" key={tab}>
        {['text', 'elements', 'media'].includes(tab) && <div className="cv-quick-add tw:grid tw:grid-cols-3 tw:gap-2 tw:mb-4" aria-label="Thêm phần tử">
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
