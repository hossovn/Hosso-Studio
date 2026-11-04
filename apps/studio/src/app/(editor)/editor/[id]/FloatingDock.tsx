'use client'
import React, { useEffect, useRef, useState } from 'react'
import { Grip, GripVertical } from 'lucide-react'
import { DrawingContext } from './DrawingTools'

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
