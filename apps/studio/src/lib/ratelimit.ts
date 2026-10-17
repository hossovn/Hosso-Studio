// Giới hạn tần suất đơn giản trong bộ nhớ (đủ cho một cài đặt = một site, một tiến trình).
type Bucket = { count: number; reset: number }
const g = globalThis as unknown as { __hossoRate?: Map<string, Bucket> }
const buckets = (g.__hossoRate ??= new Map())

/** Trả true nếu còn trong hạn mức; false khi vượt `max` lần trong `windowMs`. */
export function allow(key: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  const b = buckets.get(key)
  if (!b || b.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs })
    return true
  }
  b.count++
  return b.count <= max
}

export const clientIp = (headers: Headers) => headers.get('x-forwarded-for')?.split(',')[0].trim() || headers.get('x-real-ip') || 'local'
