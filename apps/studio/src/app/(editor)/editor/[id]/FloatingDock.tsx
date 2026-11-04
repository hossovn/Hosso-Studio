'use client'
import React, { useEffect, useRef, useState } from 'react'
import { Grip, GripVertical } from 'lucide-react'
import { DrawingContext } from './DrawingTools'

/** Inspector starts docked; moving it creates a bounded floating panel. */
export function useFloatingInspector(enabled: boolean) {
  const ref = useRef<HTMLDivElement>(null), drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null)
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null), latest = useRef(position)
  const key = 'hosso-inspector-position:v1'
  const clamp = (x: number, y: number) => {
    const node = ref.current, parent = node?.offsetParent as HTMLElement | null
    const width = parent?.clientWidth ?? window.innerWidth, height = parent?.clientHeight ?? window.innerHeight
    return { x: Math.max(8, Math.min(x, width - (node?.offsetWidth ?? 304) - 8)), y: Math.max(8, Math.min(y, height - Math.min(720, height - 24) - 8)) }
  }
  const set = (next: typeof position, persist = false) => { latest.current = next; setPosition(next); if (persist) try { if (next) localStorage.setItem(key, JSON.stringify(next)); else localStorage.removeItem(key) } catch {} }
  useEffect(() => { try { const saved = JSON.parse(localStorage.getItem(key) || 'null'); if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) set(clamp(saved.x, saved.y)) } catch {} }, [])
  useEffect(() => {
    const node = ref.current, parent = node?.offsetParent
    if (!node || !parent) return
    const resize = () => { if (latest.current) { const next = clamp(latest.current.x, latest.current.y); if (next.x !== latest.current.x || next.y !== latest.current.y) set(next) } }
    const observer = new ResizeObserver(resize); observer.observe(parent); observer.observe(node)
    return () => observer.disconnect()
  }, [enabled])
  const grip = <button type="button" className="cv-inspector-grip" aria-label="Kéo bảng thuộc tính" title="Kéo bảng thuộc tính · nhấp đúp hoặc Home để đặt lại" onDoubleClick={() => set(null, true)}
    onPointerDown={(event) => { if (event.button !== 0) return; event.preventDefault(); const node = ref.current, parent = node?.offsetParent as HTMLElement | null; if (!node || !parent) return; const rect = node.getBoundingClientRect(), bounds = parent.getBoundingClientRect(), start = clamp(rect.left - bounds.left, rect.top - bounds.top); drag.current = { x: event.clientX, y: event.clientY, left: start.x, top: start.y }; set(start); event.currentTarget.setPointerCapture(event.pointerId) }}
    onPointerMove={(event) => { if (drag.current) set(clamp(drag.current.left + event.clientX - drag.current.x, drag.current.top + event.clientY - drag.current.y)) }}
    onPointerUp={() => { drag.current = null; set(latest.current, true) }} onPointerCancel={() => { drag.current = null; set(latest.current, true) }} onLostPointerCapture={() => { drag.current = null }}
    onKeyDown={(event) => { if (event.key === 'Home') { event.preventDefault(); set(null, true); return }; const delta: Record<string, [number, number]> = { ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, -10], ArrowDown: [0, 10] }; const node = ref.current, parent = node?.offsetParent as HTMLElement | null; if (!delta[event.key] || !node || !parent) return; event.preventDefault(); event.stopPropagation(); const rect = node.getBoundingClientRect(), bounds = parent.getBoundingClientRect(), [dx, dy] = delta[event.key]; set(clamp(rect.left - bounds.left + dx, rect.top - bounds.top + dy), true) }}><GripVertical size={16} /></button>
  return { ref, grip, detached: Boolean(position), style: position ? { position: 'absolute' as const, left: position.x, top: position.y, right: 'auto', bottom: 'auto', height: 'min(720px, calc(100% - 24px))', margin: 0, zIndex: 8 } : undefined }
}

