import type { Payload } from 'payload'

// Tích hợp Giao Hàng Nhanh (GHN) API v2. Token đọc từ HOSSO_GHN_TOKEN (không lưu trong DB), các cài đặt còn lại ở global `shipping-settings`.
// Tài liệu: https://api.ghn.vn/home/docs/detail?id=122 (tạo đơn), id=47 (callback trạng thái).

export const GHN_NAME = 'Giao Hàng Nhanh'
const PROD = 'https://online-gateway.ghn.vn/shiip/public-api'
const SANDBOX = 'https://dev-online-gateway.ghn.vn/shiip/public-api'

export type GhnConfig = { token: string; shopId: number; baseUrl: string; weight: number; requiredNote: string }

export type Shipment = {
  id: number | string
  orderId: string
  customerName?: string
  phone?: string
  address?: string
  orderTotal?: number
  paymentMethod?: string
  districtId?: number
  wardCode?: string
  carrier?: string
  trackingCode?: string
  status: string
  ghnStatus?: string
  ghnError?: string
  syncedAt?: string
}

/** Cấu hình GHN, hoặc null nếu chưa bật/chưa đủ token và shopId. */
export async function getGhnConfig(payload: Payload): Promise<GhnConfig | null> {
  const s = (await payload.findGlobal({ slug: 'shipping-settings' as any, depth: 0, overrideAccess: true }).catch(() => null)) as
    | { ghnEnabled?: boolean; ghnSandbox?: boolean; ghnShopId?: number; ghnWeight?: number; ghnRequiredNote?: string }
    | null
  const token = process.env.HOSSO_GHN_TOKEN?.trim()
  if (!s?.ghnEnabled || !token || !s.ghnShopId) return null
  return {
    token,
    shopId: s.ghnShopId,
    baseUrl: process.env.HOSSO_GHN_API_URL?.trim() || (s.ghnSandbox ? SANDBOX : PROD),
    weight: s.ghnWeight ?? 500,
    requiredNote: s.ghnRequiredNote ?? 'CHOXEMHANGKHONGTHU',
  }
}

async function call<T>(cfg: GhnConfig, path: string, body?: unknown, method: 'GET' | 'POST' = 'POST'): Promise<T> {
  const res = await fetch(`${cfg.baseUrl}${path}`, {
    method,
    headers: { Token: cfg.token, ShopId: String(cfg.shopId), 'Content-Type': 'application/json' },
    body: method === 'POST' ? JSON.stringify(body ?? {}) : undefined,
    signal: AbortSignal.timeout(10_000),
  })
  const json = (await res.json().catch(() => null)) as { code?: number; message?: string; code_message_value?: string; data?: T } | null
  if (!res.ok || !json || json.code !== 200) throw new Error(`GHN: ${json?.code_message_value || json?.message || res.status}`)
  return json.data as T
}

// --- Tìm mã tỉnh/quận/phường từ địa chỉ nhập tay ---

const plain = (s: string) =>
  ` ${s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()} `
// Bỏ tiền tố hành chính; tên toàn số ("Phường 5") giữ nguyên tiền tố để khỏi khớp nhầm số nhà.
const bare = (name: string) => {
  const p = plain(name).trim()
  const b = p.replace(/^(thanh pho|tinh|tp|quan|huyen|thi xa|thi tran|phuong|xa) /, '')
  return /^\d+$/.test(b) ? p : b
}
const longest = <T>(items: T[], nameOf: (t: T) => string, addr: string) =>
  items
    .map((i) => ({ i, n: bare(nameOf(i)) }))
    .filter(({ n }) => n && addr.includes(` ${n} `))
    .sort((a, b) => b.n.length - a.n.length)[0]?.i

type Province = { ProvinceID: number; ProvinceName: string }
type District = { DistrictID: number; DistrictName: string }
type Ward = { WardCode: string; WardName: string }
const cache = new Map<string, unknown>()
const cached = async <T>(key: string, load: () => Promise<T>) => {
  if (!cache.has(key)) cache.set(key, await load())
  return cache.get(key) as T
}

