export type LayoutDevice = 'desktop' | 'tablet' | 'mobile' | `bp-${number}`
export type Breakpoint = { id: `bp-${number}`; width: number }
export function normalizeBreakpoints(input: unknown): Breakpoint[] {
  if (!Array.isArray(input)) return []
  return [...new Set(input.map((item) => Number(item?.width)).filter((w) => Number.isInteger(w) && w >= 320 && w <= 1920 && ![600, 1024].includes(w)))].sort((a, b) => a - b).map((width) => ({ id: `bp-${width}`, width }))
}
export const baseDevice = (width: number) => width <= 600 ? 'mobile' : width <= 1024 ? 'tablet' : 'desktop'
export const layoutWidth = (device: LayoutDevice): number => device.startsWith('bp-') ? Number(device.slice(3)) || 1200 : ({ desktop: 1200, tablet: 768, mobile: 390 }[device as 'desktop' | 'tablet' | 'mobile'])
export function breakpointRanges(input?: unknown) {
  const ranges: { id: LayoutDevice; max: number }[] = [{ id: 'mobile', max: 600 }, { id: 'tablet', max: 1024 }, ...normalizeBreakpoints(input).map((b) => ({ id: b.id, max: b.width }))]
  return ranges.sort((a, b) => a.max - b.max)
}
export function layoutAtWidth(width: number, input?: unknown): LayoutDevice {
  return breakpointRanges(input).find((item) => width <= item.max)?.id ?? 'desktop'
}
export function layoutMedia(device: LayoutDevice, input?: unknown): string {
  const ranges = breakpointRanges(input), index = ranges.findIndex((item) => item.id === device)
  if (device === 'desktop') return `(min-width:${ranges[ranges.length - 1].max + 1}px)`
  if (index < 0) return '(max-width:0px)'
  return `${index ? `(min-width:${ranges[index - 1].max + 1}px) and ` : ''}(max-width:${ranges[index].max}px)`
}
export const layoutVariants = (input?: unknown): LayoutDevice[] => ['desktop', ...breakpointRanges(input).map((b) => b.id)]
/** Scoped rules keep independent pages/templates from affecting each other's variants. */
export function variantCss(scope: string, input?: unknown): string {
  const selector = `[data-hs-variants="${encodeURIComponent(scope)}"]`
  return layoutVariants(input).map((key) => `@media${layoutMedia(key, input)}{${selector}>[data-hs-variant]{display:none!important}${selector}>[data-hs-variant="${key}"]{display:block!important}}`).join('')
}
export function syncBreakpoints<T extends { root?: any; content: { type: string; props: Record<string, any> }[] }>(data: T): T {
  const points = normalizeBreakpoints(data.root?.props?._breakpoints)
  return { ...data, root: { ...data.root, props: { ...data.root?.props, _breakpoints: points } }, content: data.content.map((block) => ({ ...block, props: { ...block.props, _breakpoints: points } })) }
}
