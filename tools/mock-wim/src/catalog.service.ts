import { Injectable } from '@nestjs/common'
import type { components } from './api/schema'
import { Store } from './store'

type Product = components['schemas']['Product']
type Named = components['schemas']['Named']
type Branch = components['schemas']['Branch']

type VehicleData = { makes: Named[]; models: Record<string, Named[]>; years: Record<string, number[]> }

// Bỏ dấu, chữ thường, bỏ khoảng trắng và gạch nối để so khớp mã/tên.
const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, 'd')
    .toLowerCase()
const code = (s: string) => norm(s).replace(/[\s\-_/.]/g, '')

export type ProductQuery = {
  make?: string
  model?: string
  year?: number
  category?: string
  brand?: string
  condition?: string
  q?: string
  page: number
  pageSize: number
}

@Injectable()
export class CatalogService {
  constructor(private readonly store: Store) {}

  private compat() {
    return this.store.get().chaos !== 'no-compat'
  }

  vehicles(): VehicleData | null {
    return this.compat() ? this.store.seed<VehicleData>('vehicles.json') : null
  }

  categories(): Named[] {
    return this.store.seed<Named[]>('categories.json')
  }

  branches(): Branch[] {
    return this.store.seed<Branch[]>('branches.json')
  }

  private withOverrides(p: Product): Product {
    const price = this.store.get().priceOverrides[p.id]
    const out = price === undefined ? { ...p } : { ...p, price }
    if (!this.compat()) delete out.compatibility
    return out
  }

  product(id: string): Product | undefined {
    const p = this.store.seed<Product[]>('products.json').find((x) => x.id === id)
    return p && this.withOverrides(p)
  }

  /** Số lượng bán được theo chi nhánh (đã trừ đơn đã tạo). */
  stock(productId: string): Record<string, number> {
    const base = this.store.seed<Record<string, Record<string, number>>>('stock.json')[productId] ?? {}
    const over = this.store.get().stockOverrides[productId] ?? {}
    const out: Record<string, number> = {}
    for (const b of this.branches()) out[b.id] = this.store.get().chaos === 'out_of_stock' ? 0 : (over[b.id] ?? base[b.id] ?? 0)
    return out
  }

  list(q: ProductQuery) {
    let items = this.store.seed<Product[]>('products.json').map((p) => this.withOverrides(p))

    if (q.make || q.model || q.year) {
      items = items.filter((p) =>
        p.compatibility?.some(
          (c) =>
            (!q.make || c.make === q.make) &&
            (!q.model || c.model === q.model) &&
            (!q.year || (c.yearFrom <= q.year && q.year <= c.yearTo)),
        ),
      )
    }
    if (q.category) items = items.filter((p) => p.categoryId === q.category)
    if (q.brand) items = items.filter((p) => norm(p.brand) === norm(q.brand!))
    if (q.condition) items = items.filter((p) => p.condition === q.condition)
    if (q.q?.trim()) {
      const text = norm(q.q.trim())
      const c = code(q.q)
      // Khớp mã sản phẩm, OEM, mã thay thế (không phân biệt gạch nối) hoặc tên.
      items = items.filter(
        (p) =>
          norm(p.name).includes(text) ||
          [p.code, ...(p.oemCodes ?? []), ...(p.altCodes ?? [])].some((x) => c.length >= 3 && code(x).includes(c)),
      )
    }

    const total = items.length
    const start = (q.page - 1) * q.pageSize
    return { items: items.slice(start, start + q.pageSize), page: q.page, pageSize: q.pageSize, total }
  }
}
