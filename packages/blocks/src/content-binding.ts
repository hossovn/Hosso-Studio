import { bindingValue, type RepeatItem } from './repeater-data'

const TARGETS = new Set(['text', 'heading', 'title', 'body', 'description', 'src', 'image', 'href', 'alt', 'value', 'url', 'poster'])
export function bindContentProps(props: Record<string, any>, item: RepeatItem): Record<string, any> {
  const result = { ...props }
  for (const [key, field] of Object.entries(props._bind ?? {})) {
    if (!TARGETS.has(key)) continue
    const value = bindingValue(item, field)
    result[key] = key === 'value' && typeof value === 'number' ? value : String(value ?? '')
    if (key === 'text') delete result.richText
  }
  for (const key of ['_els', 'elements']) if (Array.isArray(props[key])) result[key] = props[key].map((element: any) => ({ ...element, props: bindContentProps(element.props ?? {}, item) }))
  if (props.widget?.props) result.widget = { ...props.widget, props: bindContentProps(props.widget.props, item) }
  return result
}
export function bindPageContent<T extends { content: any[]; root?: any }>(data: T, item: RepeatItem): T {
  return { ...data, content: data.content.map((block) => ({ ...block, props: bindContentProps(block.props ?? {}, item) })), root: { ...data.root, props: { ...data.root?.props, _float: (data.root?.props?._float ?? []).map((element: any) => ({ ...element, props: bindContentProps(element.props ?? {}, item) })) } } }
}
