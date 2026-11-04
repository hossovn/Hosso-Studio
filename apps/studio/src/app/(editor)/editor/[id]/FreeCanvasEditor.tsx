'use client'
import { FREE_FONTS, FREE_ICONS, FREE_MAX_PX, FREE_W, FreeElementView, MediaField, newId, sanitizeRichText, type FreeElement } from '@hosso/studio-blocks'
import { usePuck } from '@puckeditor/core'
import { Pencil, ChevronDown, Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight, Radius, Square, RotateCw, ArrowUp, ArrowDown, Copy, Trash2, Lock, Unlock, Eye, EyeOff, Ellipsis, Paintbrush, ClipboardPaste, SlidersHorizontal, MousePointer2, GripVertical, RotateCcw } from 'lucide-react'
import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { elementStyleProps } from './canvas-model'

// ---- Phần tử đang chọn: dùng chung giữa canvas (trong iframe) và bảng thư viện (ngoài iframe); cùng một module nên chia sẻ được. ----
let selected = ''
const subs = new Set<() => void>()
export const freeStore = {
  get: () => selected,
  set(id: string) {
    selected = id
    subs.forEach((f) => f())
  },
  subscribe(f: () => void) {
    subs.add(f)
    return () => {
      subs.delete(f)
    }
  },
}
export const useSelected = () => useSyncExternalStore(freeStore.subscribe, freeStore.get, () => '')

export const BRAND = 'var(--cv-accent, #2d7b57)'
export const SNAP = 6 // px thiết kế: hút vào đường gióng
export const MIN = 12
const SWATCHES = ['#ffffff', '#f3f4f6', '#111827', '#15803d', '#f59e0b', '#dc2626', '#2563eb', '#7c3aed']
export const StyleClipboardContext = React.createContext<{ style: Record<string, unknown> | null; setStyle: (style: Record<string, unknown> | null) => void } | null>(null)
export const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const
export type Handle = (typeof HANDLES)[number]
export const CURSOR: Record<Handle, string> = { nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize', n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize' }
export const TEXTY = new Set(['heading', 'text', 'button'])

export type Drag = { mode: 'move' | 'resize'; handle?: Handle; sx: number; sy: number; orig: FreeElement; list: FreeElement[]; moved: boolean }

/** Gần nhất trong các đường gióng cho một nhóm giá trị; trả độ lệch cần dịch và đường gióng. */
export function snapTo(vals: number[], lines: number[]) {
  let best: { d: number; line: number } | null = null
  for (const v of vals) for (const l of lines) {
    const d = l - v
    if (Math.abs(d) <= SNAP && (!best || Math.abs(d) < Math.abs(best.d))) best = { d, line: l }
  }
  return best
}

// ---- Thêm phần tử từ bảng thư viện ----
/** Trả hàm thêm phần tử: vào block đang chọn (bất kỳ loại), nếu chưa chọn thì block đầu trang, nếu trang trống thì tạo một "Vùng tự do" mới. */
export function useAddFreeElement() {
  const { appState, dispatch, getSelectorForId, selectedItem } = usePuck()
  return (el: FreeElement) => {
    const content = (appState.data.content ?? []) as any[]
    const target = (selectedItem ?? content[0]) as any
    freeStore.set(el.id)
    if (!target) {
      const block = { type: 'FreeCanvas', props: { id: `FreeCanvas-${newId()}`, height: 0, _els: [{ ...el, x: 80, y: 24 }] } }
      dispatch({ type: 'setData', data: { ...appState.data, content: [...content, block] } } as any)
      return
    }
    const s = getSelectorForId(target.props.id)
    if (!s) return
    const { elements: legacy, ...rest } = target.props
    const list = (rest._els ?? legacy ?? []) as FreeElement[]
    const n = list.length % 8
    const placed = { ...el, x: el.x + n * 24, y: el.y + 24 + n * 24 }
    dispatch({ type: 'replace', destinationIndex: s.index, destinationZone: s.zone, data: { ...target, props: { ...rest, _els: [...list, placed] } } } as any)
  }
}

/** Hàm chèn một section mới (canvas trống hoặc từ mẫu) ngay dưới block đang chọn, không chọn thì cuối trang. */
export function useInsertSection() {
  const { appState, dispatch, selectedItem } = usePuck()
  return (tpl: { height: number; bg?: string; els: FreeElement[] }) => {
    const content = [...((appState.data.content ?? []) as any[])]
    const at = selectedItem ? content.findIndex((c) => c.props?.id === (selectedItem as any).props?.id) : -1
    const block = { type: 'FreeCanvas', props: { id: `FreeCanvas-${newId()}`, height: tpl.height, ...(tpl.bg ? { _bgHex: tpl.bg } : {}), _els: tpl.els } }
    content.splice(at >= 0 ? at + 1 : content.length, 0, block)
    dispatch({ type: 'setData', data: { ...appState.data, content } } as any)
    freeStore.set('')
  }
}

