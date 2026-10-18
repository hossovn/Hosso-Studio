import type { BlockLoader } from '@hosso/studio-blocks'
import type { Payload, Where } from 'payload'
import { SETTINGS } from './collections'
import { imageOf, type Product } from './util'

export type Card = { id: string; name: string; slug: string; code?: string; price: number; salePrice?: number | null; stock: number; brand?: string; image: string; category?: { name: string; slug: string } | null; description?: string; variants?: { id: string; name: string; price: number; stock: number }[] }
export type Review = { name: string; rating: number; comment: string; date: string }

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
const card = (p: Product): Card => ({
  id: String(p.id),
  name: p.name,
  slug: p.slug,
  code: p.code,
  price: p.price,
  salePrice: p.salePrice && p.salePrice > 0 && p.salePrice < p.price ? p.salePrice : null,
  stock: p.variants?.length ? p.variants.reduce((s, v) => s + (v.stock ?? 0), 0) : p.stock,
  brand: p.brand,
  image: imageOf(p),
  category: p.category && typeof p.category === 'object' ? { name: p.category.name, slug: p.category.slug } : null,
  description: p.description,
  variants: p.variants?.length ? p.variants.map((v) => ({ id: String(v.id), name: v.name, price: v.price && v.price > 0 ? v.price : p.salePrice && p.salePrice > 0 && p.salePrice < p.price ? p.salePrice : p.price, stock: v.stock ?? 0 })) : undefined,
})

const categoryTree = async (payload: Payload, slug: string) => {
  const cat = (await payload.find({ collection: 'shop-categories' as any, where: { slug: { equals: slug } }, limit: 1, depth: 0, overrideAccess: true })).docs[0]
  if (!cat) return null
  const kids = (await payload.find({ collection: 'shop-categories' as any, where: { parent: { equals: cat.id } }, limit: 200, depth: 0, pagination: false, overrideAccess: true })).docs
  return [cat.id, ...kids.map((k) => k.id)]
}

export const loadGrid: BlockLoader = async (props, ctx) => {
  const { payload, searchParams: sp } = ctx
  const listing = props.pager === 'yes' // danh sách có phân trang đọc bộ lọc từ URL; mục nổi bật chỉ dùng thuộc tính của block
  const q = listing ? first(sp.q)?.trim() : ''
  const catSlug = (listing && first(sp.category)) || props.category || ''
  const make = listing ? first(sp.make)?.trim().toLowerCase() : ''
  const brand = (listing && first(sp.brand)) || props.brand || ''
  const min = listing ? Number(first(sp.min)) : 0
  const max = listing ? Number(first(sp.max)) : 0
  const sortKey = (listing && first(sp.sort)) || props.sort || 'new'
  const pageSize = Math.min(60, Math.max(1, Number(props.pageSize) || 12))
  const page = listing ? Math.max(1, Number(first(sp.page)) || 1) : 1

  const and: Where[] = [{ active: { equals: true } }]
  if (q) and.push({ or: [{ name: { contains: q } }, { code: { contains: q } }] })
  if (make) and.push({ makes: { in: [make] } })
  if (brand) and.push({ brand: { equals: brand } })
  if (min > 0) and.push({ price: { greater_than_equal: min } })
  if (max > 0) and.push({ price: { less_than_equal: max } })
  if (catSlug) {
    const ids = await categoryTree(payload, catSlug)
    if (!ids) return { status: 'ok', items: [], page: 1, pages: 1, total: 0 }
    and.push({ category: { in: ids } })
  }
  const sort = sortKey === 'priceAsc' ? 'price' : sortKey === 'priceDesc' ? '-price' : '-createdAt'
  const r = await payload.find({ collection: 'shop-products' as any, where: { and }, sort, limit: pageSize, page, depth: 2, overrideAccess: true })
  const keep = new URLSearchParams()
  for (const k of ['q', 'category', 'make', 'brand', 'min', 'max', 'sort']) if (first(sp[k])) keep.set(k, first(sp[k])!)

  let filters: unknown
  if (listing) {
    // ponytail: danh sách thương hiệu lấy từ tối đa 500 sản phẩm đang bán; tách bảng riêng khi danh mục lớn hơn.
    const all = (await payload.find({ collection: 'shop-products' as any, where: { active: { equals: true } }, limit: 500, depth: 0, pagination: false, overrideAccess: true })).docs as unknown as Product[]
    const cats = (await payload.find({ collection: 'shop-categories' as any, sort: 'order', limit: 200, depth: 0, pagination: false, overrideAccess: true })).docs as unknown as { name: string; slug: string }[]
    filters = { brands: [...new Set(all.map((p) => p.brand).filter(Boolean))].sort(), categories: cats.map((c) => ({ name: c.name, slug: c.slug })), current: { q: q ?? '', category: catSlug, brand, min: min || '', max: max || '', sort: sortKey } }
  }
  return { status: 'ok', items: (r.docs as unknown as Product[]).map(card), page: r.page ?? 1, pages: r.totalPages || 1, total: r.totalDocs, query: keep.toString(), filters }
}

