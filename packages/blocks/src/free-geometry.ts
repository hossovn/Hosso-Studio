import type { FreeElement } from './FreeCanvas'

let seq = 0
export const newId = () => 'e' + Date.now().toString(36) + (seq++).toString(36)

// Coordinates stay section-relative; parentId only records group membership.
export function elementFamily(els: FreeElement[], id: string): FreeElement[] {
  const ids = new Set([id])
  let changed = true
  while (changed) {
    changed = false
    for (const el of els) if (el.parentId && ids.has(el.parentId) && !ids.has(el.id)) {
      ids.add(el.id)
      changed = true
    }
  }
  return els.filter((el) => ids.has(el.id))
}

export function transformFamily(els: FreeElement[], id: string, box: Pick<FreeElement, 'x' | 'y' | 'w' | 'h'>): FreeElement[] {
  const root = els.find((el) => el.id === id)
  if (!root) return els
  const ids = new Set(elementFamily(els, id).map((el) => el.id))
  const sx = box.w / Math.max(1, root.w), sy = box.h / Math.max(1, root.h)
  return els.map((el) => !ids.has(el.id) ? el : {
    ...el, x: box.x + (el.x - root.x) * sx, y: box.y + (el.y - root.y) * sy,
    w: el.w * sx, h: el.h * sy,
    ...(el.id !== id && root.type === 'container' && typeof el.props.size === 'number' && (sx !== 1 || sy !== 1) ? { props: { ...el.props, size: el.props.size * Math.min(sx, sy) } } : {}),
  })
}

export function cloneElements(els: FreeElement[], offset = 0): FreeElement[] {
  const ids = new Map(els.map((el) => [el.id, newId()]))
  return els.map((el) => ({ ...el, id: ids.get(el.id)!, parentId: el.parentId ? ids.get(el.parentId) : undefined, x: el.x + offset, y: el.y + offset, props: structuredClone(el.props) }))
}

export type CanvasRect = { left: number; top: number; width: number; height: number }
export function convertSectionBox(el: FreeElement, source: CanvasRect, target: CanvasRect, unit = 1200) {
  const from = source.width / unit, to = target.width / unit
  if (from <= 0 || to <= 0) return { x: el.x, y: el.y, w: el.w, h: el.h }
  return { x: (source.left + el.x * from - target.left) / to, y: (source.top + el.y * from - target.top) / to, w: el.w * from / to, h: el.h * from / to }
}
