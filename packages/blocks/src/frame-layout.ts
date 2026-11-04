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
