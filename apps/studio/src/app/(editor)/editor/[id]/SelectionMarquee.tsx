'use client'
import React, { useEffect, useRef, useState } from 'react'
import type { FreeElement } from '@hosso/studio-blocks'
import { rectangleSelection, type SelectionBox } from './canvas-selection'
import type { Sel } from './canvas-model'

export function SelectionMarquee({ owner, list, sel, setSel, disabled }: { owner: string; list: FreeElement[]; sel: Sel; setSel: (value: Sel) => void; disabled?: boolean }) {
  const host = useRef<HTMLDivElement>(null), current = useRef({ list, sel, setSel })
  current.current = { list, sel, setSel }
  const [box, setBox] = useState<SelectionBox | null>(null)
  useEffect(() => {
    const node = host.current, doc = node?.ownerDocument
    if (!node || !doc || disabled) return
    let drag: { x: number; y: number; ids: string[] } | null = null
    const position = (event: PointerEvent) => { const r = node.getBoundingClientRect(), scale = r.width / 1200; return { x: (event.clientX - r.left) / scale, y: (event.clientY - r.top) / scale } }
    const down = (event: PointerEvent) => {
      const target = event.target as Element
      if (event.button !== 0 || event.defaultPrevented || !target.closest || (owner === '@page' ? !target.closest('[data-editor-page]') : target.closest('[data-block]')?.getAttribute('data-block') !== owner || current.current.sel.block === '@page') || target.closest('[data-free-ui],button,a,input,textarea,select,[contenteditable]') || doc.body.dataset.panning === 'true' || doc.body.dataset.actionPicking === 'true') return
      const p = position(event), selection = current.current.sel
      drag = { ...p, ids: event.shiftKey && selection.block === owner ? selection.multi ?? (selection.el ? [selection.el] : []) : [] }
      node.setPointerCapture(event.pointerId)
      event.preventDefault(); event.stopPropagation()
    }
    const move = (event: PointerEvent) => {
      if (!drag) return
      const p = position(event)
      setBox({ x: Math.min(p.x, drag.x), y: Math.min(p.y, drag.y), w: Math.abs(p.x - drag.x), h: Math.abs(p.y - drag.y) })
    }
    const up = (event: PointerEvent) => {
      if (!drag) return
      const p = position(event), rect = { x: Math.min(p.x, drag.x), y: Math.min(p.y, drag.y), w: Math.abs(p.x - drag.x), h: Math.abs(p.y - drag.y) }
      const ids = [...new Set([...drag.ids, ...(rect.w > 3 || rect.h > 3 ? rectangleSelection(current.current.list, rect) : [])])]
      current.current.setSel({ block: owner, el: ids[ids.length - 1] ?? '', multi: ids })
      drag = null; setBox(null)
    }
    const cancel = () => { drag = null; setBox(null) }
    doc.addEventListener('pointerdown', down, true); doc.addEventListener('pointermove', move); doc.addEventListener('pointerup', up); doc.addEventListener('pointercancel', cancel)
    doc.defaultView?.addEventListener('blur', cancel)
    return () => { doc.removeEventListener('pointerdown', down, true); doc.removeEventListener('pointermove', move); doc.removeEventListener('pointerup', up); doc.removeEventListener('pointercancel', cancel); doc.defaultView?.removeEventListener('blur', cancel) }
  }, [owner, disabled])
  return <div ref={host} style={{ position: 'absolute', inset: 0, width: 'min(100%, 1200px)', margin: '0 auto', containerType: 'inline-size', pointerEvents: 'none', zIndex: 70 }}>{box && <div data-marquee="true" style={{ position: 'absolute', left: `${box.x / 12}%`, top: `${box.y / 12}cqw`, width: `${box.w / 12}%`, height: `${box.h / 12}cqw`, border: '1px solid #2d7b57', background: '#2d7b5715' }} />}</div>
}
