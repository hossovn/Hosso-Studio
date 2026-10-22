import { newId, cloneElements, elementFamily, transformFamily } from '../../../../../../../packages/blocks/src/free-geometry.ts'
import type { FreeElement } from '@hosso/studio-blocks'

/**
 * Mô hình của editor Canvas (Page → Section → Component) trên CÙNG định dạng dữ liệu của Puck:
 * trang = { root, content: Block[] }; "section" là block FreeCanvas, "component" là phần tử trong `_els` của block.
 * Block khác (banner, lưới sản phẩm…) là "widget": hiện như một section chỉ có nội dung của block đó.
 * Mọi hàm ở đây thuần túy (không đụng state) nên dễ kiểm tra.
 */
export type Block = { type: string; props: Record<string, any> }
export type PageData = { root?: any; content: Block[]; [k: string]: any }
export type Sel = { block: string; el: string; part?: string }

export const SECTION = 'FreeCanvas'
export const NO_SEL: Sel = { block: '', el: '' }

export const blocksOf = (d: PageData): Block[] => d.content ?? []
export const isSection = (b: Block) => b.type === SECTION
export const elsOf = (b: Block): FreeElement[] => (b.props._els ?? b.props.elements ?? []) as FreeElement[]
/** Ghi lại danh sách phần tử; bỏ tên prop cũ `elements`. */
export const withEls = (b: Block, els: FreeElement[]): Block => {
  const { elements: _legacy, ...rest } = b.props
  return { ...b, props: { ...rest, _els: els } }
}
export const blockId = (b: Block): string => b.props.id
export const newBlockId = (type: string) => `${type}-${newId()}`

const setContent = (d: PageData, content: Block[]): PageData => ({ ...d, content })

export const patchBlock = (d: PageData, id: string, patch: Record<string, any>): PageData =>
  setContent(d, blocksOf(d).map((b) => (blockId(b) === id ? { ...b, props: { ...b.props, ...patch } } : b)))

/** "Lớp nổi" của trang: component không thuộc section nào, lưu ở `root.props._float`; tọa độ tính trên cả trang. Sel.block = PAGE. */
export const PAGE = '@page'
export const floatOf = (d: PageData): FreeElement[] => (d.root?.props?._float ?? []) as FreeElement[]
const setFloat = (d: PageData, els: FreeElement[]): PageData => ({ ...d, root: { ...d.root, props: { ...d.root?.props, _float: els } } })

export const setBlockEls = (d: PageData, id: string, els: FreeElement[]): PageData =>
  id === PAGE ? setFloat(d, els) : setContent(d, blocksOf(d).map((b) => (blockId(b) === id ? withEls(b, els) : b)))

export const insertBlock = (d: PageData, block: Block, afterId?: string): PageData => {
  const list = [...blocksOf(d)]
  const at = afterId ? list.findIndex((b) => blockId(b) === afterId) : -1
  list.splice(at >= 0 ? at + 1 : list.length, 0, block)
  return setContent(d, list)
}

export const removeBlock = (d: PageData, id: string): PageData => setContent(d, blocksOf(d).filter((b) => blockId(b) !== id))

export const moveBlock = (d: PageData, id: string, dir: -1 | 1): PageData => {
  const list = [...blocksOf(d)]
  const i = list.findIndex((b) => blockId(b) === id)
  const j = i + dir
  if (i < 0 || j < 0 || j >= list.length) return d
  ;[list[i], list[j]] = [list[j], list[i]]
  return setContent(d, list)
}

export const cloneBlock = (b: Block): Block => {
  const copy: Block = { ...b, props: { ...b.props, id: newBlockId(b.type) } }
  return elsOf(b).length ? withEls(copy, cloneElements(elsOf(b))) : copy
}
export const duplicateBlock = (d: PageData, id: string): PageData => {
  const src = blocksOf(d).find((b) => blockId(b) === id)
  return src ? insertBlock(d, cloneBlock(src), id) : d
}

