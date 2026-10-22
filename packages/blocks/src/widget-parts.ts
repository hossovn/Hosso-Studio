export type WidgetPartStyle = Record<string, string | number>
export type WidgetParts = Record<string, WidgetPartStyle>
export type WidgetPartDevice = 'desktop' | 'tablet' | 'mobile'
export const widgetPartKey = (device: WidgetPartDevice) => device === 'mobile' ? '_partsMobile' : device === 'tablet' ? '_partsTablet' : '_parts'

export function widgetPartsForDevice(props: Record<string, unknown>, device: WidgetPartDevice): WidgetParts {
  const result: WidgetParts = {}
  const keys = device === 'mobile' ? ['_parts', '_partsTablet', '_partsMobile'] : device === 'tablet' ? ['_parts', '_partsTablet'] : ['_parts']
  for (const key of keys) {
    const parts = props[key]
    if (!parts || typeof parts !== 'object' || Array.isArray(parts)) continue
    for (const [path, style] of Object.entries(parts)) {
      if (validPartPath(path) && style && typeof style === 'object' && !Array.isArray(style)) result[path] = { ...result[path], ...style }
    }
  }
  return result
}

export function widgetPartResponsiveCss(id: string, props: Record<string, unknown>): string {
  return widgetPartCss(id, props._parts)
    + (props._partsTablet ? '@media(max-width:1024px){' + widgetPartCss(id, widgetPartsForDevice(props, 'tablet')) + '}' : '')
    + (props._partsMobile ? '@media(max-width:600px){' + widgetPartCss(id, widgetPartsForDevice(props, 'mobile')) + '}' : '')
}

const PATH = /^[a-z][a-z0-9-]*:nth-of-type\([1-9]\d*\)( > [a-z][a-z0-9-]*:nth-of-type\([1-9]\d*\))*$/
const PX = new Set(['width', 'height', 'minHeight', 'maxWidth', 'gap', 'padding', 'marginTop', 'marginBottom', 'borderRadius', 'borderWidth', 'fontSize'])
const ENUMS: Record<string, string[]> = {
  display: ['block', 'inline-block', 'flex', 'grid'], flexDirection: ['row', 'column'], flexWrap: ['wrap', 'nowrap'],
  alignItems: ['start', 'center', 'end', 'stretch'], justifyContent: ['start', 'center', 'end', 'space-between', 'space-around'],
  textAlign: ['left', 'center', 'right'], borderStyle: ['solid', 'dashed', 'none'],
}

export const validPartPath = (path: unknown): path is string => typeof path === 'string' && path.length <= 2000 && PATH.test(path)
export const widgetPartScope = (id: string) => 'wp-' + Array.from(id).map((c) => c.codePointAt(0)!.toString(16)).join('-')
export const widgetPartSelector = (id: string, path: string) => validPartPath(path) ? '[data-hs-parts="' + widgetPartScope(id) + '"] > ' + path : ''

export function widgetPartCss(id: string, parts: unknown): string {
  if (!parts || typeof parts !== 'object' || Array.isArray(parts)) return ''
  return Object.entries(parts).map(([path, style]) => {
    if (!validPartPath(path) || !style || typeof style !== 'object' || Array.isArray(style)) return ''
    const rules: string[] = []
    for (const [key, value] of Object.entries(style)) {
      const numeric = typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= 10000
      let css = ''
      if (PX.has(key) && numeric && (value >= 0 || key.startsWith('margin'))) css = value + 'px'
      if (['color', 'backgroundColor', 'borderColor'].includes(key) && typeof value === 'string' && /^#[\da-f]{6}$/i.test(value)) css = value
      if (ENUMS[key]?.includes(value as string)) css = String(value)
      if (key === 'fontWeight' && numeric && value >= 100 && value <= 900) css = String(value)
      if (key === 'order' && numeric && Number.isInteger(value)) css = String(value)
      if (key === 'columns' && numeric && Number.isInteger(value) && value >= 1 && value <= 12) {
        rules.push('grid-template-columns:repeat(' + value + ',minmax(0,1fr))!important')
      }
      if (css) rules.push(key.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase()) + ':' + css + '!important')
    }
    const hasX = typeof style.x === 'number' && Number.isFinite(style.x) && Math.abs(style.x) <= 10000
    const hasY = typeof style.y === 'number' && Number.isFinite(style.y) && Math.abs(style.y) <= 10000
    const x = hasX ? style.x : 0, y = hasY ? style.y : 0
    if (hasX || hasY) rules.push('translate:' + x + 'px ' + y + 'px!important')
    return rules.length ? widgetPartSelector(id, path) + '{' + rules.join(';') + '}' : ''
  }).join('\n')
}

export function patchWidgetPart(parts: unknown, path: string, patch: WidgetPartStyle): WidgetParts {
  const next: WidgetParts = parts && typeof parts === 'object' && !Array.isArray(parts) ? { ...parts } : {}
  if (!validPartPath(path)) return next
  const style = { ...next[path], ...patch }
  for (const key of Object.keys(style)) if (style[key] === '') delete style[key]
  if (Object.keys(style).length) next[path] = style
  else delete next[path]
  return next
}

// shortcut: paths follow DOM positions, reselect parts after changing a theme or reordering dynamic rows.
export function widgetPartPath(root: Element, target: Element): string {
  const path: string[] = []
  let node: Element | null = target
  while (node && node !== root) {
    if (!node.parentElement || ['style', 'script', 'path'].includes(node.localName)) return ''
    const tag = node.localName
    const index = Array.from(node.parentElement.children).filter((sibling) => sibling.localName === tag).indexOf(node) + 1
    path.unshift(tag + ':nth-of-type(' + index + ')')
    node = node.parentElement
  }
  const result = path.join(' > ')
  return node === root && validPartPath(result) ? result : ''
}
