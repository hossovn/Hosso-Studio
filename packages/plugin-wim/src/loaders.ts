import type { BlockLoader, LoadContext } from '@hosso/studio-blocks'
import { wimGet, WimError } from './client'
import type { Availability, Branch, Named, Order, Product, ProductPage } from './client'
import { getWimConfig, type WimConfig } from './config'
import { contentOf, imagesOf, type ProductContent } from '@hosso/plugin-shop/product-content'

export type LoadError = { status: 'error'; kind: WimError['kind'] | 'internal' }

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
const int = (v: unknown) => (Number.isInteger(Number(v)) && Number(v) > 0 ? Number(v) : undefined)

import { VEHICLE_COOKIE } from './constants'

type Vehicle = { make?: string; model?: string; year?: number }

function vehicleFrom(ctx: LoadContext): Vehicle {
  const sp = ctx.searchParams
  if (first(sp.make) || first(sp.model) || first(sp.year)) return { make: first(sp.make), model: first(sp.model), year: int(first(sp.year)) }
  return parseVehicleCookie(ctx.cookies[VEHICLE_COOKIE])
}

export function parseVehicleCookie(raw?: string): Vehicle {
  const [make, model, year] = (raw ? decodeURIComponent(raw) : '').split('~')
  return { make: make || undefined, model: model || undefined, year: int(year) }
}

/** Bọc loader: chưa cấu hình / WIM lỗi thì trả trạng thái lỗi để block tự báo, phần nội dung khác của trang không ảnh hưởng. */
const guarded =
  (fn: (cfg: WimConfig, props: Record<string, any>, ctx: LoadContext) => Promise<object>): BlockLoader =>
  async (props, ctx) => {
    const cfg = await getWimConfig(ctx.payload)
    if (!cfg) return { status: 'error', kind: 'unconfigured' } satisfies LoadError
    try {
      return { status: 'ok', ...(await fn(cfg, props, ctx)) }
    } catch (e) {
      if (e instanceof WimError) return { status: 'error', kind: e.kind } satisfies LoadError
      throw e
    }
  }

/** Dữ liệu bổ sung chỉ hiển thị trên web (plugin shop, collection shop-products gắn bằng wimId). Không có shop thì trả rỗng. */
export type Overlay = ProductContent & { priceDisplay?: string; displayName?: string; images: string[]; weight?: number; size?: string }
const overlaysOf = async (payload: any, ids: string[]): Promise<Record<string, Overlay>> => {
  if (!ids.length) return {}
  try {
    const r = await payload.find({ collection: 'shop-products', where: { wimId: { in: ids } }, limit: 200, depth: 1, overrideAccess: true })
    const out: Record<string, Overlay> = {}
    for (const d of r.docs as any[]) {
      if (!d.wimId) continue
      out[d.wimId] = {
        priceDisplay: d.priceDisplay || 'default',
        displayName: d.displayName || undefined,
        ...contentOf(d),
        images: imagesOf(d),
        weight: d.weight > 0 ? d.weight : undefined,
        size: d.length && d.width && d.height ? d.length + ' × ' + d.width + ' × ' + d.height + ' cm' : undefined,
      }
    }
    return out
  } catch {
    return {}
  }
}
const pricingOf = async (payload: any): Promise<{ show: boolean; label: string }> => {
  try {
    const g = (await payload.findGlobal({ slug: 'shop-settings', depth: 0 })) as any
    return { show: g.showPrices !== false, label: g.priceHiddenLabel || 'Liên hệ để biết giá' }
  } catch {
    return { show: true, label: 'Liên hệ để biết giá' }
  }
}
const policyOf = async (payload: any): Promise<{ title: string; items: string[] }> => {
  try {
    const g = (await payload.findGlobal({ slug: 'shop-settings', depth: 0 })) as any
    return { title: g.policyTitle || '', items: (g.policyItems ?? []).map((i: any) => i.text).filter(Boolean) }
  } catch {
    return { title: '', items: [] }
  }
}

const names = <T extends Named>(items: T[]) => Object.fromEntries(items.map((i) => [i.id, i.name]))

export const loadVehicleSelector = guarded(async (cfg, _props, ctx) => {
  let makes: Named[]
  try {
    makes = (await wimGet<{ items: Named[] }>(cfg, '/v1/vehicles/makes', {}, ['vehicles'], 10)).items
  } catch (e) {
    // WIM chưa có dữ liệu xe (404): ẩn bộ chọn, site vẫn chạy.
    if (e instanceof WimError && e.status === 404) return { unavailable: true }
    throw e
  }
  const selected = vehicleFrom(ctx)
  const models = selected.make
    ? (await wimGet<{ items: Named[] }>(cfg, `/v1/vehicles/makes/${selected.make}/models`, {}, ['vehicles'], 10).catch(() => ({ items: [] }))).items
    : []
  const years = selected.model
    ? (await wimGet<{ items: number[] }>(cfg, `/v1/vehicles/models/${selected.model}/years`, {}, ['vehicles'], 10).catch(() => ({ items: [] }))).items
    : []
  return { makes, models, years, selected }
})

