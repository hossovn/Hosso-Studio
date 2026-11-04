import type { FreeElement } from './FreeCanvas'
type Device = 'desktop' | 'tablet' | 'mobile'
const WIDTH = { desktop: 1200, tablet: 768, mobile: 390 }
const finite = (value: unknown, fallback: number) => typeof value === 'number' && Number.isFinite(value) ? value : fallback
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
  const factor = 1200 / WIDTH[device]
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
    const patch = device === 'desktop' ? undefined : el.responsive?.[device]
    const props = { ...el.props, ...patch?.props }
    if (device !== 'desktop' && ['start', 'end', 'center', 'stretch'].includes(settings.horizontal) && props.size != null && patch?.props?.size == null) props.size = Number(props.size) * factor
    const next = { ...el, x: target.x + horizontal.position * factor, y: target.y + vertical.position * factor, w: horizontal.size * factor, h: vertical.size * factor, ...patch, props }
    cache.set(el.id, next); visiting.delete(el.id)
    return next
  }
  const resolved = elements.map(resolve)
  // Flow groups arrange direct children and carry their descendants with them.
  const arranged = new Set<string>()
  const arrange = (group: FreeElement) => {
    if (arranged.has(group.id)) return
    arranged.add(group.id)
    const children = resolved.filter((el) => el.parentId === group.id && !el.props._hidden)
    if (group.type !== 'container' || !['row', 'column'].includes(group.props._layout?.direction)) { children.forEach(arrange); return }
    const flow = group.props._layout, column = flow.direction === 'column', axis = column ? 'y' : 'x', size = column ? 'h' : 'w', cross = column ? 'x' : 'y', crossSize = column ? 'w' : 'h'
    const padding = Math.max(0, finite(flow.padding, 16)) * factor, gap = Math.max(0, finite(flow.gap, 16)) * factor
    let cursor = group[axis] + padding
    for (const child of children) {
      const old = { x: child.x, y: child.y }
      if (flow.align === 'stretch') child[crossSize] = Math.max(8, group[crossSize] - padding * 2)
      arrange(child)
      child[axis] = cursor
      child[cross] = group[cross] + (flow.align === 'center' ? (group[crossSize] - child[crossSize]) / 2 : flow.align === 'end' ? group[crossSize] - padding - child[crossSize] : padding)
      cursor += child[size] + gap
      const family = new Set([child.id])
      for (let pass = 0; pass < resolved.length; pass++) for (const item of resolved) if (item.parentId && family.has(item.parentId)) family.add(item.id)
      for (const item of resolved) if (item.id !== child.id && family.has(item.id)) { item.x += child.x - old.x; item.y += child.y - old.y }
    }
    if (flow.autoSize) group[size] = Math.max(8, cursor - group[axis] - (children.length ? gap : 0) + padding)
  }
  resolved.filter((el) => !resolved.some((parent) => parent.id === el.parentId)).forEach(arrange)
  resolved.forEach(arrange)
  return resolved
}
