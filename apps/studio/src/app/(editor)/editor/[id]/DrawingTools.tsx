'use client'
import React, { createContext, useContext, useRef, useState } from 'react'
import { DEFAULT_DRAWING, normalizeGuides, type CanvasGuide, type DrawingOptions } from './canvas-guides'

export const DrawingContext = createContext<DrawingOptions>(DEFAULT_DRAWING)
export function DrawingPanel({ value, onChange }: { value: DrawingOptions; onChange: (value: DrawingOptions) => void }) {
  return <div className="cv-workbench-panel"><p className="cv-tool-help">Kéo từ thước ngang xuống để tạo guide ngang; kéo từ thước dọc sang phải để tạo guide dọc. Kéo guide ra ngoài canvas hoặc nhấn Delete để xóa. Các guide được lưu cùng trang theo thiết bị.</p>
    {([['rulers', 'Hiện thước và guide'], ['grid', 'Hiện lưới'], ['snap', 'Hít vào guide và phần tử'], ['distances', 'Hiện khoảng cách gần nhất']] as const).map(([key, title]) => <label key={key} className="cv-tool-check"><input type="checkbox" checked={value[key]} onChange={(event) => onChange({ ...value, [key]: event.target.checked })} />{title}</label>)}
    <label className="cv-tool-field">Bước lưới (px trên canvas)<input type="number" min={4} max={100} value={value.gridSize} onChange={(event) => onChange({ ...value, gridSize: Math.min(100, Math.max(4, Number(event.target.value) || 20)) })} /></label>
    <p className="cv-tool-help">Giữ Ctrl hoặc ⌘ trong lúc kéo để tạm bỏ hít. Khoảng cách hiển thị theo hệ tọa độ thiết kế 1200px.</p>
  </div>
}

/** The rulers share the element layer's coordinate system and remain inside the preview iframe. */
export function CanvasRulers({ width, height, scale, value, onChange }: { width: number; height: number; scale: number; value: unknown; onChange: (guides: CanvasGuide[]) => void }) {
  const options = useContext(DrawingContext)
  const host = useRef<HTMLDivElement>(null)
  const drag = useRef<{ guide: CanvasGuide; initial: CanvasGuide[] } | null>(null)
  const [draft, setDraft] = useState<CanvasGuide[] | null>(null)
  const guides = draft ?? normalizeGuides(value)
  if (!options.rulers && !options.grid) return null
  const move = (event: React.PointerEvent) => {
    if (!drag.current || !scale) return
    const rect = host.current!.getBoundingClientRect(), guide = drag.current.guide
    const coordinate = ((guide.axis === 'x' ? event.clientX - rect.left : event.clientY - rect.top) / scale)
    drag.current.guide = { ...guide, value: Math.round(coordinate) }
    setDraft([...drag.current.initial, drag.current.guide])
  }
  const start = (event: React.PointerEvent, axis: 'x' | 'y', guide?: CanvasGuide) => {
    event.preventDefault(); event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { guide: guide ?? { id: crypto.randomUUID(), axis, value: 0 }, initial: guides.filter((item) => item.id !== guide?.id) }
    move(event)
  }
  const finish = () => {
    if (!drag.current) return
    const { guide, initial } = drag.current
    onChange([...initial, ...(guide.value >= 0 && guide.value <= (guide.axis === 'x' ? width : height) ? [guide] : [])])
    drag.current = null; setDraft(null)
  }
  const pointer = { onPointerMove: move, onPointerUp: finish, onPointerCancel: () => { drag.current = null; setDraft(null) } }
  return <div ref={host} data-free-ui="1" data-editor-control="true" className="cv-rulers" style={{ position: 'absolute', inset: 0, zIndex: 32, pointerEvents: 'none' }}>
    {options.grid && <div aria-hidden="true" style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(#2d7b5712 1px,transparent 1px),linear-gradient(90deg,#2d7b5712 1px,transparent 1px)', backgroundSize: `${options.gridSize * scale}px ${options.gridSize * scale}px` }} />}
    {options.rulers && <>
      <div role="button" tabIndex={0} aria-label="Thước ngang: kéo để thêm guide ngang" className="cv-ruler cv-ruler-top" onPointerDown={(event) => start(event, 'y')} {...pointer} onKeyDown={(event) => { if (event.key === 'Enter') onChange([...guides, { id: crypto.randomUUID(), axis: 'y', value: Math.round(height / 2) }]) }}>
        {Array.from({ length: 25 }, (_, i) => <span key={i} style={{ left: i * 50 * scale - 18 }}>{i * 50}</span>)}
      </div>
      <div role="button" tabIndex={0} aria-label="Thước dọc: kéo để thêm guide dọc" className="cv-ruler cv-ruler-left" onPointerDown={(event) => start(event, 'x')} {...pointer} onKeyDown={(event) => { if (event.key === 'Enter') onChange([...guides, { id: crypto.randomUUID(), axis: 'x', value: Math.round(width / 2) }]) }}>
        {Array.from({ length: Math.min(100, Math.ceil(height / 50)) }, (_, i) => <span key={i} style={{ top: i * 50 * scale - 18 }}>{i * 50}</span>)}
      </div>
      {guides.map((guide) => <div key={guide.id} role="slider" tabIndex={0} aria-label={guide.axis === 'x' ? 'Guide dọc' : 'Guide ngang'} aria-valuemin={0} aria-valuemax={guide.axis === 'x' ? width : Math.round(height)} aria-valuenow={guide.value} title={`${guide.value}px · kéo ra ngoài để xóa`} className={`cv-guide cv-guide-${guide.axis}`} style={guide.axis === 'x' ? { left: guide.value * scale } : { top: guide.value * scale }}
        onPointerDown={(event) => start(event, guide.axis, guide)} {...pointer}
        onKeyDown={(event) => { const delta = ['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : ['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : 0; if (delta || ['Delete', 'Backspace'].includes(event.key)) { event.preventDefault(); event.stopPropagation(); onChange(guides.flatMap((item) => item.id !== guide.id ? [item] : delta ? [{ ...item, value: Math.max(0, Math.min(guide.axis === 'x' ? width : height, item.value + delta * (event.shiftKey ? 10 : 1))) }] : [])) } }} />)}
    </>}
  </div>
}