// ---- Thanh công cụ của phần tử ----
const Btn = ({ children, onClick, active, title }: { children: React.ReactNode; onClick: () => void; active?: boolean; title: string }) => (
  <button
    type="button"
    title={title}
    aria-label={title}
    onClick={onClick}
    className="hf-tool-button"
    aria-pressed={active}
  >
    {children}
  </button>
)
const Sep = () => <span className="hf-tool-separator" aria-hidden="true" />
const Swatches = ({ value, onPick, title }: { value?: string; onPick: (c: string) => void; title: string }) => (
  <details className="hf-color" onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); e.currentTarget.open = false; e.currentTarget.querySelector('summary')?.focus() } }}>
    <summary title={title} aria-label={title}><span className="hf-color-dot" style={{ background: value ?? '#000000' }} /><ChevronDown size={11} /></summary>
    <div className="hf-color-picker">
      <span className="hf-color-title">{title}</span>
      <div className="hf-color-grid">
        {SWATCHES.map((c) => <button key={c} type="button" title={c} aria-label={title + ' ' + c} aria-pressed={(value ?? '').toLowerCase() === c} onClick={(e) => { onPick(c); e.currentTarget.closest('details')!.open = false }} style={{ background: c }} />)}
      </div>
      <label className="hf-custom-color"><span>Tùy chỉnh</span><input type="color" aria-label={title} value={/^#[0-9a-f]{6}$/i.test(value ?? '') ? value : '#000000'} onChange={(e) => onPick(e.target.value)} /></label>
    </div>
  </details>
)
const Field = ({ value, onChange, placeholder, width = 120 }: { value: string; onChange: (v: string) => void; placeholder: string; width?: number }) => (
  <input className="hf-tool-field" value={value} placeholder={placeholder} aria-label={placeholder} onChange={(e) => onChange(e.target.value)} style={{ width, maxWidth: '100%' }} />
)
const NumberField = ({ value, onChange, label, min, max, width = 58 }: { value: number; onChange: (v: number) => void; label: string; min: number; max: number; width?: number }) => (
  <input className="hf-tool-field hf-tool-number-input" type="number" value={value} min={min} max={max} aria-label={label} title={label} onChange={(e) => onChange(Math.min(max, Math.max(min, Number(e.target.value) || min)))} style={{ width }} />
)

