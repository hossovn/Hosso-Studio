import type { FreeElement } from './FreeCanvas'
import { baseDevice, layoutWidth, type LayoutDevice as Device } from './responsive-breakpoints.ts'
const finite = (value: unknown, fallback: number) => typeof value === 'number' && Number.isFinite(value) ? value : fallback
export function textContentSize(el: FreeElement, width = el.w) {
  const p = el.props, size = Math.max(8, finite(p.size, 18)), line = size * finite(Number(p.lh), 1.25)
  const text = p.upper ? String(p.text ?? '').toUpperCase() : String(p.text ?? '')
  const measure = (value: string) => [...value].reduce((sum, char) => sum + size * (/\s/.test(char) ? .3 : /[ilI.,'!]/.test(char) ? .28 : /[MW@]/.test(char) ? .9 : .57), 0)
  let lines = 0
  for (const paragraph of text.split('\n')) { let used = 0; lines++; for (const word of paragraph.split(/(\s+)/)) { const w = measure(word); if (used && used + w > width) { lines++; used = 0 } lines += Math.max(0, Math.ceil(w / Math.max(8, width)) - 1); used += w % Math.max(8, width) } }
  return { w: Math.max(8, ...text.split('\n').map(measure)), h: Math.max(line, lines * line) }
}
export function axisConstraint(position: number, size: number, before: number, after: number, mode: string) {
  if (mode === 'start') return { position, size }
  if (mode === 'end') return { position: after - (before - position - size) - size, size }
  if (mode === 'center') return { position: after / 2 + (position + size / 2 - before / 2) - size / 2, size }
  if (mode === 'stretch') return { position, size: Math.max(8, after - position - (before - position - size)) }
  const ratio = after / Math.max(1, before)
  return { position: position * ratio, size: size * ratio }
}

/** Resolve from canonical coordinates; explicit breakpoint geometry always wins. */
export function constrainedElements(elements: FreeElement[], device: Device, baseHeight = 400, targetHeight = baseHeight): FreeElement[] {
  const factor = 1200 / layoutWidth(device)
  const cache = new Map<string, FreeElement>(), visiting = new Set<string>()
  const resolve = (el: FreeElement): FreeElement => {
    if (cache.has(el.id)) return cache.get(el.id)!
    if (visiting.has(el.id)) return el
    visiting.add(el.id)
    const parent = elements.find((candidate) => candidate.id === el.parentId && candidate.id !== el.id && !visiting.has(candidate.id))
    const resolvedParent = parent ? resolve(parent) : undefined
    const settings = el.props._constraints ?? {}
    const base = parent ?? { x: 0, y: 0, w: 1200, h: baseHeight }
    const target = resolvedParent ?? { x: 0, y: 0, w: 1200, h: targetHeight }
    const horizontal = axisConstraint(el.x - base.x, el.w, base.w, target.w / factor, settings.horizontal)
    const vertical = ['start', 'center', 'end', 'stretch'].includes(settings.vertical)
      ? axisConstraint(el.y - base.y, el.h, base.h, target.h / factor, settings.vertical)
      : { position: (el.y - base.y) * target.w / factor / Math.max(1, base.w), size: el.h * target.w / factor / Math.max(1, base.w) }
    const baseKey = baseDevice(layoutWidth(device))
    const fallback = device.startsWith('bp-') && baseKey !== 'desktop' ? el.responsive?.[baseKey] : undefined
    const own = device === 'desktop' ? undefined : el.responsive?.[device]
    const patch = fallback || own ? { ...fallback, ...own, props: { ...fallback?.props, ...own?.props } } : undefined
    const props = { ...el.props, ...patch?.props }
    if (device !== 'desktop' && ['start', 'end', 'center', 'stretch'].includes(settings.horizontal) && props.size != null && patch?.props?.size == null) props.size = Number(props.size) * factor
    const next = { ...el, x: target.x + horizontal.position * factor, y: target.y + vertical.position * factor, w: horizontal.size * factor, h: vertical.size * factor, ...patch, props }
    cache.set(el.id, next); visiting.delete(el.id)
    return next
  }
  const resolved = elements.map(resolve)
  for (const el of resolved) if (['heading', 'text', 'button'].includes(el.type)) {
    if (el.props._sizing?.width === 'hug') el.w = Math.min(1200, textContentSize(el).w + (el.type === 'button' ? 32 : 0))
    if (el.props._sizing?.height === 'hug') el.h = textContentSize(el).h + (el.type === 'button' ? 20 : 0)
  }
  // Flow groups arrange direct children and carry their descendants with them.
  const arranged = new Set<string>()
  const arrange = (group: FreeElement) => {
    if (arranged.has(group.id)) return
    arranged.add(group.id)
    const children = resolved.filter((el) => el.parentId === group.id && !el.props._hidden)
    if (group.type === 'container' && group.props._layout?.direction === 'grid') {
      const flow = group.props._layout, stacked = layoutWidth(device) <= 600 && flow.mobileStack !== false
      const weights: number[] = Array.isArray(flow.columns) && flow.columns.length ? flow.columns.slice(0, 12).map((n: unknown) => Math.max(0.1, finite(n, 1))) : [1, 1]
      const columns = stacked ? [1] : weights, sum = columns.reduce((a, b) => a + b, 0)
      const gap = Math.max(0, finite(flow.gap, 24)) * factor, padding = Math.max(0, finite(flow.padding, 0)) * factor
      const rows = Math.max(1, Math.ceil(children.length / columns.length))
      const available = Math.max(8, group.w - padding * 2 - gap * (columns.length - 1))
      const cellH = stacked ? Math.max(160 * factor, ...children.map((child) => child.h * factor)) : Math.max(8, (group.h - padding * 2 - gap * (rows - 1)) / rows)
      let x = group.x + padding
      children.forEach((child, index) => {
        const column = index % columns.length, row = Math.floor(index / columns.length)
        if (!column) x = group.x + padding
        const before = { ...child }, w = available * columns[column] / sum
        const family = new Set([child.id]); let changed = true
        while (changed) { changed = false; for (const item of resolved) if (item.parentId && family.has(item.parentId) && !family.has(item.id)) { family.add(item.id); changed = true } }
        child.x = x; child.y = group.y + padding + row * (cellH + gap); child.w = w; child.h = cellH
        for (const item of resolved) if (item.id !== child.id && family.has(item.id)) {
          const ratio = w / Math.max(1, before.w)
          item.x = child.x + (item.x - before.x) * ratio; item.y = child.y + (item.y - before.y) * ratio
          item.w *= ratio; item.h *= ratio
          if (typeof item.props.size === 'number') item.props = { ...item.props, size: item.props.size * ratio }
        }
        arrange(child); x += w + gap
      })
      if (stacked || flow.autoSize || group.props._sizing?.height === 'hug') {
        let cursor = group.y + padding
        for (let row = 0; row < rows; row++) {
          const cells = children.slice(row * columns.length, (row + 1) * columns.length)
          const height = Math.max(8, ...cells.map((child) => child.h))
          for (const child of cells) {
            const dy = cursor - child.y, family = new Set([child.id])
            for (let pass = 0; pass < resolved.length; pass++) for (const item of resolved) if (item.parentId && family.has(item.parentId)) family.add(item.id)
            for (const item of resolved) if (family.has(item.id)) item.y += dy
          }
          cursor += height + gap
        }
        group.h = cursor - group.y - (children.length ? gap : 0) + padding
      }
      return
    }
    if (group.type !== 'container' || !['row', 'column'].includes(group.props._layout?.direction)) {
      const pad = finite(group.props._layout?.padding, 0) * factor
      for (const child of children) {
        if (child.props._sizing?.width === 'fill' && group.props._sizing?.width !== 'hug') { child.x = group.x + pad; child.w = Math.max(8, group.w - pad * 2) }
        if (child.props._sizing?.height === 'fill' && group.props._sizing?.height !== 'hug') { child.y = group.y + pad; child.h = Math.max(8, group.h - pad * 2) }
        if (child.props._sizing?.height === 'hug' && ['text', 'heading'].includes(child.type)) child.h = textContentSize(child).h
      }
      children.forEach(arrange)
      if (group.type === 'container') {
        if (group.props._sizing?.width === 'hug') group.w = Math.max(8, ...children.map((el) => el.x + el.w - group.x + pad))
        if (group.props._sizing?.height === 'hug') group.h = Math.max(8, ...children.map((el) => el.y + el.h - group.y + pad))
      }
      return
    }
    const flow = group.props._layout, column = flow.direction === 'column', axis = column ? 'y' : 'x', size = column ? 'h' : 'w', cross = column ? 'x' : 'y', crossSize = column ? 'w' : 'h'
    const padding = Math.max(0, finite(flow.padding, 16)) * factor, gap = Math.max(0, finite(flow.gap, 16)) * factor
    const mainMode = column ? 'height' : 'width', crossMode = column ? 'width' : 'height'
    const fills = children.filter((child) => child.props._sizing?.[mainMode] === 'fill')
    const remaining = Math.max(8 * fills.length, group[size] - padding * 2 - gap * Math.max(0, children.length - 1) - children.filter((child) => !fills.includes(child)).reduce((sum, child) => sum + child[size], 0))
    let cursor = group[axis] + padding
    for (const child of children) {
      const old = { x: child.x, y: child.y }
      if (flow.align === 'stretch' || child.props._sizing?.[crossMode] === 'fill') child[crossSize] = Math.max(8, group[crossSize] - padding * 2)
      if (fills.includes(child) && group.props._sizing?.[mainMode] !== 'hug' && !flow.autoSize) child[size] = remaining / fills.length
      if (column && child.props._sizing?.height === 'hug' && ['text', 'heading'].includes(child.type)) child.h = textContentSize(child).h
      arrange(child)
      child[axis] = cursor
      child[cross] = group[cross] + (flow.align === 'center' ? (group[crossSize] - child[crossSize]) / 2 : flow.align === 'end' ? group[crossSize] - padding - child[crossSize] : padding)
      cursor += child[size] + gap
      const family = new Set([child.id])
      for (let pass = 0; pass < resolved.length; pass++) for (const item of resolved) if (item.parentId && family.has(item.parentId)) family.add(item.id)
      for (const item of resolved) if (item.id !== child.id && family.has(item.id)) { item.x += child.x - old.x; item.y += child.y - old.y }
    }
    if (flow.autoSize || group.props._sizing?.[mainMode] === 'hug') group[size] = Math.max(8, cursor - group[axis] - (children.length ? gap : 0) + padding)
    if (group.props._sizing?.[crossMode] === 'hug') group[crossSize] = Math.max(8, ...children.map((child) => child[crossSize] + padding * 2))
  }
  resolved.filter((el) => !resolved.some((parent) => parent.id === el.parentId)).forEach(arrange)
  resolved.forEach(arrange)
  return resolved
}

/** Arrange an already projected editor list without applying breakpoint geometry twice. */
export function arrangeResolvedElements(elements: FreeElement[], width: number): FreeElement[] {
  const factor = 1200 / Math.max(320, Math.min(1200, width))
  const layouts = new Map(elements.map((el) => [el.id, el.props._layout]))
  const temporary = elements.map((el) => {
    const layout = el.props._layout
    if (!layout) return el
    return { ...el, props: { ...el.props, _layout: { ...layout, gap: finite(layout.gap, layout.direction === 'grid' ? 24 : 16) * factor, padding: finite(layout.padding, layout.direction === 'grid' ? 0 : 16) * factor, ...(width <= 600 && layout.direction === 'grid' && layout.mobileStack !== false ? { direction: 'column', align: 'stretch', autoSize: true } : {}) } } }
  })
  return constrainedElements(temporary, 'desktop').map((el) => layouts.get(el.id) ? { ...el, props: { ...el.props, _layout: layouts.get(el.id) } } : el)
}
