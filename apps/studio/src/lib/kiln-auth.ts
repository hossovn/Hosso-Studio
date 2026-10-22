// Xác thực cho Kiln/WIM gọi vào site: token dịch vụ và token SSO. Thuần node:crypto để test được không cần Payload (scripts/test-kiln.mjs).
import { createHash, createPublicKey, timingSafeEqual, verify } from 'node:crypto'

const sha = (s: string) => createHash('sha256').update(s).digest()

/** `Authorization: Bearer <HOSSO_SERVICE_TOKEN>`. Token dưới 32 ký tự bị từ chối để không ai đặt khóa yếu. */
export function serviceTokenOk(header: string | null | undefined, token = process.env.HOSSO_SERVICE_TOKEN) {
  if (!token || token.length < 32 || !header?.startsWith('Bearer ')) return false
  return timingSafeEqual(sha(header.slice(7)), sha(token))
}

export type SsoClaims = { sub: string; aud: string; tenant?: string; iat: number; exp: number; jti: string }
export type SsoResult = { ok: true; claims: SsoClaims } | { ok: false; reason: string }

const SPKI_ED25519 = Buffer.from('302a300506032b6570032100', 'hex')
const MAX_LIFETIME = 120 // giây
// ponytail: bộ nhớ trong một tiến trình; site chạy nhiều bản sao thì chuyển sang bảng DB.
const usedJti = new Map<string, number>()

/**
 * JWT EdDSA (Ed25519). Khóa công khai là 32 byte base64 (HOSSO_SSO_PUBLIC_KEY); chỉ Kiln/WIM giữ khóa riêng.
 * Từ chối: sai chữ ký/thuật toán, `aud` khác tên miền site, hết hạn, sống quá 120 giây, dùng lại `jti`.
 */
export function verifySsoToken(token: string, opts: { publicKey: string | undefined; audience: string; now?: number; used?: Map<string, number> }): SsoResult {
  const no = (reason: string): SsoResult => ({ ok: false, reason })
  if (!opts.publicKey || !opts.audience) return no('not_configured')
  const parts = token.split('.')
  if (parts.length !== 3) return no('malformed')
  const [h, p, s] = parts
  let claims: SsoClaims
  try {
    if (JSON.parse(Buffer.from(h, 'base64url').toString()).alg !== 'EdDSA') return no('alg')
    const key = createPublicKey({ key: Buffer.concat([SPKI_ED25519, Buffer.from(opts.publicKey, 'base64')]), format: 'der', type: 'spki' })
    if (!verify(null, Buffer.from(`${h}.${p}`), key, Buffer.from(s, 'base64url'))) return no('signature')
    claims = JSON.parse(Buffer.from(p, 'base64url').toString())
  } catch {
    return no('malformed')
  }
  const now = Math.floor((opts.now ?? Date.now()) / 1000)
  if (typeof claims.sub !== 'string' || !claims.sub || typeof claims.jti !== 'string' || !claims.jti) return no('claims')
  if (claims.aud !== opts.audience) return no('audience')
  if (!(claims.exp > now)) return no('expired')
  if (!(claims.iat <= now + 5) || claims.exp - claims.iat > MAX_LIFETIME) return no('lifetime')
  const used = opts.used ?? usedJti
  for (const [id, exp] of used) if (exp <= now) used.delete(id)
  if (used.has(claims.jti)) return no('replay')
  used.set(claims.jti, claims.exp)
  return { ok: true, claims }
}
