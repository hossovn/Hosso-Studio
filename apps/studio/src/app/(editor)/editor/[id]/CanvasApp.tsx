'use client'
import { FREE_MAX_PX, FREE_W, cloneElements, elementFamily, patchWidgetPart, widgetPartKey, widgetPartsForDevice, type FreeElement, type ElementState } from '@hosso/studio-blocks'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createStore, useStore } from 'zustand'
import { ArrowLeft, ChevronRight, Copy, Eye, HelpCircle, Layers, Monitor, Pencil, PanelLeftClose, PanelRightClose, Redo2, Smartphone, Tablet, Trash2, Undo2 } from 'lucide-react'
import { elsOf } from './canvas-model'
import { visibleCanvasBlock, visibleCanvasRange } from './canvas-viewport'

import { CanvasInspector } from './CanvasInspector'
import { CanvasLeft, elLabel, type LeftOps, type Tab } from './CanvasLeft'
import type { NavCtx } from './SitePanels'
import { PagesDropdown } from './PagesDropdown'
import { CanvasStage } from './CanvasStage'
import { StyleClipboardContext } from './FreeCanvasEditor'
import type { SiteCtx } from './SectionTemplates'
import {
  NO_SEL, PAGE, addEls, placeElement, placementOwner, blockId, commitHist, dupEl, findEl, initHist, insertBlock, isSection, newBlockId, patchBlock, redoHist, removeEl, undoHist, updateEl,
  type Block, type Hist, type PageData, type Sel,
} from './canvas-model'

const CLIP = 'hosso-els:'
const DEVICES = [
  { id: 'desktop', label: 'Máy tính', width: '100%', icon: 'M3 5h18v11H3zM8 20h8M12 16v4' },
  { id: 'tablet', label: 'Máy tính bảng', width: 768, icon: 'M6 3h12v18H6zM11 18h2' },
  { id: 'mobile', label: 'Điện thoại', width: 390, icon: 'M8 3h8v18H8zM11 18h2' },
] as const


/** Bảo đảm dữ liệu có `content` và mọi block có id (dữ liệu cũ hoặc nhập từ nơi khác có thể thiếu). */
const normalize = (d: any): PageData => {
  const base: PageData = d && typeof d === 'object' ? d : { content: [] }
  return { ...base, root: base.root ?? { props: {} }, content: (base.content ?? []).map((b: Block) => (b.props?.id ? b : { ...b, props: { ...(b.props ?? {}), id: newBlockId(b.type) } })) }
}

type Props = {
  config: any
  data: any
  onChange: (d: PageData) => void
  css: string
  htmlClass: string
  title: string
  backHref: string
  menu: React.ReactNode
  actions: React.ReactNode
  labelOf: (type: string) => string
  lang: string
  rootRender?: React.ComponentType<{ children: React.ReactNode }>
  /** Liên kết chuyển phạm vi sửa: Trang, Header (dùng chung), Footer (dùng chung). */
  scopes?: { label: string; href: string; active: boolean }[]
  areaKind?: 'header' | 'footer' | ''
  siteCtx?: SiteCtx
  nav?: NavCtx
  initialSelection?: Sel
}

