import type { FreeElement } from './FreeCanvas'

export type CanvasDevice = 'desktop' | 'tablet' | 'mobile'
export type DevicePatch = Partial<Pick<FreeElement, 'x' | 'y' | 'w' | 'h'>> & { props?: Record<string, any> }
export type ResponsiveElement = FreeElement & { responsive?: Partial<Record<Exclude<CanvasDevice, 'desktop'>, DevicePatch>> }
type Block = { type: string; props: Record<string, any> }
type Document = { content: Block[]; root?: any; [key: string]: any }
export const DEVICE_WIDTH = { desktop: 1200, tablet: 768, mobile: 390 } as const
const GEOMETRY = ['x', 'y', 'w', 'h'] as const
const SHARED_PROPS = new Set(['text', 'richText', 'html', 'src', 'alt', 'href', 'url', 'poster', 'title', 'items', 'slides', 'name', '_name', '_hide', '_locked', '_hidden', '_states', '_motion', '_scroll'])
const BLOCK_LAYOUT = new Set(['height', '_padT', '_padB', '_padL', '_padR', '_marT', '_marB', '_maxW', '_minH', '_offX', '_offY'])
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
const elements = (props: Record<string, any>): ResponsiveElement[] => props._els ?? props.elements ?? []

export function elementForDevice(el: ResponsiveElement, device: CanvasDevice): ResponsiveElement {
  const patch = device === 'desktop' ? undefined : el.responsive?.[device]
  return patch ? { ...el, ...patch, props: { ...el.props, ...patch.props }, responsive: el.responsive } : el
}

export function blockForDevice(block: Block, device: CanvasDevice): Block {
  const patch = device === 'desktop' ? undefined : block.props._responsive?.[device]
  return { ...block, props: { ...block.props, ...patch, _els: elements(block.props).map((el) => elementForDevice(el, device)) } }
}

export function pageForDevice<T extends Document>(data: T, device: CanvasDevice): T {
  if (device === 'desktop') return data
  return { ...data, content: data.content.map((block) => blockForDevice(block, device)), root: data.root && { ...data.root, props: { ...data.root.props, _float: (data.root.props?._float ?? []).map((el: ResponsiveElement) => elementForDevice(el, device)) } } }
}

function mergeElement(base: ResponsiveElement | undefined, before: ResponsiveElement | undefined, next: ResponsiveElement, device: Exclude<CanvasDevice, 'desktop'>): ResponsiveElement {
  if (!base || !before) return next
  const patch: DevicePatch = { ...base.responsive?.[device], props: { ...base.responsive?.[device]?.props } }
  const props = { ...base.props }
  for (const key of GEOMETRY) if (next[key] !== before[key]) patch[key] = next[key]
  for (const key of new Set([...Object.keys(before.props), ...Object.keys(next.props)])) {
    if (same(before.props[key], next.props[key])) continue
    if (SHARED_PROPS.has(key)) props[key] = next.props[key]
    else patch.props![key] = next.props[key]
  }
  return { ...base, parentId: next.parentId, props, responsive: { ...base.responsive, [device]: patch } }
}

/** Store layout edits on the selected device; content and structural edits remain shared. */
export function mergeDevicePage<T extends Document>(base: T, next: T, device: CanvasDevice): T {
  if (device === 'desktop') return next
  const before = pageForDevice(base, device)
  const allBase = [...base.content.flatMap((block) => elements(block.props)), ...(base.root?.props?._float ?? [])] as ResponsiveElement[]
  const allVisible = [...before.content.flatMap((block) => elements(block.props)), ...(before.root?.props?._float ?? [])] as ResponsiveElement[]
  const mergeList = (original: ResponsiveElement[], visible: ResponsiveElement[], edited: ResponsiveElement[]) => edited.map((el) => mergeElement(original.find((item) => item.id === el.id) ?? allBase.find((item) => item.id === el.id), visible.find((item) => item.id === el.id) ?? allVisible.find((item) => item.id === el.id), el, device))
  const content = next.content.map((block) => {
    const original = base.content.find((item) => item.props.id === block.props.id)
    const visible = before.content.find((item) => item.props.id === block.props.id)
    if (!original || !visible) return block
    const props = { ...original.props }
    const patch = { ...original.props._responsive?.[device] }
    for (const key of new Set([...Object.keys(visible.props), ...Object.keys(block.props)])) {
      if (['_els', 'elements', '_responsive'].includes(key) || same(visible.props[key], block.props[key])) continue
      if (BLOCK_LAYOUT.has(key)) patch[key] = block.props[key]
      else props[key] = block.props[key]
    }
    delete props.elements
    return { ...block, props: { ...props, _responsive: { ...original.props._responsive, [device]: patch }, _els: mergeList(elements(original.props), elements(visible.props), elements(block.props)) } }
  })
  return { ...next, content, root: next.root && { ...next.root, props: { ...next.root.props, _float: mergeList(base.root?.props?._float ?? [], before.root?.props?._float ?? [], next.root?.props?._float ?? []) } } }
}

