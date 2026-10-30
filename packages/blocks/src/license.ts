import type { HossoPlugin } from './types'

// Giấy phép cho plugin thương mại (mã đóng, phân phối riêng). Key là chuỗi đã ký số Ed25519, kiểm tra OFFLINE bằng khóa công khai bên dưới:
//   HLK1.<payload JSON base64url>.<chữ ký base64url>
// payload: { v: 1, tenant, plugins: ["payment", ...] | "*", exp (giây Unix), hosts?: ["shop.vn"] }
// Tùy chọn: đặt HOSSO_LICENSE_SERVER=https://<máy chủ cấp phát> để hỏi online key (có trường id) đã bị thu hồi chưa. Máy chủ không trả lời thì vẫn cho chạy; kết quả được nhớ 5 phút.
// Khách đặt key vào biến môi trường HOSSO_LICENSE_KEY. Khóa riêng (để cấp key) nằm trong repo private của plugin, không nằm ở đây.
// Chạy production (hoặc HOSSO_LICENSE_ENFORCE=1) thì plugin không có giấy phép hợp lệ sẽ tự vô hiệu; chạy dev thì cho dùng thử và chỉ ghi cảnh báo.

const PUBLIC_KEY = '4360E+JcVQWq2pP7iL8BSfekRX+erao2+PWBsCPj3x0='

export type LicenseResult = { ok: boolean; reason?: 'missing' | 'invalid' | 'expired' | 'plugin' | 'host' | 'revoked'; tenant?: string; exp?: number }
type Claims = { v?: number; id?: string; tenant?: string; plugins?: string[] | '*'; exp?: number; hosts?: string[] }

const b64 = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))

let keyPromise: Promise<CryptoKey> | undefined
const publicKey = () => (keyPromise ??= crypto.subtle.importKey('raw', b64(PUBLIC_KEY) as BufferSource, { name: 'Ed25519' }, false, ['verify']))

/** Kiểm tra key cho một plugin: chữ ký, hạn dùng, plugin có trong key, tên miền của site. Kết quả được nhớ 5 phút nên hết hạn có hiệu lực ngay trong lúc chạy. */
const memo = new Map<string, { at: number; r: LicenseResult }>()
export async function checkLicense(pluginId: string, key: string | undefined = process.env.HOSSO_LICENSE_KEY, now = Date.now()): Promise<LicenseResult> {
  const hit = memo.get(`${pluginId}|${key}|${process.env.HOSSO_PUBLIC_URL}`)
  if (hit && now - hit.at < 300_000) return hit.r
  const r = await verify(pluginId, key?.trim(), now)
  memo.set(`${pluginId}|${key}|${process.env.HOSSO_PUBLIC_URL}`, { at: now, r })
  return r
}

async function verify(pluginId: string, key: string | undefined, now: number): Promise<LicenseResult> {
  if (!key) return { ok: false, reason: 'missing' }
  const [tag, body, sig] = key.split('.')
  if (tag !== 'HLK1' || !body || !sig) return { ok: false, reason: 'invalid' }
  let claims: Claims
  try {
    if (!(await crypto.subtle.verify('Ed25519', await publicKey(), b64(sig) as BufferSource, new TextEncoder().encode(body)))) return { ok: false, reason: 'invalid' }
    claims = JSON.parse(new TextDecoder().decode(b64(body)))
  } catch {
    return { ok: false, reason: 'invalid' }
  }
  const base = { tenant: claims.tenant, exp: claims.exp }
  if (!claims.exp || claims.exp * 1000 < now) return { ok: false, reason: 'expired', ...base }
  if (claims.plugins !== '*' && !claims.plugins?.includes(pluginId)) return { ok: false, reason: 'plugin', ...base }
  if (claims.hosts?.length) {
    let host = ''
    try {
      host = new URL(process.env.HOSSO_PUBLIC_URL || 'http://localhost').hostname
    } catch {
      /* URL hỏng: coi như localhost */
    }
    const local = host === 'localhost' || host === '127.0.0.1'
    if (!local && !claims.hosts.some((h) => host === h || host.endsWith(`.${h}`))) return { ok: false, reason: 'host', ...base }
  }
  const server = process.env.HOSSO_LICENSE_SERVER?.replace(/\/+$/, '')
  if (server && claims.id) {
    try {
      const res = await fetch(`${server}/api/check/${encodeURIComponent(claims.id)}`, { signal: AbortSignal.timeout(3000) })
      if (res.ok && ((await res.json()) as { revoked?: boolean }).revoked) return { ok: false, reason: 'revoked', ...base }
    } catch {
      /* máy chủ cấp phát không trả lời: không phạt khách */
    }
  }
  return { ok: true, ...base }
}

