'use server'
import config from '@payload-config'
import { loaderFor } from '@/lib/site'
import { headers } from 'next/headers'
import { getPayload } from 'payload'

/** Dữ liệu thật cho block có loader trong khung xem trước của editor (chỉ người đã đăng nhập). */
export async function loadBlockData(type: string, props: Record<string, unknown>, locale: string): Promise<unknown> {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) return { status: 'error', kind: 'unauthorized' }
  const load = loaderFor(type)
  if (!load) return undefined
  try {
    return await load(props, { payload, searchParams: {}, cookies: {}, locale })
  } catch {
    return { status: 'error', kind: 'internal' }
  }
}