/** Coordinates stay relative to the workspace, so panels survive browser fullscreen changes. */
export function FloatingDock({ children, enabled, title }: { children: React.ReactNode; enabled: boolean; title: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null)
  const [position, setPosition] = useState({ x: 16, y: 48 })
  const clamp = (x: number, y: number) => {
    const node = ref.current, parent = node?.offsetParent as HTMLElement | null
    return { x: Math.max(8, Math.min(x, (parent?.clientWidth ?? window.innerWidth) - (node?.offsetWidth ?? 48) - 8)), y: Math.max(8, Math.min(y, (parent?.clientHeight ?? window.innerHeight) - Math.min(node?.offsetHeight ?? 300, (parent?.clientHeight ?? window.innerHeight) - 16) - 8)) }
  }
  useEffect(() => {
    const node = ref.current, parent = node?.offsetParent
    if (!enabled || !node || !parent) return
    const resize = () => setPosition((value) => { const next = clamp(value.x, value.y); return next.x === value.x && next.y === value.y ? value : next })
    const observer = new ResizeObserver(resize)
    observer.observe(parent); observer.observe(node); resize()
    return () => observer.disconnect()
  }, [enabled])
  return <div ref={ref} className="cv-floating-dock" data-floating={enabled} style={enabled ? { left: position.x, top: position.y } : undefined}>
    {enabled && <button type="button" className="cv-dock-grip" aria-label={title} title={`${title} · nhấp đúp để đặt lại`} onDoubleClick={() => setPosition({ x: 16, y: 48 })}
      onPointerDown={(event) => { if (event.button !== 0) return; event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); drag.current = { x: event.clientX, y: event.clientY, left: position.x, top: position.y } }}
      onPointerMove={(event) => { if (drag.current) setPosition(clamp(drag.current.left + event.clientX - drag.current.x, drag.current.top + event.clientY - drag.current.y)) }}
      onPointerUp={() => { drag.current = null }} onPointerCancel={() => { drag.current = null }} onLostPointerCapture={() => { drag.current = null }}
      onKeyDown={(event) => { const delta: Record<string, [number, number]> = { ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, -10], ArrowDown: [0, 10] }; if (delta[event.key]) { event.preventDefault(); const [x, y] = delta[event.key]; setPosition(clamp(position.x + x, position.y + y)) } else if (event.key === 'Home') setPosition({ x: 16, y: 48 }) }}><Grip size={17} /></button>}
    {children}
  </div>
}

export function SectionToolbar({ children }: { children: React.ReactNode }) {
  const drawing = React.useContext(DrawingContext)
  const ref = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null)
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null)
  const clamp = (x: number, y: number) => {
    const node = ref.current, win = node?.ownerDocument.defaultView
    return { x: Math.max(8, Math.min(x, (win?.innerWidth ?? 1200) - (node?.offsetWidth ?? 300) - 8)), y: Math.max(8, Math.min(y, (win?.innerHeight ?? 800) - (node?.offsetHeight ?? 32) - 8)) }
  }
  return <div ref={ref} role="toolbar" aria-label="Chỉnh sửa phần" data-free-ui="1" data-editor-control="true" onPointerDown={(event) => event.stopPropagation()} style={{ position: position ? 'fixed' : 'absolute', left: position?.x ?? 72, top: position?.y ?? (drawing.rulers ? 24 : 8), display: 'flex', alignItems: 'center', gap: 2, padding: '3px 6px', maxWidth: position ? 'calc(100vw - 16px)' : 'calc(100vw - 88px)', flexWrap: 'wrap', background: '#fff', color: '#374151', border: '1px solid #dfe3e8', borderRadius: 8, pointerEvents: 'auto', font: '12px/1 Arial, sans-serif', boxShadow: '0 4px 16px #18233314', zIndex: 60 }}>
    <button type="button" aria-label="Kéo thanh công cụ phần" title="Kéo thanh công cụ phần · nhấp đúp để đặt lại" style={{ border: 0, background: 'transparent', color: 'inherit', display: 'grid', placeItems: 'center', width: 24, height: 26, touchAction: 'none', cursor: 'grab' }} onDoubleClick={() => setPosition(null)}
      onPointerDown={(event) => { if (event.button !== 0) return; event.preventDefault(); event.stopPropagation(); const rect = ref.current!.getBoundingClientRect(); drag.current = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top }; event.currentTarget.setPointerCapture(event.pointerId); setPosition(clamp(rect.left, rect.top)) }}
      onPointerMove={(event) => { if (drag.current) setPosition(clamp(drag.current.left + event.clientX - drag.current.x, drag.current.top + event.clientY - drag.current.y)) }}
      onPointerUp={() => { drag.current = null }} onPointerCancel={() => { drag.current = null }} onLostPointerCapture={() => { drag.current = null }}
      onKeyDown={(event) => { const delta: Record<string, [number, number]> = { ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, -10], ArrowDown: [0, 10] }; if (event.key === 'Home') { event.preventDefault(); setPosition(null) } else if (delta[event.key]) { event.preventDefault(); event.stopPropagation(); const rect = ref.current!.getBoundingClientRect(), [x, y] = delta[event.key]; setPosition(clamp(rect.left + x, rect.top + y)) } }}><GripVertical size={16} /></button>
    {children}
  </div>
}
