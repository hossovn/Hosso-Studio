'use client'
import { ConstraintsPanel } from './ConstraintsPanel'
import { moveIntoFrame } from '../../../../../../../packages/blocks/src/frame-layout'
import { captureFrameVariant, ensureDefaultFrameVariant, switchFrameVariant, type FrameVariant } from '../../../../../../../packages/blocks/src/design-presets'
import { ActionPanel } from './ActionPanel'
import { ReusableOverridesPanel } from './ReusableEditor'
import { DEVICE_WIDTH, elementFamily, type WidgetPartDevice, type ElementState, type ElementDevice } from '@hosso/studio-blocks'
import { BOX_SHADOWS, CLIPS, CLIP_LABEL, ColorControl, FREE_FONTS, ICON_BODY, ICON_CATS, MediaField, SHADOW_LABEL, TEXT_SHADOWS, RangeControl, SegControl, type FreeElement } from '@hosso/studio-blocks'
import React from 'react'
import { SlidersHorizontal, X, FileText, Paintbrush, LayoutGrid, Sparkles, Monitor, Settings2, ChevronDown, Type, Image, MousePointer2, Square, Shapes, LayoutTemplate, ArrowUp, ArrowDown, Copy, Trash2, Plus } from 'lucide-react'
import { WidgetPartPicker, WidgetPartsInspector } from './WidgetPartsInspector'
import { ElementStateControls } from './StateStyleEditor'
import { ScrollEffectControls } from './ScrollEffectControls'
import { MotionControls } from './MotionControls'
import { ProductSelection } from './ProductSelection'

import { blockId, dupEl, elsOf, findEl, isSection, orderEl, patchBlock, patchElProps, removeEl, updateEl, setBlockEls, type Block, type PageData, type Sel, NO_SEL } from './canvas-model'

const LINE = '#e5e7eb'
const ctl: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '6px 9px', border: '1px solid transparent', background: '#f4f5f7', borderRadius: 8, font: 'inherit', fontSize: 13 }
const btn: React.CSSProperties = { padding: '6px 10px', border: '1px solid #e3e6ea', borderRadius: 8, background: '#fff', cursor: 'pointer', font: 'inherit', fontSize: 12, fontWeight: 600 }

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="cv-field">
    <span style={{ fontSize: 12, fontWeight: 500, color: '#6b7280' }}>{label}</span>
    {children}
  </div>
)
const Group = ({ title, children, open = true, show = true }: { title: string; children: React.ReactNode; open?: boolean; show?: boolean }) =>
  show ? (
    <details className="cv-grp" open={open}>
      <summary>
        <ChevronDown size={14} aria-hidden="true" />
        {title}
      </summary>
      <div className="cv-grp-content">{children}</div>
    </details>
  ) : null

const TAB_ICONS = { content: FileText, style: Paintbrush, layout: LayoutGrid, fx: Sparkles, responsive: Monitor, advanced: Settings2 }
const OBJECT_ICONS: Record<string, typeof Type> = { heading: Type, text: Type, button: MousePointer2, image: Image, container: Square }
const TAB_LABEL: Record<string, string> = { content: 'Nội dung', style: 'Thiết kế', layout: 'Bố cục', fx: 'Hiệu ứng', responsive: 'Thiết bị', advanced: 'Nâng cao' }
const INSPECTOR_CSS = `
.cv-grp{padding:0 16px;border-bottom:1px solid var(--cv-line,#e5e7eb)}
.cv-grp>summary{display:flex;align-items:center;gap:8px;list-style:none;cursor:pointer;padding:16px 0;font-weight:650;font-size:12px;color:var(--cv-ink,#20242b)}
.cv-grp-content{padding:0 0 8px}
.cv-subheading{margin:14px 0 8px;padding-top:12px;border-top:1px solid #eef1f3;color:#374151;font-size:11px;font-weight:750;letter-spacing:.02em}
.cv-help{margin:0;padding:12px;border:1px solid #e5e9e7;border-radius:9px;background:#f7f9f8;color:#5f6b64;font-size:12px;line-height:1.5}
.cv-focal-grid{display:grid;grid-template-columns:repeat(3,32px);gap:4px}
.cv-focal-grid button{width:32px;height:28px;border:1px solid #e0e5e2;border-radius:5px;background:#fff;color:#647067;cursor:pointer}
.cv-focal-grid button:hover,.cv-focal-grid button[aria-pressed=true]{border-color:var(--hosso-brand,#15803d);background:#eaf3ed;color:var(--hosso-brand,#15803d)}
.cv-check{display:flex;align-items:center;gap:8px;margin:6px 0 14px;color:#4b5563;font-size:12px}
.cv-clear-background{width:100%;margin:4px 0 14px;padding:8px 10px;border:1px solid #e4e8e5;border-radius:8px;background:#fff;color:#8b3f3b;font:600 12px system-ui,sans-serif;cursor:pointer}
.cv-clear-background:hover{background:#fbefee;border-color:#edcfcc}
.cv-context-hint{margin:0;padding:8px 14px;border-bottom:1px solid #eef1f3;background:#fbfcfb;color:#66736b;font-size:11px;line-height:1.4}
.cv-grp>summary::-webkit-details-marker{display:none}
.cv-grp>summary svg{color:#6b7280;transition:transform .15s}
.cv-grp:not([open])>summary svg{transform:rotate(-90deg)}
.cv-tabs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px;margin:12px;padding:4px;background:var(--cv-soft,#f4f5f7);border:1px solid var(--cv-line,#e5e7eb);border-radius:7px}
.cv-tabs button{display:grid;justify-items:center;align-content:center;gap:5px;min-height:52px;padding:7px 3px;border:1px solid transparent;border-radius:4px;background:transparent;font:inherit;font-size:11px;font-weight:600;color:var(--cv-muted,#626b76);cursor:pointer}
.cv-tabs button:hover{color:#111827}
.cv-tabs button[aria-selected=true]{color:var(--hosso-brand,#15803d);background:#fff;border-color:var(--cv-line,#e5e7eb);box-shadow:0 1px 3px #1823330a}
.cv-align{display:flex;justify-content:space-between;padding:10px 16px;border-bottom:1px solid #eceef1}
.cv-align button{width:36px;height:34px;display:grid;place-items:center;border:0;border-radius:8px;background:transparent;color:#4b5563;cursor:pointer}
.cv-align button:hover{background:#f1f3f5;color:#111827}
`

// ---------- Form chung cho field của block (widget) ----------
function InspectorTabs({ value, onChange }: { value: string; onChange: (tab: string) => void }) {
  const tabs = Object.entries(TAB_ICONS)
  return <div className="cv-tabs" role="tablist" aria-label="Thuộc tính" onKeyDown={(e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    const index = tabs.findIndex(([key]) => key === value), next = (index + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length
    onChange(tabs[next][0]); e.currentTarget.querySelectorAll<HTMLButtonElement>('button')[next]?.focus()
  }}>{tabs.map(([key, Icon]) => <button key={key} type="button" role="tab" aria-selected={value === key} onClick={() => onChange(key)}><Icon size={18} />{TAB_LABEL[key]}</button>)}</div>
}

function FieldInput({ name, f, value, onChange }: { name: string; f: any; value: any; onChange: (v: any) => void }) {
  const label = f.label ?? name
  if (f.type === 'text') return <Row label={label}><input style={ctl} value={value ?? ''} onChange={(e) => onChange(e.target.value)} /></Row>
  if (f.type === 'textarea') return <Row label={label}><textarea style={{ ...ctl, minHeight: 70 }} value={value ?? ''} onChange={(e) => onChange(e.target.value)} /></Row>
  if (f.type === 'number') return <Row label={label}><input style={ctl} type="number" value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))} /></Row>
  if (f.type === 'select' || f.type === 'radio')
    return (
      <Row label={label}>
        <select style={ctl} value={String(value ?? '')} onChange={(e) => onChange((f.options.find((o: any) => String(o.value) === e.target.value) ?? { value: e.target.value }).value)}>
          {f.options.map((o: any) => <option key={String(o.value)} value={String(o.value)}>{o.label}</option>)}
        </select>
      </Row>
    )
  if (f.type === 'custom' && f.render) return <Row label={label}>{React.createElement(f.render, { value, onChange, readOnly: false, field: f, name })}</Row>
  if (f.type === 'array') {
    const list: any[] = Array.isArray(value) ? value : []
    return (
      <Row label={label}>
        <div style={{ display: 'grid', gap: 8 }}>
          {list.map((item, i) => (
            <details key={i} style={{ border: `1px solid ${LINE}`, borderRadius: 8, padding: '6px 10px' }}>
              <summary style={{ cursor: 'pointer', fontSize: 13 }}>{f.getItemSummary ? f.getItemSummary(item, i) : `Mục ${i + 1}`}</summary>
              <div style={{ paddingTop: 10 }}>
                <FieldsForm fields={f.arrayFields ?? {}} values={item} onChange={(k, v) => onChange(list.map((it, j) => (j === i ? { ...it, [k]: v } : it)))} />
                <button type="button" style={btn} disabled={i === 0} aria-label={`Đưa mục ${i + 1} lên`} onClick={() => { const next = [...list]; [next[i - 1], next[i]] = [next[i], next[i - 1]]; onChange(next) }}>Lên</button>
                <button type="button" style={btn} disabled={i === list.length - 1} aria-label={`Đưa mục ${i + 1} xuống`} onClick={() => { const next = [...list]; [next[i], next[i + 1]] = [next[i + 1], next[i]]; onChange(next) }}>Xuống</button>
                <button type="button" style={btn} onClick={() => onChange(list.filter((_, j) => j !== i))}>Xóa mục</button>
              </div>
            </details>
          ))}
          <button type="button" style={btn} onClick={() => onChange([...list, { ...(f.defaultItemProps ?? {}) }])}>＋ Thêm mục</button>
        </div>
      </Row>
    )
  }
  return null
}
export function FieldsForm({ fields, values, onChange }: { fields: Record<string, any>; values: Record<string, any>; onChange: (k: string, v: any) => void }) {
  return (
    <>
      {Object.entries(fields)
        .filter(([k]) => !k.startsWith('_'))
        .map(([k, f]) => <FieldInput key={k} name={k} f={f} value={values?.[k]} onChange={(v) => onChange(k, v)} />)}
    </>
  )
}

