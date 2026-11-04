'use client'
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Sel } from './canvas-model'

const editable = (target: EventTarget | null) => Boolean((target as Element | null)?.closest?.('input,textarea,select,[contenteditable],button,dialog[open]'))
export function CanvasNavigator({ doc, viewport, frame, scale, zoom, onZoom, width, onWidth, sel, preview }: { doc: Document | null; viewport: React.RefObject<HTMLDivElement | null>; frame: React.RefObject<HTMLIFrameElement | null>; scale: number; zoom: number | 'fit'; onZoom?: (zoom: number | 'fit') => void; width: number; onWidth?: (width: number) => void; sel?: Sel; preview?: boolean }) {
  const state = useRef({ scale, onZoom, preview }); state.current = { scale, onZoom, preview }
  const anchor = useRef<{ x: number; y: number; screenX: number; screenY: number } | null>(null)
  const [map, setMap] = useState({ width: 1200, height: 800, top: 0, view: 800, sections: [] as { id: string; y: number; h: number }[] })
  const [showMap, setShowMap] = useState(false)
  useLayoutEffect(() => {
    const point = anchor.current, view = doc?.defaultView, outer = viewport.current, f = frame.current
    if (!point || !view || !outer || !f) return
    anchor.current = null
    const rect = f.getBoundingClientRect()
    outer.scrollLeft += rect.left + point.x * scale - point.screenX
    view.scrollTo({ left: view.scrollX, top: point.y - (point.screenY - rect.top) / scale, behavior: 'instant' })
  }, [scale, doc])
  useEffect(() => {
    const view = doc?.defaultView, outer = viewport.current, f = frame.current
    if (!doc || !view || !outer || !f) return
    let space = false, drag: { x: number; y: number; left: number; top: number } | null = null
    const reset = () => { space = false; drag = null; delete doc.body.dataset.panning; doc.body.style.cursor = '' }
    const downKey = (e: KeyboardEvent) => { if (e.code !== 'Space' || editable(e.target) || state.current.preview) return; e.preventDefault(); space = true; doc.body.dataset.panning = 'true'; doc.body.style.cursor = 'grab' }
    const upKey = (e: KeyboardEvent) => { if (e.code === 'Space') reset() }
    const down = (e: PointerEvent) => { if (!space || e.button !== 0) return; e.preventDefault(); e.stopImmediatePropagation(); doc.body.setPointerCapture(e.pointerId); drag = { x: e.clientX, y: e.clientY, left: outer.scrollLeft, top: view.scrollY }; doc.body.style.cursor = 'grabbing' }
    const move = (e: PointerEvent) => { if (!drag) return; e.preventDefault(); outer.scrollLeft = drag.left - (e.clientX - drag.x) * state.current.scale; view.scrollTo({ left: view.scrollX, top: drag.top - (e.clientY - drag.y), behavior: 'instant' }) }
    const up = () => { drag = null; if (space) doc.body.style.cursor = 'grab' }
    const wheel = (e: WheelEvent) => {
      if ((!e.ctrlKey && !e.metaKey) || !state.current.onZoom || state.current.preview) return
      e.preventDefault(); const rect = f.getBoundingClientRect(), old = state.current.scale
      anchor.current = { x: e.clientX, y: e.clientY + view.scrollY, screenX: rect.left + e.clientX * old, screenY: rect.top + e.clientY * old }
      state.current.onZoom(Math.max(.2, Math.min(2, old * Math.exp(-e.deltaY * .002))))
    }
    for (const target of [doc, document]) { target.addEventListener('keydown', downKey, true); target.addEventListener('keyup', upKey, true) }
    doc.addEventListener('pointerdown', down, true); doc.addEventListener('pointermove', move, true); doc.addEventListener('pointerup', up, true); doc.addEventListener('pointercancel', reset, true); doc.addEventListener('wheel', wheel, { passive: false })
    view.addEventListener('blur', reset); window.addEventListener('blur', reset)
    return () => { reset(); for (const target of [doc, document]) { target.removeEventListener('keydown', downKey, true); target.removeEventListener('keyup', upKey, true) }; doc.removeEventListener('pointerdown', down, true); doc.removeEventListener('pointermove', move, true); doc.removeEventListener('pointerup', up, true); doc.removeEventListener('pointercancel', reset, true); doc.removeEventListener('wheel', wheel); view.removeEventListener('blur', reset); window.removeEventListener('blur', reset) }
  }, [doc])
  useEffect(() => {
    if (!showMap || !doc?.defaultView) return
    const view = doc.defaultView
    let raf = 0
    const measure = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { setMap({ width: doc.documentElement.clientWidth, height: Math.max(doc.body.scrollHeight, view.innerHeight), top: view.scrollY, view: view.innerHeight, sections: Array.from(doc.querySelectorAll<HTMLElement>('[data-block]')).map((node) => { const rect = node.getBoundingClientRect(); return { id: node.dataset.block!, y: rect.top + view.scrollY, h: rect.height } }) }) }) }
    const ro = new ResizeObserver(measure); ro.observe(doc.body); view.addEventListener('scroll', measure); measure()
    return () => { ro.disconnect(); cancelAnimationFrame(raf); view.removeEventListener('scroll', measure) }
  }, [doc, showMap, width, scale])
  const fitSelection = () => {
    if (!doc || !sel || !onZoom) return
    const ids = sel.multi?.length ? sel.multi : sel.el ? [sel.el] : []
    const nodes = ids.length ? ids.flatMap((id) => Array.from(doc.querySelectorAll<HTMLElement>(`[data-element="${CSS.escape(id)}"]`))) : Array.from(doc.querySelectorAll<HTMLElement>(`[data-block="${CSS.escape(sel.block)}"]`))
    const rects = nodes.map((node) => node.getBoundingClientRect()); if (!rects.length) return
    const x = Math.min(...rects.map((r) => r.left)), y = Math.min(...rects.map((r) => r.top)), w = Math.max(...rects.map((r) => r.right)) - x, h = Math.max(...rects.map((r) => r.bottom)) - y
    const outer = viewport.current!, f = frame.current!, r = f.getBoundingClientRect(), next = Math.max(.2, Math.min(2, (outer.clientWidth - 80) / Math.max(1, w), (outer.clientHeight - 100) / Math.max(1, h)))
    anchor.current = { x: x + w / 2, y: y + h / 2 + (doc.defaultView?.scrollY ?? 0), screenX: outer.getBoundingClientRect().left + outer.clientWidth / 2, screenY: r.top + outer.clientHeight / 2 }
    onZoom(next)
    if (Math.abs(next - scale) < .001) doc.defaultView?.scrollBy(0, y + h / 2 - doc.defaultView.innerHeight / 2)
  }
  const ratio = Math.min(120 / Math.max(1, map.width), 180 / Math.max(1, map.height))
  const scrollMap = (top: number) => doc?.defaultView?.scrollTo({ top, left: 0, behavior: 'instant' })
  const jump = (event: React.PointerEvent<HTMLDivElement>) => { const rect = event.currentTarget.getBoundingClientRect(); scrollMap((event.clientY - rect.top) / ratio - map.view / 2) }
  return <div className="cv-canvas-navigation" aria-label="Điều hướng canvas">
    {showMap && <div className="cv-minimap" role="slider" tabIndex={0} aria-label="Bản đồ trang" aria-valuemin={0} aria-valuemax={Math.max(0, Math.round(map.height - map.view))} aria-valuenow={Math.round(map.top)} onKeyDown={(e) => { if (['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) { e.preventDefault(); scrollMap(e.key === 'Home' ? 0 : e.key === 'End' ? map.height : map.top + (e.key === 'ArrowDown' ? 100 : -100)) } }} onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); jump(e) }} onPointerMove={(e) => { if (e.buttons === 1) jump(e) }} style={{ position: 'relative', width: map.width * ratio, height: map.height * ratio }}>{map.sections.map((section) => <div key={section.id} style={{ position: 'absolute', left: 2, right: 2, top: section.y * ratio, height: Math.max(2, section.h * ratio - 2), background: '#dfe8e2', border: '1px solid #c6d5cb' }} />)}<div data-minimap-viewport style={{ position: 'absolute', left: 0, right: 0, top: map.top * ratio, height: Math.min(map.height, map.view) * ratio, border: '2px solid #2d7b57', background: '#2d7b5712', pointerEvents: 'none' }} /></div>}
    <div className="cv-navigation-row"><button type="button" title="Thu nhỏ" aria-label="Thu nhỏ canvas" onClick={() => onZoom?.(Math.max(.2, scale - .1))}>−</button><button type="button" title="Vừa khung" onClick={() => onZoom?.('fit')}>{zoom === 'fit' ? 'Vừa khung' : `${Math.round(scale * 100)}%`}</button><button type="button" title="Phóng to" aria-label="Phóng to canvas" onClick={() => onZoom?.(Math.min(2, scale + .1))}>+</button><button type="button" disabled={!sel?.block} onClick={fitSelection}>Vừa vùng chọn</button><button type="button" aria-pressed={showMap} onClick={() => setShowMap(!showMap)}>Bản đồ</button></div>
    <label className="cv-navigation-width">{width} px<input aria-label="Kéo chiều rộng canvas" type="range" min={320} max={1920} value={width} onChange={(e) => onWidth?.(Number(e.target.value))} /></label>
  </div>
}
