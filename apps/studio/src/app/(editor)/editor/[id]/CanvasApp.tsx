'use client'
import { FREE_MAX_PX, FREE_W, cloneElements, patchWidgetPart, widgetPartKey, widgetPartsForDevice, type FreeElement, type ElementState } from '@hosso/studio-blocks'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createStore, useStore } from 'zustand'
import { ArrowLeft, ChevronRight, Copy, Eye, HelpCircle, Layers, Monitor, Pencil, PanelLeftClose, PanelRightClose, Redo2, Smartphone, Tablet, Trash2, Undo2, Maximize, Minimize, SlidersHorizontal } from 'lucide-react'
import { elsOf, elementStyleProps, setBlockEls } from './canvas-model'
import { DrawingContext, DrawingPanel } from './DrawingTools'
import { DEFAULT_DRAWING, type DrawingOptions } from './canvas-guides'
import { EditorHelp } from './EditorHelp'
import { useFloatingInspector } from './FloatingDock'
import { PopupPanel } from './PopupPanel'
import { batchStyle } from './batch-style'
import { selectedElements, selectionBox, transformSelection, duplicateSelection, deleteSelection, selectionOnPage, measureOwnerOrigins, translatePageSelection } from './canvas-selection'
import { inheritedElementFlag } from '../../../../../../../packages/blocks/src/free-geometry'
import { insertIntoFrame } from '../../../../../../../packages/blocks/src/frame-layout'
import { baseDevice, layoutAtWidth, syncBreakpoints, type LayoutDevice } from '../../../../../../../packages/blocks/src/responsive-breakpoints'
import { visibleCanvasBlock, visibleCanvasRange } from './canvas-viewport'

import { CanvasInspector } from './CanvasInspector'
import { BrandPanel, useBrandDraft, type BrandTheme } from './BrandPanel'
import { CanvasLeft, elLabel, type LeftOps, type Tab } from './CanvasLeft'
import type { NavCtx } from './SitePanels'
import { PagesDropdown } from './PagesDropdown'
import { CanvasStage } from './CanvasStage'
import { HistoryPanel, ResponsivePanel } from './WorkbenchPanels'
import { FormBuilderPanel } from './FormBuilderPanel'
import { CommandPalette, ReplaceDialog, type EditorCommand } from './QuickTools'
import { makeElement } from '@hosso/studio-blocks'
import { useCanvasMediaDrop } from './CanvasMediaDrop'
import { ReviewPanel } from './ReviewPanel'
import { Search, MessageSquare } from 'lucide-react'
import { jumpHistory } from './editor-tools'
import { PublishPanel, type PageMetadata } from './PublishPanel'
import { StyleClipboardContext } from './FreeCanvasEditor'
import type { SiteCtx } from './SectionTemplates'
import { DEVICE_WIDTH, pageForDevice, mergeDevicePage, resetDeviceLayout, stackDeviceSection } from '@hosso/studio-blocks'
import {
  NO_SEL, PAGE, addEls, placeElement, placementOwner, blockId, commitHist, findEl, initHist, insertBlock, isSection, newBlockId, patchBlock, redoHist, undoHist,
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
  initialDevice?: 'desktop' | 'tablet' | 'mobile'
  brandTheme?: BrandTheme
  canEditBrand?: boolean
  metadata?: PageMetadata
  onMetadataChange?: (value: PageMetadata) => void
}

