import { invalidateTag } from './cache'

const MAX_SKEW_SECONDS = 300 // 5 phút

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')

export async function sign(secret: string, timestamp: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${body}`)))
}

// So sánh thời gian không đổi.
const same = (a: string, b: string) => {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export type WebhookCheck = { ok: true } | { ok: false; reason: 'no_secret' | 'bad_timestamp' | 'stale_timestamp' | 'bad_signature' }

/** Chữ ký = HMAC-SHA256(secret, timestamp + "." + thân thô); timestamp (giây) không được lệch quá 5 phút. */
export async function verifyWebhook(secret: string, timestamp: string | null, signature: string | null, body: string): Promise<WebhookCheck> {
  if (!secret) return { ok: false, reason: 'no_secret' }
  const ts = Number(timestamp)
  if (!timestamp || !Number.isFinite(ts)) return { ok: false, reason: 'bad_timestamp' }
  if (Math.abs(Date.now() / 1000 - ts) > MAX_SKEW_SECONDS) return { ok: false, reason: 'stale_timestamp' }
  const expected = await sign(secret, timestamp, body)
  return signature && same(expected, signature.toLowerCase()) ? { ok: true } : { ok: false, reason: 'bad_signature' }
}

/** Làm mới đúng mục cache bị ảnh hưởng. Trả số mục đã xóa. */
export function applyEvent(event: { type?: string; data?: { productId?: string; orderId?: string } }): number {
  const { type, data } = event
  if (type === 'product.updated' && data?.productId) return invalidateTag(`product:${data.productId}`) + invalidateTag('list')
  if (type === 'stock.changed' && data?.productId) return invalidateTag(`product:${data.productId}`)
  if (type === 'order.status_changed' && data?.orderId) return invalidateTag(`order:${data.orderId}`)
  return 0
}
