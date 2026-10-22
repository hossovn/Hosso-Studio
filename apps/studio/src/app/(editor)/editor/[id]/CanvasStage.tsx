'use client'
import { FREE_MAX_PX, FREE_W, FreeElementView, cloneElements, elementFamily, transformFamily, convertSectionBox, makeElement, elementStateScope, elementStatesCss, type FreeElement, type FreeType, type ElementState } from '@hosso/studio-blocks'
import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { PAGE, addEls, placeElement, snapPosition, blockId, elsOf, floatOf, insertBlock, isSection, moveBlock, newBlockId, removeBlock, duplicateBlock, setBlockEls, patchBlock, type Block, type PageData, type Sel, NO_SEL } from './canvas-model'
import { BRAND, CURSOR, HANDLES, HF_CSS, InlineText, MIN, TEXTY, Toolbar, type Drag, type Handle } from './FreeCanvasEditor'
import { reparentElements } from './canvas-model'
import { guardCanvasEvent } from './canvas-events'
import { LIBRARY } from './BlockPanels'
import { SECTION_TEMPLATES, HEADER_TEMPLATES, FOOTER_TEMPLATES, type SiteCtx } from './SectionTemplates'
import { patchWidgetPart, widgetPartKey, widgetPartsForDevice, widgetPartPath, widgetPartSelector, type WidgetPartDevice, type WidgetParts } from '@hosso/studio-blocks'

const insertionPayload = (payload: string) => payload.startsWith('hosso-widget:') || payload.startsWith('hosso-section:') || payload.startsWith('hosso-library:')
function droppedElement(payload: string): FreeElement | undefined {
  if (payload.startsWith('hosso-library:')) return LIBRARY.flatMap((group) => group.items.map((item) => ({ key: group.title + '/' + item.label, create: item.make }))).find((item) => item.key === payload.slice(14))?.create()
  if (!payload.startsWith('hosso-widget:')) return
  const type = payload.slice(13)
  return ['text', 'button', 'container', 'image', 'swiper', 'video'].includes(type) ? makeElement(type as FreeType) : undefined
}
function droppedSection(payload: string, siteCtx: SiteCtx): Block | undefined {
  if (!payload.startsWith('hosso-section:')) return
  const id = payload.slice(14)
  const template = [...SECTION_TEMPLATES, ...HEADER_TEMPLATES, ...FOOTER_TEMPLATES].find((tpl) => tpl.id === id)
  if (!template && id !== 'blank') return
  return { type: 'FreeCanvas', props: { id: newBlockId('FreeCanvas'), height: template?.height ?? 400, ...(template?.bg ? { _bgHex: template.bg } : {}), _els: template?.build(siteCtx) ?? [] } }
}

