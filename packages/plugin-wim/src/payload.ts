import { emitOrderPlaced, type HossoPlugin } from '@hosso/studio-blocks'
import type { Config, Endpoint, FieldHook, GlobalConfig, PayloadRequest } from 'payload'
import { wimGet } from './client'
import { MASK, SETTINGS_SLUG, clearConfigMemo, getWimConfig } from './config'
import { encryptSecret, isEncrypted } from './crypto'
import { placeOrder } from './checkout'
import { applyEvent, verifyWebhook } from './webhook'
import { WimError, wimFetch } from './client'
import type { Branch, Named } from './client'
import { L, bi, msg } from './lang'

type Roled = { roles?: string[] | null } | null | undefined
const isAdmin = (u: unknown) => Boolean((u as Roled)?.roles?.includes('admin'))

// Chỉ quản trị viên đọc/ghi cài đặt; giá trị bí mật luôn hiện dạng che trên API và admin.
const secretBeforeChange: FieldHook = async ({ value, field, req }) => {
  const name = (field as { name: string }).name
  if (value === undefined || value === MASK) {
    // Không đổi: giữ bản mã hóa đang lưu (originalDoc đã bị che bởi afterRead nên đọc lại bản gốc).
    const raw = (await req.payload.findGlobal({ slug: SETTINGS_SLUG as any, context: { wimUnmask: true }, overrideAccess: true, depth: 0 }).catch(() => ({}))) as Record<string, unknown>
    return isEncrypted(raw[name]) ? raw[name] : ''
  }
  if (value === '' || value === null) return ''
  return isEncrypted(value) ? value : encryptSecret(String(value))
}
const secretAfterRead: FieldHook = ({ value, req }) => (req.context?.wimUnmask ? value : value ? MASK : '')

const secretField = (name: string, label: { vi: string; en: string }, description: { vi: string; en: string }) => ({
  name,
  type: 'text' as const,
  label,
  admin: { description: bi(`${description.vi} Lưu dạng mã hóa; để nguyên ô che để giữ giá trị hiện có.`, `${description.en} Stored encrypted; leave the masked value as is to keep the current one.`) },
  hooks: { beforeChange: [secretBeforeChange], afterRead: [secretAfterRead] },
})

export const WimSettings: GlobalConfig = {
  slug: SETTINGS_SLUG,
  label: bi('Kết nối Hosso WIM', 'Hosso WIM connection'),
  admin: { group: bi('Hệ thống', 'System') },
  access: { read: ({ req }) => isAdmin(req.user), update: ({ req }) => isAdmin(req.user) },
  hooks: { afterChange: [() => clearConfigMemo()] },
  fields: [
    {
      name: 'testConnection',
      type: 'ui',
      admin: { components: { Field: '@hosso/plugin-wim/admin#TestConnection' } },
    },
    { name: 'apiUrl', type: 'text', label: bi('Địa chỉ API WIM', 'WIM API address'), admin: { description: bi('Ví dụ http://localhost:4010. Biến môi trường HOSSO_WIM_API_URL (nếu có) được ưu tiên.', 'For example http://localhost:4010. The HOSSO_WIM_API_URL environment variable (if set) takes priority.'), placeholder: 'http://localhost:4010' } },
    secretField('apiKey', bi('Khóa API', 'API key'), bi('Biến môi trường HOSSO_WIM_API_KEY (nếu có) được ưu tiên.', 'The HOSSO_WIM_API_KEY environment variable (if set) takes priority.')),
    secretField('webhookSecret', bi('Bí mật webhook', 'Webhook secret'), bi('Dùng để kiểm tra chữ ký webhook; tùy chọn. Biến HOSSO_WIM_WEBHOOK_SECRET được ưu tiên.', 'Used to verify webhook signatures; optional. The HOSSO_WIM_WEBHOOK_SECRET variable takes priority.')),
    { name: 'timeoutMs', type: 'number', label: bi('Thời gian chờ WIM (ms)', 'WIM timeout (ms)'), defaultValue: 5000, min: 500, max: 30000 },
    { name: 'cacheTtl', type: 'number', label: bi('Cache dữ liệu (giây)', 'Data cache (seconds)'), defaultValue: 30, min: 1, max: 3600, admin: { description: bi('Site luôn đúng chỉ với TTL này; webhook chỉ làm mới nhanh hơn.', 'The site is always correct within this TTL; webhooks only refresh faster.') } },
    {
      name: 'categoryMap',
      type: 'array',
      label: bi('Ánh xạ danh mục', 'Category mapping'),
      admin: { description: bi('Đặt tên hiển thị riêng cho danh mục của WIM (để trống thì dùng tên của WIM).', 'Give WIM categories their own display names (empty = use the WIM name).') },
      fields: [
        { name: 'wimCategoryId', type: 'text', label: bi('Mã danh mục WIM', 'WIM category code'), required: true },
        { name: 'label', type: 'text', label: bi('Tên hiển thị trên site', 'Display name on the site'), required: true },
      ],
    },
  ],
}

