export function visibleCanvasRange(doc: Document) {
  const view = doc.defaultView
  if (!view?.innerHeight) return null
  const frame = view.frameElement as HTMLElement | null
  const viewport = frame?.closest('[data-canvas-viewport]')
  if (!frame || !viewport) return { top: 0, bottom: view.innerHeight }
  const rect = frame.getBoundingClientRect()
  const clip = viewport.getBoundingClientRect()
  const scale = rect.height / frame.clientHeight
  if (!(scale > 0)) return null
  const top = Math.max(0, clip.top, rect.top)
  const bottom = Math.min(viewport.ownerDocument.defaultView?.innerHeight ?? clip.bottom, clip.bottom, rect.bottom)
  return bottom > top ? { top: (top - rect.top) / scale, bottom: (bottom - rect.top) / scale } : null
}

export function visibleCanvasBlock(doc: Document, ids: string[]) {
  const range = visibleCanvasRange(doc)
  if (!range) return null
  const allowed = new Set(ids)
  const mid = (range.top + range.bottom) / 2
  let pick: { id: string; node: HTMLElement; rect: DOMRect; top: number; bottom: number; dist: number } | null = null
  for (const node of doc.querySelectorAll<HTMLElement>('[data-block]')) {
    const id = node.getAttribute('data-block') ?? ''
    if (!allowed.has(id) || !node.clientWidth) continue
    const rect = node.getBoundingClientRect()
    const top = Math.max(range.top, rect.top), bottom = Math.min(range.bottom, rect.bottom)
    if (bottom <= top) continue
    const dist = mid < top ? top - mid : mid > bottom ? mid - bottom : 0
    const candidate = { id, node, rect, top, bottom, dist }
    if (mid >= top && mid < bottom) return candidate
    if (!pick || dist < pick.dist) pick = candidate
  }
  return pick
}
