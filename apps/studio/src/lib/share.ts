import { createHmac, timingSafeEqual } from 'crypto'

// Link xem trước bản nháp: `${collection}.${id}.${hết hạn}.${chữ ký HMAC}`, ký bằng HOSSO_SECRET. Chỉ mở được đúng một tài liệu.
const sign = (body: string) => createHmac('sha256', process.env.HOSSO_SECRET || '').update(`share:${body}`).digest('base64url').slice(0, 32)

export const makeShareToken = (collection: string, id: string | number, days = 7) => {
  const body = `${collection}.${id}.${Math.floor(Date.now() / 1000) + days * 86400}`
  return `${body}.${sign(body)}`
}

export const verifyShareToken = (token: unknown, collection: string, id: string | number) => {
  const p = String(token ?? '').split('.')
  if (p.length !== 4 || p[0] !== collection || p[1] !== String(id) || Number(p[2]) < Date.now() / 1000) return false
  const a = Buffer.from(p[3])
  const b = Buffer.from(sign(p.slice(0, 3).join('.')))
  return a.length === b.length && timingSafeEqual(a, b)
}
