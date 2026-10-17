import type { Config, Endpoint, FieldHook, GlobalConfig, PayloadRequest } from 'payload'
import { wimGet } from './client'
import { MASK, SETTINGS_SLUG, clearConfigMemo, getWimConfig } from './config'
import { encryptSecret, isEncrypted } from './crypto'
import { placeOrder } from './checkout'
import { applyEvent, verifyWebhook } from './webhook'
import { wimFetch } from './client'
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
      const result = await placeOrder(req.payload, body ?? {})
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
        const branches = await wimFetch<{ items: Branch[] }>(cfg, '/v1/branches')
        return json({ ok: true, ms: Date.now() - t0, message: msg(req, `Kết nối được, WIM có ${branches.items.length} chi nhánh.`, `Connected; WIM has ${branches.items.length} branches.`) })
      } catch (e) {
        return json({ ok: false, ms: Date.now() - t0, message: e instanceof Error ? e.message : msg(req, 'Lỗi không rõ', 'Unknown error') })
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
