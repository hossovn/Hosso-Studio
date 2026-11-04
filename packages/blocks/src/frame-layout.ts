import type { FreeElement } from './FreeCanvas'
import { elementFamily, inheritedElementFlag, newId, transformFamily } from './free-geometry.ts'

export const FRAME_LAYOUTS = [
  { id: 'single', label: 'Một ô', columns: [1], rows: 1 },
  { id: 'halves', label: 'Hai ô bằng nhau', columns: [1, 1], rows: 1 },
  { id: 'sidebar-left', label: 'Ô nhỏ bên trái', columns: [1, 2], rows: 1 },
  { id: 'sidebar-right', label: 'Ô lớn bên trái', columns: [2, 1], rows: 1 },
  { id: 'thirds', label: 'Ba ô', columns: [1, 1, 1], rows: 1 },
  { id: 'quarters', label: 'Bốn ô', columns: [1, 1, 1, 1], rows: 1 },
  { id: 'grid', label: 'Lưới bốn ô', columns: [1, 1], rows: 2 },
  { id: 'rows', label: 'Hai hàng', columns: [1], rows: 2 },
] as const

export function createFrameLayout(id: string): FreeElement[] {
  const preset = FRAME_LAYOUTS.find((item) => item.id === id) ?? FRAME_LAYOUTS[0]
  const root: FreeElement = { id: newId(), type: 'container', x: 60, y: 40, w: 1080, h: preset.rows === 2 ? 640 : 360, props: { _name: preset.label, bg: 'transparent', _frame: true, _layout: { direction: 'grid', columns: [...preset.columns], rows: preset.rows, gap: 24, padding: 0, mobileStack: true } } }
  const gap = 24, sum = preset.columns.reduce<number>((total, weight) => total + weight, 0)
  let x = root.x
  const cells: FreeElement[] = []
  for (let row = 0; row < preset.rows; row++) {
    x = root.x
    preset.columns.forEach((weight, column) => {
      const w = (root.w - gap * (preset.columns.length - 1)) * weight / sum, h = (root.h - gap * (preset.rows - 1)) / preset.rows
      cells.push({ id: newId(), type: 'container', parentId: root.id, x, y: root.y + row * (h + gap), w, h, props: { _name: `Ô ${cells.length + 1}`, _frame: true, bg: '#ffffff', radius: 8, _layout: { direction: 'free', padding: 24, gap: 16 } } })
      x += w + gap
    })
  }
  return [root, ...cells]
}

/** Deepest visible unlocked frame under a point; excludes the entire moving family. */
export function frameAtPoint(list: FreeElement[], x: number, y: number, excluded: string[] = []): FreeElement | undefined {
  const blocked = new Set(excluded.flatMap((id) => elementFamily(list, id).map((item) => item.id)))
  const depth = (el: FreeElement) => { let count = 0, parent = el; const seen = new Set<string>(); while (parent.parentId && !seen.has(parent.id)) { seen.add(parent.id); const next = list.find((item) => item.id === parent.parentId); if (!next) break; count++; parent = next } return count }
  return list.filter((el) => el.type === 'container' && !blocked.has(el.id) && !inheritedElementFlag(list, el.id, '_hidden') && !inheritedElementFlag(list, el.id, '_locked') && x >= el.x && y >= el.y && x <= el.x + el.w && y <= el.y + el.h)
    .sort((a, b) => depth(b) - depth(a) || a.w * a.h - b.w * b.h)[0]
}

/** Insert a family into a frame, preserving its hierarchy and aspect ratio. */
export function insertIntoFrame(list: FreeElement[], frameId: string, added: FreeElement[], point?: { x: number; y: number }): FreeElement[] {
  const frame = list.find((el) => el.id === frameId && el.type === 'container')
  if (!frame || !added.length || inheritedElementFlag(list, frameId, '_locked')) return list
  const padding = Math.min(frame.w / 4, frame.h / 4, Math.max(0, Number(frame.props._layout?.padding) || 0))
  const roots = added.filter((el) => !added.some((parent) => parent.id === el.parentId))
  const x = Math.min(...added.map((el) => el.x)), y = Math.min(...added.map((el) => el.y)), w = Math.max(...added.map((el) => el.x + el.w)) - x, h = Math.max(...added.map((el) => el.y + el.h)) - y
  const ratio = Math.min(1, (frame.w - padding * 2) / Math.max(1, w), (frame.h - padding * 2) / Math.max(1, h))
  const right = frame.x + frame.w - padding - w * ratio, bottom = frame.y + frame.h - padding - h * ratio
  const siblings = list.filter((el) => el.parentId === frameId)
  const left = Math.max(frame.x + padding, Math.min(right, point ? point.x - w * ratio / 2 : frame.x + padding))
  const top = Math.max(frame.y + padding, Math.min(bottom, point ? point.y - h * ratio / 2 : siblings.length ? Math.max(...siblings.map((el) => el.y + el.h)) + (Number(frame.props._layout?.gap) || 16) : frame.y + padding))
  return [...list, ...added.map((el) => ({ ...el, parentId: roots.includes(el) ? frameId : el.parentId, x: left + (el.x - x) * ratio, y: top + (el.y - y) * ratio, w: el.w * ratio, h: el.h * ratio, props: typeof el.props.size === 'number' ? { ...el.props, size: el.props.size * ratio } : el.props }))]
}

