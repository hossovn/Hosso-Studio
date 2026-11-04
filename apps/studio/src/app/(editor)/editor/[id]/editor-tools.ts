import { elementFamily, inheritedElementFlag, transformFamily } from '../../../../../../../packages/blocks/src/free-geometry.ts'
import { PAGE, blockId, elsOf, floatOf, setBlockEls, newBlockId, type Hist, type PageData } from './canvas-model.ts'

export type ArrangeAction = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom' | 'horizontal' | 'vertical'

export function ownerElements(data: PageData, owner: string) {
  return owner === PAGE ? floatOf(data) : elsOf(data.content.find((block) => blockId(block) === owner) ?? { type: '', props: {} })
}

/** Operate on root selections only; moving a group carries its descendants. */
export function arrangeElements(data: PageData, owner: string, ids: string[], action: ArrangeAction): PageData {
  let list = ownerElements(data, owner)
  const picked = new Set(ids)
  const eligible = list.filter((el) => {
    const visited = new Set<string>([el.id])
    let parent = list.find((item) => item.id === el.parentId)
    if (!picked.has(el.id) || el.props._locked) return false
    while (parent && !visited.has(parent.id)) {
      if (picked.has(parent.id) || parent.props._locked) return false
      visited.add(parent.id)
      parent = list.find((item) => item.id === parent!.parentId)
    }
    return true
  })
  if (eligible.length < 2) return data
  const left = Math.min(...eligible.map((el) => el.x)), top = Math.min(...eligible.map((el) => el.y))
  const right = Math.max(...eligible.map((el) => el.x + el.w)), bottom = Math.max(...eligible.map((el) => el.y + el.h))
  const axis = action === 'horizontal' ? 'x' : 'y'
  const dim = axis === 'x' ? 'w' : 'h'
  const ordered = [...eligible].sort((a, b) => a[axis] - b[axis])
  const gap = (ordered.at(-1)![axis] + ordered.at(-1)![dim] - ordered[0][axis] - ordered.reduce((sum, el) => sum + el[dim], 0)) / (ordered.length - 1)
  let cursor = ordered[0][axis]
  for (const el of action === 'horizontal' || action === 'vertical' ? ordered : eligible) {
    let x = el.x, y = el.y
    if (action === 'left') x = left
    if (action === 'center') x = (left + right - el.w) / 2
    if (action === 'right') x = right - el.w
    if (action === 'top') y = top
    if (action === 'middle') y = (top + bottom - el.h) / 2
    if (action === 'bottom') y = bottom - el.h
    if (action === 'horizontal') { x = cursor; cursor += el.w + gap }
    if (action === 'vertical') { y = cursor; cursor += el.h + gap }
    const next = { ...el, x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 }
    list = transformFamily(list, el.id, next).map((item) => item.id === el.id ? next : item)
  }
  return setBlockEls(data, owner, list)
}

export function groupElements(data: PageData, owner: string, ids: string[]): { data: PageData; id: string } {
  const list = ownerElements(data, owner), selected = list.filter((el) => ids.includes(el.id))
  if (selected.length < 2 || selected.some((el) => inheritedElementFlag(list, el.id, '_locked') || el.parentId !== selected[0].parentId)) return { data, id: '' }
  const x = Math.min(...selected.map((el) => el.x)), y = Math.min(...selected.map((el) => el.y))
  const id = newBlockId('group')
  const group = { id, type: 'container' as const, parentId: selected[0].parentId, x, y, w: Math.max(...selected.map((el) => el.x + el.w)) - x, h: Math.max(...selected.map((el) => el.y + el.h)) - y, props: { _name: 'Nhóm', bg: 'transparent' } }
  return { id, data: setBlockEls(data, owner, [group, ...list.map((el) => ids.includes(el.id) ? { ...el, parentId: id } : el)]) }
}

export function ungroupElement(data: PageData, owner: string, id: string): PageData {
  const list = ownerElements(data, owner), group = list.find((el) => el.id === id && el.type === 'container')
  if (!group || inheritedElementFlag(list, id, '_locked')) return data
  return setBlockEls(data, owner, list.filter((el) => el.id !== id).map((el) => el.parentId === id ? { ...el, parentId: group.parentId } : el))
}

export function reorderLayer(data: PageData, owner: string, source: string, target: string): PageData {
  if (source === target) return data
  const list = ownerElements(data, owner), from = list.find((el) => el.id === source), to = list.find((el) => el.id === target)
  if (!from || !to || inheritedElementFlag(list, source, '_locked') || from.parentId !== to.parentId) return data
  const family = new Set(elementFamily(list, source).map((el) => el.id))
  const rest = list.filter((el) => !family.has(el.id))
  const targetFamily = new Set(elementFamily(list, target).map((el) => el.id))
  const at = list.indexOf(from) < list.indexOf(to) ? Math.max(...rest.map((el, index) => targetFamily.has(el.id) ? index : -1)) + 1 : rest.findIndex((el) => el.id === target)
  rest.splice(at, 0, ...list.filter((el) => family.has(el.id)))
  return setBlockEls(data, owner, rest)
}

export function jumpHistory(hist: Hist, index: number): Hist {
  const entries = [...hist.past, hist.present, ...hist.future]
  if (!Number.isInteger(index) || index < 0 || index >= entries.length || index === hist.past.length) return hist
  return { past: entries.slice(0, index), present: entries[index], future: entries.slice(index + 1) }
}

export function describeChange(before: PageData | undefined, after: PageData): string {
  if (!before) return 'Bắt đầu phiên chỉnh sửa'
  if (after.content.length !== before.content.length) return after.content.length > before.content.length ? 'Thêm phần' : 'Xóa phần'
  if (after.content.some((block, index) => blockId(block) !== blockId(before.content[index]))) return 'Sắp xếp phần'
  const oldEls = [...before.content.flatMap(elsOf), ...floatOf(before)]
  const newEls = [...after.content.flatMap(elsOf), ...floatOf(after)]
  if (oldEls.length !== newEls.length) return oldEls.length < newEls.length ? 'Thêm phần tử' : 'Xóa phần tử'
  if (newEls.some((el) => { const old = oldEls.find((item) => item.id === el.id); return old && ['x', 'y', 'w', 'h'].some((key) => old[key as 'x'] !== el[key as 'x']) })) return 'Thay đổi bố cục'
  return 'Chỉnh nội dung / thiết kế'
}