export const findEl = (d: PageData, elId: string): { block: Block; el: FreeElement } | null => {
  const fl = floatOf(d).find((e) => e.id === elId)
  if (fl) return { block: { type: PAGE, props: { id: PAGE, _els: floatOf(d) } }, el: fl }
  for (const block of blocksOf(d)) {
    const el = elsOf(block).find((e) => e.id === elId)
    if (el) return { block, el }
  }
  return null
}

/** Thêm component vào một section, xếp lệch nhẹ để không chồng khít lên cái trước. */
/** `at`: tâm (toạ độ thiết kế) của vùng đang nhìn thấy trong section; có thì đặt cả nhóm component vào đó thay vì xếp lệch theo vị trí mặc định. */
export const addEls = (d: PageData, id: string, add: FreeElement[], at?: { cx: number; cy: number; maxY?: number }): PageData => {
  const block = id === PAGE ? { type: PAGE, props: { id, _els: floatOf(d) } } : blocksOf(d).find((b) => blockId(b) === id)
  if (!block) return d
  const list = elsOf(block)
  const n = list.length % 8
  if (!at) return setBlockEls(d, id, [...list, ...add.map((e) => ({ ...e, x: e.x + n * 24, y: e.y + 24 + n * 24 }))])
  const x0 = Math.min(...add.map((e) => e.x)), y0 = Math.min(...add.map((e) => e.y))
  const x1 = Math.max(...add.map((e) => e.x + e.w)), y1 = Math.max(...add.map((e) => e.y + e.h))
  const dx = at.cx - (x0 + x1) / 2, dy = Math.min(at.cy - (y0 + y1) / 2, (at.maxY ?? Infinity) - y1 - 8)
  return setBlockEls(d, id, [...list, ...add.map((e) => ({ ...e, x: Math.round(Math.max(0, e.x + dx)), y: Math.round(Math.max(8, e.y + dy)) }))])
}

export function placementOwner(data: PageData, selection: Sel, visibleId?: string): string {
  const hit = selection.el ? findEl(data, selection.el) : null
  if (hit) return blockId(hit.block)
  if (selection.block === PAGE || blocksOf(data).some((b) => blockId(b) === selection.block && isSection(b))) return selection.block
  return blocksOf(data).some((b) => blockId(b) === visibleId && isSection(b)) ? visibleId! : PAGE
}

export function placeElement(data: PageData, ownerId: string, element: FreeElement, anchor?: { x: number; y: number }): PageData {
  const block = blocksOf(data).find((b) => blockId(b) === ownerId)
  if (ownerId !== PAGE && !block) return data
  if (![element.x, element.y, element.w, element.h, anchor?.x ?? 0, anchor?.y ?? 0].every(Number.isFinite) || element.w <= 0 || element.h <= 0) return data
  const siblings = ownerId === PAGE ? floatOf(data) : elsOf(block!)
  const maxX = Math.max(0, 1200 - element.w)
  let x = Math.min(maxX, Math.max(0, anchor?.x ?? (element.x || 80))), y = Math.max(0, anchor?.y ?? (element.y || 24))
  if (!anchor) {
    for (const sibling of [...siblings].sort((a, b) => a.y - b.y)) {
      if (sibling.type !== 'container' && x < sibling.x + sibling.w && x + element.w > sibling.x && y < sibling.y + sibling.h && y + element.h > sibling.y) y = sibling.y + sibling.h + 16
    }
  }
  const next = setBlockEls(data, ownerId, [...siblings, { ...element, x: Math.round(x), y: Math.round(y) }])
  return block && isSection(block) && Number(block.props.height) > 0 && y + element.h > Number(block.props.height)
    ? patchBlock(next, ownerId, { height: Math.ceil(y + element.h + 24) }) : next
}

