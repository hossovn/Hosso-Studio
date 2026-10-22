import { L } from './lang'
import type { components } from './api/schema'
import { cached } from './cache'
import type { WimConfig } from './config'

export type Product = components['schemas']['Product']
export type Availability = components['schemas']['Availability']
export type Branch = components['schemas']['Branch']
export type Named = components['schemas']['Named']
export type Order = components['schemas']['Order']
export type CreateOrder = components['schemas']['CreateOrder']
export type ProductPage = components['schemas']['ProductPage']

export type WimErrorKind = 'unconfigured' | 'timeout' | 'network' | 'http'

export class WimError extends Error {
  constructor(
    public kind: WimErrorKind,
    message: string,
    public status?: number,
    public code?: string,
    public body?: any,
  ) {
    super(message)
  }
}

type Opts = { query?: Record<string, string | number | undefined>; method?: 'GET' | 'POST'; body?: unknown; headers?: Record<string, string> }

/** Gọi WIM từ server. Trình duyệt không bao giờ gọi trực tiếp. */
export async function wimFetch<T>(cfg: WimConfig, path: string, opts: Opts = {}): Promise<T> {
  const url = new URL(`${cfg.apiUrl.replace(/\/$/, '')}${path}`)
  for (const [k, v] of Object.entries(opts.query ?? {})) if (v !== undefined && v !== '') url.searchParams.set(k, String(v))

  let res: Response
  try {
    res = await fetch(url, {
      method: opts.method ?? 'GET',
      headers: { 'X-API-Key': cfg.apiKey, Accept: 'application/json', ...(opts.body ? { 'Content-Type': 'application/json' } : {}), ...opts.headers },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: AbortSignal.timeout(cfg.timeoutMs),
      cache: 'no-store',
    })
  } catch (e) {
    const timeout = e instanceof Error && (e.name === 'TimeoutError' || e.name === 'AbortError')
    throw new WimError(timeout ? 'timeout' : 'network', timeout ? L('WIM phản hồi quá chậm', 'WIM responded too slowly') : L('Không kết nối được WIM', 'Could not connect to WIM'))
  }
  const text = await res.text()
  const body = text ? safeJson(text) : undefined
  if (!res.ok) throw new WimError('http', body?.error?.message ?? L(`WIM trả ${res.status}`, `WIM returned ${res.status}`), res.status, body?.error?.code, body)
  return body as T
}

const safeJson = (t: string) => {
  try {
    return JSON.parse(t)
  } catch {
    return undefined
  }
}

const isTransient = (e: unknown) => !(e instanceof WimError) || e.kind !== 'http' || (e.status ?? 500) >= 500

/** GET có cache TTL ngắn; `tags` để webhook làm mới đúng mục. `ttlFactor` cho dữ liệu ít đổi (xe, danh mục). */
export function wimGet<T>(cfg: WimConfig, path: string, query: Opts['query'], tags: string[], ttlFactor = 1): Promise<T> {
  const key = `${cfg.apiUrl}${path}?${new URLSearchParams(Object.entries(query ?? {}).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, String(v)])).toString()}`
  return cached(key, cfg.cacheTtl * ttlFactor, tags, () => wimFetch<T>(cfg, path, { query }), isTransient)
}
