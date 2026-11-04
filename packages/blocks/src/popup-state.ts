export function popupTrigger(value: unknown): 'delay' | 'scroll' | 'click' {
  return value === 'scroll' || value === 'click' ? value : 'delay'
}
export function scrollPercent(scrollTop: number, scrollHeight: number, viewportHeight: number) {
  const extent = scrollHeight - viewportHeight
  return extent <= 0 ? 100 : Math.min(100, Math.max(0, scrollTop / extent * 100))
}
export const popupNumber = (value: unknown, fallback: number, max: number) => Number.isFinite(Number(value)) ? Math.min(max, Math.max(0, Number(value))) : fallback
