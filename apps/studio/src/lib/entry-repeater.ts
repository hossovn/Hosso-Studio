import type { Payload } from 'payload'
import type { RepeatQuery } from '../../../../packages/blocks/src/repeater-query'
import { BUILTIN_CONTENT_TYPES } from './content-schema'
import { searchText } from '../../../../packages/blocks/src/repeater-query'
import { findAll } from './find-all'

export async function loadEntryRepeater(payload: Payload, props: Record<string, any>, query: RepeatQuery, locale: string) {
  const and: any[] = [{ published: { equals: true } }]
  if (props.entryKind) and.push({ kind: { equals: props.entryKind } })
  if (query.category) and.push({ kind: { equals: query.category } })
  if (query.q) and.push({ searchText: { contains: searchText(query.q) } })
  const sort = query.sort === 'title' ? ['title', 'id'] : query.sort === 'title-desc' ? ['-title', 'id'] : ['-createdAt', 'id']
  const find = (page: number) => payload.find({ collection: 'content-entries', where: { and }, sort, depth: 0, limit: query.size, page, locale: locale as any, overrideAccess: true })
  let result = await find(query.page)
  if (query.page > result.totalPages && result.totalPages > 0) result = await find(result.totalPages)
  const custom = await findAll(payload, { collection: 'content-types', depth: 0, overrideAccess: true })
  const types = [...BUILTIN_CONTENT_TYPES, ...custom.docs] as any[]
  return {
    status: 'ok', page: result.page ?? 1, pages: props.paginate === 'yes' ? Math.max(1, result.totalPages) : 1, total: result.totalDocs,
    categories: props.filter === 'yes' ? types.filter((type) => !props.entryKind || type.slug === props.entryKind).map((type) => ({ value: type.slug, label: type.title })) : [],
    items: result.docs.map((entry: any) => ({
      title: entry.title, excerpt: entry.data?.description || entry.data?.role || '', cover: entry.data?.image || '',
      href: entry.data?.url || (types.some((type) => type.slug === entry.kind && type.detailTemplate) ? `/noi-dung/${encodeURIComponent(entry.kind)}/${encodeURIComponent(entry.slug)}` : ''),
      category: entry.kind, data: entry.data ?? {}, slug: entry.slug,
    })),
  }
}
