'use client'
import React, { useEffect, useRef } from 'react'
import type { FreeElement } from '@hosso/studio-blocks'
import { arrangeResolvedElements } from '../../../../../../../packages/blocks/src/layout-constraints'

export function SpacingHandles({ frame, list, scale, onChange, onDraft, onCancel }: { frame: FreeElement; list: FreeElement[]; scale: number; onChange: (list: FreeElement[]) => void; onDraft: (list: FreeElement[]) => void; onCancel: () => void }) {
  const drag = useRef<{ x: number; y: number; value: number; key: 'gap' | 'padding'; list: FreeElement[]; next: FreeElement[] } | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const docs = new Set([document, ref.current?.ownerDocument])
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape' && drag.current) { e.preventDefault(); e.stopImmediatePropagation(); drag.current = null; onCancel() } }
    docs.forEach((doc) => doc?.addEventListener('keydown', escape, true))
    return () => docs.forEach((doc) => doc?.removeEventListener('keydown', escape, true))
  }, [onCancel])
  const flow = frame.props._layout
  if (!flow || !['row', 'column', 'grid'].includes(flow.direction)) return null
  const patch = (source: FreeElement[], key: 'gap' | 'padding', value: number) => arrangeResolvedElements(source.map((el) => el.id === frame.id ? { ...el, props: { ...el.props, _layout: { ...el.props._layout, [key]: Math.max(0, Math.min(240, Math.round(value))) } } } : el), scale * 1200)
  const children = list.filter((el) => el.parentId === frame.id && !el.props._hidden)
  const column = flow.direction === 'column' || flow.direction === 'grid' && scale * 1200 <= 600 && flow.mobileStack !== false
  const handles: { key: 'gap' | 'padding'; x: number; y: number }[] = [{ key: 'padding', x: frame.x + 42 / scale, y: frame.y + Math.max(8 / scale, Number(flow.padding ?? 0) / Math.max(.01, scale) / 2) }]
  if (children.length > 1) handles.push({ key: 'gap', x: column ? frame.x + frame.w / 2 : (children[0].x + children[0].w + children[1].x) / 2 + 42 / scale, y: column ? (children[0].y + children[0].h + children[1].y) / 2 : children[0].y + Math.min(children[0].h / 2, 60 / scale) })
  return <div ref={ref} data-spacing-controls data-editor-control="true" style={{ display: 'contents' }}>{handles.map(({ key, x, y }) => <button key={key} type="button" aria-label={key === 'gap' ? 'Kéo khoảng cách giữa các ô' : 'Kéo lề trong khung'} title="Kéo để chỉnh · Mũi tên ±1 · Shift ±10 · Esc hủy" onKeyDown={(e) => { if (!e.key.startsWith('Arrow')) return; e.preventDefault(); e.stopPropagation(); onChange(patch(list, key, Number(flow[key] ?? 0) + (['ArrowDown', 'ArrowRight'].includes(e.key) ? 1 : -1) * (e.shiftKey ? 10 : 1))) }} onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, value: Number(flow[key] ?? 0), key, list, next: list } }} onPointerMove={(e) => { const d = drag.current; if (!d) return; const delta = key === 'gap' && !column ? e.clientX - d.x : e.clientY - d.y; d.next = patch(d.list, key, d.value + delta); onDraft(d.next) }} onPointerUp={(e) => { e.stopPropagation(); const d = drag.current; drag.current = null; if (d) onChange(d.next) }} onPointerCancel={() => { if (drag.current) { drag.current = null; onCancel() } }} onLostPointerCapture={() => { if (drag.current) { drag.current = null; onCancel() } }} style={{ position: 'absolute', left: x * scale, top: y * scale, transform: 'translate(-50%,-50%)', minWidth: 54, padding: '5px 7px', border: '1px solid #2d7b57', borderRadius: 4, background: '#eff8f2', color: '#245e43', font: '11px system-ui', zIndex: 21, touchAction: 'none', pointerEvents: 'auto', cursor: key === 'gap' && !column ? 'ew-resize' : 'ns-resize' }}>{key === 'gap' ? 'Gap' : 'Lề'} {Math.round(Number(flow[key] ?? 0))}px</button>)}</div>
}