// ---------- Inspector ----------
const Num = ({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) => (
  <label style={{ display: 'grid', gap: 4, fontSize: 11, color: '#6b7280' }}>
    {label}
    <input style={ctl} type="number" value={Math.round(value)} onChange={(e) => onChange(Number(e.target.value) || 0)} />
  </label>
)

const Choice = ({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) => (
  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
    {options.map((o) => (
      <button key={o} type="button" style={{ ...btn, background: value === o ? '#111827' : '#fff', color: value === o ? '#fff' : '#111827' }} onClick={() => onChange(o)}>{SHADOW_LABEL[o]}</button>
    ))}
  </div>
)

/** Chọn icon: tìm theo tên, nhóm theo chủ đề. */
function IconPicker({ value, onChange }: { value: string; onChange: (n: string) => void }) {
  const [q, setQ] = React.useState('')
  const m = q.trim().toLowerCase()
  const cats = Object.entries(ICON_CATS).map(([c, names]) => [c, names.filter((n) => !m || n.includes(m))] as const).filter(([, n]) => n.length)
  return (
    <div>
      <input style={{ ...ctl, marginBottom: 8 }} type="search" placeholder="Tìm icon (tiếng Anh)…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div style={{ maxHeight: 260, overflowY: 'auto', display: 'grid', gap: 8 }}>
        {cats.map(([c, names]) => (
          <div key={c}>
            <div style={{ fontSize: 11, color: '#6b7280', margin: '0 0 4px' }}>{c}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4 }}>
              {names.map((n) => (
                <button key={n} type="button" title={n} onClick={() => onChange(n)} style={{ ...btn, padding: 6, display: 'grid', placeItems: 'center', borderColor: value === n ? '#111827' : '#e5e7eb', background: value === n ? '#f3f4f6' : '#fff' }}>
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: ICON_BODY[n] }} />
                </button>
              ))}
            </div>
          </div>
        ))}
        {!cats.length && <span style={{ fontSize: 12, color: '#6b7280' }}>Không có icon phù hợp.</span>}
      </div>
    </div>
  )
}