export function CanvasApp({ config, data: initial, onChange, css, htmlClass, title, backHref, menu, actions, labelOf, lang, rootRender, scopes, areaKind = '', siteCtx = {}, nav, initialSelection, initialDevice = 'desktop', brandTheme, canEditBrand = false, metadata, onMetadataChange }: Props) {
  const brandDraft = useBrandDraft(brandTheme, canEditBrand, nav?.locale ?? lang, !nav)
  const [store] = useState(() => createStore<{ hist: Hist; sel: Sel; preview: boolean }>(() => ({ hist: initHist(normalize(initial)), sel: initialSelection ?? NO_SEL, preview: false })))
  const { hist, sel, preview } = useStore(store)
  const setSel = useCallback((next: Sel) => store.setState({ sel: next }), [store])
  const [leftOpen, setLeftOpen] = useState(false)
  const [commandsOpen, setCommandsOpen] = useState(false), [replaceOpen, setReplaceOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  useEffect(() => { if (new URLSearchParams(location.search).get('review') === '1') { setReviewOpen(true); store.setState({ preview: true }) } }, [store])
  // Giữ canvas rộng như các landing-page builder hiện đại; thuộc tính mở theo ngữ cảnh.
  const [rightOpen, setRightOpen] = useState(false)
  const inspectorDock = useFloatingInspector(rightOpen)
  const editorRoot = useRef<HTMLDivElement>(null)
  const [focusMode, setFocusMode] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)
  const [fullscreenMessage, setFullscreenMessage] = useState('')
  const toggleFullscreen = async () => {
    setFullscreenMessage('')
    if (document.fullscreenElement) { await document.exitFullscreen(); return }
    setFocusMode(true); setLeftOpen(false); setRightOpen(false)
    try { await editorRoot.current?.requestFullscreen() }
    catch { setFullscreenMessage('Đã mở canvas rộng. Trình duyệt chặn fullscreen; có thể dùng F11.') }
  }
  useEffect(() => {
    const change = () => setFullscreen(document.fullscreenElement === editorRoot.current)
    document.addEventListener('fullscreenchange', change)
    return () => document.removeEventListener('fullscreenchange', change)
  }, [])
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
  const [zoom, setZoom] = useState<'fit' | number>('fit')
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [drawing, setDrawing] = useState<DrawingOptions>(DEFAULT_DRAWING)
  useEffect(() => { try { const saved = JSON.parse(localStorage.getItem('hosso-drawing:v1') || 'null'); if (saved) setDrawing({ ...DEFAULT_DRAWING, ...saved, gridSize: Math.max(4, Math.min(100, Number(saved.gridSize) || 20)) }) } catch {} }, [])
  const changeDrawing = (value: DrawingOptions) => { setDrawing(value); try { localStorage.setItem('hosso-drawing:v1', JSON.stringify(value)) } catch {} }
  const navigateHelp = (target: string) => { if (target === 'inspect') setRightOpen(true); else { setTab(target as Tab); openLeft() } }
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false)
  const [copiedStyle, setCopiedStyle] = useState<Record<string, unknown> | null>(null)
  useEffect(() => {
    if (window.innerWidth <= 1100) setRightOpen(false)
    if (window.innerWidth <= 800) setLeftOpen(false)
  }, [])
  const [tab, setTab] = useState<Tab>('sections')
  const [device, setBaseDevice] = useState<(typeof DEVICES)[number]['id']>(initialDevice)
  const [previewWidth, setPreviewWidth] = useState<number>(DEVICE_WIDTH[initialDevice])
  const [layout, setLayout] = useState<LayoutDevice>(() => layoutAtWidth(DEVICE_WIDTH[initialDevice], hist.present.root?.props?._breakpoints))
  const setDevice = (value: typeof device) => { setBaseDevice(value); setPreviewWidth(DEVICE_WIDTH[value]); setLayout(layoutAtWidth(DEVICE_WIDTH[value], hist.present.root?.props?._breakpoints)) }
  const resizePreview = (width: number) => { const next = Math.max(320, Math.min(1920, Math.round(width))); setPreviewWidth(next); setBaseDevice(baseDevice(next)); setLayout(layoutAtWidth(next, hist.present.root?.props?._breakpoints)) }
  const breakpointKey = JSON.stringify(hist.present.root?.props?._breakpoints ?? [])
  useEffect(() => { setLayout(layoutAtWidth(previewWidth, hist.present.root?.props?._breakpoints)) }, [breakpointKey])
  const [elementState, setElementState] = useState<ElementState>('normal')
  useEffect(() => setElementState('normal'), [sel.el, sel.block, preview])
  const [docs, setDocs] = useState<Document[]>([])
  useEffect(() => {
    if (!sel.block || !docs[0]) return
    const node = sel.el ? docs[0].querySelector(`[data-element="${CSS.escape(sel.el)}"]`) : docs[0].querySelector(`[data-block="${CSS.escape(sel.block)}"]`)
    node?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' })
  }, [sel.block, sel.el, docs])
  useEffect(() => {
    const inspect = (event: Event) => {
      setRightOpen(true)
      if (window.innerWidth <= 1100) setLeftOpen(false)
      setElementState((event as CustomEvent).detail === 'states' ? 'hover' : 'normal')
    }
    docs.forEach((doc) => doc.addEventListener('hosso-inspect', inspect))
    return () => docs.forEach((doc) => doc.removeEventListener('hosso-inspect', inspect))
  }, [docs])
  const data = useMemo(() => pageForDevice(hist.present, layout), [hist.present, layout])
  const revealBlock = useRef(initialSelection?.block ?? '')
  useEffect(() => {
    const id = revealBlock.current
    if (!id || !docs[0]) return
    const frame = requestAnimationFrame(() => {
      docs[0].querySelector(`[data-block="${CSS.escape(id)}"]`)?.scrollIntoView({ block: 'start' })
      revealBlock.current = ''
    })
    return () => cancelAnimationFrame(frame)
  }, [data, docs])
  const commit = useCallback((next: PageData, key?: string) => store.setState((s) => ({ hist: commitHist(s.hist, syncBreakpoints(mergeDevicePage(s.hist.present, next, layout)), key ? layout + ':' + key : undefined) })), [store, layout])
  const commitLayout = (next: PageData) => store.setState((s) => ({ hist: commitHist(s.hist, syncBreakpoints(next)) }))
  const mediaMessage = useCanvasMediaDrop({ docs, data, sel, preview, commit, setSel })
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
      if (t?.closest?.('input, textarea, select, [contenteditable], dialog[open], .cv-left')) return
      const mod = e.ctrlKey || e.metaKey
      const { data: d, sel: s } = st.current
      const k = e.key.toLowerCase()
      if (mod && k === 'k') { e.preventDefault(); setCommandsOpen(true); return }
      if (mod && k === 'h') { e.preventDefault(); setReplaceOpen(true); return }
      if (k === '?' && !mod) { e.preventDefault(); setShowShortcuts(true); return }
      if (mod && e.altKey && ['c', 'v'].includes(k)) {
        e.preventDefault(); const hit = findEl(d, s.el); if (!hit) return
        if (k === 'c') setCopiedStyle(elementStyleProps(hit.el.props))
        else if (copiedStyle) { const ids = s.multi?.length ? s.multi : [s.el]; commit(setBlockEls(d, s.block, batchStyle(elsOf(hit.block), ids, copiedStyle))) }
        return
      }
      if (k === 'escape' && !document.fullscreenElement && focusMode) { setFocusMode(false); return }
      if (mod && k === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return }
      if (mod && k === 'y') { e.preventDefault(); redo(); return }
      if (mod && k === 'a' && s.block) { const list = s.block === PAGE ? d.root?.props?._float ?? [] : elsOf(d.content.find((b) => blockId(b) === s.block) ?? { type: '', props: {} }); const ids = list.filter((el: FreeElement) => !inheritedElementFlag(list, el.id, '_hidden') && !inheritedElementFlag(list, el.id, '_locked')).map((el: FreeElement) => el.id); e.preventDefault(); setSel({ block: s.block, el: ids[ids.length - 1] ?? '', multi: ids }); return }
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
      const step = (e.shiftKey ? 10 : 1) * 1200 / DEVICE_WIDTH[st.current.device]
      const nudge: Record<string, [number, number]> = { arrowleft: [-step, 0], arrowright: [step, 0], arrowup: [0, -step], arrowdown: [0, step] }
      if (k === 'delete' || k === 'backspace') { e.preventDefault(); commit(deleteSelection(d, s)); setSel({ block: s.block, el: '' }) }
      else if (mod && k === 'd') { e.preventDefault(); const r = duplicateSelection(d, s); commit(r.data); setSel(r.sel) }
      else if (nudge[k]) { e.preventDefault(); const [dx, dy] = nudge[k]; commit(translatePageSelection(d, s, dx, dy), `n:${s.multi?.join(',') || s.el}`) }
      else if (k === 'escape') setSel({ block: s.block, el: '' })
    }
    // Sao chép, cắt, dán component (dùng sự kiện clipboard nên dán được sang trang khác); dán vào đúng chỗ đang nhìn.
    const typing = (e: Event) => Boolean((e.target as HTMLElement | null)?.closest?.('input, textarea, select, [contenteditable]'))
    const onCopy = (e: ClipboardEvent) => {
      if (st.current.preview || typing(e)) return
      const { data: d, sel: s } = st.current
      const hit = s.el ? findEl(d, s.el) : null
      if (!hit || !e.clipboardData) return
      e.clipboardData?.setData('text/plain', CLIP + JSON.stringify(selectionOnPage(d, s, measureOwnerOrigins(d, docs[0]))))
      e.preventDefault()
      if (e.type === 'cut') { commit(deleteSelection(d, s)); setSel({ block: s.block, el: '' }) }
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
  }, [docs, commit, undo, redo, focusMode, copiedStyle])

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
      const hit = sel.el ? findEl(data, sel.el) : null
      const parent = hit?.el.type === 'container' ? hit.el.id : hit?.el.parentId
      if (hit && parent) {
        const list = elsOf(hit.block), next = insertIntoFrame(list, parent, els)
        if (next !== list) { commit(setBlockEls(data, owner, next)); setSel({ block: owner, el: els[els.length - 1].id }); return }
      }
      if (els[0].props._frame && owner === PAGE) {
        const nb = section(els, Math.max(...els.map((el) => el.y + el.h)) + 40)
        revealBlock.current = blockId(nb); commit(insertBlock(data, nb, afterVisible())); setSel({ block: blockId(nb), el: els[1]?.id || els[0].id }); return
      }
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
        setSel({ block: vt.id, el: els[els.length - 1].id, multi: els.map((el) => el.id) })
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
        setSel({ block: PAGE, el: els[els.length - 1].id, multi: els.map((el) => el.id) })
        return
      }
      const nb = section(els.map((e) => ({ ...e, x: 80, y: 24 })))
      revealBlock.current = blockId(nb)
      commit(insertBlock(data, nb, vt?.id))
      setSel({ block: blockId(nb), el: els[els.length - 1].id, multi: els.map((el) => el.id) })
    },
    addSection: (tpl) => {
      const nb = section(tpl.els, tpl.height, tpl.bg)
      revealBlock.current = blockId(nb)
      commit(insertBlock(data, nb, afterVisible()))
      setSel({ block: blockId(nb), el: '' })
    },
    addWidget: (type, extra) => {
      const hit = sel.el ? findEl(data, sel.el) : null
      if (hit && (hit.el.type === 'container' || hit.el.parentId) && !['FreeCanvas', 'Reusable', 'Popup'].includes(type)) {
        const el: FreeElement = { id: newBlockId('widget'), type: 'widget', x: 0, y: 0, w: type === 'NavMenu' || type === 'SearchBox' ? 480 : 460, h: type === 'NavMenu' || type === 'SearchBox' ? 72 : 480, props: { _name: labelOf(type), widget: { type, props: { ...(config.components[type]?.defaultProps ?? {}), ...extra } } } }
        ops.addEls([el]); return
      }
      const nb: Block = { type, props: { ...(config.components[type]?.defaultProps ?? {}), ...extra, id: newBlockId(type) } }
      revealBlock.current = blockId(nb)
      commit(insertBlock(data, nb, afterVisible()))
      setSel({ block: blockId(nb), el: '' })
    },
    addPattern: (pattern) => {
      let next = data
      let after = afterVisible()
      let firstId = ''
      for (const block of pattern.blocks) {
        if (!config.components[block.type]) continue
        const id = newBlockId(block.type)
        const inserted = { type: block.type, props: { ...block.props, id } }
        next = insertBlock(next, inserted, after)
        firstId ||= id
        after = id
      }
      if (!firstId) return
      revealBlock.current = firstId
      commit(next)
      setSel({ block: firstId, el: '' })
    },
    addBlocks: (added) => {
      let next = data, after = afterVisible()
      for (const block of added) { next = insertBlock(next, block, after); after = blockId(block) }
      if (added.length) { commit(next); revealBlock.current = blockId(added[0]); setSel({ block: blockId(added[0]), el: '' }) }
    },
  }

  api.current = ops
  const dev = DEVICES.find((d) => d.id === device)!
  const selectedBlock = data.content.find((b) => blockId(b) === sel.block)
  const selectedEl = sel.el ? findEl(data, sel.el) : null
  const commands: EditorCommand[] = [
    { id: 'undo', label: 'Hoàn tác', run: undo }, { id: 'redo', label: 'Làm lại', run: redo },
    { id: 'replace', label: 'Tìm và thay thế trên trang', run: () => setReplaceOpen(true) },
    ...([{ type: 'text', label: 'Thêm văn bản' }, { type: 'image', label: 'Thêm ảnh' }, { type: 'button', label: 'Thêm nút bấm' }, { type: 'video', label: 'Thêm video' }] as const).map((item) => ({ id: 'add-' + item.type, label: item.label, run: () => ops.addEls([makeElement(item.type)]) })),
    ...([{ tab: 'frames', label: 'Chia ô và bố cục' }, { tab: 'input', label: 'Thêm biểu mẫu' }, { tab: 'media', label: 'Thư viện ảnh' }, { tab: 'drawing', label: 'Thước và căn chỉnh' }, { tab: 'responsive', label: 'Thiết bị và breakpoint' }] as const).map((item) => ({ id: item.tab, label: item.label, run: () => { setTab(item.tab); openLeft() } })),
    { id: 'background', label: 'Chỉnh nền và thuộc tính', run: () => setRightOpen(true) },
    ...blocks.map((block) => ({ id: 'go-' + blockId(block), label: 'Đến ' + (block.props._name || labelOf(block.type)), keywords: blockId(block), run: () => { setSel({ block: blockId(block), el: '' }); docs[0]?.querySelector<HTMLElement>(`[data-block="${CSS.escape(blockId(block))}"]`)?.scrollIntoView({ block: 'center' }) } })),
  ]
  return (
    <StyleClipboardContext.Provider value={{ style: copiedStyle, setStyle: setCopiedStyle }}>
    <DrawingContext.Provider value={drawing}>
    <div ref={editorRoot} className="cv-editor" data-focus={focusMode} data-fullscreen={fullscreen} style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', background: 'var(--cv-workspace)', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif', fontSize: 14, color: '#20242b' }}>
      <header className="cv-top">
        <a className="cv-ib" href={backHref} title="Về trang quản trị" aria-label="Về trang quản trị"><ArrowLeft size={18} /></a>
        <span className="cv-brand">HOSSO<span>STUDIO</span></span>
        {!preview && <button type="button" className="cv-ib" aria-label="Lệnh nhanh" title="Lệnh nhanh (Ctrl+K)" onClick={() => setCommandsOpen(true)}><Search size={17} /></button>}
        {nav && <PagesDropdown ctx={nav} />}
        <div className="cv-document" title={title}>{title}</div>
        {focusMode && <div className="cv-focus-controls"><div className="cv-dev" role="group" aria-label="Thiết bị">{DEVICES.map((item) => { const Icon = item.id === 'desktop' ? Monitor : item.id === 'tablet' ? Tablet : Smartphone; return <button type="button" key={item.id} title={item.label} aria-label={item.label} aria-pressed={device === item.id} onClick={() => setDevice(item.id)}><Icon size={16} /></button> })}</div><button type="button" className="cv-ib" aria-label="Hoàn tác" title="Hoàn tác (Ctrl+Z)" disabled={!hist.past.length} onClick={undo}><Undo2 size={16} /></button><button type="button" className="cv-ib" aria-label="Làm lại" title="Làm lại" disabled={!hist.future.length} onClick={redo}><Redo2 size={16} /></button></div>}
        {focusMode && !preview && <button type="button" className="cv-ib" title="Bảng thuộc tính" aria-label="Bảng thuộc tính" aria-pressed={rightOpen} onClick={toggleRight}><PanelRightClose size={17} /></button>}
        <button type="button" className="cv-mobile-actions" aria-label="Tác vụ trang" aria-expanded={mobileActionsOpen} aria-controls="cv-file-actions" onClick={() => setMobileActionsOpen((open) => !open)}>Tác vụ</button>
        <div id="cv-file-actions" className="cv-file-actions" data-open={mobileActionsOpen} onKeyDown={(event) => { if (event.key === 'Escape') setMobileActionsOpen(false) }}>{menu}{actions}</div>
        <div className="cv-dev" role="group" aria-label="Chế độ">
          <button type="button" title="Chế độ sửa" aria-label="Chế độ sửa" aria-pressed={!preview} onClick={() => store.setState({ preview: false })}><Pencil size={17} /></button>
          <button type="button" title="Xem trước trang" aria-label="Xem trước trang" aria-pressed={preview} onClick={() => store.setState({ preview: true })}><Eye size={17} /></button>
        </div>
        <button type="button" className="cv-ib" aria-label={focusMode ? 'Hiện thanh công cụ đầy đủ' : 'Canvas mở rộng'} title={focusMode ? 'Hiện thanh công cụ đầy đủ' : 'Canvas mở rộng'} onClick={() => setFocusMode(!focusMode)}><SlidersHorizontal size={17} /></button>
        <button type="button" className="cv-ib" aria-label="Căn chỉnh canvas" title="Thước, lưới và guide" aria-pressed={leftOpen && tab === 'drawing'} onClick={() => { setTab('drawing'); openLeft() }}><SlidersHorizontal size={17} /></button>
        <button type="button" className="cv-ib" aria-label="Trợ giúp Studio" title="Trợ giúp và phím tắt (?)" onClick={() => setShowShortcuts(true)}><HelpCircle size={17} /></button>
        {nav && <button type="button" className="cv-ib" aria-label="Góp ý" title="Góp ý thiết kế" aria-pressed={reviewOpen} onClick={() => { setReviewOpen(!reviewOpen); if (!reviewOpen) store.setState({ preview: true }) }}><MessageSquare size={17} /></button>}
        <button type="button" className="cv-ib" aria-label={fullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'} title={fullscreen ? 'Thoát toàn màn hình (Esc)' : 'Toàn màn hình'} onClick={toggleFullscreen}>{fullscreen ? <Minimize size={17} /> : <Maximize size={17} />}</button>
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
        {!preview && device !== 'desktop' && selectedBlock?.type === 'FreeCanvas' && <button type="button" className="cv-act" onClick={() => commitLayout(stackDeviceSection(hist.present, sel.block, device))}>{lang === 'en' ? 'Stack vertically' : 'Tự xếp dọc'}</button>}
        {!preview && device !== 'desktop' && sel.block && <button type="button" className="cv-act" onClick={() => commitLayout(resetDeviceLayout(hist.present, sel.block, device, sel.el || undefined))}>{lang === 'en' ? 'Use base layout' : 'Dùng bố cục gốc'}</button>}
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
        {fullscreenMessage && <div className="cv-fullscreen-message" role="status" onClick={() => setFullscreenMessage('')}>{fullscreenMessage}</div>}
        {!preview && (
          <div className="cv-left-slot" style={{ display: 'flex', minHeight: 0 }}>
            <CanvasLeft
              canvasDoc={docs[0]}
              open={leftOpen}
              floating={focusMode}
              tab={tab}
              setTab={setTab}
              config={config}
              data={data}
              templateData={hist.present}
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
              brandPanel={<BrandPanel theme={brandTheme} enabled={canEditBrand} draft={brandDraft} />}
              drawingPanel={<DrawingPanel value={drawing} onChange={changeDrawing} />}
              popupPanel={<PopupPanel data={data} sel={sel} setSel={setSel} commit={commit} onAdd={() => ops.addWidget('Popup')} />}
              historyPanel={<HistoryPanel hist={hist} nav={nav} storageKey={`hosso-snapshots:${nav?.collection ?? 'demo'}:${nav?.id ?? 'demo'}:${nav?.locale ?? lang}`} onJump={(index) => { store.setState({ hist: jumpHistory(hist, index), sel: NO_SEL }) }} onRestore={(next) => { commitLayout(next); setSel(NO_SEL) }} />}
              responsivePanel={<ResponsivePanel data={hist.present} device={device} layout={layout} width={previewWidth} onWidth={resizePreview} onLayout={setLayout} setDevice={setDevice} sel={sel} setSel={setSel} commit={commitLayout} />}
              formPanel={<FormBuilderPanel nav={nav} onInsert={(slug, heading) => ops.addWidget('Form', { form: slug, heading })} />}
              publishPanel={<PublishPanel nav={nav} metadata={metadata} onMetadataChange={onMetadataChange} data={hist.present} config={config} setSel={(selection) => { setSel(selection); setRightOpen(true); if (window.innerWidth <= 1100) setLeftOpen(false) }} onDevice={setDevice} />}
            />
          </div>
        )}
        <main className="cv-canvas" style={{ flex: 1, minWidth: 0, padding: 0, display: 'flex', flexDirection: 'column' }}>
          <CanvasStage
            locale={nav?.locale ?? lang}
            expanded={focusMode}
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
            width={previewWidth}
            onWidth={resizePreview}
            onZoom={setZoom}
            zoom={zoom}
            css={css + brandDraft.css}
            htmlClass={htmlClass}
            rootRender={rootRender}
            areaKind={areaKind}
            onDoc={(d) => setDocs((x) => [...x, d])}
          />
          {!preview && <footer className="cv-selection" aria-label="Phần tử đang chọn">
            <nav aria-label="Vị trí phần tử">
              <button type="button" onClick={() => setSel(NO_SEL)}>Trang</button>
              {selectedBlock && <><ChevronRight size={12} /><button type="button" onClick={() => setSel({ block: sel.block, el: '' })}>{labelOf(selectedBlock.type)}</button></>}
              {selectedEl && <><ChevronRight size={12} /><span title={elLabel(selectedEl.el)}>{(sel.multi?.length ?? 0) > 1 ? `${sel.multi!.length} phần tử` : elLabel(selectedEl.el)}</span></>}
            </nav>
            {selectedEl && <div className="cv-selection-actions">
              <button type="button" className="cv-ib" title="Nhân đôi phần tử" aria-label="Nhân đôi phần tử" onClick={() => { const r = duplicateSelection(data, sel); commit(r.data); setSel(r.sel) }}><Copy size={15} /></button>
              <button type="button" className="cv-ib" title="Xóa phần tử" aria-label="Xóa phần tử" onClick={() => { commit(deleteSelection(data, sel)); setSel({ block: sel.block, el: '' }) }}><Trash2 size={15} /></button>
            </div>}
          </footer>}
        </main>
        {!preview && rightOpen && (
          <div ref={inspectorDock.ref} className="cv-right-slot" data-detached={inspectorDock.detached} style={{ display: 'flex', minHeight: 0, ...inspectorDock.style }}>
            <CanvasInspector
              dragHandle={inspectorDock.grip}
              locale={nav?.locale ?? lang}
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

      <EditorHelp open={showShortcuts} onClose={() => setShowShortcuts(false)} onNavigate={navigateHelp} />
      {mediaMessage && <div className="cv-media-status" role="status">{mediaMessage}</div>}
      <CommandPalette open={commandsOpen} onClose={() => setCommandsOpen(false)} commands={commands} />
      <ReplaceDialog open={replaceOpen} onClose={() => setReplaceOpen(false)} data={data} commit={commit} setSel={setSel} />
      {reviewOpen && preview && nav && <ReviewPanel nav={nav} docs={docs} onClose={() => setReviewOpen(false)} />}
    </div>
    </DrawingContext.Provider>
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