// ---------- Khung xem trước cách ly CSS ----------
/** Khung iframe cho trang: sao chép style của trình soạn vào iframe (như Puck) để CSS của site không ảnh hưởng giao diện admin và ngược lại. */
export function StageFrame({
  width,
  zoom = 'fit',
  css,
  htmlClass,
  children,
  onDoc,
}: {
  width: number | string
  zoom?: 'fit' | number
  css: string
  htmlClass: string
  children: React.ReactNode
  onDoc?: (d: Document) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const ref = useRef<HTMLIFrameElement>(null)
  const [doc, setDoc] = useState<Document | null>(null)
  const [containerW, setContainerW] = useState(1200)
  const [containerH, setContainerH] = useState(800)

  useEffect(() => {
    const c = containerRef.current
    if (!c) return
    const measure = () => {
      setContainerW(c.clientWidth || 1200)
      setContainerH(c.clientHeight || 800)
    }
    const ro = new ResizeObserver(measure)
    ro.observe(c)
    measure()
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (!doc) return
    const guard = (event: Event) => guardCanvasEvent(event, Boolean(doc.body.dataset.preview === 'true'))
    for (const name of ['click', 'auxclick', 'submit']) doc.addEventListener(name, guard, true)
    return () => { for (const name of ['click', 'auxclick', 'submit']) doc.removeEventListener(name, guard, true) }
  }, [doc])

  useEffect(() => {
    const f = ref.current
    if (!f) return
    const setup = () => {
      const d = f.contentDocument
      if (!d || d.body?.dataset.ready) return
      document.head.querySelectorAll('style, link[rel="stylesheet"]').forEach((n) => d.head.appendChild(n.cloneNode(true)))
      const s = d.createElement('style')
      s.textContent = `${css}\nhtml,body{margin:0}\nhtml,*{scrollbar-width:none}::-webkit-scrollbar{display:none}\n${HF_CSS}`
      d.head.appendChild(s)
      d.documentElement.className = htmlClass
      d.body.dataset.ready = '1'
      setDoc(d)
      onDoc?.(d)
    }
    if (f.contentDocument?.readyState === 'complete') setup()
    f.addEventListener('load', setup)
    return () => f.removeEventListener('load', setup)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const targetW = typeof width === 'number' ? width : 1200
  const fitScale = Math.min(1, Math.max(0.1, (containerW - 32) / targetW))
  const scale = zoom === 'fit' ? fitScale : Number(zoom) || 1
  const frameHeight = Math.max(720, (containerH - 40) / scale)

  return (
    <div
      ref={containerRef}
      data-canvas-viewport
      style={{
        width: '100%',
        height: '100%',
        flex: 1,
        minHeight: 0,
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        padding: '20px 16px',
        boxSizing: 'border-box',
        background: '#e9ecea',
      }}
    >
      <div style={{ width: targetW * scale, height: frameHeight * scale, margin: '0 auto', flexShrink: 0 }}>
      <div
        style={{
          width: targetW,
          height: frameHeight,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          boxShadow: '0 2px 12px rgba(24,42,30,0.08), 0 0 0 1px rgba(24,42,30,0.08)',
          overflow: 'hidden',
          background: '#fff',
          flexShrink: 0,
        }}
      >
        <iframe
          ref={ref}
          title="Trang"
          srcDoc="<!doctype html><html><head></head><body></body></html>"
          style={{ width: '100%', height: '100%', minHeight: 720, border: 0, display: 'block', margin: 0, background: '#fff' }}
        />
        {doc ? createPortal(children, doc.body) : null}
      </div>
      </div>
    </div>
  )
}

// ---------- Lớp component trong một section ----------
function Layer({ blockId: bid, els, sel, setSel, onEls, onTransfer, preview = false, labelHint, selectedState = 'normal' }: { blockId: string; els: FreeElement[]; sel: Sel; setSel: (s: Sel) => void; onEls: (next: FreeElement[], key?: string) => void; onTransfer: (target: string, next: FreeElement[], rootId: string) => void; preview?: boolean; labelHint?: string; selectedState?: ElementState }) {
  const host = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: FREE_W, h: 0 })
  const [draft, setDraft] = useState<FreeElement[] | null>(null)
  const draftRef = useRef<FreeElement[] | null>(null)
  const [editing, setEditing] = useState('')
  const [hover, setHover] = useState('')
  const [interacting, setInteracting] = useState('')
  const scrollStart = useRef(0)
  const [guides, setGuides] = useState<{ v?: number; h?: number }>({})
  const drag = useRef<Drag | null>(null)
  const list = draft ?? els
  // Explicit pixels avoid container-query layout suppression in portaled iframe widgets.
  const scale = size.w / FREE_W
  const cur = !preview && sel.block === bid ? list.find((e) => e.id === sel.el) : undefined
  const group = cur?.type === 'container' ? cur : list.find((el) => el.id === cur?.parentId)
  const moving = drag.current?.moved && drag.current.mode === 'move' ? elementFamily(list, drag.current.orig.id) : []
  const movingIds = new Set(moving.map((el) => el.id))
  const hoverEl = list.find((el) => el.id === hover)
  useEffect(() => { setInteracting('') }, [sel.el, preview])
  const cancel = () => {
    drag.current = null
    draftRef.current = null
    setDraft(null)
    setGuides({})
  }
  useEffect(() => {
    const doc = host.current?.ownerDocument
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') { cancel(); setInteracting('') } }
    doc?.addEventListener('keydown', escape)
    return () => doc?.removeEventListener('keydown', escape)
  }, [])

  useEffect(() => {
    const n = host.current
    if (!n) return
    const measure = () => setSize({ w: n.clientWidth || FREE_W, h: n.clientHeight })
    const ro = new ResizeObserver(measure)
    ro.observe(n)
    measure()
    return () => ro.disconnect()
  }, [])

  const commit = (next: FreeElement[], key?: string) => {
    onEls(next.map((e) => ({ ...e, x: Math.round(e.x), y: Math.round(e.y), w: Math.round(e.w), h: Math.round(e.h) })), key)
    draftRef.current = null
    setDraft(null)
  }
  const mapOne = (id: string, f: (e: FreeElement) => FreeElement) => list.map((e) => (e.id === id ? f(e) : e))
  const patch = (p: Record<string, any>) => cur && commit(mapOne(cur.id, (e) => ({ ...e, props: { ...e.props, ...p } })), `p:${cur.id}`)
  const set = (f: (e: FreeElement) => FreeElement) => { if (!cur) return; const next = f(cur); if (cur.props._locked && (['x', 'y', 'w', 'h'] as const).some((key) => next[key] !== cur[key])) return; commit(transformFamily(list, cur.id, next).map((el) => el.id === cur.id ? next : el)) }
  const del = () => {
    if (!cur) return
    const ids = new Set(elementFamily(list, cur.id).map((el) => el.id))
    commit(list.filter((e) => !ids.has(e.id)))
    setSel({ block: bid, el: '' })
  }
  const dup = () => {
    if (!cur) return
    const family = elementFamily(list, cur.id)
    const copies = cloneElements(family, 24)
    commit([...list, ...copies])
    setSel({ block: bid, el: copies[family.findIndex((el) => el.id === cur.id)].id })
  }
  const order = (d: 1 | -1 | 'front' | 'back') => {
    if (!cur) return
    const i = list.findIndex((e) => e.id === cur.id)
    const j = d === 'front' ? list.length - 1 : d === 'back' ? 0 : Math.min(list.length - 1, Math.max(0, i + d))
    const next = [...list]
    next.splice(i, 1)
    next.splice(j, 0, cur)
    commit(next)
  }

  const start = (e: React.PointerEvent, el: FreeElement, mode: Drag['mode'], handle?: Handle) => {
    if (preview || e.button !== 0 || (mode === 'move' && interacting === el.id && sel.el === el.id)) return
    e.preventDefault()
    e.stopPropagation()
    if (editing) return
    if (mode === 'resize') setInteracting('')
    setSel({ block: bid, el: el.id })
    if (el.props._locked) return
    e.currentTarget.setPointerCapture(e.pointerId)
    scrollStart.current = host.current?.ownerDocument.defaultView?.scrollY ?? 0
    drag.current = { mode, handle, sx: e.clientX, sy: e.clientY, orig: el, list, moved: false }
  }
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const dx = (e.clientX - d.sx) / scale
    const view = host.current!.ownerDocument.defaultView!
    if (e.clientY < 40) view.scrollBy(0, -14)
    else if (e.clientY > view.innerHeight - 40) view.scrollBy(0, 14)
    const dy = (e.clientY - d.sy + view.scrollY - scrollStart.current) / scale
    if (!d.moved && Math.hypot(dx, dy) < 3) return
    d.moved = true
    const o = d.orig
    const boxH = size.h / scale
    let { x, y, w, h } = o
    const g: { v?: number; h?: number } = {}
    if (d.mode === 'move') {
      x = o.x + dx
      y = o.y + dy
      const snapData: PageData = { content: [{ type: 'FreeCanvas', props: { id: bid, height: boxH, _els: d.list } }], ...(bid === PAGE ? { root: { props: { _float: d.list } } } : {}) }
      const snapped = snapPosition(snapData, bid, o, { x, y })
      x = snapped.x; y = snapped.y
      for (const guide of snapped.guides) { if (guide.axis === 'x') g.v = guide.value; else g.h = guide.value }
      if (!e.altKey) { x = Math.max(0, Math.min(FREE_W - w, x)); y = Math.max(0, Math.min(Math.max(0, boxH - h), y)) }
    } else {
      const hd = d.handle as Handle
      const isCorner = ['nw', 'ne', 'se', 'sw'].includes(hd)
      if (isCorner && e.shiftKey && o.h > 0) {
        const ratio = o.w / o.h
        let newW = Math.max(MIN, hd.includes('w') ? o.w - dx : o.w + dx)
        let newH = Math.round(newW / ratio)
        w = newW
        h = newH
        if (hd.includes('w')) x = o.x + o.w - w
        if (hd.includes('n')) y = o.y + o.h - h
      } else {
        if (hd.includes('e')) w = Math.max(MIN, o.w + dx)
        if (hd.includes('w')) { w = Math.max(MIN, o.w - dx); x = o.x + o.w - w }
        if (hd.includes('s')) h = Math.max(MIN, o.h + dy)
        if (hd.includes('n')) { h = Math.max(MIN, o.h - dy); y = o.y + o.h - h }
      }
    }
    const next = transformFamily(d.list, o.id, { x, y, w, h })
    draftRef.current = next
    setDraft(next)
    setGuides(g)
  }
  const onUp = (e: React.PointerEvent) => {
    const d = drag.current
    drag.current = null
    setGuides({})
    if (d?.moved && draftRef.current) {
      const next = draftRef.current
      const source = host.current!.getBoundingClientRect()
      const el = next.find((it) => it.id === d.orig.id)!
      const cx = source.left + px(el.x + el.w / 2), cy = source.top + px(el.y + el.h / 2)
      const target = e.altKey && d.mode === 'move' ? Array.from(host.current!.ownerDocument.querySelectorAll<HTMLElement>('[data-canvas-layer]')).find((node) => {
        if (node.dataset.canvasLayer === bid || node.dataset.canvasLayer === PAGE) return false
        const rect = node.getBoundingClientRect()
        return cx >= rect.left && cx <= rect.right && cy >= rect.top && cy <= rect.bottom
      }) : undefined
      if (target) {
        const ids = new Set(elementFamily(next, el.id).map((it) => it.id))
        const rect = target.getBoundingClientRect()
        onTransfer(target.dataset.canvasLayer!, next.map((it) => ids.has(it.id) ? { ...it, ...convertSectionBox(it, source, rect) } : it), el.id)
        draftRef.current = null
        setDraft(null)
      } else commit(next)
    }
  }

  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; el: FreeElement } | null>(null)
  useEffect(() => {
    if (!ctxMenu) return
    const close = () => setCtxMenu(null)
    const doc = host.current?.ownerDocument
    doc?.addEventListener('click', close)
    doc?.addEventListener('pointerdown', close)
    window.addEventListener('click', close)
    window.addEventListener('pointerdown', close)
    return () => {
      doc?.removeEventListener('click', close)
      doc?.removeEventListener('pointerdown', close)
      window.removeEventListener('click', close)
      window.removeEventListener('pointerdown', close)
    }
  }, [ctxMenu])

  const copyToClipboard = async (el: FreeElement) => {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText('hosso-els:' + JSON.stringify(elementFamily(list, el.id)))
      return true
    } catch {
      window.alert('Không thể truy cập clipboard. Hãy dùng Ctrl+C hoặc Ctrl+X.')
      return false
    }
  }

  const px = (n: number) => n * scale
  const rect = host.current?.getBoundingClientRect()
  const measure: React.CSSProperties = { position: 'absolute', color: '#10b981', font: '11px/1.5 monospace', fontWeight: 700, whiteSpace: 'nowrap', background: '#fff', padding: '1px 5px', borderRadius: 3, boxShadow: '0 1px 4px rgba(0,0,0,.15)' }
  return <div ref={host} data-canvas-layer={bid} data-scroll-boundary onPointerMove={preview ? undefined : onMove} onPointerUp={onUp} onPointerCancel={cancel} onLostPointerCapture={() => { if (drag.current) cancel() }} style={{ position: 'absolute', inset: 0, width: 'min(100%, ' + FREE_MAX_PX + 'px)', margin: '0 auto', pointerEvents: 'none', zIndex: cur ? 35 : 1 }}>
    <style>{HF_CSS}</style>
    {!preview && labelHint && !list.length && <div style={{ position: 'absolute', inset: 0, border: '1px dashed #cbd5e1' }} />}
    {list.map((el) => {
      const active = !preview && interacting === el.id && sel.el === el.id
      return <div key={el.id} className={'hf-el' + (preview && ['m', 't', 'd'].includes(el.props._hide) ? ' hs-hide-' + el.props._hide : '')} draggable={false} onDragStart={(e) => { if (!preview) e.preventDefault() }} data-free-ui="1" data-editor-interactive={active ? "true" : undefined} data-element={el.id}
        onPointerDown={(e) => start(e, el, 'move')}
        onContextMenu={(e) => {
          if (preview) return
          e.preventDefault()
          e.stopPropagation()
          setSel({ block: bid, el: el.id })
          setCtxMenu({ x: e.clientX, y: e.clientY, el })
        }}
        onPointerEnter={() => !preview && setHover(el.id)} onPointerLeave={() => setHover('')}
        onDoubleClick={() => { if (preview || el.props._locked) return; if (TEXTY.has(el.type)) setEditing(el.id); else if (el.type === 'video' || el.type === 'swiper') setInteracting(el.id) }}
        style={{ display: preview && el.props._hidden ? 'none' : undefined, position: 'absolute', left: px(el.x), top: px(el.y), width: px(el.w), height: px(el.h), opacity: movingIds.has(el.id) ? 0 : el.props._hidden ? 0.3 : 1, zIndex: el.type === 'container' ? 0 : 1, cursor: preview || active || el.props._locked ? 'auto' : editing === el.id ? 'text' : 'move', touchAction: preview || active ? 'auto' : 'none', userSelect: preview ? 'auto' : 'none', pointerEvents: preview && el.type === 'container' ? 'none' : 'auto' }}>
        {editing === el.id && !preview ? <InlineText el={el} scale={scale} onDone={(text) => { setEditing(''); if (text !== null) commit(mapOne(el.id, (it) => ({ ...it, props: { ...it.props, text } }))) }} /> :
          <div onPointerDown={active ? (e) => e.stopPropagation() : undefined} style={{ width: '100%', height: '100%', pointerEvents: preview || active ? 'auto' : 'none' }}><FreeElementView el={el} scale={scale} editing={!preview && !active} scrollEffects={preview} state={!preview && cur?.id === el.id ? selectedState : undefined} /></div>}
      </div>
    })}
    {moving.length > 0 && rect && createPortal(<div data-free-ui="1" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 99999 }}>
      {moving.map((el) => <div key={el.id} style={{ position: 'absolute', left: rect.left + px(el.x), top: rect.top + px(el.y), width: px(el.w), height: px(el.h), containerType: 'inline-size' }}><FreeElementView el={el} scale={scale} editing /></div>)}
    </div>, host.current!.ownerDocument.body)}
    {!preview && <div data-hud="1" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 5 }}>
      {hoverEl && hoverEl.id !== cur?.id && (
        <div style={{ position: 'absolute', left: px(hoverEl.x), top: px(hoverEl.y), width: px(hoverEl.w), height: px(hoverEl.h), outline: '1.5px solid #10b981', pointerEvents: 'none', zIndex: 10 }}>
          <span style={{ position: 'absolute', left: 0, top: -20, background: '#10b981', color: '#fff', padding: '1px 6px', borderRadius: '4px 4px 0 0', fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>
            {hoverEl.props?.text ? String(hoverEl.props.text).slice(0, 18) : hoverEl.type}
          </span>
        </div>
      )}
      {group && <>
        <div style={{ position: 'absolute', left: px(group.x), top: px(group.y), width: px(group.w), height: px(group.h), outline: '1.5px solid #10b981' }} />
        {list.filter((el) => el.parentId === group.id).flatMap((el) => [el.y, el.y + el.h].map((y, i) => <div key={el.id + i} style={{ position: 'absolute', left: px(group.x), width: px(group.w), top: px(y), borderTop: '1px dashed #34d39980' }} />))}
      </>}
      {guides.v != null && <div style={{ position: 'absolute', left: px(guides.v), top: 0, bottom: 0, borderLeft: '1px solid #d946ef' }} />}
      {cur && editing !== cur.id && <>
        <div data-docking-line="1" style={{ position: 'absolute', top: px(cur.y + cur.h / 2), left: 0, right: 0, borderTop: '1px solid #d946ef' }} />
        {guides.h != null && <div style={{ position: 'absolute', top: px(guides.h), left: 0, right: 0, borderTop: '1px solid #d946ef' }} />}
        <span data-measure="offset" style={{ ...measure, left: Math.min(size.w - 42, px(cur.x + cur.w) + 8), top: px(cur.y + cur.h / 2) - 20 }}>{(Math.max(0, FREE_W - cur.x - cur.w) / FREE_W * 100).toFixed(1)}%</span>
        <div style={{ position: 'absolute', left: px(cur.x), top: px(cur.y), width: px(cur.w), height: px(cur.h), outline: '1.5px solid #10b981', outlineOffset: 0 }}>
          <span data-measure="top" style={{ ...measure, left: '50%', top: -20, transform: 'translateX(-50%)' }}>{Math.round(cur.y - (group && group.id !== cur.id ? Math.max(group.y, ...list.filter((el) => el.parentId === group.id && el.id !== cur.id && el.y + el.h <= cur.y).map((el) => el.y + el.h)) : 0))}px</span>
          {HANDLES.map((hd) => {
            const hx = hd.includes('w') ? 0 : hd.includes('e') ? 100 : 50
            const hy = hd.includes('n') ? 0 : hd.includes('s') ? 100 : 50
            return <span key={hd} data-free-ui="1" data-handle={hd} data-editor-control="true" role="button" tabIndex={0} aria-label={'Resize ' + hd} onKeyDown={(e) => { if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return; e.preventDefault(); e.stopPropagation(); const step = e.shiftKey ? 10 : 1; const dx = e.key === 'ArrowRight' ? step : e.key === 'ArrowLeft' ? -step : 0; const dy = e.key === 'ArrowDown' ? step : e.key === 'ArrowUp' ? -step : 0; set((el) => { const w = Math.max(MIN, el.w + (hd.includes('w') ? -dx : hd.includes('e') ? dx : 0)); const h = Math.max(MIN, el.h + (hd.includes('n') ? -dy : hd.includes('s') ? dy : 0)); return { ...el, x: hd.includes('w') ? el.x + el.w - w : el.x, y: hd.includes('n') ? el.y + el.h - h : el.y, w, h } }) }} onPointerDown={(e) => start(e, cur, 'resize', hd)} style={{ position: 'absolute', left: hx + '%', top: hy + '%', width: 8, height: 8, boxSizing: 'border-box', marginLeft: -4, marginTop: -4, background: '#fff', border: '1px solid #10b981', borderRadius: hd === 'w' || hd === 'e' ? '50%' : 1, boxShadow: '0 1px 3px rgba(0,0,0,.25)', pointerEvents: 'auto', cursor: CURSOR[hd], touchAction: 'none' }} />
          })}
        </div>
        {!interacting && !drag.current?.moved && <div data-free-ui="1" style={{ display: 'contents' }}><Toolbar el={cur} scale={scale} hostW={size.w} patch={patch} set={set} dup={dup} del={del} order={order} onEdit={() => setEditing(cur.id)} /></div>}
      </>}
    </div>}
    {ctxMenu && createPortal(
      <div
        data-free-ui="1"
        data-editor-control="true"
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          left: Math.min(ctxMenu.x, (host.current?.ownerDocument.defaultView?.innerWidth ?? 1200) - 210),
          top: Math.min(ctxMenu.y, (host.current?.ownerDocument.defaultView?.innerHeight ?? 800) - 280),
          zIndex: 99999,
          background: '#ffffff',
          borderRadius: 10,
          border: '1px solid #e2e8f0',
          boxShadow: '0 16px 36px rgba(0,0,0,0.18)',
          padding: 5,
          minWidth: 190,
          fontFamily: 'system-ui, sans-serif',
          fontSize: 12,
        }}
      >
        <div style={{ padding: '4px 8px', fontSize: 11, fontWeight: 700, color: '#64748b', borderBottom: '1px solid #f1f5f9', marginBottom: 4 }}>
          {ctxMenu.el.type.toUpperCase()}
        </div>
        <button type="button" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '6px 8px', border: 0, borderRadius: 6, background: 'transparent', cursor: 'pointer', fontSize: 12, color: '#1e293b' }} onClick={() => { copyToClipboard(ctxMenu.el); setCtxMenu(null) }}>
          <span>Sao chép</span><span style={{ fontSize: 10, color: '#94a3b8' }}>Ctrl+C</span>
        </button>
        <button type="button" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '6px 8px', border: 0, borderRadius: 6, background: 'transparent', cursor: 'pointer', fontSize: 12, color: '#1e293b' }} onClick={async () => { if (await copyToClipboard(ctxMenu.el)) { del(); setCtxMenu(null) } }}>
          <span>Cắt</span><span style={{ fontSize: 10, color: '#94a3b8' }}>Ctrl+X</span>
        </button>
        <button type="button" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '6px 8px', border: 0, borderRadius: 6, background: 'transparent', cursor: 'pointer', fontSize: 12, color: '#1e293b' }} onClick={() => { dup(); setCtxMenu(null) }}>
          <span>Nhân đôi</span><span style={{ fontSize: 10, color: '#94a3b8' }}>Ctrl+D</span>
        </button>
        <div style={{ height: 1, background: '#f1f5f9', margin: '4px 0' }} />
        <button type="button" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '6px 8px', border: 0, borderRadius: 6, background: 'transparent', cursor: 'pointer', fontSize: 12, color: '#1e293b' }} onClick={() => { order('front'); setCtxMenu(null) }}>
          <span>Lên trên cùng</span>
        </button>
        <button type="button" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '6px 8px', border: 0, borderRadius: 6, background: 'transparent', cursor: 'pointer', fontSize: 12, color: '#1e293b' }} onClick={() => { order(1); setCtxMenu(null) }}>
          <span>Lên một lớp</span><span style={{ fontSize: 10, color: '#94a3b8' }}>Ctrl+]</span>
        </button>
        <button type="button" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '6px 8px', border: 0, borderRadius: 6, background: 'transparent', cursor: 'pointer', fontSize: 12, color: '#1e293b' }} onClick={() => { order(-1); setCtxMenu(null) }}>
          <span>Xuống một lớp</span><span style={{ fontSize: 10, color: '#94a3b8' }}>Ctrl+[</span>
        </button>
        <button type="button" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '6px 8px', border: 0, borderRadius: 6, background: 'transparent', cursor: 'pointer', fontSize: 12, color: '#1e293b' }} onClick={() => { order('back'); setCtxMenu(null) }}>
          <span>Xuống dưới cùng</span>
        </button>
        <div style={{ height: 1, background: '#f1f5f9', margin: '4px 0' }} />
        <button type="button" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '6px 8px', border: 0, borderRadius: 6, background: 'transparent', cursor: 'pointer', fontSize: 12, color: '#ef4444' }} onClick={() => { del(); setCtxMenu(null) }}>
          <span>Xóa</span><span style={{ fontSize: 10, color: '#ef4444' }}>Del</span>
        </button>
      </div>,
      host.current!.ownerDocument.body
    )}
  </div>
}

