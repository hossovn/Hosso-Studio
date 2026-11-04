import { sectionAnchor } from './link-actions.ts'
import { normalizeBreakpoints } from './responsive-breakpoints.ts'
import { applyFrameVariant, type FrameVariant } from './design-presets.ts'
type Block = { type: string; props: Record<string, any> }
export type ReusableOverrides = Record<string, Record<string, string>>
const CONTENT = new Set(['text', 'richText', 'src', 'alt', 'color', 'bg', 'borderColor', '_bgHex', '_bg2Hex', '_bdHex', 'bgImage'])
export function reusableTargets(blocks: Block[]) {
  return blocks.filter((b) => b.type !== 'Reusable').flatMap((block) => [{ key: String(block.props.id), type: block.type, props: block.props }, ...(block.props._els ?? block.props.elements ?? []).map((el: any) => ({ key: `${block.props.id}::${el.id}`, type: el.type, props: el.props }))])
}
export function cleanReusablePatch(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(Object.entries(value).filter(([key, item]) => CONTENT.has(key) && typeof item === 'string' && item.length <= 100000))
}
/** Stable source IDs keep content variants attached when source sections are reordered. */
export function expandReusableInstance(blocks: Block[], instance: Block): Block[] {
  const source = blocks.filter((block) => block.type !== 'Reusable'), prefix = String(instance.props.id)
  const ids = new Map(source.map((block) => [String(block.props.id), `${prefix}__${encodeURIComponent(String(block.props.id))}`]))
  const triggers = new Map(source.filter((b) => b.type === 'Popup').map((b) => [String(b.props.triggerKey || b.props.id), `${prefix}__popup__${encodeURIComponent(String(b.props.triggerKey || b.props.id))}`]))
  const link = (href: unknown) => {
    if (typeof href !== 'string') return href
    for (const [id, next] of ids) if (href === '#' + sectionAnchor(id)) return '#' + sectionAnchor(next)
    for (const [id, next] of triggers) if (href === '#popup:' + id) return '#popup:' + next
    return href
  }
  const override = (props: Record<string, any>, key: string) => ({ ...props, ...cleanReusablePatch(instance.props.overrides?.[key]) })
  return source.map((block, index) => {
    const id = String(block.props.id), props = override(block.props, id)
    let elements = props._els ?? props.elements ?? []
    for (const root of [...elements]) {
      const selected = instance.props.variants?.[`${id}::${root.id}`]
      const variant = (root.props._variants as FrameVariant[] | undefined)?.find((item) => item.id === selected)
      let sequence = 0
      if (variant) elements = applyFrameVariant(elements, root.id, variant, () => `${root.id}--${variant.id}--${sequence++}`)
    }
    const elementIds = new Map<string, string>(elements.map((el: any) => [el.id, `${ids.get(id)}__${encodeURIComponent(el.id)}`]))
    const _els = elements.map((el: any) => {
      const patch = cleanReusablePatch(instance.props.overrides?.[`${id}::${el.id}`])
      return { ...el, id: elementIds.get(el.id), parentId: elementIds.get(el.parentId), props: { ...el.props, ...patch, href: link(el.props.href) }, responsive: el.responsive && Object.fromEntries(Object.entries(el.responsive).map(([key, value]) => [key, { ...(value as any), props: { ...(value as any)?.props, ...patch } }])) }
    })
    return { ...block, props: { ...props, id: ids.get(id), _els, elements: undefined, href: link(props.href), triggerKey: block.type === 'Popup' ? triggers.get(String(block.props.triggerKey || id)) : props.triggerKey, _reusableHide: instance.props._hide, _reusableAnchor: index === 0 && instance.props._anchor ? prefix : undefined, _breakpoints: normalizeBreakpoints([...(props._breakpoints ?? []), ...(instance.props._breakpoints ?? [])]) } }
  })
}