export const loadProductGrid = guarded(async (cfg, props, ctx) => {
  const sp = ctx.searchParams
  const vehicle = props.useSelectedVehicle === 'no' ? {} : vehicleFrom(ctx)
  const filters = {
    q: first(sp.q),
    category: first(sp.category) || props.category || undefined,
    brand: first(sp.brand) || props.brand || undefined,
    condition: first(sp.condition) || (props.condition && props.condition !== 'any' ? props.condition : undefined),
  }
  const paged = props.pager !== 'no'
  const page = paged ? (int(first(sp.page)) ?? 1) : 1
  const result = await wimGet<ProductPage>(
    cfg,
    '/v1/products',
    { page, pageSize: int(props.pageSize) ?? 12, ...filters, ...vehicle },
    ['list'],
  )

  // Nhãn hiển thị cho xe đã chọn (không bắt buộc, lỗi thì bỏ qua).
  let vehicleLabel: string | undefined
  if (vehicle.make) {
    try {
      const makes = names((await wimGet<{ items: Named[] }>(cfg, '/v1/vehicles/makes', {}, ['vehicles'], 10)).items)
      const models = vehicle.model ? names((await wimGet<{ items: Named[] }>(cfg, `/v1/vehicles/makes/${vehicle.make}/models`, {}, ['vehicles'], 10)).items) : {}
      vehicleLabel = [makes[vehicle.make], vehicle.model && models[vehicle.model], vehicle.year].filter(Boolean).join(' ')
    } catch {}
  }

  const categoryNames: Record<string, string> = {}
  try {
    Object.assign(categoryNames, names((await wimGet<{ items: Named[] }>(cfg, '/v1/categories', {}, ['list'], 10)).items))
  } catch {}
  for (const c of cfg.categoryMap) categoryNames[c.wimCategoryId] = c.label // quản trị viên ánh xạ tên riêng

  // Trang danh sách có bộ lọc: danh sách thương hiệu trong danh mục đang xem và sắp xếp (sắp theo trang đang hiện).
  let brands: string[] = []
  let items = result.items
  const sort = first(sp.sort) ?? ''
  if (paged) {
    try {
      const all = await wimGet<ProductPage>(cfg, '/v1/products', { pageSize: 100, category: filters.category }, ['list'])
      brands = [...new Set(all.items.map((p) => p.brand).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi'))
    } catch {}
    if (sort === 'price-asc') items = [...items].sort((a, b) => a.price - b.price)
    else if (sort === 'price-desc') items = [...items].sort((a, b) => b.price - a.price)
    else if (sort === 'name') items = [...items].sort((a, b) => a.name.localeCompare(b.name, 'vi'))
  }

  return { ...result, items, paged, filters: { ...filters, ...vehicle }, vehicleLabel, categoryNames, brands, sort, overlays: await overlaysOf(ctx.payload, items.map((p) => p.id)), pricing: await pricingOf(ctx.payload), detailPath: props.detailPath || '/chi-tiet' }
})

export const loadProductDetail = guarded(async (cfg, props, ctx) => {
  const id = first(ctx.searchParams.p)
  if (!id) return { missing: 'pick' }
  try {
    const [product, availability, branches] = await Promise.all([
      wimGet<Product>(cfg, `/v1/products/${encodeURIComponent(id)}`, {}, [`product:${id}`]),
      wimGet<Availability>(cfg, `/v1/products/${encodeURIComponent(id)}/availability`, {}, [`product:${id}`]),
      wimGet<{ items: Branch[] }>(cfg, '/v1/branches', {}, ['list'], 10),
    ])
    const categoryNames = Object.fromEntries(cfg.categoryMap.map((c) => [c.wimCategoryId, c.label]))
    // Dữ liệu bổ sung của web, chính sách khách hàng và sản phẩm tương tự (cùng danh mục).
    const overlays = await overlaysOf(ctx.payload, [id])
    let related: Product[] = []
    try {
      related = (await wimGet<ProductPage>(cfg, '/v1/products', { pageSize: 9, category: product.categoryId }, ['list'])).items.filter((p) => p.id !== product.id).slice(0, 8)
    } catch {}
    const relatedOverlays = await overlaysOf(ctx.payload, related.map((p) => p.id))
    return {
      product,
      availability,
      branches: branches.items,
      categoryName: product.categoryId && categoryNames[product.categoryId],
      overlay: overlays[id] ?? null,
      pricing: await pricingOf(ctx.payload),
      policy: await policyOf(ctx.payload),
      related,
      relatedOverlays,
    }
  } catch (e) {
    if (e instanceof WimError && e.status === 404) return { missing: 'notFound' }
    throw e
  }
})

export const loadCheckout = guarded(async (cfg) => {
  const branches = await wimGet<{ items: Branch[] }>(cfg, '/v1/branches', {}, ['list'], 10)
  return { branches: branches.items.map((b) => ({ id: b.id, name: b.name })) }
})

/** Luồng E: khách xem trạng thái đơn. Cần mã đơn + 4 số cuối điện thoại (khách không có tài khoản). */
export const loadOrderStatus = guarded(async (cfg, _props, ctx) => {
  const id = first(ctx.searchParams.id)
  const phone4 = (first(ctx.searchParams.phone) ?? '').replace(/\D/g, '')
  if (!id) return { ask: true }
  try {
    const order = await wimGet<Order>(cfg, `/v1/orders/${encodeURIComponent(id)}`, {}, [`order:${id}`])
    // Không tiết lộ đơn tồn tại hay không khi 4 số cuối sai.
    if (phone4.length !== 4 || !order.customer.phone.replace(/\D/g, '').endsWith(phone4)) return { notFound: true, id }
    const branches = order.fulfillment.type === 'pickup' ? (await wimGet<{ items: Branch[] }>(cfg, '/v1/branches', {}, ['list'], 10)).items : []
    return {
      order: { id: order.id, status: order.status, total: order.total, items: order.items, fulfillment: order.fulfillment, createdAt: order.createdAt },
      branchName: branches.find((b) => b.id === order.fulfillment.branchId)?.name,
    }
  } catch (e) {
    if (e instanceof WimError && e.status === 404) return { notFound: true, id }
    throw e
  }
})
