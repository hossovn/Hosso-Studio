'use server'
import config from '@payload-config'
import { loaderFor } from '@/lib/site'
import { headers } from 'next/headers'
import { getPayload } from 'payload'
import { editorPreviewParams } from '@hosso/studio-blocks'

/** Dữ liệu thật cho block có loader trong khung xem trước của editor (chỉ người đã đăng nhập). */
export async function loadBlockData(type: string, props: Record<string, unknown>, locale: string, preview?: unknown): Promise<unknown> {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) return { status: 'error', kind: 'unauthorized' }
  const load = loaderFor(type)
  if (!load) return undefined
  try {
    // Simulated identity stays client-side; never forward customer-session cookies.
    return await load(props, { payload, searchParams: editorPreviewParams(type, preview), cookies: {}, locale })
  } catch {
    return { status: 'error', kind: 'internal' }
  }
}

export async function listPreviewProducts(source: 'shop' | 'wim', query: string, locale: string): Promise<{ items: { value: string; label: string }[]; error?: string }> {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) return { items: [], error: 'unauthorized' }
  if (!['shop', 'wim'].includes(source) || typeof query !== 'string' || query.length > 200) return { items: [], error: 'invalid_request' }
  const load = loaderFor(source === 'shop' ? 'ShopProductGrid' : 'WimProductGrid')
  if (!load) return { items: [], error: 'unavailable' }
  try {
    const data = await load({ pageSize: 30, pager: source === 'shop' ? 'yes' : 'no', useSelectedVehicle: 'no' }, { payload, searchParams: { q: query.trim() }, cookies: {}, locale }) as { status?: string; kind?: string; items?: { id: string | number; slug?: string; name: string; code?: string }[] }
    if (data.status !== 'ok' || !Array.isArray(data.items)) return { items: [], error: data.kind || data.status || 'internal' }
    return { items: data.items.map((p) => ({ value: source === 'shop' ? p.slug || String(p.id) : String(p.id), label: p.code ? `${p.name} (${p.code})` : p.name })) }
  } catch {
    return { items: [], error: 'internal' }
  }
}