export function CanvasApp({ config, data: initial, onChange, css, htmlClass, title, backHref, menu, actions, labelOf, lang, rootRender, scopes, areaKind = '', siteCtx = {}, nav, initialSelection }: Props) {
  const [store] = useState(() => createStore<{ hist: Hist; sel: Sel; preview: boolean }>(() => ({ hist: initHist(normalize(initial)), sel: initialSelection ?? NO_SEL, preview: false })))
  const { hist, sel, preview } = useStore(store)
  const setSel = useCallback((next: Sel) => store.setState({ sel: next }), [store])
  const [leftOpen, setLeftOpen] = useState(false)
  const [rightOpen, setRightOpen] = useState(true)
  const openLeft = () => {
    if (window.innerWidth <= 1100) setRightOpen(false)
    setLeftOpen(true)
  }
  const toggleLeft = () => {
    if (!leftOpen && window.innerWidth <= 1100) setRightOpen(false)
    setLeftOpen(!leftOpen)
  }
  const toggleRight = () => {
    if (!rightOpen && window.innerWidth <= 1100) setLeftOpen(false)
    setRightOpen(!rightOpen)
  }
  const [zoom, setZoom] = useState<'fit' | 0.5 | 0.75 | 1 | 1.25>('fit')
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [copiedStyle, setCopiedStyle] = useState<Record<string, unknown> | null>(null)
  useEffect(() => {
    if (window.innerWidth <= 1100) setRightOpen(false)
    if (window.innerWidth <= 800) setLeftOpen(false)
  }, [])
  const [tab, setTab] = useState<Tab>('sections')
  const [device, setDevice] = useState<(typeof DEVICES)[number]['id']>('desktop')
  const [elementState, setElementState] = useState<ElementState>('normal')
  useEffect(() => setElementState('normal'), [sel.el, sel.block, preview])
  const [docs, setDocs] = useState<Document[]>([])
  useEffect(() => {
    const inspect = (event: Event) => {
      setRightOpen(true)
      if (window.innerWidth <= 1100) setLeftOpen(false)
      setElementState((event as CustomEvent).detail === 'states' ? 'hover' : 'normal')
    }
    docs.forEach((doc) => doc.addEventListener('hosso-inspect', inspect))
    return () => docs.forEach((doc) => doc.removeEventListener('hosso-inspect', inspect))
  }, [docs])
  const data = hist.present
  const revealBlock = useRef('')
  useEffect(() => {
    const id = revealBlock.current
    if (!id || !docs[0]) return
    const frame = requestAnimationFrame(() => {
      docs[0].querySelector(`[data-block="${CSS.escape(id)}"]`)?.scrollIntoView({ block: 'start' })
      revealBlock.current = ''
    })
    return () => cancelAnimationFrame(frame)
  }, [data, docs])
  const commit = useCallback((next: PageData, key?: string) => store.setState((s) => ({ hist: commitHist(s.hist, next, key) })), [store])
  const undo = useCallback(() => store.setState((s) => {
    const hist = undoHist(s.hist), hit = findEl(hist.present, s.sel.el)
    return { hist, sel: hit ? { block: blockId(hit.block), el: hit.el.id } : NO_SEL }
  }), [store])
  const redo = useCallback(() => store.setState((s) => {
    const hist = redoHist(s.hist), hit = findEl(hist.present, s.sel.el)
    return { hist, sel: hit ? { block: blockId(hit.block), el: hit.el.id } : NO_SEL }
  }), [store])

  // Báo thay đổi lên Editor (tự lưu nháp, cảnh báo chưa lưu…), bỏ lần đầu.
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    onChange(hist.present)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hist.present])

  const st = useRef({ data, sel, preview, device })
  st.current = { data, sel, preview, device }
  const api = useRef<{ addEls: (els: FreeElement[]) => void }>({ addEls: () => {} })

  // ---- Phím tắt (cả trang quản trị lẫn trong iframe) ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (st.current.preview) return
      const t = e.target as HTMLElement | null
      if (t?.closest?.('input, textarea, select, [contenteditable], .cv-left')) return
      const mod = e.ctrlKey || e.metaKey
      const { data: d, sel: s } = st.current
      const k = e.key.toLowerCase()
      if (mod && k === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return }
      if (mod && k === 'y') { e.preventDefault(); redo(); return }
      if (s.part) {
        if (k === 'escape') { setSel({ block: s.block, el: '' }); return }
        const block = d.content.find((b) => blockId(b) === s.block)
        const step = e.shiftKey ? 10 : 1
        const delta: Record<string, [number, number]> = { arrowleft: [-step, 0], arrowright: [step, 0], arrowup: [0, -step], arrowdown: [0, step] }
        if (block && delta[k]) {
          e.preventDefault()
          const key = widgetPartKey(st.current.device)
          const part = widgetPartsForDevice(block.props, st.current.device)[s.part] ?? {}, [dx, dy] = delta[k]
          commit(patchBlock(d, s.block, { [key]: patchWidgetPart(block.props[key], s.part, { x: (Number(part.x) || 0) + dx, y: (Number(part.y) || 0) + dy }) }), 'n:' + st.current.device + ':' + s.block + ':' + s.part)
        }
        return
      }
      if (!s.el || !findEl(d, s.el)) return
      if (findEl(d, s.el)?.el.props._locked && k !== 'escape') return
      const step = e.shiftKey ? 10 : 1
      const nudge: Record<string, [number, number]> = { arrowleft: [-step, 0], arrowright: [step, 0], arrowup: [0, -step], arrowdown: [0, step] }
      if (k === 'delete' || k === 'backspace') { e.preventDefault(); commit(removeEl(d, s.el)); setSel({ block: s.block, el: '' }) }
      else if (mod && k === 'd') { e.preventDefault(); const r = dupEl(d, s.el); commit(r.data); setSel({ block: s.block, el: r.id }) }
      else if (nudge[k]) { e.preventDefault(); const [dx, dy] = nudge[k]; commit(updateEl(d, s.el, (el) => ({ ...el, x: el.x + dx, y: el.y + dy })), `n:${s.el}`) }
      else if (k === 'escape') setSel({ block: s.block, el: '' })
    }
    // Sao chép, cắt, dán component (dùng sự kiện clipboard nên dán được sang trang khác); dán vào đúng chỗ đang nhìn.
    const typing = (e: Event) => Boolean((e.target as HTMLElement | null)?.closest?.('input, textarea, select, [contenteditable]'))
    const onCopy = (e: ClipboardEvent) => {
      if (st.current.preview || typing(e)) return
      const { data: d, sel: s } = st.current
      const hit = s.el ? findEl(d, s.el) : null
      if (!hit || !e.clipboardData) return
      e.clipboardData?.setData('text/plain', CLIP + JSON.stringify(elementFamily(elsOf(hit.block), hit.el.id)))
      e.preventDefault()
      if (e.type === 'cut') { commit(removeEl(d, s.el)); setSel({ block: s.block, el: '' }) }
    }
    const onPaste = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData('text/plain') ?? ''
      if (st.current.preview || typing(e) || !text.startsWith(CLIP)) return
      e.preventDefault()
      try {
        const els = JSON.parse(text.slice(CLIP.length)) as FreeElement[]
        if (Array.isArray(els) && els.length && els.every((el) => el && typeof el.id === 'string' && typeof el.type === 'string' && ['x', 'y', 'w', 'h'].every((key) => Number.isFinite(el[key as keyof FreeElement])) && el.w > 0 && el.h > 0 && el.props && typeof el.props === 'object')) api.current.addEls(cloneElements(els))
      } catch {}
    }
    const targets: Document[] = [document, ...docs]
    targets.forEach((d) => {
      d.addEventListener('keydown', onKey)
      d.addEventListener('copy', onCopy)
      d.addEventListener('cut', onCopy)
      d.addEventListener('paste', onPaste)
    })
    return () => targets.forEach((d) => {
      d.removeEventListener('keydown', onKey)
      d.removeEventListener('copy', onCopy)
      d.removeEventListener('cut', onCopy)
      d.removeEventListener('paste', onPaste)
    })
  }, [docs, commit, undo, redo])

  // ---- Thêm nội dung ----
  const blocks = data.content
  const section = (els: FreeElement[], height?: number, bg?: string): Block => ({
    type: 'FreeCanvas',
    props: { id: newBlockId('FreeCanvas'), height: height ?? Math.max(400, ...els.map((e) => e.y + e.h + 40)), ...(bg ? { _bgHex: bg } : {}), _els: els },
  })
  const viewTarget = () => {
    const doc = docs[0]
    const pick = doc && visibleCanvasBlock(doc, blocks.map(blockId))
    if (!pick) return null
    const k = Math.min(pick.node.clientWidth, FREE_MAX_PX) / FREE_W
    return { id: pick.id, cx: FREE_W / 2, cy: ((pick.top + pick.bottom) / 2 - pick.rect.top) / k, maxY: pick.rect.height / k }
  }
  const afterVisible = () => viewTarget()?.id
  const ops: LeftOps = {
    addEls: (els) => {
      if (!els.length) return
      const visible = docs[0] && [...blocks].reverse().find((block) => isSection(block) && visibleCanvasBlock(docs[0], [blockId(block)]))
      const owner = placementOwner(data, sel, visible ? blockId(visible) : undefined)
      if (els.length === 1 && (!areaKind || owner !== PAGE)) {
        const selected = sel.el && findEl(data, sel.el)?.el
        const el = selected ? { ...els[0], x: selected.x + selected.w + 16 + els[0].w <= FREE_W ? selected.x + selected.w + 16 : selected.x, y: selected.x + selected.w + 16 + els[0].w <= FREE_W ? selected.y : selected.y + selected.h + 16, parentId: selected.parentId } : els[0]
        commit(placeElement(data, owner, el))
        setSel({ block: owner, el: el.id })
        return
      }
      // Vào đúng section đang nhìn thấy (không phải section chọn từ lúc trước), đặt giữa vùng thấy được.
      const vt = viewTarget()
      if (vt && blocks.some((b) => blockId(b) === vt.id && isSection(b))) {
        commit(addEls(data, vt.id, els, vt))
        setSel({ block: vt.id, el: els[0].id })
        return
      }
      // No visible section: place the element on the visible part of the page layer.
      if (!areaKind) {
        const doc = docs[0]
        const range = doc && visibleCanvasRange(doc)
        const page = doc?.querySelector<HTMLElement>('[data-editor-page]')
        if (!range || !page || !page.clientWidth) return
        const rect = page.getBoundingClientRect()
        const scale = Math.min(page.clientWidth, FREE_MAX_PX) / FREE_W
        commit(addEls(data, PAGE, els, { cx: FREE_W / 2, cy: ((range.top + range.bottom) / 2 - rect.top) / scale, maxY: rect.height / scale }))
        setSel({ block: PAGE, el: els[0].id })
        return
      }
      const nb = section(els.map((e) => ({ ...e, x: 80, y: 24 })))
      revealBlock.current = blockId(nb)
      commit(insertBlock(data, nb, vt?.id))
      setSel({ block: blockId(nb), el: els[0].id })
    },
    addSection: (tpl) => {
      const nb = section(tpl.els, tpl.height, tpl.bg)
      revealBlock.current = blockId(nb)
      commit(insertBlock(data, nb, afterVisible()))
      setSel({ block: blockId(nb), el: '' })
    },
    addWidget: (type, extra) => {
      const nb: Block = { type, props: { ...(config.components[type]?.defaultProps ?? {}), ...extra, id: newBlockId(type) } }
      revealBlock.current = blockId(nb)
      commit(insertBlock(data, nb, afterVisible()))
      setSel({ block: blockId(nb), el: '' })
    },
  }

  api.current = ops
  const dev = DEVICES.find((d) => d.id === device)!
  const selectedBlock = data.content.find((b) => blockId(b) === sel.block)
  const selectedEl = sel.el ? findEl(data, sel.el) : null
  return (
    <StyleClipboardContext.Provider value={{ style: copiedStyle, setStyle: setCopiedStyle }}>
    <div className="cv-editor" style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', background: '#edf0f4', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif', fontSize: 14, color: '#20242b' }}>
      <header className="cv-top">
        <a className="cv-ib" href={backHref} title="Về trang quản trị" aria-label="Về trang quản trị"><ArrowLeft size={18} /></a>
        <span className="cv-brand">HOSSO<span>STUDIO</span></span>
        {nav && <PagesDropdown ctx={nav} />}
        <div className="cv-document" title={title}>{title}</div>
        <div className="cv-file-actions">{menu}{actions}</div>
        <div className="cv-dev" role="group" aria-label="Chế độ">
          <button type="button" title="Chế độ sửa" aria-label="Chế độ sửa" aria-pressed={!preview} onClick={() => store.setState({ preview: false })}><Pencil size={17} /></button>
          <button type="button" title="Xem trước trang" aria-label="Xem trước trang" aria-pressed={preview} onClick={() => store.setState({ preview: true })}><Eye size={17} /></button>
        </div>
      </header>
      <div className="cv-workbar" role="toolbar" aria-label="Công cụ canvas">
        <div className="cv-history">
          <button type="button" className="cv-ib" title="Hoàn tác (Ctrl+Z)" aria-label="Hoàn tác" disabled={!hist.past.length} onClick={undo}><Undo2 size={17} /></button>
          <button type="button" className="cv-ib" title="Làm lại (Ctrl+Shift+Z)" aria-label="Làm lại" disabled={!hist.future.length} onClick={redo}><Redo2 size={17} /></button>
        </div>
        {scopes && <div className="cv-scopes" role="tablist" aria-label="Phạm vi chỉnh sửa">
          {scopes.map((sc) => <a key={sc.label} role="tab" aria-selected={sc.active} href={sc.href}>{sc.label}</a>)}
        </div>}
        <div className="cv-dev" role="group" aria-label="Thiết bị">
          {DEVICES.map((d) => {
            const DeviceIcon = d.id === 'desktop' ? Monitor : d.id === 'tablet' ? Tablet : Smartphone
            return <button key={d.id} type="button" title={d.label} aria-label={d.label} aria-pressed={device === d.id} onClick={() => setDevice(d.id)}><DeviceIcon size={17} /></button>
          })}
        </div>
        <select aria-label="Thu phóng" value={String(zoom)} onChange={(e) => setZoom(e.target.value === 'fit' ? 'fit' : Number(e.target.value) as typeof zoom)}>
          <option value="fit">Vừa khung</option>
          <option value="0.5">50%</option><option value="0.75">75%</option><option value="1">100%</option><option value="1.25">125%</option>
        </select>
        <span className="cv-device-label">{dev.label}{typeof dev.width === 'number' ? ' · ' + dev.width + ' px' : ''}</span>
        <div className="cv-panel-tools">
          {!preview && <>
            <button type="button" className="cv-ib" title="Cấu trúc trang" aria-label="Cấu trúc trang" aria-pressed={leftOpen && tab === 'layers'} onClick={() => { if (!leftOpen || tab === 'layers') toggleLeft(); setTab('layers') }}><Layers size={17} /></button>
            <button type="button" className="cv-ib" title="Bảng phần tử" aria-label="Bảng phần tử" aria-pressed={leftOpen} onClick={toggleLeft}><PanelLeftClose size={17} /></button>
            <button type="button" className="cv-ib" title="Bảng thuộc tính" aria-label="Bảng thuộc tính" aria-pressed={rightOpen} onClick={toggleRight}><PanelRightClose size={17} /></button>
          </>}
          <button type="button" className="cv-ib" title="Phím tắt" aria-label="Phím tắt trợ giúp" onClick={() => setShowShortcuts(true)}><HelpCircle size={17} /></button>
        </div>
      </div>
      <div className="cv-workspace" style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {!preview && (
          <div className="cv-left-slot" style={{ display: 'flex', minHeight: 0 }}>
            <CanvasLeft
              open={leftOpen}
              tab={tab}
              setTab={setTab}
              config={config}
              data={data}
              sel={sel}
              setSel={setSel}
              commit={commit}
              labelOf={labelOf}
              ops={ops}
              lang={lang}
              areaKind={areaKind}
              siteCtx={siteCtx}
              nav={nav}
              onOpen={openLeft}
              onClose={() => setLeftOpen(false)}
            />
          </div>
        )}
        <main className="cv-canvas" style={{ flex: 1, minWidth: 0, padding: 0, display: 'flex', flexDirection: 'column' }}>
          <CanvasStage
            siteCtx={siteCtx}
            selectedState={elementState}
            partDevice={device}
            preview={preview}
            data={data}
            config={config}
            sel={sel}
            setSel={setSel}
            commit={commit}
            labelOf={labelOf}
            width={dev.width}
            zoom={zoom}
            css={css}
            htmlClass={htmlClass}
            rootRender={rootRender}
            areaKind={areaKind}
            onDoc={(d) => setDocs((x) => [...x, d])}
          />
          {!preview && <footer className="cv-selection" aria-label="Phần tử đang chọn">
            <nav aria-label="Vị trí phần tử">
              <button type="button" onClick={() => setSel(NO_SEL)}>Trang</button>
              {selectedBlock && <><ChevronRight size={12} /><button type="button" onClick={() => setSel({ block: sel.block, el: '' })}>{labelOf(selectedBlock.type)}</button></>}
              {selectedEl && <><ChevronRight size={12} /><span title={elLabel(selectedEl.el)}>{elLabel(selectedEl.el)}</span></>}
            </nav>
            {selectedEl && <div className="cv-selection-actions">
              <button type="button" className="cv-ib" title="Nhân đôi phần tử" aria-label="Nhân đôi phần tử" onClick={() => { const r = dupEl(data, sel.el); commit(r.data); setSel({ block: sel.block, el: r.id }) }}><Copy size={15} /></button>
              <button type="button" className="cv-ib" title="Xóa phần tử" aria-label="Xóa phần tử" onClick={() => { commit(removeEl(data, sel.el)); setSel({ block: sel.block, el: '' }) }}><Trash2 size={15} /></button>
            </div>}
          </footer>}
        </main>
        {!preview && rightOpen && (
          <div className="cv-right-slot" style={{ display: 'flex', minHeight: 0 }}>
            <CanvasInspector
              state={elementState}
              onStateChange={setElementState}
              onDeviceChange={setDevice}
              partDevice={device}
              docs={docs}
              data={data}
              config={config}
              sel={sel}
              setSel={setSel}
              commit={commit}
              labelOf={labelOf}
              title={title}
              onClose={() => setRightOpen(false)}
            />
          </div>
        )}
      </div>

      {showShortcuts && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setShowShortcuts(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 520,
              maxWidth: '100%',
              background: '#fff',
              borderRadius: 16,
              boxShadow: '0 24px 48px -12px rgba(0,0,0,0.25)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Phím tắt trình dựng trang</span>
              <button
                type="button"
                onClick={() => setShowShortcuts(false)}
                style={{ border: 0, background: 'transparent', cursor: 'pointer', fontSize: 18, color: '#64748b' }}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: '20px', display: 'grid', gap: 12, fontSize: 13 }}>
              {[
                ['Hoàn tác (Undo)', 'Ctrl + Z'],
                ['Làm lại (Redo)', 'Ctrl + Shift + Z / Ctrl + Y'],
                ['Sao chép phần tử', 'Ctrl + C'],
                ['Cắt phần tử', 'Ctrl + X'],
                ['Dán phần tử (Dán vào giữa vùng xem)', 'Ctrl + V'],
                ['Nhân đôi phần tử', 'Ctrl + D'],
                ['Xóa phần tử đang chọn', 'Delete / Backspace'],
                ['Dịch chuyển 1px', 'Phím mũi tên (↑ ↓ ← →)'],
                ['Dịch chuyển 10px', 'Shift + Phím mũi tên'],
                ['Giữ tỉ lệ khi kéo góc', 'Shift + Kéo tay nắm góc'],
                ['Sửa chữ tại chỗ', 'Nhấp đúp (Double-click) vào chữ'],
                ['Mở menu thao tác nhanh', 'Chuột phải vào phần tử'],
                ['Bỏ chọn / Đóng bảng', 'Escape'],
              ].map(([desc, shortcut]) => (
                <div key={desc} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
                  <span style={{ color: '#334155' }}>{desc}</span>
                  <kbd style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, padding: '3px 8px', fontFamily: 'monospace', fontWeight: 600, fontSize: 12, color: '#0f172a' }}>
                    {shortcut}
                  </kbd>
                </div>
              ))}
            </div>
            <div style={{ padding: '12px 20px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', textAlign: 'right' }}>
              <button
                type="button"
                onClick={() => setShowShortcuts(false)}
                style={{ padding: '8px 16px', borderRadius: 8, background: '#0f172a', color: '#fff', border: 0, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </StyleClipboardContext.Provider>
  )
}

/** Nếu editor mới gặp lỗi lúc chạy thì không để trắng màn hình: báo và dẫn sang editor cũ. */
export class CanvasBoundary extends React.Component<{ fallbackHref: string; children: React.ReactNode }, { error: string }> {
  state = { error: '' }
  static getDerivedStateFromError(e: Error) {
    return { error: String(e?.message ?? e) }
  }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div style={{ padding: 32, font: '15px/1.6 Arial, sans-serif', maxWidth: 640 }}>
        <h2>Editor mới gặp lỗi</h2>
        <p style={{ color: '#b91c1c' }}>{this.state.error}</p>
        <p>Nội dung đã lưu không bị ảnh hưởng. Bạn có thể mở trang này bằng editor cũ trong lúc chờ sửa lỗi.</p>
        <a href={this.props.fallbackHref} style={{ display: 'inline-block', padding: '10px 16px', background: '#15803d', color: '#fff', borderRadius: 8, textDecoration: 'none', fontWeight: 700 }}>Mở bằng editor cũ</a>
      </div>
    )
  }
}
