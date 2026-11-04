type Page = { root?: any; content: { type: string; props: Record<string, any> }[]; [key: string]: any }
export const CONTENT_KEYS = new Set(['text', 'richText', 'src', 'alt', 'href', 'title', 'heading', 'body', 'description', 'excerpt', 'label', 'caption', 'poster'])
const canonical = (value: any): any => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().filter((key) => value[key] !== undefined).map((key) => [key, canonical(value[key])])) : value
const same = (a: unknown, b: unknown) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b))
const contentProps = (base: Record<string, any>, next: Record<string, any>) => {
  const props = { ...base }
  for (const key of CONTENT_KEYS) if (key in next && (typeof next[key] === 'string' || key === 'richText' && typeof next[key] === 'object')) props[key] = next[key]
  return props
}
/** Preserve every identifier, geometry, responsive override, template and design setting. */
export function contentOnlyPage<T extends Page>(base: T, next: T): T {
  const elements = (a: any[], b: any[]) => a.map((el) => { const edited = b.find((item) => item.id === el.id); return edited ? { ...el, props: contentProps(el.props, edited.props ?? {}) } : el })
  return { ...base, root: base.root && { ...base.root, props: { ...base.root.props, ...(base.root.props?._float ? { _float: elements(base.root.props._float, next.root?.props?._float ?? []) } : {}) } }, content: base.content.map((block) => {
    const edited = next.content.find((item) => item.props.id === block.props.id && item.type === block.type)
    if (!edited) return block
    return { ...block, props: { ...contentProps(block.props, edited.props), ...(block.props._els || block.props.elements ? { _els: elements(block.props._els ?? block.props.elements, edited.props._els ?? edited.props.elements ?? []) } : {}) } }
  }) }
}
export function isContentOnlyChange(base: Page, next: Page): boolean { return same(contentOnlyPage(base, next), next) }
