import type { RepeatItem } from './repeater-data'
export const repeatPrefix = (id: unknown) => `r_${String(id ?? 'list').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 100)}_`
export type RepeatQuery = { q: string; category: string; sort: string; page: number; size: number }
export function repeatQuery(props: Record<string, any>, params: Record<string, string | string[] | undefined> = {}): RepeatQuery {
  const prefix = repeatPrefix(props.id), get = (key: string) => String(Array.isArray(params[prefix + key]) ? params[prefix + key]?.[0] ?? '' : params[prefix + key] ?? '').trim().slice(0, 160)
  return { q: props.search === 'yes' ? get('q') : '', category: props.filter === 'yes' ? get('category') : '', sort: props.sorting === 'yes' && ['title', 'title-desc', 'price', '-price'].includes(get('sort')) ? get('sort') : '', page: props.paginate === 'yes' ? Math.max(1, Math.min(100000, Math.floor(Number(get('page')) || 1))) : 1, size: Math.max(1, Math.min(60, Math.floor(Number(props.count) || 6))) }
}
export const searchText = (value: unknown) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLocaleLowerCase()
const numericPrice = (price: RepeatItem['price']) => typeof price === 'number' && Number.isFinite(price) ? price : typeof price === 'string' && /^\d+(?:\.\d+)?$/.test(price.trim()) ? Number(price) : null
export function queryRepeatItems(items: RepeatItem[], query: RepeatQuery) {
  const categories = [...new Set(items.map((item) => item.category).filter((value): value is string => Boolean(value)))].sort().map((value) => ({ value, label: value }))
  const filtered = items.filter((item) => (!query.q || searchText(`${item.title ?? ''} ${item.excerpt ?? ''}`).includes(searchText(query.q))) && (!query.category || item.category === query.category))
  if (query.sort === 'title' || query.sort === 'title-desc') filtered.sort((a, b) => String(a.title ?? '').localeCompare(String(b.title ?? ''), 'vi') * (query.sort === 'title' ? 1 : -1))
  if (query.sort === 'price' || query.sort === '-price') filtered.sort((a, b) => { const first = numericPrice(a.price), second = numericPrice(b.price); return first == null ? second == null ? 0 : 1 : second == null ? -1 : (first - second) * (query.sort === 'price' ? 1 : -1) })
  const pages = Math.max(1, Math.ceil(filtered.length / query.size)), page = Math.min(query.page, pages)
  return { status: 'ok', items: filtered.slice((page - 1) * query.size, page * query.size), total: filtered.length, page, pages, categories }
}
