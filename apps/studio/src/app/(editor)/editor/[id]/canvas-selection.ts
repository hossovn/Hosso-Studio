import type { FreeElement } from '@hosso/studio-blocks'
import { cloneElements, elementFamily, inheritedElementFlag } from '../../../../../../../packages/blocks/src/free-geometry.ts'
import { elsOf, findEl, setBlockEls, type PageData, type Sel } from './canvas-model.ts'

export type SelectionBox = { x: number; y: number; w: number; h: number }
export function selectionFamily(list: FreeElement[], ids: string[], editable = true): FreeElement[] {
  const selected = new Set(ids), family = new Set<string>()
  for (const el of list) {
    if (!selected.has(el.id)) continue
    const members = elementFamily(list, el.id)
    if (editable && members.some((item) => inheritedElementFlag(list, item.id, '_locked'))) continue
    members.forEach((item) => family.add(item.id))
  }
  return list.filter((el) => family.has(el.id))
}
export function selectionBox(list: FreeElement[]): SelectionBox | null {
  if (!list.length) return null
  const x = Math.min(...list.map((el) => el.x)), y = Math.min(...list.map((el) => el.y))
  return { x, y, w: Math.max(...list.map((el) => el.x + el.w)) - x, h: Math.max(...list.map((el) => el.y + el.h)) - y }
}
export function transformSelection(list: FreeElement[], ids: string[], box: SelectionBox): FreeElement[] {
  const members = selectionFamily(list, ids), before = selectionBox(members)
  if (!before || ![box.x, box.y, box.w, box.h].every(Number.isFinite)) return list
  const chosen = new Set(members.map((el) => el.id)), sx = Math.max(8, box.w) / Math.max(1, before.w), sy = Math.max(8, box.h) / Math.max(1, before.h)
  return list.map((el) => !chosen.has(el.id) ? el : { ...el, x: box.x + (el.x - before.x) * sx, y: box.y + (el.y - before.y) * sy, w: Math.max(1, el.w * sx), h: Math.max(1, el.h * sy), props: { ...el.props, ...(typeof el.props.size === 'number' && (sx !== 1 || sy !== 1) ? { size: el.props.size * Math.min(sx, sy) } : {}) } })
}
export function rectangleSelection(list: FreeElement[], box: SelectionBox): string[] {
  return list.filter((el) => !inheritedElementFlag(list, el.id, '_hidden') && !inheritedElementFlag(list, el.id, '_locked') && el.x < box.x + box.w && el.x + el.w > box.x && el.y < box.y + box.h && el.y + el.h > box.y).map((el) => el.id)
}
export function selectedElements(data: PageData, sel: Sel, editable = true) {
  const hit = findEl(data, sel.el)
  return hit ? selectionFamily(elsOf(hit.block), sel.multi?.length ? sel.multi : [sel.el], editable) : []
}
export function duplicateSelection(data: PageData, sel: Sel): { data: PageData; sel: Sel } {
  const hit = findEl(data, sel.el), members = selectedElements(data, sel, false)
  if (!hit || !members.length) return { data, sel }
  const copies = cloneElements(members, 24), ids = copies.map((el) => el.id)
  return { data: setBlockEls(data, sel.block, [...elsOf(hit.block), ...copies]), sel: { block: sel.block, el: ids[ids.length - 1], multi: ids } }
}
export function deleteSelection(data: PageData, sel: Sel): PageData {
  const hit = findEl(data, sel.el), ids = new Set(selectedElements(data, sel).map((el) => el.id))
  return hit && ids.size ? setBlockEls(data, sel.block, elsOf(hit.block).filter((el) => !ids.has(el.id))) : data
}
