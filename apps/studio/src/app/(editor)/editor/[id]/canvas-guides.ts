export type CanvasGuide = { id: string; axis: 'x' | 'y'; value: number }
export type DrawingOptions = { rulers: boolean; grid: boolean; snap: boolean; gridSize: number; distances: boolean }
export const DEFAULT_DRAWING: DrawingOptions = { rulers: false, grid: false, snap: true, gridSize: 20, distances: true }
export function normalizeGuides(value: unknown): CanvasGuide[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  return value.filter((item): item is CanvasGuide => Boolean(item && typeof item.id === 'string' && !seen.has(item.id) && seen.add(item.id) && ['x', 'y'].includes(item.axis) && Number.isFinite(item.value) && item.value >= 0)).slice(0, 100)
}
export function nearestDistances(current: { id: string; x: number; y: number; w: number; h: number }, list: typeof current[]) {
  const result: { axis: 'x' | 'y'; from: number; to: number; cross: number }[] = []
  for (const axis of ['x', 'y'] as const) {
    const size = axis === 'x' ? 'w' : 'h', cross = axis === 'x' ? 'y' : 'x', crossSize = axis === 'x' ? 'h' : 'w'
    for (const side of [-1, 1]) {
      const candidates = list.filter((el) => el.id !== current.id && el[cross] < current[cross] + current[crossSize] && el[cross] + el[crossSize] > current[cross])
        .map((el) => ({ from: side < 0 ? el[axis] + el[size] : current[axis] + current[size], to: side < 0 ? current[axis] : el[axis] }))
        .filter((gap) => gap.to >= gap.from).sort((a, b) => (a.to - a.from) - (b.to - b.from))
      if (candidates[0]) result.push({ axis, ...candidates[0], cross: current[cross] + current[crossSize] / 2 })
    }
  }
  return result
}