export const loadDetail: BlockLoader = async (_props, { payload, searchParams }) => {
  const key = first(searchParams.p)?.trim()
  if (!key) return { status: 'notfound' }
  const r = await payload.find({ collection: 'shop-products' as any, where: { and: [{ active: { equals: true } }, { or: [{ slug: { equals: key } }, ...(/^\d+$/.test(key) ? [{ id: { equals: Number(key) } }] : [])] }] }, limit: 1, depth: 2, overrideAccess: true })
  const p = r.docs[0] as unknown as Product | undefined
  if (!p) return { status: 'notfound' }

  const rv = (await payload.find({ collection: 'shop-reviews' as any, where: { and: [{ product: { equals: p.id } }, { status: { equals: 'approved' } }] }, sort: '-createdAt', limit: 100, depth: 0, pagination: false, overrideAccess: true })).docs as unknown as { name: string; rating: number; comment?: string; createdAt: string }[]
  const reviews: Review[] = rv.slice(0, 10).map((x) => ({ name: x.name, rating: x.rating, comment: x.comment ?? '', date: x.createdAt }))
  const rating = rv.length ? Math.round((rv.reduce((s, x) => s + x.rating, 0) / rv.length) * 10) / 10 : 0

  let related: Card[] = []
  if (p.category && typeof p.category === 'object') {
    const rel = await payload.find({ collection: 'shop-products' as any, where: { and: [{ active: { equals: true } }, { category: { equals: p.category.id } }, { id: { not_equals: p.id } }] }, limit: 4, depth: 2, overrideAccess: true })
    related = (rel.docs as unknown as Product[]).map(card)
  }
  return { status: 'ok', product: card(p), reviews, rating, reviewCount: rv.length, related, baseUrl: (process.env.HOSSO_PUBLIC_URL || '').replace(/\/$/, '') }
}

export const loadCategories: BlockLoader = async (props, { payload }) => {
  let parent: number | string | undefined
  if (props.parent) parent = (await payload.find({ collection: 'shop-categories' as any, where: { slug: { equals: props.parent } }, limit: 1, depth: 0, overrideAccess: true })).docs[0]?.id
  const where: Where = props.parent ? (parent ? { parent: { equals: parent } } : { id: { equals: -1 } }) : { parent: { exists: false } }
  const r = await payload.find({ collection: 'shop-categories' as any, where, sort: 'order', limit: 100, depth: 1, pagination: false, overrideAccess: true })
  return { status: 'ok', items: r.docs.map((c: any) => ({ name: c.name, slug: c.slug, image: c.image?.filename ? `/api/media/file/${encodeURIComponent(c.image.filename)}` : '' })) }
}

export const loadCheckout: BlockLoader = async (_props, { payload }) => {
  const s = (await payload.findGlobal({ slug: SETTINGS as any, depth: 0, overrideAccess: true }).catch(() => null)) as { bankInfo?: string } | null
  return { status: 'ok', bankInfo: s?.bankInfo ?? '' }
}
