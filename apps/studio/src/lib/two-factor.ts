import hosso from '@hosso-config'
import { APIError, type CollectionBeforeLoginHook, type Endpoint } from 'payload'

import { allow, clientIp } from './ratelimit'
import { newSecret, otpauthUri, seal, unseal, verifyTotp } from './totp'

const json = (body: unknown, status = 200) => Response.json(body, { status })
const cookieOf = (headers: Headers, name: string) => headers.get('cookie')?.split(/;\s*/).find((c) => c.startsWith(`${name}=`))?.slice(name.length + 1)

/** Đăng nhập: nếu tài khoản đã bật 2FA thì bắt buộc mã 6 số (ô nhập ở màn đăng nhập ghi vào cookie hs_totp). */
export const requireTwoFactor: CollectionBeforeLoginHook = async ({ user, req }) => {
  const u = user as { twoFactorEnabled?: boolean; twoFactorSecret?: string; email?: string }
  if (!u.twoFactorEnabled || !u.twoFactorSecret) return
  const code = req.headers ? decodeURIComponent(cookieOf(req.headers, 'hs_totp') ?? '') : ''
  if (!allow(`totp:${u.email}:${clientIp(req.headers)}`, 8, 10 * 60_000)) throw new APIError('Nhập sai mã quá nhiều lần. Thử lại sau 10 phút.', 429)
  if (!code) throw new APIError('Tài khoản này bật xác thực hai lớp: nhập mã 6 số từ ứng dụng xác thực.', 401)
  if (!verifyTotp(unseal(u.twoFactorSecret), code)) throw new APIError('Mã xác thực không đúng hoặc đã hết hạn.', 401)
}

const need = (req: { user?: unknown }) => (req.user ? null : json({ ok: false, error: 'unauthorized' }, 401))

/** POST /api/users/2fa/setup: tạo bí mật mới (chưa bật) và trả khóa để nhập vào ứng dụng xác thực. */
const setup: Endpoint = {
  path: '/2fa/setup',
  method: 'post',
  handler: async (req) => {
    const denied = need(req)
    if (denied) return denied
    const user = req.user as { id: number | string; email: string }
    const secret = newSecret()
    await req.payload.update({ collection: 'users', id: user.id, data: { twoFactorPending: seal(secret) } as never, overrideAccess: true })
    return json({ ok: true, secret, uri: otpauthUri(secret, user.email, hosso.brand.name) })
  },
}

/** POST /api/users/2fa/enable {code}: xác nhận mã đầu tiên rồi mới bật. */
const enable: Endpoint = {
  path: '/2fa/enable',
  method: 'post',
  handler: async (req) => {
    const denied = need(req)
    if (denied) return denied
    const user = req.user as { id: number | string }
    const body = (await req.json?.().catch(() => ({}))) as { code?: string }
    const doc = (await req.payload.findByID({ collection: 'users', id: user.id, depth: 0, overrideAccess: true, showHiddenFields: true })) as { twoFactorPending?: string }
    if (!doc.twoFactorPending) return json({ ok: false, error: 'no_setup' }, 400)
    if (!verifyTotp(unseal(doc.twoFactorPending), String(body.code ?? ''))) return json({ ok: false, error: 'bad_code' }, 400)
    await req.payload.update({ collection: 'users', id: user.id, data: { twoFactorEnabled: true, twoFactorSecret: doc.twoFactorPending, twoFactorPending: null } as never, overrideAccess: true })
    return json({ ok: true })
  },
}

/** POST /api/users/2fa/disable {code}: tắt, cần mã hiện tại. */
const disable: Endpoint = {
  path: '/2fa/disable',
  method: 'post',
  handler: async (req) => {
    const denied = need(req)
    if (denied) return denied
    const user = req.user as { id: number | string }
    const body = (await req.json?.().catch(() => ({}))) as { code?: string }
    const doc = (await req.payload.findByID({ collection: 'users', id: user.id, depth: 0, overrideAccess: true, showHiddenFields: true })) as { twoFactorSecret?: string }
    if (!doc.twoFactorSecret || !verifyTotp(unseal(doc.twoFactorSecret), String(body.code ?? ''))) return json({ ok: false, error: 'bad_code' }, 400)
    await req.payload.update({ collection: 'users', id: user.id, data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorPending: null } as never, overrideAccess: true })
    return json({ ok: true })
  },
}

/** GET /api/users/2fa/status */
const status: Endpoint = {
  path: '/2fa/status',
  method: 'get',
  handler: async (req) => {
    const denied = need(req)
    if (denied) return denied
    const doc = (await req.payload.findByID({ collection: 'users', id: (req.user as { id: number | string }).id, depth: 0, overrideAccess: true })) as { twoFactorEnabled?: boolean }
    return json({ ok: true, enabled: Boolean(doc.twoFactorEnabled) })
  },
}

export const twoFactorEndpoints = [setup, enable, disable, status]