export function moveIntoFrame(list: FreeElement[], id: string, frameId?: string): FreeElement[] {
  const el = list.find((item) => item.id === id), family = elementFamily(list, id)
  if (!el || family.some((item) => inheritedElementFlag(list, item.id, '_locked')) || (frameId && family.some((item) => item.id === frameId))) return list
  if (!frameId) return list.map((item) => item.id === id ? { ...item, parentId: undefined } : item)
  if (el.parentId === frameId) return list
  const frame = list.find((item) => item.id === frameId && item.type === 'container')
  if (!frame || inheritedElementFlag(list, frameId, '_locked')) return list
  const ids = new Set(family.map((item) => item.id))
  const moved = transformFamily(family, id, { ...el })
  return insertIntoFrame(list.filter((item) => !ids.has(item.id)), frameId, moved, { x: el.x + el.w / 2, y: el.y + el.h / 2 })
}

/** Resize just the adjacent tracks, keeping the overall grid width unchanged. */
export function resizeFrameColumns(list: FreeElement[], id: string, index: number, delta: number): FreeElement[] {
  const frame = list.find((el) => el.id === id), flow = frame?.props._layout
  if (!frame || flow?.direction !== 'grid' || elementFamily(list, id).some((el) => inheritedElementFlag(list, el.id, '_locked'))) return list
  const columns: number[] = (flow.columns ?? [1, 1]).map((n: number) => Math.max(.1, Number(n) || 1))
  if (index < 0 || index >= columns.length - 1) return list
  const sum = columns.reduce((a, b) => a + b, 0), available = Math.max(1, frame.w - 2 * (flow.padding || 0) - (columns.length - 1) * (flow.gap || 0))
  const pair = columns[index] + columns[index + 1], min = Math.min(pair / 3, sum * 48 / available)
  columns[index] = Math.max(min, Math.min(pair - min, columns[index] + delta / available * sum))
  columns[index + 1] = pair - columns[index]
  return list.map((el) => el.id === id ? { ...el, props: { ...el.props, _layout: { ...flow, columns } } } : el)
}

/** Split into nested cells, retaining all existing content inside the first cell. */
export function splitFrame(list: FreeElement[], id: string, direction: 'row' | 'column'): FreeElement[] {
  const frame = list.find((el) => el.id === id && el.type === 'container')
  if (!frame || elementFamily(list, id).some((el) => inheritedElementFlag(list, el.id, '_locked'))) return list
  const gap = 16, vertical = direction === 'column', first = newId(), second = newId()
  const cell = (key: string, index: number): FreeElement => ({ id: key, type: 'container', parentId: id, x: frame.x + (vertical ? 0 : index * (frame.w + gap) / 2), y: frame.y + (vertical ? index * (frame.h + gap) / 2 : 0), w: vertical ? frame.w : (frame.w - gap) / 2, h: vertical ? (frame.h - gap) / 2 : frame.h, props: { _frame: true, _name: `Ô ${index + 1}`, bg: 'transparent', _layout: { direction: 'free', padding: 16 } } })
  const family = new Set(elementFamily(list, id).map((el) => el.id)), ratio = vertical ? (frame.h - gap) / (2 * frame.h) : (frame.w - gap) / (2 * frame.w)
  return [...list.map((el) => el.id === id ? { ...el, props: { ...el.props, _layout: { direction, gap, padding: 0, align: 'stretch' } } } : family.has(el.id) ? { ...el, parentId: el.parentId === id ? first : el.parentId, x: frame.x + (el.x - frame.x) * ratio, y: frame.y + (el.y - frame.y) * ratio, w: el.w * ratio, h: el.h * ratio, props: typeof el.props.size === 'number' ? { ...el.props, size: el.props.size * ratio } : el.props } : el), cell(first, 0), cell(second, 1)]
}

/** Merge child cells without deleting any of their content or changing its coordinates. */
export function mergeFrameCells(list: FreeElement[], id: string): FreeElement[] {
  const frame = list.find((el) => el.id === id && el.type === 'container'), cells = list.filter((el) => el.parentId === id)
  if (!frame || !cells.length || cells.some((el) => el.type !== 'container') || elementFamily(list, id).some((el) => inheritedElementFlag(list, el.id, '_locked'))) return list
  const ids = new Set(cells.map((el) => el.id))
  return list.filter((el) => !ids.has(el.id)).map((el) => el.id === id ? { ...el, props: { ...el.props, _layout: { ...el.props._layout, direction: 'free' } } } : el.parentId && ids.has(el.parentId) ? { ...el, parentId: id } : el)
}

export function reorderFrameChild(list: FreeElement[], id: string, index: number): FreeElement[] {
  const child = list.find((el) => el.id === id), parent = list.find((el) => el.id === child?.parentId)
  if (!child || !parent || !['row', 'column', 'grid'].includes(parent.props._layout?.direction) || inheritedElementFlag(list, id, '_locked') || inheritedElementFlag(list, parent.id, '_locked')) return list
  const siblings = list.filter((el) => el.parentId === parent.id && el.id !== id)
  if (siblings.some((el) => elementFamily(list, el.id).some((child) => inheritedElementFlag(list, child.id, '_locked')))) return list
  siblings.splice(Math.max(0, Math.min(siblings.length, index)), 0, child)
  let cursor = 0
  return list.map((el) => el.parentId === parent.id ? siblings[cursor++] : el)
}
