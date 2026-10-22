import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto'

// Xác thực hai lớp bằng mã 6 số (TOTP, RFC 6238) tương thích Google Authenticator, Microsoft Authenticator, Authy. Không cần thư viện ngoài.
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export const newSecret = () => {
  const bytes = randomBytes(20)
  let bits = ''
  for (const b of bytes) bits += b.toString(2).padStart(8, '0')
  let out = ''
  for (let i = 0; i + 5 <= bits.length; i += 5) out += B32[parseInt(bits.slice(i, i + 5), 2)]
  return out
}

const fromBase32 = (s: string) => {
  let bits = ''
  for (const c of s.replace(/=+$/, '').toUpperCase()) {
    const v = B32.indexOf(c)
    if (v >= 0) bits += v.toString(2).padStart(5, '0')
  }
  const bytes: number[] = []
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2))
  return Buffer.from(bytes)
}

const hotp = (secret: string, counter: number) => {
  const buf = Buffer.alloc(8)
  buf.writeBigUInt64BE(BigInt(counter))
  const h = createHmac('sha1', fromBase32(secret)).update(buf).digest()
  const o = h[h.length - 1] & 0xf
  const n = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]
  return String(n % 1_000_000).padStart(6, '0')
}

/** Đúng nếu mã khớp trong cửa sổ ±1 bước (30 giây) để chịu lệch đồng hồ. */
export const verifyTotp = (secret: string, code: string, now = Date.now()) => {
  const c = String(code ?? '').replace(/\s+/g, '')
  if (!/^\d{6}$/.test(c)) return false
  const step = Math.floor(now / 30_000)
  return [-1, 0, 1].some((d) => hotp(secret, step + d) === c)
}

export const otpauthUri = (secret: string, account: string, issuer: string) =>
  `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&digits=6&period=30`

// Mã hóa bí mật khi lưu (AES-256-GCM, khóa HOSSO_ENCRYPTION_KEY dạng hex 64 ký tự, giống các bí mật khác của site).
const key = () => {
  const k = process.env.HOSSO_ENCRYPTION_KEY ?? ''
  if (!/^[0-9a-f]{64}$/i.test(k)) throw new Error('HOSSO_ENCRYPTION_KEY phải là 64 ký tự hex')
  return Buffer.from(k, 'hex')
}
export const seal = (plain: string) => {
  const iv = randomBytes(12)
  const c = createCipheriv('aes-256-gcm', key(), iv)
  const enc = Buffer.concat([c.update(plain, 'utf8'), c.final()])
  return `${iv.toString('hex')}.${c.getAuthTag().toString('hex')}.${enc.toString('hex')}`
}
export const unseal = (sealed: string) => {
  const [iv, tag, enc] = sealed.split('.')
  const d = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'hex'))
  d.setAuthTag(Buffer.from(tag, 'hex'))
  return Buffer.concat([d.update(Buffer.from(enc, 'hex')), d.final()]).toString('utf8')
}