type StateInspectorProps = { state: ElementState; onStateChange: (state: ElementState) => void; device: ElementDevice; onDeviceChange: (device: ElementDevice) => void }
function ComponentInspector({ el, block, data, commit, setSel, state, onStateChange, device, onDeviceChange, config }: { el: FreeElement; block: Block; data: PageData; commit: (d: PageData, key?: string) => void; setSel: (s: Sel) => void; config?: any } & StateInspectorProps) {
  const [unit, setUnit] = React.useState<'px' | '%'>('px')
  const pixelScale = DEVICE_WIDTH[device] / 1200
  const sectionHeight = Number(block.props.height) || 400
  const denominator = (key: string) => key === 'x' || key === 'w' ? 1200 : sectionHeight
  const [tab, setTab] = React.useState('content')
  React.useEffect(() => { if (state !== 'normal') setTab('fx') }, [state])
  const p = el.props
  const put = (patch: Record<string, any>) => commit(patchElProps(data, el.id, patch), `p:${el.id}:${Object.keys(patch).join(',')}`)
  const geo = (g: Partial<Pick<FreeElement, 'x' | 'y' | 'w' | 'h'>>) => commit(updateEl(data, el.id, (e) => ({ ...e, ...g })), `g:${el.id}`)
  type MenuRow = { label: string; href: string; children?: MenuRow[] }
  const itemsText = (Array.isArray(p.items) ? p.items : []).flatMap((i: MenuRow) => [`${i.label} | ${i.href}`, ...(i.children ?? []).map((c) => `- ${c.label} | ${c.href}`)]).join('\n')
  // Dòng bắt đầu bằng "- " là mục con (menu thả xuống) của dòng trước.
  const parseMenu = (text: string): MenuRow[] => {
    const rows: MenuRow[] = []
    for (const raw of text.split('\n').map((l) => l.trim()).filter(Boolean)) {
      const sub = raw.startsWith('- ')
      const [label, ...rest] = (sub ? raw.slice(2) : raw).split('|')
      const row = { label: label.trim(), href: rest.join('|').trim() || '#' }
      if (sub && rows.length) (rows[rows.length - 1].children ??= []).push(row)
      else rows.push(row)
    }
    return rows
  }
  const textual = el.type === 'heading' || el.type === 'text' || el.type === 'button'
  const NAMES: Record<string, string> = { container: 'Container', swiper: 'Swiper', accordion: 'Câu hỏi thu gọn (FAQ)', countdown: 'Đếm ngược', number: 'Số liệu', table: 'Bảng', map: 'Bản đồ', embed: 'Nhúng', tabs: 'Tab', breadcrumb: 'Breadcrumb', menu: 'Menu', heading: 'Tiêu đề', text: 'Văn bản', button: 'Nút bấm', shape: 'Hình khối', line: 'Đường kẻ', icon: 'Icon', image: 'Ảnh', video: 'Video' }
  const ObjectIcon = OBJECT_ICONS[el.type] ?? Shapes
  return (
    <>
      <div className="cv-object-path">
        <button type="button" onClick={() => setSel({ block: '', el: '' })} style={{ border: 0, background: 'transparent', color: 'inherit', cursor: 'pointer', font: 'inherit', padding: 0 }}>Trang</button>›
        <button type="button" onClick={() => setSel({ block: blockId(block), el: '' })} style={{ border: 0, background: 'transparent', color: 'inherit', cursor: 'pointer', font: 'inherit', padding: 0 }}>{blockId(block) === '@page' ? 'Lớp nổi' : 'Phần'}</button>›
      </div>
      <div className="cv-object-heading"><span className="cv-module-icon"><ObjectIcon size={20} aria-hidden="true" /></span><div><strong>{NAMES[el.type]}</strong><span>{Math.round(el.w * pixelScale)} × {Math.round(el.h * pixelScale)} px · {device}</span></div></div>
      {textual && <p className="cv-context-hint">Nhấp đúp để sửa và định dạng từng đoạn. Các chỉnh sửa nhanh luôn nằm cạnh phần tử trên canvas.</p>}
      {['button', 'image', 'text', 'heading'].includes(el.type) && <ElementStateControls props={p} state={state} onStateChange={onStateChange} device={device} onDeviceChange={onDeviceChange} supported={el.type === 'button' || p.href ? ['normal', 'hover', 'focus', 'active'] : ['normal', 'hover']} onChange={(props, key) => commit(updateEl(data, el.id, (current) => ({ ...current, props })), 'state:' + el.id + ':' + device + ':' + state + ':' + key)} />}
      <div className="cv-align" role="group" aria-label="Căn chỉnh nhanh" style={{ borderBottom: '1px solid #f1f5f9', background: '#fafafa', padding: '6px 12px' }}>
        {([
          ['Căn trái', 'M4 4v16M8 8h12v3H8zM8 14h7v3H8z', () => geo({ x: 0 })],
          ['Căn giữa ngang', 'M12 3v18M5 8h14v3H5zM8 14h8v3H8z', () => geo({ x: Math.round((1200 - el.w) / 2) })],
          ['Căn phải', 'M20 4v16M4 8h12v3H4zM9 14h7v3H9z', () => geo({ x: 1200 - el.w })],
          ['Căn trên', 'M4 4h16M8 8v12h3V8zM14 8v7h3V8z', () => geo({ y: 0 })],
          ['Căn giữa dọc', 'M3 12h18M8 5v14h3V5zM14 8v8h3V8z', () => geo({ y: Math.round((Number(block.props.height) || 400) / 2 - el.h / 2) })],
          ['Căn dưới', 'M4 20h16M8 4v12h3V4zM14 9v7h3V9z', () => geo({ y: Math.max(0, (Number(block.props.height) || 400) - el.h) })],
        ] as [string, string, () => void][]).map(([t, d, fn]) => (
          <button key={t} type="button" title={t} aria-label={t} onClick={fn} style={{ width: 34, height: 30, display: 'grid', placeItems: 'center', border: 0, borderRadius: 6, background: 'transparent', color: '#475569', cursor: 'pointer' }}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
          </button>
        ))}
      </div>
      <InspectorTabs value={tab} onChange={setTab} />
      <Group title="Vị trí và kích thước" show={tab === 'layout'}>
        <fieldset disabled={Boolean(p._locked)} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        <SegControl value={unit} onChange={(v) => setUnit(v as 'px' | '%')} options={[{ label: 'px', value: 'px' }, { label: '%', value: '%' }]} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {(['x', 'y', 'w', 'h'] as const).map((key) => <Num key={key} label={key.toUpperCase() + ' (' + unit + ')'} value={unit === 'px' ? Number((el[key] * pixelScale).toFixed(2)) : Number((el[key] / denominator(key) * 100).toFixed(2))} onChange={(v) => { const n = unit === 'px' ? v / pixelScale : v / 100 * denominator(key); geo({ [key]: key === 'w' || key === 'h' ? Math.max(8, n) : n }) }} />)}
        </div>
        <Row label="Thuộc ô / khung"><select aria-label="Thuộc ô / khung" style={ctl} value={el.parentId || ''} onChange={(e) => commit(setBlockEls(data, blockId(block), moveIntoFrame(elsOf(block), el.id, e.target.value || undefined)))}><option value="">Ngoài khung</option>{elsOf(block).filter((it) => it.type === 'container' && !elementFamily(elsOf(block), el.id).some((child) => child.id === it.id)).map((it) => <option key={it.id} value={it.id}>{it.props._name || it.props.name || it.id}</option>)}</select></Row>
        <ConstraintsPanel el={el} put={put} />
        </fieldset>
      </Group>
      <Group title="Nội dung" show={tab === 'content'}>
        {el.type === 'widget' && <FieldsForm fields={config?.components[p.widget?.type]?.fields ?? {}} values={p.widget?.props ?? {}} onChange={(key, value) => put({ widget: { ...p.widget, props: { ...p.widget?.props, [key]: value } } })} />}
        {el.type === 'container' && <>
          <Row label="Tên Container"><input style={ctl} value={p.name || ''} onChange={(e) => put({ name: e.target.value })} /></Row>
          <div className="cv-subheading">Tương tác (Tab / Hộp nổi Popover)</div>
          <label className="cv-check"><input type="checkbox" checked={Boolean(p._isPopover)} onChange={(e) => put({ _isPopover: e.target.checked, _frame: true })} />Ẩn trên trang, chỉ mở dạng hộp nổi (#popover)</label>
          {(() => {
            const variants: FrameVariant[] = Array.isArray(p._variants) ? p._variants : []
            const activeVarId = p._variant || variants[0]?.id || ''
            const list = elsOf(block)
            if (!variants.length) return <button type="button" style={{ ...btn, width: '100%', borderColor: '#2d7b57', color: '#2d7b57', background: '#edf5ef' }} onClick={() => {
              const seeded = ensureDefaultFrameVariant(list, el.id, 'Tab 1')
              const seededFrame = seeded.find((it) => it.id === el.id)!
              const tab2 = captureFrameVariant(seeded, seededFrame, `tab_${Date.now().toString(36)}`, 'Tab 2')
              const baseVars: FrameVariant[] = seededFrame.props._variants ?? []
              commit(setBlockEls(data, blockId(block), seeded.map((it) => it.id === el.id ? { ...it, props: { ...it.props, _variants: [...baseVars, tab2], _variant: baseVars[0]?.id || 'default', _frame: true } } : it)))
            }}>＋ Bật trạng thái Tab (Tab 1 / Tab 2)</button>
            return <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {variants.map((v) => <button key={v.id} type="button" aria-pressed={activeVarId === v.id} style={{ ...btn, background: activeVarId === v.id ? '#edf5ef' : '#fff', borderColor: activeVarId === v.id ? '#2d7b57' : '#e3e6ea', color: activeVarId === v.id ? '#2d7b57' : '#20242b' }} onClick={() => commit(setBlockEls(data, blockId(block), switchFrameVariant(list, el.id, v.id, () => crypto.randomUUID())))}>{v.name}</button>)}
                <button type="button" style={btn} disabled={variants.length >= 12} onClick={() => {
                  const synced = activeVarId ? switchFrameVariant(list, el.id, activeVarId, () => crypto.randomUUID()) : list
                  const syncedFrame = synced.find((it) => it.id === el.id)!
                  const nextVar = captureFrameVariant(synced, syncedFrame, `tab_${Date.now().toString(36)}`, `Tab ${variants.length + 1}`)
                  const curVars: FrameVariant[] = syncedFrame.props._variants ?? variants
                  commit(setBlockEls(data, blockId(block), synced.map((it) => it.id === el.id ? { ...it, props: { ...it.props, _variants: [...curVars, nextVar], _variant: nextVar.id } } : it)))
                }}>＋ Thêm tab</button>
              </div>
              {activeVarId && <Row label="Tên trạng thái đang sửa"><input style={ctl} value={variants.find((v) => v.id === activeVarId)?.name ?? ''} onChange={(e) => put({ _variants: variants.map((v) => v.id === activeVarId ? { ...v, name: e.target.value } : v) })} /></Row>}
              <p className="cv-tool-help">Chọn từng tab ở trên để sửa nội dung riêng trên canvas. Gắn hành động “Đổi trạng thái khung (Tab)” cho nút bấm tới khung <code>{el.id}</code>.</p>
            </div>
          })()}
        </>}
        {el.type === 'swiper' && <>
          {(Array.isArray(p.slides) ? p.slides : []).map((slide: { image: string; alt?: string; text?: string }, i: number) => <div key={i} style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: 12, marginBottom: 12 }}>
            <Row label={'Slide ' + (i + 1)}><MediaField kind="image" value={slide.image} onChange={(image) => put({ slides: p.slides.map((s: unknown, n: number) => n === i ? { ...slide, image } : s) })} /></Row>
            <Row label="Alt"><input style={ctl} value={slide.alt || ''} onChange={(e) => put({ slides: p.slides.map((s: unknown, n: number) => n === i ? { ...slide, alt: e.target.value } : s) })} /></Row>
            <Row label="Nội dung"><input style={ctl} value={slide.text || ''} onChange={(e) => put({ slides: p.slides.map((s: unknown, n: number) => n === i ? { ...slide, text: e.target.value } : s) })} /></Row>
            <button type="button" style={btn} onClick={() => put({ slides: p.slides.filter((_: unknown, n: number) => n !== i) })}>Xóa slide</button>
            <button type="button" style={btn} disabled={i === 0} onClick={() => { const slides = [...p.slides]; [slides[i - 1], slides[i]] = [slides[i], slides[i - 1]]; put({ slides }) }}>Lên</button>
          </div>)}
          <button type="button" style={btn} onClick={() => put({ slides: [...(p.slides || []), { image: '', alt: '', text: '' }] })}>Thêm slide</button>
          <Row label="Tự chạy (giây, 0 = tắt)"><input type="number" min={0} max={60} style={ctl} value={p.seconds || 0} onChange={(e) => put({ seconds: Math.max(0, Math.min(60, Number(e.target.value) || 0)) })} /></Row>
          <Row label="Chuyển ảnh"><select aria-label="Chuyển ảnh" style={ctl} value={p.effect === 'fade' ? 'fade' : 'slide'} onChange={(e) => put({ effect: e.target.value })}><option value="slide">Trượt ngang</option><option value="fade">Chuyển mờ</option></select></Row>
          <label className="cv-scroll-mobile"><input type="checkbox" checked={p.thumbnails === true} onChange={(e) => put({ thumbnails: e.target.checked })} />Hiện ảnh nhỏ để chọn</label>
          <Row label="Số thẻ hiển thị cùng lúc"><SegControl value={String(p.perView ?? 1)} onChange={(v) => put({ perView: Number(v) })} options={[1, 2, 3, 4].map((n) => ({ label: `${n} thẻ`, value: String(n) }))} /></Row>
          <label className="cv-check"><input type="checkbox" checked={Boolean(p.playToggle)} onChange={(e) => put({ playToggle: e.target.checked })} />Hiện thanh Điều hướng + Tạm dừng / Phát</label>
          {Boolean(p.playToggle) && <Row label="Nhãn nút chạy/dừng"><input style={ctl} value={p.playToggleLabel ?? ''} placeholder="Tạm dừng / Phát" onChange={(e) => put({ playToggleLabel: e.target.value })} /></Row>}
        </>}
        {textual && <Row label={el.type === 'button' ? 'Chữ trên nút' : 'Nội dung'}><textarea style={{ ...ctl, minHeight: 64 }} value={p.text ?? ''} onChange={(e) => put({ text: e.target.value })} /></Row>}
        {['button', 'text', 'heading', 'image'].includes(el.type) && <ActionPanel key={el.id} href={p.href} data={data} onChange={(href, anchor) => commit(patchElProps(anchor ? patchBlock(data, anchor, { _anchor: true }) : data, el.id, { href }))} />}
        {el.type === 'button' && <details><summary>Biểu tượng</summary><IconPicker value={p.icon ?? ''} onChange={(icon) => put({ icon })} /><button type="button" style={btn} onClick={() => put({ icon: '' })}>Bỏ biểu tượng</button></details>}
        {el.type === 'heading' && (
          <Row label="Cấp tiêu đề (SEO)">
            <SegControl value={String(p.level)} onChange={(v) => put({ level: Number(v) })} options={[1, 2, 3, 4, 5, 6].map((n) => ({ label: `H${n}`, value: String(n) }))} />
          </Row>
        )}
        {el.type === 'image' && (
          <>
            <Row label="Ảnh"><MediaField value={p.src ?? ''} onChange={(v) => put({ src: v })} kind="image" /></Row>
            <Row label="Mô tả ảnh (alt)"><input style={ctl} value={p.alt ?? ''} onChange={(e) => put({ alt: e.target.value })} /></Row>
            <Row label="Cách vừa khung"><SegControl value={p.fit === 'contain' ? 'contain' : 'cover'} onChange={(v) => put({ fit: v })} options={[{ label: 'Phủ kín', value: 'cover' }, { label: 'Vừa ảnh', value: 'contain' }]} /></Row>
            <p className="cv-tool-help">Nhấp đúp ảnh để kéo vị trí và cuộn phóng. Alt + nhấp đúp để cắt ảnh thành tệp mới. Chuyển sang mobile để đặt điểm nhìn riêng.</p>
            {(['focalX', 'focalY', 'imageZoom'] as const).map((key) => <Row key={key} label={key === 'focalX' ? 'Điểm nhìn ngang (%)' : key === 'focalY' ? 'Điểm nhìn dọc (%)' : 'Độ phóng'}><input style={ctl} aria-label={key} type="number" min={key === 'imageZoom' ? 1 : 0} max={key === 'imageZoom' ? 5 : 100} step={key === 'imageZoom' ? .1 : 1} value={p[key] ?? (key === 'imageZoom' ? 1 : 50)} onChange={(e) => put({ [key]: Math.max(key === 'imageZoom' ? 1 : 0, Math.min(key === 'imageZoom' ? 5 : 100, Number(e.target.value))) })} /></Row>)}
          </>
        )}
        {el.type === 'menu' && (
          <Row label="Mục menu (mỗi dòng: Nhãn | đường dẫn; thêm '- ' đầu dòng để làm mục con thả xuống)">
            <textarea
              style={{ ...ctl, minHeight: 120 }}
              defaultValue={itemsText}
              key={el.id}
              onChange={(e) => put({ items: parseMenu(e.target.value) })}
            />
          </Row>
        )}
        {el.type === 'countdown' && <Row label="Thời điểm kết thúc"><input style={ctl} type="datetime-local" value={p.end ?? ''} onChange={(e) => put({ end: e.target.value })} /></Row>}
        {el.type === 'number' && (
          <>
            <Row label="Con số"><input style={ctl} value={p.value ?? ''} onChange={(e) => put({ value: e.target.value })} /></Row>
            <Row label="Hậu tố (+, %, k…)"><input style={ctl} value={p.suffix ?? ''} onChange={(e) => put({ suffix: e.target.value })} /></Row>
            <Row label="Nhãn"><input style={ctl} value={p.label ?? ''} onChange={(e) => put({ label: e.target.value })} /></Row>
          </>
        )}
        {el.type === 'table' && (
          <Row label="Bảng (mỗi dòng một hàng, cột cách nhau bằng |; dòng đầu là tiêu đề)">
            <textarea style={{ ...ctl, minHeight: 130 }} key={el.id} defaultValue={(p.rows ?? []).map((r: string[]) => r.join(' | ')).join('\n')} onChange={(e) => put({ rows: e.target.value.split('\n').filter((l) => l.trim()).map((l) => l.split('|').map((c) => c.trim())) })} />
          </Row>
        )}
        {el.type === 'map' && (
          <>
            <Row label="Địa chỉ hoặc tên địa điểm"><input style={ctl} value={p.query ?? ''} onChange={(e) => put({ query: e.target.value })} /></Row>
            <Row label="Mức phóng to"><RangeControl value={p.zoom ?? 15} onChange={(v) => put({ zoom: Number(v) || 15 })} min={3} max={20} /></Row>
          </>
        )}
        {el.type === 'embed' && <Row label="Đường dẫn nhúng (https://…)"><input style={ctl} value={p.url ?? ''} placeholder="https://…" onChange={(e) => put({ url: e.target.value })} /></Row>}
        {el.type === 'tabs' && (
          <Row label="Các tab (mỗi dòng: Tên | Nội dung)">
            <textarea style={{ ...ctl, minHeight: 130 }} key={el.id} defaultValue={(p.tabs ?? []).map((t: { label: string; text: string }) => `${t.label} | ${t.text}`).join('\n')} onChange={(e) => put({ tabs: e.target.value.split('\n').filter((l) => l.trim()).map((l) => { const [label, ...rest] = l.split('|'); return { label: label.trim(), text: rest.join('|').trim() } }) })} />
          </Row>
        )}
        {el.type === 'breadcrumb' && (
          <Row label="Các mục (mỗi dòng: Nhãn | đường dẫn)">
            <textarea style={{ ...ctl, minHeight: 100 }} key={el.id} defaultValue={(p.items ?? []).map((i: { label: string; href: string }) => `${i.label} | ${i.href}`).join('\n')} onChange={(e) => put({ items: e.target.value.split('\n').filter((l) => l.trim()).map((l) => { const [label, ...rest] = l.split('|'); return { label: label.trim(), href: rest.join('|').trim() || '#' } }) })} />
          </Row>
        )}
        {el.type === 'accordion' && <>
          {(Array.isArray(p.items) ? p.items : []).map((item: { question: string; answer: string; defaultOpen?: boolean }, i: number) => <div key={i} style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: 12, marginBottom: 12 }}>
            <Row label={'Câu hỏi ' + (i + 1)}><input style={ctl} value={item.question ?? ''} onChange={(e) => put({ items: p.items.map((it: unknown, n: number) => n === i ? { ...item, question: e.target.value } : it) })} /></Row>
            <Row label="Câu trả lời"><textarea style={{ ...ctl, minHeight: 68 }} value={item.answer ?? ''} onChange={(e) => put({ items: p.items.map((it: unknown, n: number) => n === i ? { ...item, answer: e.target.value } : it) })} /></Row>
            <label className="cv-check"><input type="checkbox" checked={Boolean(item.defaultOpen)} onChange={(e) => put({ items: p.items.map((it: any, n: number) => n === i ? { ...item, defaultOpen: e.target.checked } : (p.exclusive !== false && e.target.checked ? { ...it, defaultOpen: false } : it)) })} />Mở sẵn khi vào trang</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <button type="button" style={btn} disabled={i === 0} onClick={() => { const items = [...p.items]; [items[i - 1], items[i]] = [items[i], items[i - 1]]; put({ items }) }}>Lên</button>
              <button type="button" style={btn} disabled={i === p.items.length - 1} onClick={() => { const items = [...p.items]; [items[i], items[i + 1]] = [items[i + 1], items[i]]; put({ items }) }}>Xuống</button>
              <button type="button" style={btn} disabled={p.items.length <= 1} onClick={() => put({ items: p.items.filter((_: unknown, n: number) => n !== i) })}>Xóa</button>
            </div>
          </div>)}
          <button type="button" style={btn} onClick={() => put({ items: [...(p.items || []), { question: 'Câu hỏi mới?', answer: 'Nội dung trả lời chi tiết.', defaultOpen: false }] })}>＋ Thêm câu hỏi</button>
          <label className="cv-check"><input type="checkbox" checked={p.exclusive !== false} onChange={(e) => put({ exclusive: e.target.checked })} />Chỉ mở 1 câu hỏi mỗi lúc</label>
          <Row label="Biểu tượng đóng/mở"><SegControl value={p.iconStyle === 'chevron' ? 'chevron' : 'plus'} onChange={(iconStyle) => put({ iconStyle })} options={[{ label: 'Dấu cộng (+)', value: 'plus' }, { label: 'Mũi tên (⌄)', value: 'chevron' }]} /></Row>
        </>}
        {el.type === 'video' && <>
          <Row label="Link YouTube hoặc tệp video MP4"><input style={ctl} value={p.url ?? ''} onChange={(e) => put({ url: e.target.value })} /></Row>
          <Row label="Ảnh bìa (Poster)"><MediaField kind="image" value={p.poster ?? ''} onChange={(poster) => put({ poster })} /></Row>
          <Row label="Kiểu điều khiển (MP4)"><SegControl value={p.controlsMode === 'overlay' ? 'overlay' : 'native'} onChange={(controlsMode) => put({ controlsMode })} options={[{ label: 'Trình duyệt', value: 'native' }, { label: 'Nút Play nổi', value: 'overlay' }]} /></Row>
          {p.controlsMode === 'overlay' && <>
            <Row label="Nhãn nút phát"><input style={ctl} value={p.playLabel ?? 'Phát video'} onChange={(e) => put({ playLabel: e.target.value })} /></Row>
            <Row label="Nhãn nút tạm dừng"><input style={ctl} value={p.pauseLabel ?? 'Tạm dừng video'} onChange={(e) => put({ pauseLabel: e.target.value })} /></Row>
          </>}
          <label className="cv-check"><input type="checkbox" checked={Boolean(p.autoplay)} onChange={(e) => put({ autoplay: e.target.checked, ...(e.target.checked ? { muted: true } : {}) })} />Tự động phát (tự tắt tiếng)</label>
          <label className="cv-check"><input type="checkbox" checked={Boolean(p.loop)} onChange={(e) => put({ loop: e.target.checked })} />Lặp lại liên tục</label>
          <label className="cv-check"><input type="checkbox" checked={Boolean(p.muted)} onChange={(e) => put({ muted: e.target.checked })} />Tắt tiếng mặc định</label>
        </>}

        {el.type === 'icon' && (
          <Row label="Icon"><IconPicker value={p.name} onChange={(n) => put({ name: n })} /></Row>
        )}
      </Group>
      <Group title="Kiểu" show={tab === 'style'}>
        {el.type === 'menu' && (
          <>
            <Row label="Kiểu menu">
              <select style={ctl} value={p.variant ?? ''} onChange={(e) => put({ variant: e.target.value })}>
                {[['', 'Ngang / dọc đơn giản'], ['underline', 'Gạch chân'], ['box', 'Thanh nền'], ['pill', 'Viên thuốc'], ['grid', 'Lưới ô'], ['collapse', 'Thu gọn'], ['hamburger', 'Hamburger']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Row>
            <Row label="Màu nhấn (mục đang chọn)"><ColorControl value={p.accent ?? '#15803d'} onChange={(v) => put({ accent: v })} /></Row>
            <Row label="Mục đang chọn (số thứ tự, -1 là không)"><RangeControl value={p.active ?? 0} onChange={(v) => put({ active: Number(v) })} min={-1} max={9} /></Row>
            <Row label="Cỡ chữ"><RangeControl value={Number((p.size * pixelScale).toFixed(2))} onChange={(v) => put({ size: (Number(v) || 8) / pixelScale })} min={8} max={60} /></Row>
            <Row label="Khoảng cách giữa các mục"><RangeControl value={(p.gap ?? 24) * pixelScale} onChange={(v) => put({ gap: (Number(v) || 0) / pixelScale })} min={0} max={120} /></Row>
            <Row label="Hướng"><SegControl value={p.vertical ? 'v' : 'h'} onChange={(v) => put({ vertical: v === 'v' })} options={[{ label: 'Ngang', value: 'h' }, { label: 'Dọc', value: 'v' }]} /></Row>
            <Row label="Căn lề"><SegControl value={p.align ?? 'left'} onChange={(v) => put({ align: v })} options={[{ label: 'Trái', value: 'left' }, { label: 'Giữa', value: 'center' }, { label: 'Phải', value: 'right' }]} /></Row>
            <Row label="Màu chữ"><ColorControl value={p.color} onChange={(v) => put({ color: v })} /></Row>
          </>
        )}
        {(el.type === 'heading' || el.type === 'text' || el.type === 'button') && (
          <>
            <Row label="Cỡ chữ"><RangeControl value={Number(((p.size ?? 18) * pixelScale).toFixed(2))} onChange={(v) => put({ size: (Number(v) || 8) / pixelScale })} min={8} max={200} /></Row>
            <Row label="Độ đậm"><select style={ctl} value={String(p.weight ?? 400)} onChange={(e) => put({ weight: Number(e.target.value) })}>{[100, 200, 300, 400, 500, 600, 700, 800, 900].map((weight) => <option key={weight} value={weight}>{weight}{weight === 400 ? ' · Thường' : weight === 600 ? ' · Bán đậm' : weight === 700 ? ' · Đậm' : ''}</option>)}</select></Row>
            {el.type !== 'button' && <Row label="Căn lề"><SegControl value={p.align ?? 'left'} onChange={(v) => put({ align: v })} options={[{ label: 'Trái', value: 'left' }, { label: 'Giữa', value: 'center' }, { label: 'Phải', value: 'right' }]} /></Row>}
            <Row label="Màu chữ"><ColorControl value={p.color} onChange={(v) => put({ color: v })} /></Row>
            <Row label="Font chữ">
              <select style={{ ...ctl, fontFamily: p.font ? `"${p.font}"` : undefined }} value={p.font ?? ''} onChange={(e) => put({ font: e.target.value })}>
                <option value="">Mặc định của site</option>
                {FREE_FONTS.map((f) => <option key={f.name} value={f.name}>{f.name}</option>)}
              </select>
            </Row>
            <Row label="Định dạng">
              <div style={{ display: 'flex', gap: 6 }}>
                {([['italic', 'I', 'Nghiêng'], ['upper', 'AA', 'IN HOA'], ['underline', 'U', 'Gạch chân']] as const).map(([k, t, title]) => (
                  <button key={k} type="button" title={title} style={{ ...btn, flex: 1, background: p[k] ? '#111827' : '#fff', color: p[k] ? '#fff' : '#111827', fontStyle: k === 'italic' ? 'italic' : 'normal', textDecoration: k === 'underline' ? 'underline' : 'none' }} onClick={() => put({ [k]: !p[k] })}>{t}</button>
                ))}
              </div>
            </Row>
            <Row label="Giãn chữ (px)"><RangeControl value={p.spacing ?? 0} onChange={(v) => put({ spacing: Number(v) || 0 })} min={-4} max={40} /></Row>
            <Row label="Giãn dòng"><RangeControl value={p.lh ?? 1.25} onChange={(v) => put({ lh: Number(v) || 1.25 })} min={0.9} max={2.4} step={0.05} /></Row>
            {(el.type === 'heading' || el.type === 'text') && <>
              <div className="cv-subheading">Khung chữ</div>
              <Row label="Nền"><ColorControl value={p.bg ?? ''} onChange={(v) => put({ bg: v })} /></Row>
              <Row label="Màu chuyển sắc"><ColorControl value={p.bg2 ?? ''} onChange={(v) => put({ bg2: v })} /></Row>
              {Boolean(p.bg && p.bg2) && <Row label="Góc chuyển sắc"><RangeControl value={p.angle ?? 135} onChange={(v) => put({ angle: Number(v) || 0 })} min={0} max={360} /></Row>}
              <Row label="Đệm ngang"><RangeControl value={p.padX ?? 0} onChange={(v) => put({ padX: Number(v) || 0 })} min={0} max={200} /></Row>
              <Row label="Đệm dọc"><RangeControl value={p.padY ?? 0} onChange={(v) => put({ padY: Number(v) || 0 })} min={0} max={200} /></Row>
              <Row label="Căn dọc"><SegControl value={p.vAlign ?? 'top'} onChange={(v) => put({ vAlign: v })} options={[{ label: 'Trên', value: 'top' }, { label: 'Giữa', value: 'center' }, { label: 'Dưới', value: 'bottom' }]} /></Row>
              <Row label="Tràn nội dung"><SegControl value={p.overflow === 'hidden' ? 'hidden' : 'visible'} onChange={(v) => put({ overflow: v })} options={[{ label: 'Hiện', value: 'visible' }, { label: 'Cắt', value: 'hidden' }]} /></Row>
            </>}
          </>
        )}
        {(el.type === 'button' || el.type === 'shape' || el.type === 'container') && <Row label={p.bg2 ? 'Màu nền (đầu)' : 'Màu nền'}><ColorControl value={p.bg} onChange={(v) => put({ bg: v })} /></Row>}
        {(el.type === 'heading' || el.type === 'text' || el.type === 'button' || el.type === 'shape' || el.type === 'image' || el.type === 'container') && <Row label="Bo góc"><RangeControl value={p.radius ?? 0} onChange={(v) => put({ radius: Number(v) || 0 })} min={0} max={el.type === 'shape' ? 999 : 200} /></Row>}
        {(el.type === 'heading' || el.type === 'text' || el.type === 'button' || el.type === 'shape' || el.type === 'image' || el.type === 'container') && (
          <>
            <Row label="Độ dày viền"><RangeControl value={p.borderW ?? 0} onChange={(v) => put({ borderW: Number(v) || 0 })} min={0} max={20} /></Row>
            {Boolean(p.borderW) && <Row label="Màu viền"><ColorControl value={p.borderColor} onChange={(v) => put({ borderColor: v })} /></Row>}
          </>
        )}
        {(el.type === 'countdown' || el.type === 'number' || el.type === 'table' || el.type === 'tabs' || el.type === 'breadcrumb') && (
          <>
            <Row label="Cỡ chữ"><RangeControl value={Number(((p.size ?? 16) * pixelScale).toFixed(2))} onChange={(v) => put({ size: (Number(v) || 8) / pixelScale })} min={8} max={160} /></Row>
            {el.type !== 'table' && <Row label="Màu chữ / số"><ColorControl value={p.color ?? ''} onChange={(v) => put({ color: v })} /></Row>}
            {(el.type === 'countdown' || el.type === 'tabs') && <Row label="Màu nền ô"><ColorControl value={p.bg ?? ''} onChange={(v) => put({ bg: v })} /></Row>}
            {(el.type === 'tabs' || el.type === 'breadcrumb') && <Row label="Màu nhấn"><ColorControl value={p.accent ?? '#15803d'} onChange={(v) => put({ accent: v })} /></Row>}
            {el.type === 'table' && (
              <>
                <Row label="Màu nền tiêu đề"><ColorControl value={p.headBg ?? '#15803d'} onChange={(v) => put({ headBg: v })} /></Row>
                <Row label="Màu chữ tiêu đề"><ColorControl value={p.headColor ?? '#ffffff'} onChange={(v) => put({ headColor: v })} /></Row>
              </>
            )}
            {(el.type === 'countdown' || el.type === 'table' || el.type === 'tabs') && <Row label="Bo góc"><RangeControl value={p.radius ?? 12} onChange={(v) => put({ radius: Number(v) || 0 })} min={0} max={80} /></Row>}
            <Row label="Font chữ">
              <select style={ctl} value={p.font ?? ''} onChange={(e) => put({ font: e.target.value })}>
                <option value="">Mặc định của site</option>
                {FREE_FONTS.map((f) => <option key={f.name} value={f.name}>{f.name}</option>)}
              </select>
            </Row>
          </>
        )}
        {el.type === 'accordion' && <>
          <Row label="Cỡ chữ câu hỏi"><RangeControl value={Number(((p.size ?? 18) * pixelScale).toFixed(2))} onChange={(v) => put({ size: (Number(v) || 12) / pixelScale })} min={12} max={42} /></Row>
          <Row label="Cỡ chữ câu trả lời"><RangeControl value={Number(((p.answerSize ?? 15) * pixelScale).toFixed(2))} onChange={(v) => put({ answerSize: (Number(v) || 11) / pixelScale })} min={11} max={32} /></Row>
          <Row label="Màu câu hỏi"><ColorControl value={p.color ?? '#111827'} onChange={(color) => put({ color })} /></Row>
          <Row label="Màu câu trả lời"><ColorControl value={p.answerColor ?? '#4b5563'} onChange={(answerColor) => put({ answerColor })} /></Row>
          <Row label="Màu nhấn / viền đang mở"><ColorControl value={p.accent ?? '#eab308'} onChange={(accent) => put({ accent })} /></Row>
          <Row label="Nền thẻ"><ColorControl value={p.bg ?? '#ffffff'} onChange={(bg) => put({ bg })} /></Row>
          <Row label="Nền thẻ khi mở"><ColorControl value={p.openBg ?? '#fefce8'} onChange={(openBg) => put({ openBg })} /></Row>
          <Row label="Màu viền thẻ"><ColorControl value={p.borderColor ?? '#e5e7eb'} onChange={(borderColor) => put({ borderColor })} /></Row>
          <Row label="Bo góc thẻ"><RangeControl value={p.radius ?? 16} onChange={(v) => put({ radius: Number(v) || 0 })} min={0} max={40} /></Row>
          <Row label="Khoảng cách giữa các câu"><RangeControl value={p.gap ?? 12} onChange={(v) => put({ gap: Number(v) || 0 })} min={0} max={36} /></Row>
          <Row label="Đệm ngang (px)"><RangeControl value={p.padX ?? 22} onChange={(v) => put({ padX: Number(v) || 8 })} min={8} max={64} /></Row>
          <Row label="Đệm dọc (px)"><RangeControl value={p.padY ?? 18} onChange={(v) => put({ padY: Number(v) || 8 })} min={8} max={48} /></Row>
          <Row label="Font chữ">
            <select style={ctl} value={p.font ?? ''} onChange={(e) => put({ font: e.target.value })}>
              <option value="">Mặc định của site</option>
              {FREE_FONTS.map((f) => <option key={f.name} value={f.name}>{f.name}</option>)}
            </select>
          </Row>
        </>}
        {el.type === 'swiper' && <>
          <Row label="Khoảng cách thẻ (px)"><RangeControl value={p.gap ?? 16} onChange={(v) => put({ gap: Number(v) || 0 })} min={0} max={48} /></Row>
          <Row label="Bo góc thẻ (px)"><RangeControl value={p.slideRadius ?? (p.radius ?? 16)} onChange={(v) => put({ slideRadius: Number(v) || 0 })} min={0} max={48} /></Row>
        </>}
        {el.type === 'video' && <>
          <Row label="Cách vừa khung"><SegControl value={p.fit === 'contain' ? 'contain' : 'cover'} onChange={(fit) => put({ fit })} options={[{ label: 'Phủ kín', value: 'cover' }, { label: 'Vừa video', value: 'contain' }]} /></Row>
          <Row label="Bo góc"><RangeControl value={p.radius ?? 16} onChange={(v) => put({ radius: Number(v) || 0 })} min={0} max={80} /></Row>
        </>}
        {el.type === 'line' && (
          <>
            <Row label="Màu"><ColorControl value={p.color} onChange={(v) => put({ color: v })} /></Row>
            <Row label="Độ dày"><RangeControl value={p.thickness} onChange={(v) => put({ thickness: Number(v) || 1 })} min={1} max={20} /></Row>
            <Row label="Kiểu nét"><SegControl value={p.dashed ? 'd' : 's'} onChange={(v) => put({ dashed: v === 'd' })} options={[{ label: 'Liền', value: 's' }, { label: 'Đứt', value: 'd' }]} /></Row>
          </>
        )}

        {el.type === 'icon' && (
          <>
            <Row label="Màu"><ColorControl value={p.color} onChange={(v) => put({ color: v })} /></Row>
            <Row label="Độ dày nét"><RangeControl value={p.stroke ?? 1.8} onChange={(v) => put({ stroke: Number(v) || 1 })} min={0.5} max={4} step={0.1} /></Row>
            <Row label="Tô đầy"><SegControl value={p.fill ? 'y' : 'n'} onChange={(v) => put({ fill: v === 'y' })} options={[{ label: 'Chỉ nét', value: 'n' }, { label: 'Tô đầy', value: 'y' }]} /></Row>
          </>
        )}
      </Group>
      <Group title="Hiệu ứng" show={tab === 'fx'}>
        {el.type !== 'container' && <MotionControls props={p} type={el.type} onChange={(value) => put({ _motion: value })} />}
        {el.type !== 'container' && <ScrollEffectControls value={p._scroll} onChange={(value) => put({ _scroll: value ?? undefined })} />}
        {el.type === 'image' && <Row label="Đổ bóng"><Choice value={p.bshadow ?? ''} onChange={(v) => put({ bshadow: v })} options={['', ...Object.keys(BOX_SHADOWS)]} /></Row>}
        {(el.type === 'heading' || el.type === 'text') && (
          <>
            <Row label="Bóng chữ"><Choice value={p.tshadow ?? ''} onChange={(v) => put({ tshadow: v })} options={['', ...Object.keys(TEXT_SHADOWS)]} /></Row>
            <Row label="Viền chữ (px)"><RangeControl value={p.strokeW ?? 0} onChange={(v) => put({ strokeW: Number(v) || 0 })} min={0} max={12} /></Row>
            {Boolean(p.strokeW) && <Row label="Màu viền chữ"><ColorControl value={p.strokeColor ?? '#111827'} onChange={(v) => put({ strokeColor: v })} /></Row>}
            <Row label="Chữ chuyển màu (màu cuối)"><ColorControl value={p.grad2 ?? ''} onChange={(v) => put({ grad2: v })} /></Row>
            <Row label="Bóng khung chữ"><Choice value={p.bshadow ?? ''} onChange={(v) => put({ bshadow: v })} options={['', ...Object.keys(BOX_SHADOWS)]} /></Row>
          </>
        )}
        {(el.type === 'button' || el.type === 'shape' || el.type === 'container') && (
          <>
            <Row label="Nền chuyển màu (màu cuối)"><ColorControl value={p.bg2 === 'transparent' ? '' : (p.bg2 ?? '')} onChange={(v) => put({ bg2: v })} /></Row>
            {el.type === 'shape' && <button type="button" style={{ ...btn, width: '100%', marginBottom: 10, background: p.bg2 === 'transparent' ? '#edf5ef' : '#fff', borderColor: p.bg2 === 'transparent' ? '#2d7b57' : '#e3e6ea', color: p.bg2 === 'transparent' ? '#2d7b57' : '#374151' }} aria-pressed={p.bg2 === 'transparent'} onClick={() => put(p.bg2 === 'transparent' ? { bg2: '', fillType: 'linear' } : { bg2: 'transparent', fillType: 'radial' })}>{p.bg2 === 'transparent' ? '✓ Đích trong suốt (Hào quang)' : 'Đặt đích trong suốt (Hào quang)'}</button>}
            {Boolean(p.bg2) && el.type === 'shape' && <Row label="Kiểu chuyển màu"><SegControl value={p.fillType === 'radial' ? 'radial' : 'linear'} onChange={(fillType) => put({ fillType })} options={[{ label: 'Thẳng (Linear)', value: 'linear' }, { label: 'Tỏa tròn (Radial)', value: 'radial' }]} /></Row>}
            {Boolean(p.bg2) && p.fillType !== 'radial' && <Row label="Góc chuyển màu"><RangeControl value={p.angle ?? 135} onChange={(v) => put({ angle: Number(v) || 0 })} min={0} max={360} /></Row>}
            {el.type === 'shape' && <Row label="Làm mờ hào quang (Blur px)"><RangeControl value={p.blur ?? 0} onChange={(v) => put({ blur: Math.min(40, Math.max(0, Number(v) || 0)) })} min={0} max={40} /></Row>}
            <Row label="Đổ bóng"><Choice value={p.bshadow ?? ''} onChange={(v) => put({ bshadow: v })} options={['', ...Object.keys(BOX_SHADOWS)]} /></Row>
          </>
        )}
        {el.type === 'container' && <>
          <Row label="Ảnh nền ô"><MediaField kind="image" value={p.bgImage ?? ''} onChange={(bgImage) => put({ bgImage })} /></Row>
          {p.bgImage && <><Row label="Cách vừa ảnh nền"><SegControl value={p.bgFit === 'contain' ? 'contain' : 'cover'} onChange={(bgFit) => put({ bgFit })} options={[{ label: 'Phủ kín', value: 'cover' }, { label: 'Vừa ảnh', value: 'contain' }]} /></Row><button type="button" style={btn} onClick={() => put({ bgImage: '' })}>Bỏ ảnh nền</button></>}
        </>}
        {el.type === 'shape' && (
          <Row label="Hình dạng">
            <select style={ctl} value={p.clip ?? ''} onChange={(e) => put({ clip: e.target.value })}>
              {['', ...Object.keys(CLIPS), 'blob'].map((k) => <option key={k} value={k}>{CLIP_LABEL[k]}</option>)}
            </select>
          </Row>
        )}
        <Row label="Độ trong suốt (%)"><RangeControl value={p.opacity ?? 100} onChange={(v) => put({ opacity: Math.min(100, Math.max(0, Number(v) || 0)) })} min={0} max={100} /></Row>
        <Row label="Xoay (độ)"><RangeControl value={p.rotate ?? 0} onChange={(v) => put({ rotate: Number(v) || 0 })} min={-180} max={180} /></Row>
      </Group>
      <Group title="Hiển thị theo thiết bị" show={tab === 'responsive'}>
        <DevicePickerRow value={p._hide ?? ''} onChange={(value) => put({ _hide: value })} />
      </Group>
      <Group title="Nâng cao" show={tab === 'advanced'}>
        <label><input type="checkbox" checked={Boolean(p._locked)} onChange={(e) => put({ _locked: e.target.checked })} />Khóa vị trí</label>
        <label><input type="checkbox" checked={Boolean(p._hidden)} onChange={(e) => put({ _hidden: e.target.checked })} />Ẩn phần tử</label>
      </Group>
      <div className="cv-object-actions">
        <button type="button" className="cv-ib" title="Lên một lớp" aria-label="Lên một lớp" onClick={() => commit(orderEl(data, el.id, 1))}><ArrowUp size={16} /></button>
        <button type="button" className="cv-ib" title="Xuống một lớp" aria-label="Xuống một lớp" onClick={() => commit(orderEl(data, el.id, -1))}><ArrowDown size={16} /></button>
        <button type="button" className="cv-ib" title="Nhân đôi" aria-label="Nhân đôi" onClick={() => { const r = dupEl(data, el.id); commit(r.data); setSel({ block: blockId(block), el: r.id }) }}><Copy size={16} /></button>
        <button type="button" className="cv-ib cv-danger" title="Xóa phần tử" aria-label="Xóa phần tử" onClick={() => { commit(removeEl(data, el.id)); setSel({ block: blockId(block), el: '' }) }}><Trash2 size={16} /></button>
      </div>
    </>
  )
}