export function responsiveBlockCss(id: string, props: Record<string, any>): string {
  const cssNames: Record<string, string> = { _padT: 'padding-top', _padB: 'padding-bottom', _padL: 'padding-left', _padR: 'padding-right', _marT: 'margin-top', _marB: 'margin-bottom', _maxW: 'max-width', _minH: 'min-height' }
  return (['tablet', 'mobile'] as const).map((device) => {
    const patch = props._responsive?.[device]
    if (!patch) return ''
    const rules = Object.entries(cssNames).flatMap(([key, name]) => typeof patch[key] === 'number' && Number.isFinite(patch[key]) ? [`${name}:${patch[key]}px!important`] : [])
    if (['_offX', '_offY'].some((key) => typeof patch[key] === 'number' && Number.isFinite(patch[key]))) rules.push(`transform:translate(${Number(patch._offX ?? props._offX) || 0}px,${Number(patch._offY ?? props._offY) || 0}px)!important`)
    return rules.length ? `@media${device === 'mobile' ? '(max-width:600px)' : '(min-width:601px) and (max-width:1024px)'}{[data-hs-layout="${encodeURIComponent(id)}"]{${rules.join(';')}}}` : ''
  }).join('')
}

export function resetDeviceLayout<T extends Document>(data: T, blockId: string, device: CanvasDevice, elementId?: string): T {
  if (device === 'desktop') return data
  const reset = (el: ResponsiveElement) => {
    if (elementId && el.id !== elementId) return el
    const responsive = { ...el.responsive }
    delete responsive[device]
    return { ...el, responsive }
  }
  if (blockId === '@page') return { ...data, root: { ...data.root, props: { ...data.root?.props, _float: (data.root?.props?._float ?? []).map(reset) } } }
  return { ...data, content: data.content.map((block) => {
    if (block.props.id !== blockId) return block
    const responsive = { ...block.props._responsive }
    if (!elementId) delete responsive[device]
    return { ...block, props: { ...block.props, _responsive: responsive, _els: elements(block.props).map(reset) } }
  }) }
}

/** One undoable layout suggestion; subsequent dragging can refine its device overrides. */
export function stackDeviceSection<T extends Document>(data: T, blockId: string, device: CanvasDevice, gap = 20, padding = 20): T {
  if (device === 'desktop') return data
  const visible = pageForDevice(data, device)
  const block = visible.content.find((item) => item.props.id === blockId)
  if (!block || block.type !== 'FreeCanvas') return data
  const factor = 1200 / DEVICE_WIDTH[device]
  const list = elements(block.props)
  const roots = list.filter((el) => !el.parentId || !list.some((parent) => parent.id === el.parentId)).sort((a, b) => a.y - b.y || a.x - b.x)
  let y = padding * factor
  const arranged = new Map<string, ResponsiveElement>()
  for (const el of roots) {
    const hidden = el.props._hidden || el.props._hide === (device === 'mobile' ? 'm' : 't')
    if (hidden) continue
    const width = 1200 - padding * factor * 2
    const scale = width / Math.max(1, el.w)
    const props = { ...el.props }
    let height = el.h * scale
    if (['heading', 'text', 'button'].includes(el.type)) {
      props.size = Math.min(el.type === 'heading' ? 36 : 20, Math.max(16, Number(el.props.size) || 18)) * factor
      const text = String(el.props.text ?? '').replace(/<[^>]*>/g, '')
      const lines = Math.max(1, Math.ceil(text.length * props.size * 0.55 / width))
      height = Math.max(el.type === 'button' ? 44 * factor : 0, lines * props.size * 1.5 + 12 * factor)
    }
    arranged.set(el.id, { ...el, x: padding * factor, y, w: width, h: height, props })
    const family = new Set([el.id])
    let changed = true
    while (changed) {
      changed = false
      for (const child of list) if (child.parentId && family.has(child.parentId) && !family.has(child.id)) { family.add(child.id); changed = true }
    }
    for (const child of list) if (child.id !== el.id && family.has(child.id)) arranged.set(child.id, { ...child, x: padding * factor + (child.x - el.x) * scale, y: y + (child.y - el.y) * scale, w: child.w * scale, h: child.h * scale, props: { ...child.props, ...(typeof child.props.size === 'number' ? { size: child.props.size * scale } : {}) } })
    y += height + gap * factor
  }
  const edited = { ...visible, content: visible.content.map((item) => item === block ? { ...item, props: { ...item.props, height: Math.max(80, y - gap * factor + padding * factor), _els: list.map((el) => arranged.get(el.id) ?? el) } } : item) }
  return mergeDevicePage(data, edited, device)
}
