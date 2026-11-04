import type { FreeElement } from '@hosso/studio-blocks'
import { cloneElements, elementFamily, inheritedElementFlag } from '../../../../../../../packages/blocks/src/free-geometry.ts'
import { PAGE, blockId, elsOf, floatOf, patchBlock, setBlockEls, type PageData, type Sel } from './canvas-model.ts'
import { arrangeElements, type ArrangeAction } from './editor-tools.ts'

export const selectionOwners = (data: PageData) => [{ id: PAGE, list: floatOf(data) }, ...data.content.map((block) => ({ id: blockId(block), list: elsOf(block) }))]
export type OwnerOrigins = Record<string, { x: number; y: number }>
export function measureOwnerOrigins(data: PageData, doc?: Document): OwnerOrigins {
  const origins: OwnerOrigins = { [PAGE]: { x: 0, y: 0 } }, page = doc?.querySelector('[data-editor-page]')?.getBoundingClientRect()
  const scale = page ? Math.min(1200, page.width) / 1200 : 1
  let y = 0
  for (const block of data.content) {
    const id = blockId(block), rect = doc?.querySelector(`[data-block="${CSS.escape(id)}"] [data-canvas-layer]`)?.getBoundingClientRect()
    origins[id] = rect && page && scale ? { x: (rect.left - page.left - Math.max(0, (page.width - 1200) / 2)) / scale, y: (rect.top - page.top) / scale } : { x: 0, y }
    y += Number(block.props.height) || 400
  }
  return origins
}

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
  return selectionOwners(data).flatMap((owner) => selectionFamily(owner.list, sel.multi?.length ? sel.multi : [sel.el], editable))
}
export function selectionOnPage(data: PageData, sel: Sel, origins: OwnerOrigins) {
  const ids = sel.multi?.length ? sel.multi : [sel.el]
  return selectionOwners(data).flatMap((owner) => selectionFamily(owner.list, ids).map((el) => ({ ...el, x: el.x + (origins[owner.id]?.x ?? 0), y: el.y + (origins[owner.id]?.y ?? 0) })))
}
export function translatePageSelection(data: PageData, sel: Sel, dx: number, dy: number): PageData {
  if (![dx, dy].every(Number.isFinite)) return data
  let next = data
  for (const owner of selectionOwners(data)) {
    const members = new Set(selectionFamily(owner.list, sel.multi?.length ? sel.multi : [sel.el]).map((el) => el.id))
    if (members.size) next = setBlockEls(next, owner.id, owner.list.map((el) => members.has(el.id) ? { ...el, x: el.x + dx, y: el.y + dy } : el))
  }
  return next
}
export function arrangePageSelection(data: PageData, sel: Sel, action: ArrangeAction, origins: OwnerOrigins): PageData {
  const ids = sel.multi?.length ? sel.multi : [sel.el], flattened = selectionOnPage(data, sel, origins)
  const arranged = floatOf(arrangeElements({ content: [], root: { props: { _float: flattened } } }, PAGE, ids, action))
  let next = data
  for (const owner of selectionOwners(data)) next = setBlockEls(next, owner.id, owner.list.map((el) => { const change = arranged.find((item) => item.id === el.id); return change ? { ...change, x: change.x - (origins[owner.id]?.x ?? 0), y: change.y - (origins[owner.id]?.y ?? 0) } : el }))
  return next
}
export function transferPageSelection(data: PageData, sel: Sel, destination: string, origins: OwnerOrigins): PageData {
  if (!selectionOwners(data).some((owner) => owner.id === destination)) return data
  const members = selectionOnPage(data, sel, origins), ids = new Set(members.map((el) => el.id)), box = selectionBox(members)
  if (!box) return data
  let next = data
  for (const owner of selectionOwners(data)) next = setBlockEls(next, owner.id, owner.list.filter((el) => !ids.has(el.id)))
  const target = selectionOwners(next).find((owner) => owner.id === destination)!
  const inserted = members.map((el) => ({ ...el, parentId: el.parentId && ids.has(el.parentId) ? el.parentId : undefined, x: el.x - box.x + 40, y: el.y - box.y + 40 }))
  next = setBlockEls(next, destination, [...target.list, ...inserted])
  if (destination !== PAGE) { const block = next.content.find((item) => blockId(item) === destination)!; next = patchBlock(next, destination, { height: Math.max(Number(block.props.height) || 400, ...inserted.map((el) => el.y + el.h + 24)) }) }
  return next
}
export function duplicateSelection(data: PageData, sel: Sel): { data: PageData; sel: Sel } {
  let next = data; const ids: string[] = []; let owner = sel.block
  for (const group of selectionOwners(data)) { const members = selectionFamily(group.list, sel.multi?.length ? sel.multi : [sel.el], false); if (!members.length) continue; const copies = cloneElements(members, 24); ids.push(...copies.map((el) => el.id)); owner = group.id; next = setBlockEls(next, group.id, [...group.list, ...copies]) }
  return { data: next, sel: ids.length ? { block: owner, el: ids[ids.length - 1], multi: ids } : sel }
}
export function deleteSelection(data: PageData, sel: Sel): PageData {
  let next = data
  for (const owner of selectionOwners(data)) { const ids = new Set(selectionFamily(owner.list, sel.multi?.length ? sel.multi : [sel.el]).map((el) => el.id)); if (ids.size) next = setBlockEls(next, owner.id, owner.list.filter((el) => !ids.has(el.id))) }
  return next
}
