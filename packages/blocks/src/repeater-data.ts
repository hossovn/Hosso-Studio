import type { FreeElement } from './FreeCanvas'
export type RepeatItem = { title?: string; excerpt?: string; cover?: string; href?: string; price?: string | number; category?: string; slug?: string; data?: Record<string, unknown> }
export const REPEAT_FIELDS = ['title', 'excerpt', 'cover', 'href', 'price'] as const
export const REPEAT_TYPES = new Set(['container', 'heading', 'text', 'image', 'button', 'shape', 'line', 'icon', 'video', 'number'])
export function bindingValue(item: RepeatItem, field: unknown): string | number | boolean | undefined {
  if (typeof field !== 'string') return undefined
  const key = field.startsWith('data.') ? field.slice(5) : field
  if (!/^[a-z][a-z0-9_-]{0,63}$/i.test(key) || ['__proto__', 'constructor', 'prototype'].includes(key)) return undefined
  const source = field.startsWith('data.') ? item.data : item
  if (!source || !Object.hasOwn(source, key)) return undefined
  const value = (source as Record<string, unknown>)[key]
  return ['string', 'number', 'boolean'].includes(typeof value) ? value as string | number | boolean : undefined
}
export const DEFAULT_REPEAT_TEMPLATE: FreeElement[] = [
  { id: 'card', type: 'container', x: 0, y: 0, w: 360, h: 390, props: { bg: '#ffffff', radius: 12, borderW: 1, borderColor: '#e1e7e3', _frame: true } },
  { id: 'cover', parentId: 'card', type: 'image', x: 16, y: 16, w: 328, h: 200, props: { radius: 8, _bind: { src: 'cover', alt: 'title' } } },
  { id: 'title', parentId: 'card', type: 'heading', x: 20, y: 234, w: 320, h: 58, props: { text: 'Tên nội dung', size: 24, weight: 650, color: '#233b2c', _bind: { text: 'title', href: 'href' }, _sizing: { height: 'hug' } } },
  { id: 'excerpt', parentId: 'card', type: 'text', x: 20, y: 304, w: 320, h: 62, props: { text: 'Mô tả nội dung', size: 16, color: '#627168', _bind: { text: 'excerpt' } } },
]
export function bindRepeatTemplate(template: FreeElement[], item: RepeatItem, prefix: string, locale = 'vi'): FreeElement[] {
  return template.filter((el) => REPEAT_TYPES.has(el.type)).map((el) => {
    const props = { ...el.props }
    for (const [key, field] of Object.entries(props._bind ?? {})) {
      if (!['text', 'src', 'href', 'alt', 'value', 'url', 'poster'].includes(key)) continue
      const raw = bindingValue(item, field)
      props[key] = key === 'value' && typeof raw === 'number' ? raw : field === 'price' && typeof raw === 'number' ? new Intl.NumberFormat(locale, { style: 'currency', currency: 'VND' }).format(raw) : String(raw ?? '')
      if (key === 'text') delete props.richText
    }
    return { ...el, id: `${prefix}-${el.id}`, parentId: el.parentId ? `${prefix}-${el.parentId}` : undefined, props }
  })
}