export function snapPosition(data: PageData, ownerId: string, element: FreeElement, position: { x: number; y: number }) {
  const block = blocksOf(data).find((b) => blockId(b) === ownerId)
  const siblings = ownerId === PAGE ? floatOf(data) : block ? elsOf(block) : []
  const family = new Set(elementFamily(siblings, element.id).map((el) => el.id))
  const others = siblings.filter((el) => !family.has(el.id) && !el.props._hidden)
  const guides: { axis: 'x' | 'y'; value: number }[] = []
  const next = { ...position }
  for (const axis of ['x', 'y'] as const) {
    const size = axis === 'x' ? 'w' : 'h'
    const limit = axis === 'x' ? 1200 : Number(block?.props.height) || 400
    const lines = [0, limit / 2, limit, ...others.flatMap((el) => [el[axis], el[axis] + el[size] / 2, el[axis] + el[size]])]
    const ordered = [...others].sort((a, b) => a[axis] - b[axis])
    for (let i = 1; i < ordered.length; i++) {
      const a = ordered[i - 1], b = ordered[i], gap = b[axis] - a[axis] - a[size]
      if (gap < 0) continue
      lines.push(b[axis] + b[size] + gap, a[axis] - gap - element[size])
      const between = b[axis] - a[axis] - a[size] - element[size]
      if (between >= 0) lines.push(a[axis] + a[size] + between / 2)
    }
    let best: { delta: number; value: number } | undefined
    for (const line of lines) for (const offset of [0, element[size] / 2, element[size]]) {
      const delta = line - position[axis] - offset
      if (Math.abs(delta) <= 6 && (!best || Math.abs(delta) < Math.abs(best.delta))) best = { delta, value: line }
    }
    if (best) { next[axis] += best.delta; guides.push({ axis, value: best.value }) }
  }
  return { ...next, guides }
}

let historySequence = 0
export const coalesceHistoryKey = (action: 'drag' | 'resize' | 'style' | 'structure', elementId = '') =>
  action === 'style' ? 'style:' + elementId : 'gesture:' + action + ':' + elementId + ':' + historySequence++

// ---- Lịch sử hoàn tác/làm lại ----
export type Hist = { past: PageData[]; present: PageData; future: PageData[]; key?: string; at?: number }
export const initHist = (present: PageData): Hist => ({ past: [], present, future: [] })

/** Ghi một trạng thái mới. Các lần ghi liên tiếp cùng `key` trong 0,9 giây gộp thành một bước (gõ chữ, kéo thanh trượt). */
export const commitHist = (h: Hist, next: PageData, key?: string, now = Date.now()): Hist => {
  if (next === h.present) return h
  const merge = Boolean(key) && h.key === key && (key!.startsWith('gesture:') || now - (h.at ?? 0) < 900)
  return { past: merge ? h.past : [...h.past.slice(-99), h.present], present: next, future: [], key, at: now }
}
export const undoHist = (h: Hist): Hist => (h.past.length ? { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] } : h)
export const redoHist = (h: Hist): Hist => (h.future.length ? { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) } : h)

// ---- Thao tác trên một component (tìm theo id ở bất kỳ section nào) ----
const mapEl = (d: PageData, elId: string, f: (els: FreeElement[], i: number) => FreeElement[]): PageData => {
  const hit = findEl(d, elId)
  if (!hit) return d
  const els = elsOf(hit.block)
  const next = f(els, els.findIndex((e) => e.id === elId))
  return next === els ? d : setBlockEls(d, blockId(hit.block), next)
}
export const updateEl = (d: PageData, elId: string, f: (e: FreeElement) => FreeElement): PageData => mapEl(d, elId, (els, i) => {
  const next = f(els[i])
  if (els[i].props._locked && (['x', 'y', 'w', 'h'] as const).some((key) => next[key] !== els[i][key])) return els
  return transformFamily(els, elId, next).map((el) => el.id === elId ? next : el)
})
export const patchElProps = (d: PageData, elId: string, p: Record<string, any>): PageData => updateEl(d, elId, (e) => ({ ...e, props: { ...e.props, ...p } }))
export const removeEl = (d: PageData, elId: string): PageData => mapEl(d, elId, (els) => {
  const ids = new Set(elementFamily(els, elId).map((el) => el.id))
  return els.filter((el) => !ids.has(el.id))
})
export const orderEl = (d: PageData, elId: string, to: 1 | -1 | 'front' | 'back'): PageData =>
  mapEl(d, elId, (els, i) => {
    const j = to === 'front' ? els.length - 1 : to === 'back' ? 0 : Math.min(els.length - 1, Math.max(0, i + to))
    const next = [...els]
    const [it] = next.splice(i, 1)
    next.splice(j, 0, it)
    return next
  })
