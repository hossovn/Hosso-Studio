'use client'
import React, { useEffect, useRef } from 'react'
import type { FreeElement } from '@hosso/studio-blocks'
import { resizeFrameColumns, splitFrame, mergeFrameCells } from '../../../../../../../packages/blocks/src/frame-layout'
import { arrangeResolvedElements } from '../../../../../../../packages/blocks/src/layout-constraints'

export function FrameTools({ frame, list, scale, onChange, onDraft, onCancel, mode = 'dividers' }: { frame: FreeElement; list: FreeElement[]; scale: number; onChange: (els: FreeElement[]) => void; onDraft: (els: FreeElement[]) => void; onCancel: () => void; mode?: 'actions' | 'dividers' }) {
  const drag = useRef<{ x: number; list: FreeElement[]; next: FreeElement[] } | null>(null)
  useEffect(() => { const escape = (e: KeyboardEvent) => { if (e.key === 'Escape' && drag.current) { e.preventDefault(); e.stopImmediatePropagation(); drag.current = null; onCancel() } }; const doc = document.querySelector<HTMLIFrameElement>('iframe[title="Trang"]')?.contentDocument; document.addEventListener('keydown', escape, true); doc?.addEventListener('keydown', escape, true); return () => { document.removeEventListener('keydown', escape, true); doc?.removeEventListener('keydown', escape, true) } }, [onCancel])
  const flow = frame.props._layout, children = list.filter((el) => el.parentId === frame.id)
  const columns: number[] = flow?.direction === 'grid' ? flow.columns ?? [1, 1] : []
  const control: React.CSSProperties = { background: '#fff', border: '1px solid #b6cbbf', borderRadius: 4, color: '#245e43', padding: '4px 7px', font: '11px system-ui', cursor: 'pointer', pointerEvents: 'auto' }
  return <>
    {mode === 'actions' && <div data-frame-tools style={{ display: 'flex', flexWrap: 'wrap', gap: 4, pointerEvents: 'auto', flexBasis: '100%', borderTop: '1px solid #e2eae5', paddingTop: 6 }} onPointerDown={(e) => e.stopPropagation()}>
      <button type="button" style={control} onClick={() => onChange(splitFrame(list, frame.id, 'row'))}>Chia ngang</button>
      <button type="button" style={control} onClick={() => onChange(splitFrame(list, frame.id, 'column'))}>Chia dọc</button>
      {children.length > 0 && children.every((el) => el.type === 'container') && <button type="button" style={control} onClick={() => onChange(mergeFrameCells(list, frame.id))}>Gộp các ô con</button>}
      <button type="button" style={control} onClick={(e) => e.currentTarget.ownerDocument.dispatchEvent(new CustomEvent('hosso-isolate', { detail: frame.id }))}>Chỉ chỉnh khung này</button>
    </div>}
    {mode === 'dividers' && scale * 1200 > 600 && columns.slice(0, -1).map((_, index) => {
      const child = children[index]; if (!child) return null
      return <button key={index} type="button" data-frame-divider={index} aria-label={`Đổi tỷ lệ cột ${index + 1}`} onKeyDown={(e) => { if (['ArrowLeft', 'ArrowRight'].includes(e.key)) { e.preventDefault(); e.stopPropagation(); onChange(arrangeResolvedElements(resizeFrameColumns(list, frame.id, index, (e.key === 'ArrowRight' ? 1 : -1) * (e.shiftKey ? 20 : 4)), scale * 1200)) } }} onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: e.clientX, list, next: list } }} onPointerMove={(e) => { const d = drag.current; if (!d) return; d.next = arrangeResolvedElements(resizeFrameColumns(d.list, frame.id, index, (e.clientX - d.x) / scale), scale * 1200); onDraft(d.next) }} onPointerUp={(e) => { e.stopPropagation(); const d = drag.current; drag.current = null; if (d) onChange(d.next) }} onPointerCancel={() => { drag.current = null; onCancel() }} onLostPointerCapture={() => { if (drag.current) { drag.current = null; onCancel() } }} style={{ position: 'absolute', left: (child.x + child.w + (flow.gap || 0) / Math.max(.1, scale) / 2) * scale - 5, top: frame.y * scale + 12, height: Math.max(24, frame.h * scale - 24), width: 10, padding: 0, background: '#2d7b5730', border: '1px solid #2d7b57', borderRadius: 4, cursor: 'col-resize', pointerEvents: 'auto', touchAction: 'none' }} />
    })}
  </>
}
