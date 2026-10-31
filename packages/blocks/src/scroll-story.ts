export type StoryRect = { top: number; bottom: number }

/** The step crossing the viewport midpoint wins, including after a fast jump in either direction. */
export function activeStoryStep(rects: StoryRect[], midpoint: number): number {
  const crossing = rects.findIndex(({ top, bottom }) => top <= midpoint && midpoint < bottom)
  if (crossing !== -1) return crossing
  let nearest = 0
  let distance = Infinity
  rects.forEach(({ top, bottom }, index) => {
    const gap = midpoint < top ? top - midpoint : midpoint - bottom
    if (gap < distance) { nearest = index; distance = gap }
  })
  return nearest
}

export const storyViewportMidpoint = (root: StoryRect | null, viewportHeight: number): number =>
  root ? (root.top + root.bottom) / 2 : viewportHeight / 2

export const storyProgress = (rect: StoryRect, midpoint: number): number =>
  Math.max(0, Math.min(1, (midpoint - rect.top) / Math.max(1, rect.bottom - rect.top)))

export const storyCanPin = (width: number, height: number, reducedMotion: boolean, editing: boolean, count: number): boolean =>
  width > 768 && height > 560 && !reducedMotion && !editing && count > 1