const enforced = () => process.env.NODE_ENV === 'production' || process.env.HOSSO_LICENSE_ENFORCE === '1'
let warned = false

/** Plugin có được chạy không: có key hợp lệ, hoặc đang chạy dev (không ép giấy phép). */
export async function licensed(pluginId: string): Promise<boolean> {
  if ((await checkLicense(pluginId)).ok) return true
  if (enforced()) return false
  if (!warned) {
    warned = true
    console.warn(`[license] Plugin thương mại "${pluginId}" chạy thử ở chế độ dev, chưa có HOSSO_LICENSE_KEY hợp lệ. Production cần giấy phép.`)
  }
  return true
}

const WHY: Record<string, string> = { missing: 'chưa có HOSSO_LICENSE_KEY', invalid: 'key không hợp lệ', expired: 'key đã hết hạn', plugin: 'key không gồm plugin này', host: 'key không dùng cho tên miền này', revoked: 'key đã bị thu hồi' }

/**
 * Bọc plugin thương mại bằng kiểm tra giấy phép: hook, endpoint, loader và tìm kiếm của plugin chỉ chạy khi `licensed(id)`;
 * dashboard admin có thêm bước "Giấy phép". Plugin mã đóng gọi `export default withLicense(plugin)`.
 */
export function withLicense(plugin: HossoPlugin): HossoPlugin {
  const id = plugin.id
  const wrap = <A extends unknown[], R>(fn: ((...a: A) => Promise<R>) | undefined, off: R) => (fn ? async (...a: A) => ((await licensed(id)) ? fn(...a) : off) : undefined)
  const hooks = plugin.hooks
  return {
    ...plugin,
    manifest: plugin.manifest && { ...plugin.manifest, commercial: true },
    hooks: hooks && {
      beforeOrder: wrap(hooks.beforeOrder, undefined),
      onOrderPlaced: wrap(hooks.onOrderPlaced, undefined),
      onOrderStatusChanged: wrap(hooks.onOrderStatusChanged, undefined),
      onOrderPaid: wrap(hooks.onOrderPaid, undefined),
      describeOrder: wrap(hooks.describeOrder, undefined),
    },
    readOrder: plugin.readOrder && (async (...args) => {
      if (!(await licensed(id))) throw new Error('Plugin license required for order reconciliation')
      return plugin.readOrder!(...args)
    }),
    search: wrap(plugin.search, []),
    sitemap: wrap(plugin.sitemap, []),
    loaders: plugin.loaders && Object.fromEntries(Object.entries(plugin.loaders).map(([k, fn]) => [k, async (...a: Parameters<typeof fn>) => ((await licensed(id)) ? fn(...a) : { status: 'unlicensed' })])),
    // Endpoint do plugin thêm vào Payload: không có giấy phép thì trả 402.
    payload:
      plugin.payload &&
      ((config) => {
        const out = plugin.payload!(config)
        const before = new Set(config.endpoints ?? [])
        return {
          ...out,
          endpoints: (out.endpoints ?? []).map((e) =>
            before.has(e) ? e : { ...e, handler: async (req) => ((await licensed(id)) ? e.handler(req) : Response.json({ ok: false, code: 'license', message: 'Plugin chưa có giấy phép hợp lệ.' }, { status: 402 })) },
          ),
        }
      }),
    checklist: async (payload) => {
      const r = await checkLicense(id)
      const own = (await plugin.checklist?.(payload)) ?? []
      return [...own, { label: `Giấy phép plugin ${plugin.manifest?.name.vi ?? id}${r.ok ? '' : ` (${WHY[r.reason ?? 'missing']})`}`, done: r.ok || !enforced(), href: '/admin/plugins' }]
    },
  }
}
