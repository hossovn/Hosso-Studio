import { PAGE, blockId, elsOf, floatOf, type PageData } from './canvas-model.ts'
import { inheritedElementFlag } from '../../../../../../../packages/blocks/src/free-geometry.ts'
export type ReplaceKind = 'text' | 'link' | 'phone' | 'font' | 'color'
export type ReplaceMatch = { owner: string; element: string; path: (string | number)[]; before: string; after: string; label: string }
const keys: Record<ReplaceKind, Set<string>> = { text: new Set(['text', 'title', 'heading', 'label', 'body', 'description', 'alt', 'placeholder']), link: new Set(['href', 'url', 'ctaHref', 'src', 'bgImage']), phone: new Set(['href', 'phone', 'tel', 'text']), font: new Set(['font', 'fontFamily', '_font']), color: new Set(['color', 'bg', 'grad2', 'borderColor', '_bgHex', '_bg2Hex', '_bdHex', 'bgOverlayColor']) }
const replace = (value: string, find: string, replacement: string, exact: boolean, sensitive: boolean) => {
  const pattern = new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), sensitive ? 'g' : 'gi')
  if (exact && (sensitive ? value !== find : value.toLowerCase() !== find.toLowerCase())) return value
  return value.replace(pattern, () => replacement)
}
export function findPageReplacements(data: PageData, kind: ReplaceKind, find: string, replacement: string, sensitive = false): ReplaceMatch[] {
  if (!find || find.length > 1000) return []
  const matches: ReplaceMatch[] = []
  const scan = (value: any, path: (string | number)[], owner: string, element: string, label: string, depth = 0) => {
    if (!value || typeof value !== 'object' || depth > 8) return
    for (const [key, item] of Object.entries(value)) {
      if (['id', 'parentId', 'overrides', '_review', '_states'].includes(key)) continue
      const nextPath = [...path, Array.isArray(value) ? Number(key) : key]
      if (typeof item === 'string' && keys[kind].has(key)) {
        const after = replace(item, find, replacement, ['color', 'font'].includes(kind), sensitive)
        if (after !== item) matches.push({ owner, element, path: nextPath, before: item, after, label })
      } else if (typeof item === 'object') scan(item, nextPath, owner, element, label, depth + 1)
    }
  }
  for (const block of data.content) {
    const owner = blockId(block), list = elsOf(block)
    const { _els, elements, ...props } = block.props
    scan(props, ['props'], owner, '', String(block.props._name || block.type))
    for (const el of list) if (!inheritedElementFlag(list, el.id, '_locked')) scan(el, [], owner, el.id, String(el.props._name || el.props.text || el.type).slice(0, 80))
  }
  for (const el of floatOf(data)) if (!inheritedElementFlag(floatOf(data), el.id, '_locked')) scan(el, [], PAGE, el.id, String(el.props._name || el.props.text || el.type).slice(0, 80))
  return matches.slice(0, 2000)
}
export function applyPageReplacements(data: PageData, matches: ReplaceMatch[]): PageData {
  const next = structuredClone(data)
  for (const match of matches) {
    const block = next.content.find((b) => blockId(b) === match.owner), list = match.owner === PAGE ? floatOf(next) : block ? elsOf(block) : []
    const el = list.find((item) => item.id === match.element)
    if (el && inheritedElementFlag(list, el.id, '_locked')) continue
    let target: any = match.element ? el : block
    for (const key of match.path.slice(0, -1)) target = target?.[key]
    const key = match.path[match.path.length - 1]
    if (target?.[key] !== match.before) continue
    target[key] = match.after
    // Plain-copy replacements must also replace the rendered rich copy.
    if (key === 'text' && target.richText) target.richText = ''
  }
  return next
}
