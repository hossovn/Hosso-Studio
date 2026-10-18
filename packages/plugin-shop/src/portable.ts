import type { Payload } from 'payload'
import { slugify } from './util'

type Cat = { id: number | string; name: string; slug: string; order?: number; parent?: { slug: string } | null; image?: { filename?: string } | null }
type Prod = {
  code?: string; name: string; slug: string; active?: boolean; brand?: string; price: number; salePrice?: number | null; stock: number; makes?: string[]; description?: string
  category?: { slug: string } | null; images?: { image?: { filename?: string } | null }[]; variants?: { name: string; sku?: string; price?: number | null; stock?: number }[]
}

/** Danh mục và sản phẩm của Cửa hàng cho gói site (ảnh đi theo tên tệp trong Media). */
export async function exportCatalog(payload: Payload) {
  const find = async (collection: string) => (await payload.find({ collection: collection as any, limit: 10000, depth: 2, pagination: false, overrideAccess: true })).docs
  const cats = (await find('shop-categories')) as unknown as Cat[]
  const prods = (await find('shop-products')) as unknown as Prod[]
  return {
    categories: cats.map((c) => ({ name: c.name, slug: c.slug, order: c.order ?? 0, parent: c.parent?.slug, image: c.image?.filename })),
    products: prods.map((p) => ({
      code: p.code, name: p.name, slug: p.slug, active: p.active !== false, brand: p.brand, price: p.price, salePrice: p.salePrice ?? undefined, stock: p.stock, makes: p.makes,
      description: p.description, category: p.category?.slug, images: (p.images ?? []).map((i) => i.image?.filename).filter(Boolean),
      variants: (p.variants ?? []).map(({ name, sku, price, stock }) => ({ name, sku, price: price ?? undefined, stock })),
    })),
  }
}

type Data = { categories?: { name: string; slug: string; order?: number; parent?: string; image?: string }[]; products?: (Omit<Prod, 'category' | 'images'> & { category?: string; images?: string[] })[] }

/** Nhập lại: cập nhật theo đường dẫn (slug), chưa có thì tạo. Ảnh không tìm thấy trong Media thì bỏ qua. */
export async function importCatalog(payload: Payload, data: Data) {
  const one = async (collection: string, where: object) => (await payload.find({ collection: collection as any, where: where as any, limit: 1, depth: 0, overrideAccess: true })).docs[0]
  const media = async (filename?: string) => (filename ? (await one('media', { filename: { equals: filename } }))?.id : undefined)
  const upsert = async (collection: string, key: object, doc: Record<string, unknown>) => {
    const found = await one(collection, key)
    return found ? payload.update({ collection: collection as any, id: found.id, data: doc, overrideAccess: true }) : payload.create({ collection: collection as any, data: doc, overrideAccess: true })
  }
  const ids = new Map<string, number | string>()
  for (const c of data.categories ?? []) ids.set(c.slug, (await upsert('shop-categories', { slug: { equals: c.slug } }, { name: c.name, slug: c.slug, order: c.order ?? 0, image: await media(c.image) })).id)
  for (const c of data.categories ?? []) if (c.parent && ids.has(c.parent)) await payload.update({ collection: 'shop-categories' as any, id: ids.get(c.slug)!, data: { parent: ids.get(c.parent) }, overrideAccess: true })
  for (const p of data.products ?? []) {
    const images = []
    for (const f of p.images ?? []) {
      const id = await media(f)
      if (id) images.push({ image: id })
    }
    const { category, images: _i, ...rest } = p
    await upsert('shop-products', { slug: { equals: p.slug || slugify(p.name) } }, { ...rest, slug: p.slug || slugify(p.name), category: category ? ids.get(category) : undefined, images })
  }
}