export function Toolbar({ el, scale, hostW, patch, set, dup, del, order, onEdit, extra }: { extra?: React.ReactNode; el: FreeElement; scale: number; hostW: number; patch: (p: Record<string, any>) => void; set: (f: (e: FreeElement) => FreeElement) => void; dup: () => void; del: () => void; order: (d: 1 | -1 | 'front' | 'back') => void; onEdit: () => void }) {
  const [media, setMedia] = useState(false)
  const [localStyle, setLocalStyle] = useState<Record<string, unknown> | null>(null)
  const sharedClipboard = React.useContext(StyleClipboardContext)
  const copiedStyle = sharedClipboard ? sharedClipboard.style : localStyle
  const setCopiedStyle = sharedClipboard ? sharedClipboard.setStyle : setLocalStyle
  const toolbar = useRef<HTMLDivElement>(null)
  const [dock, setDock] = useState<{ x: number; y: number } | null>(null)
  const toolbarDrag = useRef<{ x: number; y: number; left: number; top: number } | null>(null)
  useEffect(() => { setDock(null); setMedia(false) }, [el.id])
  const dockAt = (x: number, y: number) => {
    const node = toolbar.current
    const win = node?.ownerDocument.defaultView
    return { x: Math.max(8, Math.min(x, (win?.innerWidth ?? hostW) - (node?.offsetWidth ?? 100) - 8)), y: Math.max(8, Math.min(y, Math.max(8, (win?.innerHeight ?? 700) - (node?.offsetHeight ?? 54) - 8))) }
  }
  const inspect = (mode: 'inspect' | 'states') => toolbar.current?.ownerDocument.dispatchEvent(new CustomEvent('hosso-inspect', { detail: mode }))
  const p = el.props
  // Neo theo mép dưới khi đặt phía trên: thanh có thể xuống dòng nhưng chỉ mọc lên, không đè lên phần tử.
  const above = el.y * scale > 120
  const top = above ? el.y * scale - 8 : (el.y + el.h) * scale + 8
  const toolbarWidth = Math.min(1120, Math.max(120, hostW - 16))
  const left = Math.max(8, Math.min(el.x * scale, hostW - toolbarWidth - 8))
  const cycle = (key: string, vals: number[]) => patch({ [key]: vals[(vals.indexOf(Number(p[key])) + 1) % vals.length] })
  return (
    <div ref={toolbar} role="toolbar" aria-label="Chỉnh sửa phần tử" data-editor-control="true" data-toolbar-docked={Boolean(dock)} onPointerDown={(e) => e.stopPropagation()} style={{ position: dock ? 'fixed' : 'absolute', left: dock?.x ?? left, top: dock?.y ?? top, transform: !dock && above ? 'translateY(-100%)' : undefined, maxWidth: Math.max(120, hostW - 16), pointerEvents: 'auto', zIndex: 50 }}>
      <div className="hf-toolbar" style={{ maxWidth: toolbarWidth }}>
        <button type="button" className="hf-toolbar-grip" title="Kéo thanh công cụ · nhấp đúp để đặt lại" aria-label="Kéo thanh công cụ" onDoubleClick={() => setDock(null)}
          onPointerDown={(event) => { if (event.button !== 0) return; event.preventDefault(); event.stopPropagation(); const rect = toolbar.current!.getBoundingClientRect(); toolbarDrag.current = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top }; event.currentTarget.setPointerCapture(event.pointerId); setDock(dockAt(rect.left, rect.top)) }}
          onPointerMove={(event) => { const drag = toolbarDrag.current; if (drag) setDock(dockAt(drag.left + event.clientX - drag.x, drag.top + event.clientY - drag.y)) }}
          onPointerUp={() => { toolbarDrag.current = null }} onPointerCancel={() => { toolbarDrag.current = null }} onLostPointerCapture={() => { toolbarDrag.current = null }}
          onKeyDown={(event) => { const delta: Record<string, [number, number]> = { ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, -10], ArrowDown: [0, 10] }; if (event.key === 'Home') { event.preventDefault(); setDock(null) } else if (delta[event.key]) { event.preventDefault(); event.stopPropagation(); const rect = toolbar.current!.getBoundingClientRect(); const [x, y] = delta[event.key]; setDock(dockAt(rect.left + x, rect.top + y)) } }}><GripVertical size={17} /></button>
        {dock && <Btn title="Đặt lại vị trí thanh công cụ" onClick={() => setDock(null)}><RotateCcw size={14} /></Btn>}
        {TEXTY.has(el.type) && <><Btn title="Sửa văn bản" onClick={onEdit}><Pencil size={13} />Sửa văn bản</Btn><Sep /></>}
        {TEXTY.has(el.type) && (
          <>
            <select className="hf-tool-select hf-font-select" aria-label="Font chữ" value={p.font ?? ''} onChange={(e) => patch({ font: e.target.value })}>
              <option value="">Font của site</option>
              {FREE_FONTS.map((font) => <option key={font.name} value={font.name}>{font.name}</option>)}
            </select>
            <NumberField label="Cỡ chữ" value={Number(p.size) || 18} min={8} max={200} onChange={(size) => patch({ size })} />
            <select className="hf-tool-select" aria-label="Độ đậm" value={String(p.weight ?? 400)} onChange={(e) => patch({ weight: Number(e.target.value) })}>
              {[100, 200, 300, 400, 500, 600, 700, 800, 900].map((weight) => <option key={weight} value={weight}>{weight}</option>)}
            </select>
            <Swatches title="Màu chữ" value={p.color} onPick={(c) => patch({ color: c })} />
            <Btn title="In đậm (Bold)" active={Number(p.weight) >= 700} onClick={() => patch({ weight: Number(p.weight) >= 700 ? 400 : 700 })}>
              <Bold size={15} />
            </Btn>
            <Btn title="In nghiêng" active={Boolean(p.italic)} onClick={() => patch({ italic: !p.italic })}><Italic size={15} /></Btn>
            <Btn title="Gạch chân" active={Boolean(p.underline)} onClick={() => patch({ underline: !p.underline })}><Underline size={15} /></Btn>
            {([['left', 'Căn trái', AlignLeft], ['center', 'Căn giữa', AlignCenter], ['right', 'Căn phải', AlignRight]] as const).map(([a, title, AlignIcon]) => (
              <Btn key={a} title={title} active={p.align === a} onClick={() => patch({ align: a })}>
                <AlignIcon size={15} />
              </Btn>
            ))}
            {el.type === 'heading' && (
              <select className="hf-tool-select" aria-label="Cấp tiêu đề" value={p.level} onChange={(e) => patch({ level: Number(e.target.value) })}>
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>{`H${n}`}</option>
                ))}
              </select>
            )}
            {(el.type === 'heading' || el.type === 'text') && <>
              <Swatches title="Nền khung chữ" value={p.bg} onPick={(bg) => patch({ bg })} />
              <details className="hf-box-tools">
                <summary title="Khung chữ" aria-label="Khung chữ"><Square size={16} /></summary>
                <div className="hf-box-popover">
                  <strong>Khung chữ</strong>
                  <label>Đệm ngang <NumberField label="Đệm ngang" value={Number(p.padX) || 0} min={0} max={200} onChange={(padX) => patch({ padX })} width={68} /></label>
                  <label>Đệm dọc <NumberField label="Đệm dọc" value={Number(p.padY) || 0} min={0} max={200} onChange={(padY) => patch({ padY })} width={68} /></label>
                  <label>Bo góc <NumberField label="Bo góc" value={Number(p.radius) || 0} min={0} max={200} onChange={(radius) => patch({ radius })} width={68} /></label>
                  <label>Viền <NumberField label="Độ dày viền" value={Number(p.borderW) || 0} min={0} max={20} onChange={(borderW) => patch({ borderW })} width={68} /></label>
                  <label>Căn dọc <select className="hf-tool-select" value={p.vAlign ?? 'top'} onChange={(e) => patch({ vAlign: e.target.value })}><option value="top">Trên</option><option value="center">Giữa</option><option value="bottom">Dưới</option></select></label>
                </div>
              </details>
            </>}
            <Sep />
          </>
        )}
        {el.type === 'button' && (
          <>
            <Swatches title="Màu nền nút" value={p.bg} onPick={(c) => patch({ bg: c })} />
            <Btn title="Màu chữ: đổi trắng/đen" onClick={() => patch({ color: p.color === '#ffffff' ? '#111827' : '#ffffff' })}>Aa</Btn>
            <Field value={p.href ?? ''} onChange={(v) => patch({ href: v })} placeholder="Liên kết (https://…)" width={140} />
            <Btn title="Bo góc (Đổi bán kính)" onClick={() => cycle('radius', [0, 8, 16, 999])}>
              <Radius size={15} />
            </Btn>
            <Sep />
          </>
        )}
        {el.type === 'shape' && (
          <>
            <Swatches title="Màu nền" value={p.bg} onPick={(c) => patch({ bg: c })} />
            <Btn title="Bo góc" onClick={() => cycle('radius', [0, 12, 32, 999])}>
              <Radius size={15} />
            </Btn>
            <Btn title="Viền" active={Boolean(p.borderW)} onClick={() => patch({ borderW: p.borderW ? 0 : 2 })}>
              <Square size={15} />
            </Btn>
            <Sep />
          </>
        )}
        {el.type === 'line' && (
          <>
            <Swatches title="Màu đường kẻ" value={p.color} onPick={(c) => patch({ color: c })} />
            <Btn title="Độ dày" onClick={() => cycle('thickness', [1, 2, 4, 8])}>{p.thickness}px</Btn>
            <Btn title="Nét đứt" active={p.dashed} onClick={() => patch({ dashed: !p.dashed })}>┄</Btn>
            <Btn title="Xoay ngang/dọc" onClick={() => set((e) => ({ ...e, w: e.h, h: e.w, props: { ...e.props, vertical: !e.props.vertical } }))}><RotateCw size={15} /></Btn>
            <Sep />
          </>
        )}
        {el.type === 'icon' && (
          <>
            <Swatches title="Màu icon" value={p.color} onPick={(c) => patch({ color: c })} />
            <select aria-label="Chọn icon" value={p.name} onChange={(e) => patch({ name: e.target.value })} style={{ height: 24, borderRadius: 6, border: 0, font: 'inherit', fontSize: 12, background: 'rgba(255,255,255,0.15)', color: '#374151', padding: '0 4px', cursor: 'pointer' }}>
              {FREE_ICONS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <Sep />
          </>
        )}
        {el.type === 'image' && (
          <>
            <Btn title="Chọn ảnh" onClick={() => setMedia((m) => !m)}>Đổi ảnh</Btn>
            <Field value={p.alt ?? ''} onChange={(v) => patch({ alt: v })} placeholder="Mô tả ảnh" width={110} />
            <Btn title="Bo góc" onClick={() => cycle('radius', [0, 8, 20, 999])}>
              <Radius size={15} />
            </Btn>
            <Sep />
          </>
        )}
        {el.type === 'video' && (
          <>
            <Field value={p.url ?? ''} onChange={(v) => patch({ url: v })} placeholder="Link YouTube hoặc video" width={180} />
            <Sep />
          </>
        )}
        <Btn title={p._locked ? 'Mở khóa' : 'Khóa vị trí'} active={Boolean(p._locked)} onClick={() => patch({ _locked: !p._locked })}>{p._locked ? <Unlock size={15} /> : <Lock size={15} />}</Btn>
        <Btn title={p._hidden ? 'Hiện phần tử' : 'Ẩn phần tử'} active={Boolean(p._hidden)} onClick={() => patch({ _hidden: !p._hidden })}>{p._hidden ? <Eye size={15} /> : <EyeOff size={15} />}</Btn>
        <Btn title="Căn giữa phần tử" onClick={() => !p._locked && set((el) => ({ ...el, x: Math.round((1200 - el.w) / 2) }))}><AlignCenter size={15} /></Btn>
        <Btn title="Thuộc tính" onClick={() => inspect('inspect')}><SlidersHorizontal size={15} /></Btn>
        {['button', 'image', 'text', 'heading'].includes(el.type) && <Btn title="Trạng thái phần tử" onClick={() => inspect('states')}><MousePointer2 size={15} /></Btn>}
        <details className="hf-actions"><summary aria-label="Thao tác khác" title="Thao tác khác"><Ellipsis size={16} /></summary><div>
          <Btn title="Sao chép kiểu" onClick={() => setCopiedStyle(elementStyleProps(p))}><Paintbrush size={15} /></Btn>
          <button type="button" className="hf-tool-button" title="Dán kiểu" aria-label="Dán kiểu" disabled={!copiedStyle} onClick={() => copiedStyle && set((el) => { const props = { ...el.props }; for (const key of Object.keys(elementStyleProps(props))) delete props[key]; return { ...el, props: { ...props, ...structuredClone(copiedStyle) } } })}><ClipboardPaste size={15} /></button>
        </div></details>
        <Btn title="Lên một lớp (Ctrl+])" onClick={() => order(1)}>
          <ArrowUp size={15} />
        </Btn>
        <Btn title="Xuống một lớp (Ctrl+[)" onClick={() => order(-1)}>
          <ArrowDown size={15} />
        </Btn>
        <Btn title="Nhân đôi (Ctrl+D)" onClick={dup}>
          <Copy size={15} />
        </Btn>
        <Btn title="Xóa (Delete)" onClick={del}>
          <Trash2 size={15} />
        </Btn>
        {extra}
      </div>
      {media && el.type === 'image' && (
        <div style={{ marginTop: 6, width: 300, padding: 10, background: '#fff', color: '#111', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,.25)' }}>
          <MediaField value={p.src ?? ''} onChange={(v) => { patch({ src: v }); setMedia(false) }} kind="image" />
        </div>
      )}
    </div>
  )
 }