function DevicePickerRow({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <select aria-label="Ẩn trên thiết bị" style={ctl} value={value} onChange={(e) => onChange(e.target.value)}><option value="">Hiện mọi nơi</option><option value="m">Ẩn trên điện thoại</option><option value="t">Ẩn trên máy tính bảng</option><option value="d">Ẩn trên máy tính</option></select>
}

function BlockInspector({ block, config, data, commit, labelOf, state, onStateChange, device, onDeviceChange, locale }: { block: Block; config: any; data: PageData; commit: (d: PageData, key?: string) => void; labelOf: (type: string) => string; locale?: string } & StateInspectorProps) {
  const id = blockId(block)
  const section = isSection(block)
  const [tab, setTab] = React.useState(section ? 'style' : 'content')
  React.useEffect(() => setTab(section ? 'style' : 'content'), [id, section])
  const put = (patch: Record<string, any>) => commit(patchBlock(data, id, patch), 'b:' + id + ':' + Object.keys(patch).join(','))
  const fields = config.components[block.type]?.fields ?? {}
  return <>
    <div className="cv-object-heading"><span className="cv-module-icon"><LayoutTemplate size={20} aria-hidden="true" /></span><div><strong>{section ? 'Phần (section)' : labelOf(block.type)}</strong><span>{id}</span></div></div>
    {section && <ElementStateControls props={block.props} state={state} onStateChange={onStateChange} device={device} onDeviceChange={onDeviceChange} supported={['normal', 'hover']} onChange={(props, key) => commit(patchBlock(data, id, { _states: props._states }), 'state:' + id + ':' + device + ':' + state + ':' + key)} />}
    <InspectorTabs value={tab} onChange={setTab} />
    <Group title="Nội dung" show={tab === 'content'}>
      {block.type === 'Reusable' && <ReusableOverridesPanel key={id + ':' + block.props.slug} block={block} locale={locale} onChange={put} />}
      {section ? <p className="cv-help">Nội dung của section nằm trực tiếp trên canvas. Chọn chữ, ảnh hoặc nút để sửa; mở tab <strong>Thiết kế</strong> để chỉnh toàn bộ nền section.</p> : <>{block.type === 'ShopProductGrid' && <ProductSelection value={block.props.productIds} onChange={(ids) => put({ productIds: ids ?? null })} />}<FieldsForm fields={fields} values={block.props} onChange={(k, v) => put({ [k]: v })} /></>}
    </Group>
    <Group title="Thiết kế" show={tab === 'style'}>
      <Row label="Màu nền"><ColorControl value={block.props._bgHex ?? ''} onChange={(v) => put({ _bgHex: v })} /></Row>
      {section && <>
        <Row label="Màu chuyển sắc"><ColorControl value={block.props._bg2Hex ?? ''} onChange={(v) => put({ _bg2Hex: v })} /></Row>
        {Boolean(block.props._bgHex && block.props._bg2Hex) && <Row label="Góc chuyển sắc"><RangeControl value={block.props._bgAngle ?? 135} onChange={(v) => put({ _bgAngle: Number(v) || 0 })} min={0} max={360} /></Row>}
        <div className="cv-subheading">Ảnh và video nền</div>
        <Row label="Ảnh nền"><MediaField value={block.props.bgImage ?? ''} onChange={(v) => put({ bgImage: v })} kind="image" /></Row>
        {Boolean(block.props.bgImage) && <>
          <Row label="Cách phủ"><SegControl value={block.props.bgSize ?? 'cover'} onChange={(v) => put({ bgSize: v })} options={[{ label: 'Phủ kín', value: 'cover' }, { label: 'Vừa ảnh', value: 'contain' }, { label: 'Gốc', value: 'auto' }]} /></Row>
          <Row label="Lặp ảnh"><select style={ctl} value={block.props.bgRepeat ?? 'no-repeat'} onChange={(e) => put({ bgRepeat: e.target.value })}><option value="no-repeat">Không lặp</option><option value="repeat">Lặp cả hai chiều</option><option value="repeat-x">Lặp ngang</option><option value="repeat-y">Lặp dọc</option></select></Row>
          <Row label="Tiêu điểm">
            <div className="cv-focal-grid">{([[0, 0, '↖'], [50, 0, '↑'], [100, 0, '↗'], [0, 50, '←'], [50, 50, '●'], [100, 50, '→'], [0, 100, '↙'], [50, 100, '↓'], [100, 100, '↘']] as const).map(([x, y, icon]) => <button key={`${x}-${y}`} type="button" aria-label={`Tiêu điểm ${x}% ${y}%`} aria-pressed={Number(block.props.bgPositionX ?? 50) === x && Number(block.props.bgPositionY ?? 50) === y} onClick={() => put({ bgPositionX: x, bgPositionY: y })}>{icon}</button>)}</div>
          </Row>
          <Row label="Vị trí ngang"><RangeControl value={block.props.bgPositionX ?? 50} onChange={(v) => put({ bgPositionX: Number(v) || 0 })} min={0} max={100} /></Row>
          <Row label="Vị trí dọc"><RangeControl value={block.props.bgPositionY ?? 50} onChange={(v) => put({ bgPositionY: Number(v) || 0 })} min={0} max={100} /></Row>
          <Row label="Độ hiện ảnh"><RangeControl value={block.props.bgImageOpacity ?? 100} onChange={(v) => put({ bgImageOpacity: Number(v) || 0 })} min={0} max={100} /></Row>
          <Row label="Làm mờ"><RangeControl value={block.props.bgBlur ?? 0} onChange={(v) => put({ bgBlur: Number(v) || 0 })} min={0} max={40} /></Row>
          <label className="cv-check"><input type="checkbox" checked={block.props.bgAttachment === 'fixed'} onChange={(e) => put({ bgAttachment: e.target.checked ? 'fixed' : 'scroll' })} />Giữ nền cố định khi cuộn</label>
        </>}
        <Row label="Video nền MP4"><MediaField value={block.props.bgVideo ?? ''} onChange={(v) => put({ bgVideo: v })} kind="video" /></Row>
        {Boolean(block.props.bgVideo) && <Row label="Cách phủ video"><SegControl value={block.props.bgVideoFit ?? 'cover'} onChange={(v) => put({ bgVideoFit: v })} options={[{ label: 'Phủ kín', value: 'cover' }, { label: 'Vừa video', value: 'contain' }]} /></Row>}
        <div className="cv-subheading">Lớp phủ</div>
        <Row label="Màu lớp phủ"><ColorControl value={block.props.bgOverlayColor ?? '#000000'} onChange={(v) => put({ bgOverlayColor: v })} /></Row>
        <Row label="Độ đậm lớp phủ"><RangeControl value={block.props.bgOverlay ?? 0} onChange={(v) => put({ bgOverlay: Math.min(100, Math.max(0, Number(v) || 0)) })} min={0} max={100} /></Row>
        <Row label="Màu phủ cuối (Gradient)"><div style={{ display: 'grid', gap: 6 }}><ColorControl value={block.props.bgOverlayColor2 === 'transparent' ? '' : (block.props.bgOverlayColor2 ?? '')} onChange={(v) => put({ bgOverlayColor2: v })} /><button type="button" style={{ ...btn, background: block.props.bgOverlayColor2 === 'transparent' ? '#edf5ef' : '#fff', borderColor: block.props.bgOverlayColor2 === 'transparent' ? '#2d7b57' : '#e3e6ea', color: block.props.bgOverlayColor2 === 'transparent' ? '#2d7b57' : '#374151' }} aria-pressed={block.props.bgOverlayColor2 === 'transparent'} onClick={() => put({ bgOverlayColor2: block.props.bgOverlayColor2 === 'transparent' ? '' : 'transparent' })}>{block.props.bgOverlayColor2 === 'transparent' ? '✓ Đích trong suốt (Sáng dần)' : 'Đặt đích trong suốt (Hero)'}</button></div></Row>
        {Boolean(block.props.bgOverlayColor2) && <Row label="Góc phủ chuyển hướng"><RangeControl value={block.props.bgOverlayAngle ?? 90} onChange={(v) => put({ bgOverlayAngle: Number(v) || 0 })} min={0} max={360} /></Row>}
        <button type="button" className="cv-clear-background" onClick={() => put({ _bgHex: '', _bg2Hex: '', bgImage: '', bgVideo: '', bgOverlay: 0, bgOverlayColor2: '', bgOverlayAngle: 90, bgBlur: 0, bgImageOpacity: 100, bgAttachment: 'scroll' })}>Xóa toàn bộ nền</button>
      </>}
      <Row label="Màu viền"><ColorControl value={block.props._bdHex ?? ''} onChange={(v) => put({ _bdHex: v })} /></Row>
      <Row label="Độ dày viền"><RangeControl value={block.props._bdPx ?? 0} onChange={(v) => put({ _bdPx: Number(v) || 0 })} min={0} max={20} /></Row>
      <Row label="Bo góc"><RangeControl value={block.props._radPx ?? 0} onChange={(v) => put({ _radPx: Number(v) || 0 })} min={0} max={80} /></Row>
    </Group>
    <Group title="Bố cục" show={tab === 'layout'}>
      {section && <>
        <Row label="Chế độ chiều cao"><SegControl value={block.props.heightMode === 'svh' ? 'svh' : 'canvas'} onChange={(heightMode) => put({ heightMode })} options={[{ label: 'Theo khung (px)', value: 'canvas' }, { label: 'Tràn màn hình (svh)', value: 'svh' }]} /></Row>
        {block.props.heightMode === 'svh' && <>
          <Row label="Tỉ lệ màn hình (svh)"><RangeControl value={block.props.svh ?? 100} onChange={(v) => put({ svh: Math.min(100, Math.max(40, Number(v) || 100)) })} min={40} max={100} /></Row>
          <Row label="Trừ chiều cao Header (px)"><RangeControl value={block.props.svhOffset ?? 82} onChange={(v) => put({ svhOffset: Math.min(200, Math.max(0, Number(v) || 0)) })} min={0} max={200} /></Row>
          <Row label="Chiều cao tối thiểu (px)"><RangeControl value={block.props.minHeightPx ?? 610} onChange={(v) => put({ minHeightPx: Math.min(1200, Math.max(320, Number(v) || 610)) })} min={320} max={1200} /></Row>
          <p className="cv-tool-help">Trên trang thật, phần này tự giãn tối thiểu theo màn hình thiết bị (svh). Trong khung soạn thảo vẫn giữ chiều cao thiết kế bên dưới để căn vị trí chuẩn.</p>
        </>}
        <Row label="Chiều cao (px, khung 1200px)"><RangeControl value={block.props.height ?? 400} onChange={(v) => put({ height: Number(v) || 80 })} min={80} max={2000} /></Row>
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>{[320, 480, 640, 800].map((h) => <button key={h} type="button" style={{ ...btn, flex: 1, padding: '4px 6px', fontSize: 11 }} onClick={() => put({ height: h })}>{h}px</button>)}</div>
      </>}
      {([['_padT', 'Khoảng cách trên'], ['_padB', 'Khoảng cách dưới'], ['_padL', 'Khoảng cách trái'], ['_padR', 'Khoảng cách phải']] as const).map(([key, label]) => <Row key={key} label={label + ' (px)'}><RangeControl value={block.props[key] ?? 0} onChange={(v) => put({ [key]: Number(v) || 0 })} min={0} max={200} /></Row>)}
    </Group>
    <Group title="Hiệu ứng" show={tab === 'fx'}>
      <Row label="Đổ bóng"><select style={ctl} value={block.props._sh ?? ''} onChange={(e) => put({ _sh: e.target.value })}><option value="">Không</option><option value="sm">Nhẹ</option><option value="md">Đậm</option></select></Row>
      <Row label="Di chuột"><select style={ctl} value={block.props._hv ?? ''} onChange={(e) => put({ _hv: e.target.value })}><option value="">Không</option><option value="lift">Nâng lên</option><option value="grow">Phóng to</option></select></Row>
    </Group>
    <Group title="Thiết bị" show={tab === 'responsive'}><Row label="Hiển thị"><DevicePickerRow value={block.props._hide ?? ''} onChange={(value) => put({ _hide: value })} /></Row></Group>
    <Group title="Nâng cao" show={tab === 'advanced'}><Row label="ID"><input style={ctl} aria-label="ID phần" readOnly value={id} /></Row><Row label="Lớp xếp chồng"><input style={ctl} aria-label="Lớp xếp chồng" type="number" min={0} max={100} value={block.props._z ?? ''} onChange={(e) => put({ _z: e.target.value === '' ? '' : Math.min(100, Math.max(0, Number(e.target.value))) })} /></Row></Group>
  </>
}

function PageOverviewInspector({ data, setSel, commit, title, areaKind = '' }: { areaKind?: 'header' | 'footer' | '';
  data: PageData
  setSel: (s: Sel) => void
  commit: (d: PageData, key?: string) => void
  title?: string
}) {
  const blocks = data.content ?? []
  const totalEls = blocks.reduce((acc, b) => acc + elsOf(b).length, 0)
  return <div className="cv-page-overview">
    <div className="cv-object-heading"><span className="cv-module-icon"><FileText size={20} aria-hidden="true" /></span><div><strong>{title || 'Trang web'}</strong></div></div>
    <dl className="cv-page-stats"><div><dt>Số phần</dt><dd>{blocks.length}</dd></div><div><dt>Phần tử</dt><dd>{totalEls}</dd></div></dl>
    {areaKind === 'header' && (() => {
      const rp = data.root?.props ?? {}
      const putRoot = (patch: Record<string, any>) => commit({ ...data, root: { ...data.root, props: { ...rp, ...patch } } }, 'root:' + Object.keys(patch).join(','))
      return <Group title="Đầu trang dính & Kính mờ (Sticky Header)">
        <label className="cv-check"><input type="checkbox" checked={Boolean(rp.sticky)} onChange={(e) => putRoot({ sticky: e.target.checked })} />Ghim cố định đầu trang khi cuộn (Sticky)</label>
        <Row label="Nền Header (hỗ trợ rgba kính mờ)"><input style={ctl} value={rp.headerBg ?? ''} placeholder="rgba(255, 255, 255, 0.86)" onChange={(e) => putRoot({ headerBg: e.target.value })} /></Row>
        <Row label="Độ mờ kính (Backdrop Blur px)"><RangeControl value={rp.backdropBlur ?? 0} onChange={(v) => putRoot({ backdropBlur: Math.min(24, Math.max(0, Number(v) || 0)) })} min={0} max={24} /></Row>
        <Row label="Viền dưới (CSS border)"><input style={ctl} value={rp.borderBottom ?? ''} placeholder="1px solid rgba(15, 23, 42, 0.08)" onChange={(e) => putRoot({ borderBottom: e.target.value })} /></Row>
        <label className="cv-check"><input type="checkbox" checked={Boolean(rp.hideAutoSlots)} onChange={(e) => putRoot({ hideAutoSlots: e.target.checked })} />Ẩn cụm ngôn ngữ/tiện ích tự động góc phải</label>
        <div className="cv-subheading">Thanh tiến độ đọc trang</div>
        <label className="cv-check"><input type="checkbox" checked={Boolean(rp.readingProgress)} onChange={(e) => putRoot({ readingProgress: e.target.checked })} />Hiện thanh tiến độ cuộn trang ở đáy Header</label>
        {Boolean(rp.readingProgress) && <>
          <Row label="Màu thanh tiến độ"><ColorControl value={rp.progressColor ?? '#eab308'} onChange={(progressColor) => putRoot({ progressColor })} /></Row>
          <Row label="Độ dày thanh (px)"><RangeControl value={rp.progressHeight ?? 3} onChange={(v) => putRoot({ progressHeight: Math.min(8, Math.max(2, Number(v) || 3)) })} min={2} max={8} /></Row>
        </>}
      </Group>
    })()}
    <div className="cv-page-commands">
      <button type="button" className="cv-primary-command" onClick={() => {
        const nb: Block = { type: 'FreeCanvas', props: { id: `FreeCanvas-${Date.now().toString(36)}`, height: 450, _els: [] } }
        commit({ ...data, content: [...blocks, nb] })
        setSel({ block: nb.props.id, el: '' })
      }}><Plus size={16} />Thêm phần mới vào cuối</button>
      {blocks.length > 0 && <button type="button" className="cv-destructive-command" onClick={() => {
        if (window.confirm('Bạn có chắc muốn xóa trắng toàn bộ nội dung của trang này?')) {
          commit({ ...data, content: [] })
          setSel(NO_SEL)
        }
      }}><Trash2 size={15} />Xóa trắng nội dung trang</button>}
    </div>
  </div>
}

export function CanvasInspector({
  data,
  config,
  sel,
  setSel,
  commit,
  labelOf,
  title,
  onClose,
  docs = [],
  locale = 'vi',
  dragHandle,
  partDevice = 'desktop',
  state = 'normal',
  onStateChange = () => {},
  onDeviceChange = () => {},
  areaKind = '',
}: {
  data: PageData
  config: any
  sel: Sel
  setSel: (s: Sel) => void
  commit: (d: PageData, key?: string) => void
  labelOf: (type: string) => string
  title?: string
  onClose?: () => void
  docs?: Document[]
  locale?: string
  dragHandle?: React.ReactNode
  partDevice?: WidgetPartDevice
  state?: ElementState
  onStateChange?: (state: ElementState) => void
  onDeviceChange?: (device: ElementDevice) => void
  areaKind?: 'header' | 'footer' | ''
}) {
  const hit = sel.el ? findEl(data, sel.el) : null
  const block = sel.block ? (data.content ?? []).find((b) => blockId(b) === sel.block) : undefined
  let body: React.ReactNode
  if (hit) body = <ComponentInspector key={hit.el.id} config={config} el={hit.el} block={hit.block} data={data} commit={commit} setSel={setSel} state={state} onStateChange={onStateChange} device={partDevice} onDeviceChange={onDeviceChange} />
  else if (block) body = <>
    {!isSection(block) && <WidgetPartPicker block={block} sel={sel} setSel={setSel} docs={docs} />}
    {sel.part && !isSection(block)
      ? <WidgetPartsInspector block={block} path={sel.part} data={data} commit={commit} setSel={setSel} device={partDevice} />
      : <BlockInspector block={block} config={config} data={data} commit={commit} labelOf={labelOf} state={state} onStateChange={onStateChange} device={partDevice} onDeviceChange={onDeviceChange} locale={locale} />}
  </>
  else body = <PageOverviewInspector data={data} setSel={setSel} commit={commit} title={title} areaKind={areaKind} />
  return (
    <aside className="cv-insp" style={{ width: 310, flex: '0 0 310px', borderLeft: `1px solid ${LINE}`, background: '#fff', overflowY: 'auto', fontFamily: 'inherit', display: 'flex', flexDirection: 'column' }}>
      <style>{INSPECTOR_CSS}</style>
      <div className="cv-panel-heading">
        {dragHandle}
        <span className="cv-panel-title">
          <SlidersHorizontal size={16} />{hit ? 'Thuộc tính phần tử' : block ? 'Thuộc tính phần' : 'Tổng quan trang'}
        </span>
        {onClose && (
          <button
            type="button"
            title="Đóng bảng thuộc tính"
            aria-label="Đóng bảng thuộc tính"
            onClick={onClose}
            className="cv-ib"
          >
            <X size={16} />
          </button>
        )}
      </div>
      <div className="cv-inspector-body" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {body}
      </div>
      {(hit || block) && !hit && <div style={{ height: 24 }} />}
    </aside>
  )
}

export { NO_SEL }