// ponytail: so khớp chuỗi trên địa chỉ nhập tay; sai thì quản trị viên điền districtId/wardCode trong vận đơn rồi lưu để thử lại.
export async function resolveAddress(cfg: GhnConfig, address: string) {
  const addr = plain(address)
  const provinces = await cached('p', () => call<Province[]>(cfg, '/master-data/province', undefined, 'GET'))
  const province = longest(provinces, (p) => p.ProvinceName, addr)
  if (!province) throw new Error('GHN: không nhận ra tỉnh/thành trong địa chỉ')
  const districts = await cached(`d${province.ProvinceID}`, () => call<District[]>(cfg, '/master-data/district', { province_id: province.ProvinceID }))
  const district = longest(districts, (d) => d.DistrictName, addr)
  if (!district) throw new Error('GHN: không nhận ra quận/huyện trong địa chỉ')
  const wards = await cached(`w${district.DistrictID}`, () => call<Ward[] | null>(cfg, '/master-data/ward', { district_id: district.DistrictID }))
  const ward = longest(wards ?? [], (w) => w.WardName, addr)
  if (!ward) throw new Error('GHN: không nhận ra phường/xã trong địa chỉ')
  return { districtId: district.DistrictID, wardCode: ward.WardCode }
}

/** Tạo đơn GHN cho vận đơn, trả mã vận đơn (order_code). Giao COD: khách trả tiền hàng cho shipper, shop trả cước. */
export async function createGhnOrder(cfg: GhnConfig, s: Shipment) {
  if (!s.address) throw new Error('GHN: đơn chưa có địa chỉ giao')
  const where = s.districtId && s.wardCode ? { districtId: s.districtId, wardCode: s.wardCode } : await resolveAddress(cfg, s.address)
  const data = await call<{ order_code: string }>(cfg, '/v2/shipping-order/create', {
    payment_type_id: 1,
    required_note: cfg.requiredNote,
    service_type_id: 2,
    client_order_code: s.orderId,
    to_name: s.customerName,
    to_phone: s.phone,
    to_address: s.address,
    to_district_id: where.districtId,
    to_ward_code: where.wardCode,
    // Đơn đã trả trước (chuyển khoản) thì shipper không thu tiền.
    cod_amount: s.paymentMethod && s.paymentMethod !== 'cod' ? 0 : Math.round(s.orderTotal ?? 0),
    weight: cfg.weight,
    items: [{ name: `Đơn hàng ${s.orderId}`, quantity: 1, weight: cfg.weight }],
  })
  return { orderCode: data.order_code, ...where }
}

export async function getGhnStatus(cfg: GhnConfig, orderCode: string) {
  return (await call<{ status: string }>(cfg, '/v2/shipping-order/detail', { order_code: orderCode })).status
}

/** Trạng thái GHN -> trạng thái vận đơn của Studio. Trạng thái lạ thì giữ nguyên (undefined). */
export function mapStatus(ghn: string): string | undefined {
  if (['ready_to_pick', 'picking', 'money_collect_picking'].includes(ghn)) return 'pending'
  if (['picked', 'storing', 'transporting', 'sorting'].includes(ghn)) return 'handed_over'
  if (['delivering', 'money_collect_delivering', 'delivery_fail'].includes(ghn)) return 'delivering'
  if (ghn === 'delivered') return 'delivered'
  if (/return/.test(ghn)) return 'returned'
  if (ghn === 'cancel') return 'cancelled'
  return undefined
}

export const FINAL = ['delivered', 'returned', 'cancelled']

/** Phí vận chuyển GHN cho địa chỉ nhập tay (tự nhận mã quận/phường như khi tạo đơn). */
export async function getGhnFee(cfg: GhnConfig, address: string, insuranceValue: number) {
  const where = await resolveAddress(cfg, address)
  const data = await call<{ total: number }>(cfg, '/v2/shipping-order/fee', {
    service_type_id: 2,
    to_district_id: where.districtId,
    to_ward_code: where.wardCode,
    weight: cfg.weight,
    insurance_value: Math.round(insuranceValue),
  })
  return Math.round(data.total)
}