/** Nhân đôi component; trả dữ liệu mới và id bản sao. */
export const dupEl = (d: PageData, elId: string): { data: PageData; id: string } => {
  const hit = findEl(d, elId)
  if (!hit) return { data: d, id: '' }
  const family = elementFamily(elsOf(hit.block), elId)
  const copies = cloneElements(family, 24)
  return { id: copies[family.findIndex((el) => el.id === elId)].id, data: setBlockEls(d, blockId(hit.block), [...elsOf(hit.block), ...copies]) }
}

export function reparentElements(d: PageData, sourceId: string, targetId: string, moved: FreeElement[], rootId: string): PageData {
  if (sourceId === targetId) return setBlockEls(d, sourceId, moved)
  const sourceBlock = blocksOf(d).find((b) => blockId(b) === sourceId)
  if (sourceId !== PAGE && !sourceBlock) return d
  const source = sourceId === PAGE ? floatOf(d) : elsOf(sourceBlock!)
  const target = targetId === PAGE ? floatOf(d) : blocksOf(d).find((b) => blockId(b) === targetId)
  if (!target) return d
  const family = elementFamily(moved, rootId)
  const ids = new Set(family.map((el) => el.id))
  return setBlockEls(setBlockEls(d, sourceId, source.filter((el) => !ids.has(el.id))), targetId,
    [...(Array.isArray(target) ? target : elsOf(target)), ...family.map((el) => el.id === rootId ? { ...el, parentId: undefined } : el)])
}

export type SelectionAction = 'duplicate' | 'delete' | 'lock' | 'hide' | 'align' | 'forward' | 'backward' | 'copy-style' | 'paste-style' | 'inspect' | 'states'
const STYLE_KEYS = ['color', 'bg', 'bg2', 'angle', 'radius', 'borderW', 'borderColor', 'bshadow', 'opacity', 'rotate', 'font', 'size', 'weight', 'align', 'lh', 'italic', 'spacing', 'underline', '_states', '_scroll'] as const
export const elementStyleProps = (props: Record<string, unknown>) => Object.fromEntries(STYLE_KEYS.filter((key) => props[key] !== undefined).map((key) => [key, structuredClone(props[key])]))

export function runSelectionAction(action: SelectionAction, selection: Sel, data: PageData, style?: Record<string, unknown>): PageData | { data: PageData; mode?: 'inspect' | 'states'; style?: Record<string, unknown> } {
  const hit = findEl(data, selection.el)
  if (!hit) return data
  if (action === 'inspect' || action === 'states') return { data, mode: action }
  if (action === 'copy-style') return { data, style: elementStyleProps(hit.el.props) }
  if (action === 'paste-style') return style ? updateEl(data, selection.el, (el) => {
    const props = { ...el.props }
    for (const key of STYLE_KEYS) delete props[key]
    return { ...el, props: { ...props, ...elementStyleProps(style) } }
  }) : data
  if (action === 'lock' || action === 'hide') return patchElProps(data, selection.el, { [action === 'lock' ? '_locked' : '_hidden']: !hit.el.props[action === 'lock' ? '_locked' : '_hidden'] })
  if (hit.el.props._locked) return data
  if (action === 'delete') return removeEl(data, selection.el)
  if (action === 'duplicate') return dupEl(data, selection.el).data
  if (action === 'align') return updateEl(data, selection.el, (el) => ({ ...el, x: Math.round((1200 - el.w) / 2) }))
  return orderEl(data, selection.el, action === 'forward' ? 1 : -1)
}
