// Cache TTL ngắn trong bộ nhớ. Dùng globalThis vì Next tách bundle route API và trang (mỗi bên một bản module).
type Entry = { value: unknown; expires: number; tags: string[] }
type Store = { entries: Map<string, Entry>; inflight: Map<string, Promise<unknown>> }

const g = globalThis as unknown as { __hossoWimCache?: Store }
const store: Store = (g.__hossoWimCache ??= { entries: new Map(), inflight: new Map() })

const STALE_MS = 10 * 60_000 // giữ bản cũ tối đa 10 phút để dùng khi WIM lỗi

/**
 * Trả cache còn hạn; hết hạn thì gọi `fetcher`. Nếu WIM lỗi mà còn bản cũ, trả bản cũ (stale-while-error).
 * Các lần gọi đồng thời cùng khóa dùng chung một request.
 */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  tags: string[],
  fetcher: () => Promise<T>,
  /** Chỉ dùng bản cũ cho lỗi tạm thời (timeout, mạng, 5xx); 404/4xx là câu trả lời thật của WIM. */
  staleOn: (err: unknown) => boolean = () => true,
): Promise<T> {
  const now = Date.now()
  const hit = store.entries.get(key)
  if (hit && hit.expires > now) return hit.value as T

  const pending = store.inflight.get(key)
  if (pending) return pending as Promise<T>

  const p = fetcher()
    .then((value) => {
      store.entries.set(key, { value, expires: Date.now() + ttlSeconds * 1000, tags })
      return value
    })
    .catch((err) => {
      if (hit && staleOn(err) && hit.expires + STALE_MS > Date.now()) return hit.value as T
      throw err
    })
    .finally(() => store.inflight.delete(key))
  store.inflight.set(key, p)
  return p
}

/** Xóa mọi mục gắn thẻ này (webhook dùng để làm mới nhanh đúng sản phẩm). Trả số mục đã xóa. */
export function invalidateTag(tag: string): number {
  let n = 0
  for (const [key, e] of store.entries) {
    if (e.tags.includes(tag)) {
      store.entries.delete(key)
      n++
    }
  }
  return n
}

export const clearCache = () => store.entries.clear()