// ---------- Một section / widget trên canvas ----------
const chipBtn: React.CSSProperties = { minWidth: 26, height: 26, border: 0, borderRadius: 6, background: 'transparent', color: '#fff', cursor: 'pointer', font: 'inherit', fontSize: 13, fontWeight: 700 }

function SectionBox({ block, config, sel, setSel, data, commit, label, first, last, preview, partDevice, selectedState, siteCtx }: { block: Block; config: any; sel: Sel; setSel: (s: Sel) => void; data: PageData; commit: (d: PageData, key?: string) => void; label: string; first: boolean; last: boolean; preview?: boolean; partDevice: WidgetPartDevice; selectedState: ElementState; siteCtx: SiteCtx }) {
  const id = blockId(block)
  const Render = config.components[block.type]?.render
  const wrap = useRef<HTMLDivElement>(null)
  const section = isSection(block)
  const [partDraft, setPartDraft] = useState<WidgetParts | null>(null)
  const partDrag = useRef<{ path: string; sx: number; sy: number; x: number; y: number; parts: WidgetParts; moved: boolean } | null>(null)
  const activePart = !preview && sel.block === id && sel.part ? widgetPartSelector(id, sel.part) : ''
  const partKey = widgetPartKey(partDevice)
  const selected = !preview && sel.block === id && !sel.el
  const [hDraft, setHDraft] = useState<number | null>(null)
  const hDrag = useRef<{ sy: number; h0: number } | null>(null)
  const hRef = useRef(0)
  const scale = () => Math.min(wrap.current?.clientWidth ?? FREE_W, FREE_MAX_PX) / FREE_W

  const op = (kind: 'up' | 'down' | 'dup' | 'del' | 'add') => {
    if (kind === 'up') commit(moveBlock(data, id, -1))
    if (kind === 'down') commit(moveBlock(data, id, 1))
    if (kind === 'dup') commit(duplicateBlock(data, id))
    if (kind === 'del') { commit(removeBlock(data, id)); setSel(NO_SEL) }
    if (kind === 'add') {
      const nb: Block = { type: 'FreeCanvas', props: { id: newBlockId('FreeCanvas'), height: 400, _els: [] } }
      commit(insertBlock(data, nb, id))
      setSel({ block: nb.props.id, el: '' })
    }
  }

  return (
    <div
      ref={wrap}
      data-block={id}
      className={(section ? elementStateScope(id) : '') + (preview && ['m', 't', 'd'].includes(block.props._hide) ? ' hs-hide-' + block.props._hide : '')}
      data-hs-state={!preview && selected ? selectedState : undefined}
      tabIndex={-1}
      onDragOver={(e) => { if (!preview && e.dataTransfer.types.includes('text/plain')) { e.preventDefault(); e.currentTarget.dataset.canvasDrop = 'true' } }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) delete e.currentTarget.dataset.canvasDrop }}
      onDrop={(e) => {
        if (preview) return
        delete e.currentTarget.dataset.canvasDrop
        const payload = e.dataTransfer.getData('text/plain')
        if (!insertionPayload(payload)) return
        e.preventDefault()
        e.stopPropagation()
        const section = droppedSection(payload, siteCtx)
        if (section) { commit(insertBlock(data, section, id)); setSel({ block: blockId(section), el: '' }); return }
        const el = droppedElement(payload)
        if (!el) return
        const rect = wrap.current!.querySelector('[data-canvas-layer]')!.getBoundingClientRect()
        el.x = (e.clientX - rect.left) / (rect.width / FREE_W) - el.w / 2
        el.y = (e.clientY - rect.top) / (rect.width / FREE_W) - el.h / 2
        commit(placeElement(data, id, el, { x: el.x, y: el.y }))
        setSel({ block: id, el: el.id })
      }}
      style={{ position: 'relative', zIndex: !preview && sel.block === id ? 40 : 0 }}
      onPointerDown={(e) => {
        if (preview || e.button !== 0 || (e.target as Element).closest('[data-free-ui]')) return
        const target = e.target as Element
        const root = target.closest('[data-hs-parts]')
        const part = target.closest('button, a, input, select, textarea') ?? target.closest('svg') ?? target
        const path = !section && root ? widgetPartPath(root, part) : ''
        setSel({ block: id, el: '', ...(path ? { part: path } : {}) })
        if (!path) return
        e.preventDefault()
        e.currentTarget.focus({ preventScroll: true })
        const style = widgetPartsForDevice(block.props, partDevice)[path] ?? {}
        partDrag.current = { path, sx: e.clientX, sy: e.clientY, x: Number(style.x) || 0, y: Number(style.y) || 0, parts: block.props[partKey] ?? {}, moved: false }
        e.currentTarget.setPointerCapture(e.pointerId)
      }}
      onPointerMove={(e) => {
        const drag = partDrag.current
        if (!drag) return
        const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy
        if (!drag.moved && Math.abs(dx) + Math.abs(dy) < 3) return
        drag.moved = true
        drag.parts = patchWidgetPart(block.props[partKey], drag.path, { x: Math.round(drag.x + dx), y: Math.round(drag.y + dy) })
        setPartDraft(drag.parts)
      }}
      onPointerUp={() => {
        const drag = partDrag.current
        partDrag.current = null
        if (drag?.moved) commit(patchBlock(data, id, { [partKey]: drag.parts }))
        setPartDraft(null)
      }}
      onPointerCancel={() => { partDrag.current = null; setPartDraft(null) }}
      onLostPointerCapture={() => { partDrag.current = null; setPartDraft(null) }}
    >
      {Render ? React.createElement(Render, { ...block.props, ...(partDraft ? { [partKey]: partDraft } : {}), _hide: undefined, _states: section ? undefined : block.props._states, _editorState: undefined, _noFree: true, _editParts: !section }) : <div style={{ padding: 24, background: '#fef3c7', font: '14px sans-serif' }}>Block “{block.type}” không còn trong site (plugin đã gỡ).</div>}
      {section && <style>{elementStatesCss(id, block.props)}</style>}
      {activePart && <style>{activePart + '{outline:2px solid #10b981!important;outline-offset:3px;cursor:move;touch-action:none}'}</style>}
      <Layer selectedState={selectedState} blockId={id} els={elsOf(block)} sel={sel} setSel={setSel} preview={preview} onTransfer={(target, next, rootId) => { commit(reparentElements(data, id, target, next, rootId)); setSel({ block: target, el: rootId }) }} onEls={(next, key) => commit(setBlockEls(data, id, next), key)} labelHint={section ? 'Phần trống: chọn tab “Văn bản” hoặc “Phần tử” bên trái rồi bấm để thêm.' : undefined} />
      {selected && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', outline: `2px solid ${BRAND}`, outlineOffset: -2, zIndex: 30 }}>
          <div data-free-ui="1" data-editor-control="true" style={{ position: 'absolute', left: 8, top: 8, display: 'flex', alignItems: 'center', gap: 2, padding: '3px 6px', background: BRAND, color: '#fff', borderRadius: 8, pointerEvents: 'auto', font: '12px/1 Arial, sans-serif', boxShadow: '0 4px 12px rgba(0,0,0,.25)' }}>
            <span style={{ padding: '0 6px', fontWeight: 700 }}>{label}</span>
            <button type="button" title="Lên" disabled={first} style={{ ...chipBtn, opacity: first ? 0.4 : 1 }} onClick={() => op('up')}>↑</button>
            <button type="button" title="Xuống" disabled={last} style={{ ...chipBtn, opacity: last ? 0.4 : 1 }} onClick={() => op('down')}>↓</button>
            <button type="button" title="Nhân đôi" style={chipBtn} onClick={() => op('dup')}>⧉</button>
            <button type="button" title="Thêm phần bên dưới" style={chipBtn} onClick={() => op('add')}>＋</button>
            <button type="button" title="Xóa phần" style={chipBtn} onClick={() => op('del')}>🗑</button>
          </div>
          {section && (
            <>
              <div
                data-free-ui="1"
                title="Kéo để đổi chiều cao phần"
                onPointerDown={(e) => {
                  e.stopPropagation()
                  e.currentTarget.setPointerCapture(e.pointerId)
                  const h0 = (wrap.current?.clientHeight ?? 400) / scale()
                  hDrag.current = { sy: e.clientY, h0 }
                  hRef.current = Math.round(h0)
                  setHDraft(hRef.current)
                }}
                onPointerMove={(e) => {
                  if (!hDrag.current) return
                  hRef.current = Math.max(80, Math.round(hDrag.current.h0 + (e.clientY - hDrag.current.sy) / scale()))
                  setHDraft(hRef.current)
                }}
                onPointerUp={() => {
                  if (!hDrag.current) return
                  hDrag.current = null
                  commit(patchBlock(data, id, { height: hRef.current }))
                  setHDraft(null)
                }}
                style={{ position: 'absolute', left: '50%', bottom: 0, transform: 'translate(-50%, 50%)', width: 72, height: 14, borderRadius: 7, background: '#fff', border: `1.5px solid ${BRAND}`, cursor: 'ns-resize', pointerEvents: 'auto', touchAction: 'none' }}
              />
              {hDraft != null && <span style={{ position: 'absolute', left: '50%', bottom: 14, transform: 'translateX(-50%)', padding: '2px 6px', background: '#111827', color: '#fff', borderRadius: 4, fontSize: 11 }}>{hDraft}px</span>}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function InsertDivider({ onAdd, preview }: { onAdd: () => void; preview?: boolean }) {
  const [hover, setHover] = useState(false)
  if (preview) return null
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      data-free-ui="1"
      style={{
        position: 'relative',
        height: 18,
        margin: '-9px 0',
        zIndex: 28,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
      }}
      onClick={(e) => { e.stopPropagation(); onAdd() }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          height: 2,
          background: hover ? 'var(--hosso-brand, #15803d)' : 'transparent',
          transition: 'background 0.15s ease',
        }}
      />
      {hover && (
        <button
          type="button"
          data-editor-control="true"
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '3px 12px',
            borderRadius: 999,
            background: 'var(--hosso-brand, #15803d)',
            color: '#fff',
            border: 0,
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(0,0,0,0.22)',
            transition: 'transform 0.1s ease',
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          ＋ Thêm phần vào đây
        </button>
      )}
    </div>
  )
}

// ---------- Trang ----------
export function CanvasStage({
  siteCtx = {},
  selectedState = 'normal',
  partDevice = 'desktop',
  data,
  config,
  sel,
  setSel,
  commit,
  labelOf,
  width,
  zoom = 'fit',
  css,
  htmlClass,
  onDoc,
  rootRender,
  areaKind,
  preview = false,
}: {
  areaKind?: string
  preview?: boolean
  partDevice?: WidgetPartDevice
  selectedState?: ElementState
  siteCtx?: SiteCtx
  data: PageData
  config: any
  sel: Sel
  setSel: (s: Sel) => void
  commit: (d: PageData, key?: string) => void
  labelOf: (type: string) => string
  width: number | string
  zoom?: 'fit' | number
  css: string
  htmlClass: string
  onDoc?: (d: Document) => void
  rootRender?: React.ComponentType<{ children: React.ReactNode }>
}) {
  const blocks = data.content ?? []
  const Root = rootRender ?? (config.root?.render as React.ComponentType<{ children: React.ReactNode }> | undefined)
  const body = blocks.length ? (
    blocks.map((b, i) => (
      <React.Fragment key={blockId(b)}>
        <SectionBox
          siteCtx={siteCtx}
          selectedState={selectedState}
          partDevice={partDevice}
          preview={preview}
          block={b}
          config={config}
          sel={sel}
          setSel={setSel}
          data={data}
          commit={commit}
          label={isSection(b) ? 'Phần' : labelOf(b.type)}
          first={i === 0}
          last={i === blocks.length - 1}
        />
        <InsertDivider
          preview={preview}
          onAdd={() => {
            const nb: Block = { type: 'FreeCanvas', props: { id: newBlockId('FreeCanvas'), height: 400, _els: [] } }
            commit(insertBlock(data, nb, blockId(b)))
            setSel({ block: nb.props.id, el: '' })
          }}
        />
      </React.Fragment>
    ))
  ) : (
    <div style={{ padding: '120px 24px', textAlign: 'center', font: '16px Arial, sans-serif', color: '#6b7280' }}>
      Trang trống. Mở tab “Thêm” bên trái để thêm phần đầu tiên.
    </div>
  )
  // Lớp nổi toàn trang (component không thuộc section nào) phủ lên toàn bộ nội dung; vùng header/footer không dùng.
  const page = (
    <div data-editor-page='true' ref={(node) => { if (node) node.ownerDocument.body.dataset.preview = String(preview) }} style={{ position: 'relative' }}
      onDragOver={(e) => { if (!preview && e.dataTransfer.types.includes('text/plain')) e.preventDefault() }}
      onDrop={(e) => {
        if (preview) return
        const payload = e.dataTransfer.getData('text/plain')
        if (!insertionPayload(payload)) return
        e.preventDefault()
        const section = droppedSection(payload, siteCtx)
        if (section) { commit(insertBlock(data, section)); setSel({ block: blockId(section), el: '' }); return }
        const el = droppedElement(payload)
        if (!el) return
        if (areaKind) {
          const section: Block = { type: 'FreeCanvas', props: { id: newBlockId('FreeCanvas'), height: 400, _els: [el] } }
          commit(insertBlock(data, section)); setSel({ block: blockId(section), el: el.id }); return
        }
        const rect = e.currentTarget.getBoundingClientRect(), scale = Math.min(rect.width, FREE_MAX_PX) / FREE_W
        if (!scale) return
        commit(placeElement(data, PAGE, el, { x: (e.clientX - rect.left - Math.max(0, (rect.width - FREE_MAX_PX) / 2)) / scale - el.w / 2, y: (e.clientY - rect.top) / scale - el.h / 2 }))
        setSel({ block: PAGE, el: el.id })
      }}>
      {body}
      {!areaKind && <div style={{ position: 'absolute', inset: 0, zIndex: 25, pointerEvents: 'none' }}><Layer selectedState={selectedState} preview={preview} onTransfer={(target, next, rootId) => { commit(reparentElements(data, PAGE, target, next, rootId)); setSel({ block: target, el: rootId }) }} blockId={PAGE} els={floatOf(data)} sel={sel} setSel={setSel} onEls={(next, key) => commit(setBlockEls(data, PAGE, next), key)} /></div>}
    </div>
  )
  return <StageFrame width={width} zoom={zoom} css={css} htmlClass={htmlClass} onDoc={onDoc}>{Root ? <Root>{page}</Root> : page}</StageFrame>
}

export { addEls }
