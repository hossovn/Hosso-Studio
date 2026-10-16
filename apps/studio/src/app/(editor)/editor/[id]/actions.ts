'use server'
import config from '@payload-config'
import hosso from '@hosso-config'
import { headers } from 'next/headers'
import { getPayload } from 'payload'

/** Dữ liệu thật cho block của plugin trong khung xem trước của editor (chỉ người đã đăng nhập). */
export async function loadBlockData(type: string, props: Record<string, unknown>): Promise<unknown> {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) return { status: 'error', kind: 'unauthorized' }
  const load = hosso.plugins.find((p) => p.loaders?.[type])?.loaders?.[type]
  if (!load) return undefined
  try {
    return await load(props, { payload, searchParams: {}, cookies: {} })
  } catch {
    return { status: 'error', kind: 'internal' }
  }
}