const json = (body: unknown, status = 200) => Response.json(body, { status })

const readText = async (req: PayloadRequest) => (typeof req.text === 'function' ? req.text() : '')

const endpoints: Endpoint[] = [
  {
    // Luồng C: WIM báo thay đổi (tùy chọn). Sai chữ ký hoặc lệch timestamp > 5 phút thì từ chối.
    path: '/plugins/wim/webhook',
    method: 'post',
    handler: async (req) => {
      const body = await readText(req)
      const cfg = await getWimConfig(req.payload)
      const check = await verifyWebhook(
        cfg?.webhookSecret ?? '',
        req.headers.get('x-hosso-timestamp'),
        req.headers.get('x-hosso-signature'),
        body,
      )
      if (!check.ok) {
        req.payload.logger.warn(`[wim] ${L('webhook bị từ chối', 'webhook rejected')}: ${check.reason}`)
        return json({ error: { code: 'unauthorized', message: check.reason } }, check.reason === 'no_secret' ? 503 : 401)
      }
      let event: any
      try {
        event = JSON.parse(body)
      } catch {
        return json({ error: { code: 'bad_request', message: msg(req, 'Thân không phải JSON', 'The body is not JSON') } }, 400)
      }
      if (event.type === 'order.status_changed' && typeof event.data?.orderId === 'string') {
        const affiliate = (req.payload.config.custom?.hossoPlugins as HossoPlugin[] | undefined)?.find((p) => p.id === 'affiliate')
        if (affiliate?.hooks?.onOrderStatusChanged) {
          try {
            const order = await wimFetch<any>(cfg!, '/v1/orders/' + encodeURIComponent(event.data.orderId))
            await affiliate.hooks.onOrderStatusChanged({ payload: req.payload, source: 'wim', order: { id: order.id, total: order.total, status: order.status }, from: '', to: order.status })
          } catch (error) {
            req.payload.logger.error(error, '[wim] affiliate reconciliation failed')
            return json({ ok: false, error: { code: 'reconciliation_failed' } }, 503)
          }
        }
      }
      return json({ ok: true, refreshed: applyEvent(event) })
    },
  },
  {
    // Luồng D: khách đặt đơn (kiểm tra tồn kho -> Idempotency-Key -> POST /orders; lỗi mạng thì thử lại cùng khóa).
    path: '/plugins/wim/checkout',
    method: 'post',
    handler: async (req) => {
      let body: any
      try {
        body = await req.json?.()
      } catch {
        return json({ ok: false, code: 'bad_request', message: msg(req, 'Yêu cầu không hợp lệ', 'Invalid request') }, 400)
      }
      const result = await placeOrder(req.payload, body ?? {}, req.headers)
      if (result.body.ok) {
        const c = body?.customer
        await emitOrderPlaced(req.payload, { headers: req.headers, order: result.body.order, customer: { name: String(c?.name ?? ''), phone: String(c?.phone ?? ''), address: String(c?.address ?? '') }, fulfillment: { type: body?.fulfillment?.type === 'pickup' ? 'pickup' : 'delivery' }, source: 'wim' })
      }
      return json(result.body, result.status)
    },
  },
  {
    // Nút "Kiểm tra kết nối" trong trang cài đặt (chỉ quản trị viên).
    path: '/plugins/wim/test',
    method: 'post',
    handler: async (req) => {
      if (!isAdmin(req.user)) return json({ ok: false, message: msg(req, 'Cần quyền quản trị viên', 'Administrator access is required') }, 403)
      const cfg = await getWimConfig(req.payload)
      if (!cfg) return json({ ok: false, message: msg(req, 'Chưa đủ địa chỉ API và khóa API (lưu cài đặt trước khi kiểm tra).', 'The API address and key are incomplete (save the settings before testing).') })
      const t0 = Date.now()
      try {
        let branches: { items: Branch[] } | null = null
        try {
          branches = await wimFetch<{ items: Branch[] }>(cfg, '/v1/branches')
        } catch (e) {
          // Bản WIM thật có thể chưa có /v1/branches: thử /v1/products để biết địa chỉ và khóa có dùng được không.
          if (!(e instanceof WimError && e.kind === 'http' && e.status === 404)) throw e
          await wimFetch(cfg, '/v1/products?pageSize=1')
        }
        return json({
          ok: true,
          ms: Date.now() - t0,
          message: branches
            ? msg(req, `Kết nối được, WIM có ${branches.items.length} chi nhánh.`, `Connected; WIM has ${branches.items.length} branches.`)
            : msg(req, 'Kết nối được (đọc được sản phẩm). WIM này chưa có danh sách chi nhánh nên chọn nhận hàng tại chi nhánh sẽ chưa dùng được.', 'Connected (products are readable). This WIM has no branch list yet, so branch pickup is unavailable.'),
        })
      } catch (e) {
        return json({ ok: false, ms: Date.now() - t0, message: e instanceof Error ? e.message : msg(req, 'Lỗi không rõ', 'Unknown error') })
      }
    },
  },
  {
    // Ảnh sản phẩm: WIM chặn nhúng ảnh từ tên miền khác (Cross-Origin-Resource-Policy), nên site tải hộ rồi trả lại cùng tên miền.
    path: '/plugins/wim/image',
    method: 'get',
    handler: async (req) => {
      const id = new URL(req.url!).searchParams.get('id') ?? ''
      const cfg = await getWimConfig(req.payload)
      if (!cfg || !id || id.length > 200) return new Response(null, { status: 404 })
      try {
        const r = await fetch(new URL(`/v1/products/${encodeURIComponent(id)}/image`, cfg.apiUrl).toString(), { headers: { 'X-API-Key': cfg.apiKey }, signal: AbortSignal.timeout(cfg.timeoutMs) })
        const type = r.headers.get('content-type') ?? ''
        if (!r.ok || !type.startsWith('image/')) return new Response(null, { status: 404 })
        return new Response(await r.arrayBuffer(), { headers: { 'Content-Type': type, 'Cache-Control': 'public, max-age=3600', 'X-Content-Type-Options': 'nosniff' } })
      } catch {
        return new Response(null, { status: 404 })
      }
    },
  },
  {
    // Bộ chọn xe gọi site (không gọi WIM trực tiếp).
    path: '/plugins/wim/vehicles/models',
    method: 'get',
    handler: async (req) => {
      const make = new URL(req.url!).searchParams.get('make')
      const cfg = await getWimConfig(req.payload)
      if (!cfg || !make) return json({ items: [] })
      try {
        return json(await wimGet<{ items: Named[] }>(cfg, `/v1/vehicles/makes/${encodeURIComponent(make)}/models`, {}, ['vehicles'], 10))
      } catch {
        return json({ items: [] })
      }
    },
  },
  {
    path: '/plugins/wim/vehicles/years',
    method: 'get',
    handler: async (req) => {
      const model = new URL(req.url!).searchParams.get('model')
      const cfg = await getWimConfig(req.payload)
      if (!cfg || !model) return json({ items: [] })
      try {
        return json(await wimGet<{ items: number[] }>(cfg, `/v1/vehicles/models/${encodeURIComponent(model)}/years`, {}, ['vehicles'], 10))
      } catch {
        return json({ items: [] })
      }
    },
  },
]

/** Phần Payload của plugin: global cài đặt + endpoint. */
export const applyPayload = (config: Config): Config => ({
  ...config,
  globals: [...(config.globals ?? []), WimSettings],
  endpoints: [...(config.endpoints ?? []), ...endpoints],
})
