import type { Config, Endpoint, FieldHook, GlobalConfig, PayloadRequest } from 'payload'
import { wimGet } from './client'
import { MASK, SETTINGS_SLUG, clearConfigMemo, getWimConfig } from './config'
import { encryptSecret, isEncrypted } from './crypto'
import { placeOrder } from './checkout'
import { applyEvent, verifyWebhook } from './webhook'
import { wimFetch } from './client'
import type { Branch, Named } from './client'

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

const secretField = (name: string, label: string, description: string) => ({
  name,
  type: 'text' as const,
  label,
  admin: { description: `${description} Lưu dạng mã hóa; để nguyên ô che để giữ giá trị hiện có.` },
  hooks: { beforeChange: [secretBeforeChange], afterRead: [secretAfterRead] },
})

export const WimSettings: GlobalConfig = {
  slug: SETTINGS_SLUG,
  label: 'Kết nối Hosso WIM',
  admin: { group: 'Hệ thống' },
  access: { read: ({ req }) => isAdmin(req.user), update: ({ req }) => isAdmin(req.user) },
  hooks: { afterChange: [() => clearConfigMemo()] },
  fields: [
    {
      name: 'testConnection',
      type: 'ui',
      admin: { components: { Field: '@hosso/plugin-wim/admin#TestConnection' } },
    },
    { name: 'apiUrl', type: 'text', label: 'Địa chỉ API WIM', admin: { description: 'Ví dụ http://localhost:4010. Biến môi trường HOSSO_WIM_API_URL (nếu có) được ưu tiên.', placeholder: 'http://localhost:4010' } },
    secretField('apiKey', 'Khóa API', 'Biến môi trường HOSSO_WIM_API_KEY (nếu có) được ưu tiên.'),
    secretField('webhookSecret', 'Bí mật webhook', 'Dùng để kiểm tra chữ ký webhook; tùy chọn. Biến HOSSO_WIM_WEBHOOK_SECRET được ưu tiên.'),
    { name: 'timeoutMs', type: 'number', label: 'Thời gian chờ WIM (ms)', defaultValue: 5000, min: 500, max: 30000 },
    { name: 'cacheTtl', type: 'number', label: 'Cache dữ liệu (giây)', defaultValue: 30, min: 1, max: 3600, admin: { description: 'Site luôn đúng chỉ với TTL này; webhook chỉ làm mới nhanh hơn.' } },
    {
      name: 'categoryMap',
      type: 'array',
      label: 'Ánh xạ danh mục',
      admin: { description: 'Đặt tên hiển thị riêng cho danh mục của WIM (để trống thì dùng tên của WIM).' },
      fields: [
        { name: 'wimCategoryId', type: 'text', label: 'Mã danh mục WIM', required: true },
        { name: 'label', type: 'text', label: 'Tên hiển thị trên site', required: true },
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
        req.payload.logger.warn(`[wim] webhook bị từ chối: ${check.reason}`)
        return json({ error: { code: 'unauthorized', message: check.reason } }, check.reason === 'no_secret' ? 503 : 401)
      }
      let event: any
      try {
        event = JSON.parse(body)
      } catch {
        return json({ error: { code: 'bad_request', message: 'Thân không phải JSON' } }, 400)
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
        return json({ ok: false, code: 'bad_request', message: 'Yêu cầu không hợp lệ' }, 400)
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
      if (!isAdmin(req.user)) return json({ ok: false, message: 'Cần quyền quản trị viên' }, 403)
      const cfg = await getWimConfig(req.payload)
      if (!cfg) return json({ ok: false, message: 'Chưa đủ địa chỉ API và khóa API (lưu cài đặt trước khi kiểm tra).' })
      const t0 = Date.now()
      try {
        const branches = await wimFetch<{ items: Branch[] }>(cfg, '/v1/branches')
        return json({ ok: true, ms: Date.now() - t0, message: `Kết nối được, WIM có ${branches.items.length} chi nhánh.` })
      } catch (e) {
        return json({ ok: false, ms: Date.now() - t0, message: e instanceof Error ? e.message : 'Lỗi không rõ' })
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
