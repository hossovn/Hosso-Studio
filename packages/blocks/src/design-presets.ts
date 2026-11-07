import type { FreeElement } from './FreeCanvas'
import { elementFamily, inheritedElementFlag } from './free-geometry.ts'

export const LINKED_STYLE_KEYS = ['color', 'bg', 'borderColor', 'borderW', 'radius', 'size', 'font', 'weight', 'lh', 'ls', 'align', 'opacity', 'bshadow', 'tshadow', 'spacing', 'padX', 'padY', 'bg2', 'angle', 'upper', 'italic', 'underline'] as const
export type LinkedStyle = { id: string; name: string; props: Record<string, any> }
export type FrameVariant = { id: string; name: string; elements: FreeElement[] }
type Page = { root?: any; content: { type: string; props: Record<string, any> }[] }
export const styleValues = (props: Record<string, any>) => Object.fromEntries(LINKED_STYLE_KEYS.filter((key) => props[key] !== undefined).map((key) => [key, props[key]]))
export function linkStyle(el: FreeElement, style: LinkedStyle): FreeElement {
  const props = { ...el.props }
  for (const key of props._styleKeys ?? []) if ((LINKED_STYLE_KEYS as readonly string[]).includes(key)) delete props[key]
  return { ...el, props: { ...props, ...styleValues(style.props), _styleLink: style.id, _styleKeys: Object.keys(styleValues(style.props)) } }
}
function mapDesignProps(props: Record<string, any>, apply: (el: FreeElement) => FreeElement): Record<string, any> {
  const visit = (els: FreeElement[]) => els.map((el) => { const next = apply(el); return { ...next, props: mapDesignProps(next.props, apply) } })
  return { ...props,
    ...(Array.isArray(props._template) ? { _template: visit(props._template) } : {}),
    ...(Array.isArray(props._variants) ? { _variants: props._variants.map((variant: FrameVariant) => ({ ...variant, elements: visit(variant.elements) })) } : {}),
    ...(props.widget?.props ? { widget: { ...props.widget, props: mapDesignProps(props.widget.props, apply) } } : {}),
    ...(props._els || props.elements ? { _els: visit(props._els ?? props.elements) } : {}),
    ...(Array.isArray(props._float) ? { _float: visit(props._float) } : {}),
  }
}
/** Values are materialized in the document so exports and public renderers need no editor runtime. */
export function updateLinkedStyle<T extends Page>(page: T, style: LinkedStyle): T {
  const styles: LinkedStyle[] = page.root?.props?._styles ?? []
  const apply = (el: FreeElement) => el.props._styleLink === style.id ? linkStyle(el, style) : el
  return { ...page, root: { ...page.root, props: { ...mapDesignProps(page.root?.props ?? {}, apply), _styles: [...styles.filter((item) => item.id !== style.id), { ...style, props: styleValues(style.props) }] } }, content: page.content.map((block) => ({ ...block, props: mapDesignProps(block.props, apply) })) }
}
export function deleteLinkedStyle<T extends Page>(page: T, id: string): T {
  const apply = (el: FreeElement) => el.props._styleLink === id ? { ...el, props: { ...el.props, _styleLink: '', _styleKeys: [] } } : el
  return { ...page, root: { ...page.root, props: { ...mapDesignProps(page.root?.props ?? {}, apply), _styles: (page.root?.props?._styles ?? []).filter((style: LinkedStyle) => style.id !== id) } }, content: page.content.map((block) => ({ ...block, props: mapDesignProps(block.props, apply) })) }
}
export function captureFrameVariant(list: FreeElement[], root: FreeElement, id: string, name: string): FrameVariant {
  return { id, name, elements: elementFamily(list, root.id).map((el) => {
    const { _variants, _variant, _isPopover, ...rootProps } = el.props
    const responsive = el.responsive && Object.fromEntries(Object.entries(el.responsive).map(([device, patch]) => [device, { ...patch, ...(patch?.x != null ? { x: patch.x - (root.responsive?.[device as keyof typeof root.responsive]?.x ?? root.x) } : {}), ...(patch?.y != null ? { y: patch.y - (root.responsive?.[device as keyof typeof root.responsive]?.y ?? root.y) } : {}) }]))
    return structuredClone({ ...el, x: el.x - root.x, y: el.y - root.y, parentId: el.id === root.id ? undefined : el.parentId, props: el.id === root.id ? rootProps : el.props, responsive })
  }) }
}
export function applyFrameVariant(list: FreeElement[], rootId: string, variant: FrameVariant, newId: () => string): FreeElement[] {
  const root = list.find((el) => el.id === rootId), source = variant.elements.find((el) => !el.parentId)
  if (!root || !source || elementFamily(list, rootId).some((el) => inheritedElementFlag(list, el.id, '_locked'))) return list
  const old = new Set(elementFamily(list, rootId).map((el) => el.id)), ids = new Map(variant.elements.map((el) => [el.id, el === source ? rootId : newId()]))
  const next = variant.elements.map((el) => ({ ...structuredClone(el), id: ids.get(el.id)!, parentId: el === source ? root.parentId : ids.get(el.parentId!), x: el.x - source.x + root.x, y: el.y - source.y + root.y, responsive: el.responsive && Object.fromEntries(Object.entries(el.responsive).map(([device, patch]) => [device, { ...patch, ...(patch?.x != null ? { x: patch.x + (root.responsive?.[device as keyof typeof root.responsive]?.x ?? root.x) } : {}), ...(patch?.y != null ? { y: patch.y + (root.responsive?.[device as keyof typeof root.responsive]?.y ?? root.y) } : {}) }])), props: { ...el.props, ...(el === source ? { _variants: root.props._variants, _variant: variant.id, ...(root.props._isPopover ? { _isPopover: true } : {}), ...(root.props._repeatTarget ? { _repeatTarget: root.props._repeatTarget } : {}) } : {}) } }))
  const result: FreeElement[] = []
  for (const el of list) { if (el.id === rootId) result.push(...next); else if (!old.has(el.id)) result.push(el) }
  return result
}
export function ensureDefaultFrameVariant(list: FreeElement[], rootId: string): FreeElement[] {
  const root = list.find((el) => el.id === rootId && el.type === 'container')
  if (!root) return list
  const existing: FrameVariant[] = Array.isArray(root.props._variants) ? root.props._variants : []
  if (existing.length > 0) {
    return root.props._variant ? list : list.map((el) => el.id === rootId ? { ...el, props: { ...el.props, _variant: existing[0].id } } : el)
  }
  const initial = captureFrameVariant(list, root, 'default', 'Mặc định')
  return list.map((el) => el.id === rootId ? { ...el, props: { ...el.props, _variants: [initial], _variant: 'default' } } : el)
}
export function materializeFrameVariant(list: FreeElement[], rootId: string, variantId: string, fallbackId?: () => string): FreeElement[] {
  const root = list.find((el) => el.id === rootId)
  const variants: FrameVariant[] = Array.isArray(root?.props._variants) ? root.props._variants : []
  const variant = variants.find((item) => item.id === variantId)
  const source = variant?.elements.find((el) => !el.parentId)
  if (!root || !variant || !source) return list
  const old = new Set(elementFamily(list, rootId).map((el) => el.id))
  const outside = new Set(list.filter((el) => !old.has(el.id)).map((el) => el.id))
  const used = new Set<string>(outside)
  const ids = new Map<string, string>()
  for (const el of variant.elements) {
    if (el === source) { ids.set(el.id, rootId); used.add(rootId); continue }
    let nextId = !used.has(el.id) ? el.id : (fallbackId ? fallbackId() : `${rootId}-${el.id}`)
    while (used.has(nextId)) nextId = fallbackId ? fallbackId() : `${nextId}_`
    ids.set(el.id, nextId)
    used.add(nextId)
  }
  const next = variant.elements.map((el) => ({
    ...structuredClone(el),
    id: ids.get(el.id)!,
    parentId: el === source ? root.parentId : ids.get(el.parentId!),
    x: el.x - source.x + root.x,
    y: el.y - source.y + root.y,
    responsive: el.responsive && Object.fromEntries(Object.entries(el.responsive).map(([device, patch]) => [device, {
      ...patch,
      ...(patch?.x != null ? { x: patch.x + (root.responsive?.[device as keyof typeof root.responsive]?.x ?? root.x) } : {}),
      ...(patch?.y != null ? { y: patch.y + (root.responsive?.[device as keyof typeof root.responsive]?.y ?? root.y) } : {}),
    }])),
    props: {
      ...el.props,
      ...(el === source ? {
        _variants: root.props._variants,
        _variant: variant.id,
        ...(root.props._isPopover ? { _isPopover: true } : {}),
        ...(root.props._repeatTarget ? { _repeatTarget: root.props._repeatTarget } : {}),
      } : {}),
    },
  }))
  const result: FreeElement[] = []
  for (const el of list) {
    if (el.id === rootId) result.push(...next)
    else if (!old.has(el.id)) result.push(el)
  }
  return result
}
export function switchFrameVariant(list: FreeElement[], rootId: string, variantId: string, newId?: () => string): FreeElement[] {
  const root = list.find((el) => el.id === rootId && el.type === 'container')
  if (!root || elementFamily(list, rootId).some((el) => inheritedElementFlag(list, el.id, '_locked'))) return list
  const ready = ensureDefaultFrameVariant(list, rootId)
  const curRoot = ready.find((el) => el.id === rootId)!
  const variants: FrameVariant[] = Array.isArray(curRoot.props._variants) ? curRoot.props._variants : []
  if (!variants.some((item) => item.id === variantId)) return list
  const activeId = curRoot.props._variant || variants[0]?.id
  const savedVariants = activeId
    ? variants.map((item) => item.id === activeId ? captureFrameVariant(ready, curRoot, item.id, item.name) : item)
    : variants
  const withSaved = ready.map((el) => el.id === rootId ? { ...el, props: { ...el.props, _variants: savedVariants } } : el)
  return materializeFrameVariant(withSaved, rootId, variantId, newId)
}
