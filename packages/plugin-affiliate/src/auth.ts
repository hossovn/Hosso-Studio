// Đăng nhập riêng của cộng tác viên, tách khỏi người dùng admin của Payload (để CTV không bao giờ đọc được bản nháp hay dữ liệu quản trị).
// Chỉ dùng Web Crypto (chạy được ở mọi môi trường): mật khẩu PBKDF2-SHA256, phiên là cookie ký HMAC.

export const SESSION_COOKIE = 'hs_aff'
const SESSION_DAYS = 30
const ITER = 100_000

const enc = new TextEncoder()
const hex = (b: ArrayBuffer | Uint8Array) => [...new Uint8Array(b as ArrayBuffer)].map((x) => x.toString(16).padStart(2, '0')).join('')
const unhex = (s: string) => Uint8Array.from(s.match(/../g) ?? [], (h) => parseInt(h, 16))

const same = (a: string, b: string) => {
  if (a.length !== b.length) return false
  let d = 0
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return d === 0
}

async function pbkdf2(password: string, salt: Uint8Array) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations: ITER }, key, 256))
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  return `${hex(salt)}:${await pbkdf2(password, salt)}`
}

export async function verifyPassword(password: string, stored: string) {
  const [salt, h] = stored.split(':')
  return Boolean(salt && h) && same(await pbkdf2(password, unhex(salt)), h)
}

async function mac(secret: string, data: string) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return hex(await crypto.subtle.sign('HMAC', key, enc.encode(data)))
}

/** Giá trị cookie phiên: `id.hạn.chữ-ký`. */
export async function makeSession(secret: string, id: string | number) {
  const exp = Date.now() + SESSION_DAYS * 86400_000
  return `${id}.${exp}.${await mac(secret, `${id}.${exp}`)}`
}

/** Trả id cộng tác viên nếu cookie hợp lệ và chưa hết hạn. */
export async function readSession(secret: string, headers: Headers): Promise<string | null> {
  const raw = headers.get('cookie')?.split(/;\s*/).find((c) => c.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1)
  const [id, exp, sig] = raw?.split('.') ?? []
  if (!id || !exp || !sig || Number(exp) < Date.now()) return null
  return same(await mac(secret, `${id}.${exp}`), sig) ? id : null
}

export const sessionCookie = (value: string) =>
  `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${value ? SESSION_DAYS * 86400 : 0}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