export type InlineTextValue = { text: string; richText: string }
const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')

/** Sửa rich text tại chỗ: chọn một đoạn rồi đổi font/màu/đậm; Ctrl+Enter lưu, Esc hủy. */
export function InlineText({ el, scale = 1, onDone }: { el: FreeElement; scale?: number; onDone: (value: InlineTextValue | null) => void }) {
  const root = useRef<HTMLDivElement>(null)
  const ref = useRef<HTMLDivElement>(null)
  const range = useRef<Range | null>(null)
  const finished = useRef(false)
  const p = el.props
  const done = (cancel = false) => {
    if (finished.current) return
    finished.current = true
    if (cancel || !ref.current) { onDone(null); return }
    const raw = ref.current.innerHTML.replace(/<div><br\s*\/?><\/div>/gi, '<br>').replace(/<div>/gi, '<br>').replace(/<\/div>/gi, '').replace(/<p>/gi, '').replace(/<\/p>/gi, '<br>')
    onDone({ text: ref.current.innerText.replace(/\n$/, ''), richText: sanitizeRichText(raw) })
  }
  const restore = () => {
    const selection = ref.current?.ownerDocument.defaultView?.getSelection()
    if (!selection || !range.current) return
    selection.removeAllRanges()
    selection.addRange(range.current)
  }
  const command = (name: string, value?: string) => {
    restore()
    ref.current?.ownerDocument.execCommand(name, false, value)
    ref.current?.focus({ preventScroll: true })
  }
  const fontSize = (value: string) => {
    command('fontSize', '7')
    ref.current?.querySelectorAll('font[size="7"]').forEach((node) => { (node as HTMLElement).style.fontSize = `${value}px`; node.removeAttribute('size') })
  }
  useEffect(() => {
    const n = ref.current
    if (!n) return
    n.focus()
    const r = n.ownerDocument.createRange()
    r.selectNodeContents(n)
    const s = n.ownerDocument.defaultView?.getSelection()
    s?.removeAllRanges()
    s?.addRange(r)
    const remember = () => {
      const selection = n.ownerDocument.defaultView?.getSelection()
      if (selection?.rangeCount && n.contains(selection.anchorNode)) range.current = selection.getRangeAt(0).cloneRange()
    }
    n.ownerDocument.addEventListener('selectionchange', remember)
    return () => n.ownerDocument.removeEventListener('selectionchange', remember)
  }, [])
  const boxBackground = p.bg2 && p.bg ? `linear-gradient(${Number(p.angle ?? 135)}deg,${p.bg},${p.bg2})` : p.bg
  const above = el.y * scale > 60
  return (
    <div ref={root} data-editor-control="true" onPointerDown={(e) => e.stopPropagation()} style={{ position: 'relative', width: '100%', height: '100%', zIndex: 80 }}>
      <div className="hf-rich-toolbar" role="toolbar" aria-label="Định dạng đoạn chữ" onPointerDown={(e) => e.preventDefault()} style={{ top: above ? -52 : 'calc(100% + 8px)' }}>
        <button type="button" title="Đậm" onClick={() => command('bold')}><Bold size={15} /></button>
        <button type="button" title="Nghiêng" onClick={() => command('italic')}><Italic size={15} /></button>
        <button type="button" title="Gạch chân" onClick={() => command('underline')}><Underline size={15} /></button>
        <button type="button" title="Gạch ngang" onClick={() => command('strikeThrough')}><Strikethrough size={15} /></button>
        <select aria-label="Cỡ chữ đoạn đã chọn" defaultValue={String(p.size ?? 18)} onChange={(e) => fontSize(e.target.value)}>{[12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 56, 64, 72, 96, 120].map((size) => <option key={size} value={size}>{size}px</option>)}</select>
        <select aria-label="Font đoạn đã chọn" defaultValue="" onChange={(e) => command('fontName', e.target.value)}><option value="">Font</option>{FREE_FONTS.map((font) => <option key={font.name} value={font.name}>{font.name}</option>)}</select>
        <label title="Màu chữ"><span>A</span><input type="color" defaultValue={/^#[0-9a-f]{6}$/i.test(p.color ?? '') ? p.color : '#111827'} onInput={(e) => command('foreColor', e.currentTarget.value)} /></label>
        <label title="Màu nền chữ"><span>▰</span><input type="color" defaultValue="#fff59d" onInput={(e) => command('hiliteColor', e.currentTarget.value)} /></label>
        <button type="button" className="hf-rich-done" onClick={() => done()}>Xong</button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        dangerouslySetInnerHTML={{ __html: sanitizeRichText(p.richText) || escapeHtml(String(p.text ?? '')) }}
        onBlur={() => setTimeout(() => { if (!root.current?.contains(root.current.ownerDocument.activeElement)) done() }, 0)}
        onKeyDown={(e) => {
          e.stopPropagation()
          if (e.key === 'Escape') { e.preventDefault(); done(true) }
          else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); done() }
        }}
        style={{ width: '100%', height: '100%', boxSizing: 'border-box', outline: `2px solid ${BRAND}`, cursor: 'text', padding: `${Number(p.padY ?? 0) * scale}px ${Number(p.padX ?? 0) * scale}px`, display: 'flex', flexDirection: 'column', justifyContent: p.vAlign === 'bottom' ? 'flex-end' : p.vAlign === 'center' ? 'center' : 'flex-start', color: p.color, background: boxBackground, border: p.borderW ? `${Number(p.borderW) * scale}px solid ${p.borderColor ?? '#111827'}` : undefined, borderRadius: Number(p.radius ?? 0) * scale, fontFamily: p.font ? `"${p.font}"` : 'inherit', fontSize: Number(p.size ?? 18) * scale, fontWeight: p.weight ?? 400, fontStyle: p.italic ? 'italic' : 'normal', lineHeight: p.lh ?? 1.25, letterSpacing: Number(p.spacing ?? 0) * scale, textAlign: p.align ?? 'left', textDecoration: p.underline ? 'underline' : undefined, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
      />
    </div>
  )
}

// ---- Lớp chỉnh sửa phủ lên mỗi block ----
// CSS nằm cùng component để chắc chắn có trong iframe xem trước.
export const HF_CSS = `
.hf-el:hover{outline:1px solid color-mix(in srgb,var(--cv-accent,#2d7b57) 55%,transparent)}
.hf-toolbar{display:flex;align-items:center;gap:4px;flex-wrap:wrap;padding:8px;background:#fff;color:#303842;border:1px solid #dfe3e8;border-radius:8px;box-shadow:0 4px 16px #18233314;font:12px/1.3 system-ui,sans-serif;letter-spacing:0;box-sizing:border-box}
.hf-toolbar *{box-sizing:border-box}
.hf-toolbar-grip{align-self:stretch;display:grid;place-items:center;min-width:20px;padding:0;border:0;border-right:1px solid #e5e7eb;background:transparent;color:#737b86;cursor:grab;touch-action:none}
.hf-toolbar-grip:active{cursor:grabbing}
.hf-tool-button>svg{width:17px;height:17px}
.hf-tool-button{display:inline-flex;align-items:center;justify-content:center;gap:6px;flex-shrink:0;min-width:36px;height:38px;padding:0 9px;border:0;border-radius:5px;background:transparent;color:#505863;cursor:pointer;font:500 12px/1 system-ui,sans-serif;white-space:nowrap;transition:background .12s,transform .12s}
.hf-tool-button:active:not(:disabled){transform:scale(.94)}
@media(prefers-reduced-motion:reduce){.hf-tool-button{transition:none;transform:none!important}}
@media(prefers-reduced-transparency:reduce){.hf-toolbar{background:#fff;backdrop-filter:none}}
@media(prefers-contrast:more){.hf-toolbar{background:#fff;border-color:#68717d;backdrop-filter:none}}
.hf-tool-button:hover{background:#f3f4f6;color:#374151}
.hf-tool-button[aria-pressed=true]{background:#edf5ef;color:#2d7b57}
.hf-tool-button[aria-label="Sửa văn bản"]{padding:0 10px;background:#edf5ef;color:#2d7b57}
.hf-tool-button[aria-label="Sửa văn bản"]:hover{background:#deede2}
.hf-tool-button[aria-label="Xóa (Delete)"]{color:#b54a43}
.hf-tool-button[aria-label="Xóa (Delete)"]:hover{background:#fbefee;color:#9e322b}
.hf-toolbar button:focus-visible,.hf-toolbar summary:focus-visible,.hf-toolbar input:focus-visible,.hf-toolbar select:focus-visible{outline:2px solid #2d7b57;outline-offset:2px}
.hf-tool-separator{width:1px;height:18px;flex-shrink:0;margin:0 3px;background:#e5e7eb}
.hf-tool-number{min-width:26px;text-align:center;color:#374151;font-weight:600;font-variant-numeric:tabular-nums}
.hf-tool-field,.hf-tool-select{height:38px;min-width:0;padding:0 8px;border:1px solid #e5e7eb;border-radius:4px;background:#f9fafb;color:#4b5563;font:12px Arial,sans-serif}
.hf-tool-select{cursor:pointer;padding:0 5px}
.hf-font-select{width:112px}
.hf-tool-number-input{font-variant-numeric:tabular-nums;text-align:center}
.hf-box-tools{position:relative}
.hf-box-tools>summary{display:grid;place-items:center;width:36px;height:38px;border-radius:5px;cursor:pointer;list-style:none}
.hf-box-tools>summary::-webkit-details-marker{display:none}
.hf-box-tools>summary:hover,.hf-box-tools[open]>summary{background:#f3f4f6;color:#374151}
.hf-box-popover{position:absolute;left:0;top:calc(100% + 10px);z-index:80;display:grid;gap:10px;width:224px;padding:14px;border:1px solid #dfe3e8;border-radius:8px;background:#fff;box-shadow:0 14px 34px #1823331a}
.hf-box-popover>strong{font-size:12px}
.hf-box-popover>label{display:flex;align-items:center;justify-content:space-between;gap:12px;color:#626b76;font-size:11px}
.hf-rich-toolbar{position:absolute;left:0;display:flex;align-items:center;gap:4px;min-width:max-content;padding:6px;border:1px solid #dfe3e8;border-radius:8px;background:#fff;color:#374151;box-shadow:0 12px 30px #1823331a;z-index:100;font:12px/1 system-ui,sans-serif}
.hf-rich-toolbar button{display:grid;place-items:center;height:32px;min-width:32px;padding:0 8px;border:0;border-radius:5px;background:transparent;color:inherit;cursor:pointer}
.hf-rich-toolbar button:hover{background:#f3f4f6}
.hf-rich-toolbar select{height:32px;max-width:112px;border:1px solid #e5e7eb;border-radius:5px;background:#f9fafb;color:#374151;font:12px system-ui,sans-serif}
.hf-rich-toolbar label{position:relative;display:grid;place-items:center;width:32px;height:32px;border-radius:5px;cursor:pointer;font-weight:700}
.hf-rich-toolbar label:hover{background:#f3f4f6}
.hf-rich-toolbar label input{position:absolute;inset:auto 3px 2px;width:26px;height:5px;padding:0;border:0;opacity:.9;cursor:pointer}
.hf-rich-toolbar .hf-rich-done{display:block;margin-left:4px;padding:0 12px;background:#edf5ef;color:#2d7b57;font-weight:700}
.hf-rich-toolbar .hf-rich-done:hover{background:#deede2}
.hf-color{position:relative;margin:0;border:0;padding:0}
.hf-color>summary{display:flex;align-items:center;gap:6px;height:38px;padding:0 7px;border-radius:4px;cursor:pointer;list-style:none;color:#626b76}
.hf-color>summary::-webkit-details-marker{display:none}
.hf-color>summary:hover,.hf-color[open]>summary{background:#f3f4f6}
.hf-color-dot{display:block;width:17px;height:17px;border:1px solid #adb5bf;border-radius:4px;box-shadow:inset 0 0 0 2px #fff}
.hf-color-picker{position:absolute;top:calc(100% + 10px);left:0;width:164px;padding:12px;border:1px solid #dfe3e8;border-radius:7px;background:#fff;color:#4b5563;box-shadow:0 8px 24px #18233314;z-index:2}
.hf-color-title{display:block;margin-bottom:10px;font-size:11px;font-weight:600}
.hf-color-grid{display:grid;grid-template-columns:repeat(4,26px);gap:8px}
.hf-color-grid button{width:26px;height:26px;padding:0;border:1px solid #dfe3e8;border-radius:5px;cursor:pointer}
.hf-color-grid button:hover,.hf-color-grid button[aria-pressed=true]{outline:2px solid #2d7b57;outline-offset:2px}
.hf-custom-color{display:flex;align-items:center;justify-content:space-between;margin-top:12px;padding-top:10px;border-top:1px solid #eef0f3;font-size:11px}
.hf-custom-color input{width:28px;height:24px;border:1px solid #dfe3e8;border-radius:4px;padding:2px;background:#fff;cursor:pointer}
`

function FreeLayer({ id, elements, isFree }: { id: string; elements: FreeElement[]; isFree: boolean }) {
  const { dispatch, getItemById, getSelectorForId, selectedItem } = usePuck()
  const blockSelected = isFree && (selectedItem as any)?.props?.id === id
  const [hDraft, setHDraft] = useState<number | null>(null)
  const hDrag = useRef<{ sy: number; h0: number } | null>(null)
  const hRef = useRef(0)
  const sel = useSelected()
  const host = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: FREE_W, h: 0 })
  const [draft, setDraft] = useState<FreeElement[] | null>(null)
  const draftRef = useRef<FreeElement[] | null>(null)
  const [editing, setEditing] = useState('')
  const [guides, setGuides] = useState<{ v?: number; h?: number }>({})
  const drag = useRef<Drag | null>(null)
  const els = draft ?? elements
  const hostW = size.w
  const scale = hostW / FREE_W
  const cur = els.find((e) => e.id === sel)

  useEffect(() => {
    const n = host.current
    if (!n) return
    const measure = () => setSize({ w: n.clientWidth || FREE_W, h: n.clientHeight })
    const ro = new ResizeObserver(measure)
    ro.observe(n)
    measure()
    return () => ro.disconnect()
  }, [])

  const commit = (next: FreeElement[]) => {
    const s = getSelectorForId(id)
    const item = getItemById(id) as any
    if (!s || !item) return
    const rounded = next.map((e) => ({ ...e, x: Math.round(e.x), y: Math.round(e.y), w: Math.round(e.w), h: Math.round(e.h) }))
    const { elements: _legacy, ...rest } = item.props
    dispatch({ type: 'replace', destinationIndex: s.index, destinationZone: s.zone, data: { ...item, props: { ...rest, _els: rounded } } } as any)
    draftRef.current = null
    setDraft(null)
  }
  const mapOne = (elId: string, f: (e: FreeElement) => FreeElement) => els.map((e) => (e.id === elId ? f(e) : e))
  const patch = (p: Record<string, any>) => cur && commit(mapOne(cur.id, (e) => ({ ...e, props: { ...e.props, ...p } })))
  const set = (f: (e: FreeElement) => FreeElement) => cur && commit(mapOne(cur.id, f))
  const del = () => {
    if (!cur) return
    commit(els.filter((e) => e.id !== cur.id))
    freeStore.set('')
  }
  const dup = () => {
    if (!cur) return
    const copy = { ...cur, id: newId(), x: cur.x + 24, y: cur.y + 24, props: { ...cur.props } }
    commit([...els, copy])
    freeStore.set(copy.id)
  }
  const order = (d: 1 | -1 | 'front' | 'back') => {
    if (!cur) return
    const i = els.findIndex((e) => e.id === cur.id)
    const j = d === 'front' ? els.length - 1 : d === 'back' ? 0 : Math.min(els.length - 1, Math.max(0, i + d))
    const next = [...els]
    next.splice(i, 1)
    next.splice(j, 0, cur)
    commit(next)
  }

  const start = (e: React.PointerEvent, el: FreeElement, mode: Drag['mode'], handle?: Handle) => {
    e.stopPropagation() // chặn kéo-thả block của Puck
    if (editing) return
    freeStore.set(el.id)
    host.current?.focus({ preventScroll: true })
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { mode, handle, sx: e.clientX, sy: e.clientY, orig: el, list: els, moved: false }
  }
  const onMove = (e: React.PointerEvent) => {
    if (hDrag.current) {
      hRef.current = Math.max(80, Math.round(hDrag.current.h0 + (e.clientY - hDrag.current.sy) / scale))
      setHDraft(hRef.current)
      return
    }
    const d = drag.current
    if (!d) return
    const dx = (e.clientX - d.sx) / scale
    const dy = (e.clientY - d.sy) / scale
    if (!d.moved && Math.hypot(dx, dy) < 3) return
    d.moved = true
    const o = d.orig
    const boxH = size.h / scale
    const others = d.list.filter((x) => x.id !== o.id)
    const xs = [0, FREE_W / 2, FREE_W, ...others.flatMap((x) => [x.x, x.x + x.w / 2, x.x + x.w])]
    const ys = [0, boxH / 2, boxH, ...others.flatMap((x) => [x.y, x.y + x.h / 2, x.y + x.h])]
    let { x, y, w, h } = o
    const g: { v?: number; h?: number } = {}
    if (d.mode === 'move') {
      x = o.x + dx
      y = o.y + dy
      const sx = snapTo([x, x + w / 2, x + w], xs)
      const sy = snapTo([y, y + h / 2, y + h], ys)
      if (sx) { x += sx.d; g.v = sx.line }
      if (sy) { y += sy.d; g.h = sy.line }
    } else {
      const hd = d.handle as Handle
      if (hd.includes('e')) w = Math.max(MIN, o.w + dx)
      if (hd.includes('w')) { w = Math.max(MIN, o.w - dx); x = o.x + o.w - w }
      if (hd.includes('s')) h = Math.max(MIN, o.h + dy)
      if (hd.includes('n')) { h = Math.max(MIN, o.h - dy); y = o.y + o.h - h }
    }
    const next = d.list.map((it) => (it.id === o.id ? { ...it, x, y, w, h } : it))
    draftRef.current = next
    setDraft(next)
    setGuides(g)
  }
  const onUp = () => {
    if (hDrag.current) {
      hDrag.current = null
      const s = getSelectorForId(id)
      const item = getItemById(id) as any
      if (s && item) dispatch({ type: 'replace', destinationIndex: s.index, destinationZone: s.zone, data: { ...item, props: { ...item.props, height: hRef.current } } } as any)
      setHDraft(null)
      return
    }
    const d = drag.current
    drag.current = null
    setGuides({})
    if (d?.moved && draftRef.current) commit(draftRef.current)
  }
  const onKey = (e: React.KeyboardEvent) => {
    if (editing || !cur) return
    const step = e.shiftKey ? 10 : 1
    const nudge: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); del() }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') { e.preventDefault(); dup() }
    else if (nudge[e.key]) { e.preventDefault(); const [nx, ny] = nudge[e.key]; set((it) => ({ ...it, x: it.x + nx, y: it.y + ny })) }
    else if (e.key === 'Escape') freeStore.set('')
  }

  const px = (n: number) => n * scale
  // Host không nhận chuột (để click xuyên xuống block, Puck vẫn chọn được block); chỉ phần tử, tay nắm và thanh công cụ nhận.
  return (
    <div
      ref={host}
      tabIndex={-1}
      onKeyDown={onKey}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, width: `min(100%, ${FREE_MAX_PX}px)`, margin: '0 auto', containerType: 'inline-size', pointerEvents: 'none', outline: 'none' }}
    >
      <style>{HF_CSS}</style>
      {isFree && els.length === 0 && <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#6b7280', fontSize: 15, textAlign: 'center', padding: 24, border: '1px dashed #cbd5e1' }}>Vùng tự do: mở tab “Văn bản” hoặc “Phần tử” bên trái rồi bấm để thêm chữ, nút, hình…</div>}
      {els.map((el) => (
        <div
          key={el.id}
          className="hf-el"
          onPointerDown={(e) => start(e, el, 'move')}
          onDoubleClick={() => TEXTY.has(el.type) && setEditing(el.id)}
          style={{ position: 'absolute', left: `${(el.x / FREE_W) * 100}%`, top: `${(el.y / FREE_W) * 100}cqw`, width: `${(el.w / FREE_W) * 100}%`, height: `${(el.h / FREE_W) * 100}cqw`, cursor: editing === el.id ? 'text' : 'move', touchAction: 'none', userSelect: 'none', pointerEvents: 'auto' }}
        >
          {editing === el.id ? (
            <InlineText el={el} scale={scale} onDone={(value) => { setEditing(''); if (value) commit(mapOne(el.id, (it) => ({ ...it, props: { ...it.props, text: value.text, richText: value.richText } }))) }} />
          ) : (
            <div style={{ width: '100%', height: '100%', pointerEvents: 'none' }}>
              <FreeElementView el={el} editing />
            </div>
          )}
        </div>
      ))}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {blockSelected && (
          <>
            <div
              title="Kéo để đổi chiều cao phần"
              onPointerDown={(e) => {
                e.stopPropagation()
                e.currentTarget.setPointerCapture(e.pointerId)
                hDrag.current = { sy: e.clientY, h0: size.h / scale }
                hRef.current = Math.round(size.h / scale)
                setHDraft(hRef.current)
              }}
              style={{ position: 'absolute', left: '50%', bottom: 0, transform: 'translate(-50%, 50%)', width: 72, height: 14, borderRadius: 7, background: '#fff', border: `1.5px solid ${BRAND}`, cursor: 'ns-resize', pointerEvents: 'auto', zIndex: 40, touchAction: 'none' }}
            />
            {hDraft != null && (
              <>
                <div style={{ position: 'absolute', left: 0, right: 0, top: px(hDraft), borderTop: `2px dashed ${BRAND}` }} />
                <span style={{ position: 'absolute', left: '50%', top: px(hDraft) + 6, transform: 'translateX(-50%)', padding: '2px 6px', background: '#111827', color: '#fff', borderRadius: 4, fontSize: 11 }}>{hDraft}px</span>
              </>
            )}
          </>
        )}
        {guides.v != null && <div style={{ position: 'absolute', left: px(guides.v), top: 0, bottom: 0, width: 1, background: '#f43f5e' }} />}
        {guides.h != null && <div style={{ position: 'absolute', top: px(guides.h), left: 0, right: 0, height: 1, background: '#f43f5e' }} />}
        {cur && editing !== cur.id && (
          <>
            <div style={{ position: 'absolute', left: px(cur.x), top: px(cur.y), width: px(cur.w), height: px(cur.h), outline: `1.5px solid ${BRAND}` }}>
              {HANDLES.map((hd) => {
                const hx = hd.includes('w') ? 0 : hd.includes('e') ? 100 : 50
                const hy = hd.includes('n') ? 0 : hd.includes('s') ? 100 : 50
                return (
                  <span key={hd} onPointerDown={(e) => start(e, cur, 'resize', hd)} style={{ position: 'absolute', left: `${hx}%`, top: `${hy}%`, width: 10, height: 10, marginLeft: -5, marginTop: -5, background: '#fff', border: `1.5px solid ${BRAND}`, borderRadius: 3, pointerEvents: 'auto', cursor: CURSOR[hd], touchAction: 'none' }} />
                )
              })}
              <span style={{ position: 'absolute', left: '50%', top: '100%', transform: 'translateX(-50%)', marginTop: 8, padding: '2px 6px', background: '#111827', color: '#fff', borderRadius: 4, fontSize: 11, whiteSpace: 'nowrap' }}>{Math.round(cur.w)} × {Math.round(cur.h)}</span>
            </div>
            <Toolbar el={cur} scale={scale} hostW={hostW} patch={patch} set={set} dup={dup} del={del} order={order} onEdit={() => setEditing(cur.id)} />
          </>
        )}
      </div>
    </div>
  )
}

/** Bọc renderer của một block để phủ thêm lớp phần tử chỉnh được (prop `_els`; `elements` là tên cũ của khối Vùng tự do). */
export const withFreeLayer = (Orig: any, type: string) =>
  function WithFreeLayer(props: any) {
    const els = (props._els ?? props.elements ?? []) as FreeElement[]
    return (
      <div style={{ position: 'relative' }}>
        <Orig {...props} _noFree />
        <FreeLayer id={props.id} elements={els} isFree={type === 'FreeCanvas'} />
      </div>
    )
  }
