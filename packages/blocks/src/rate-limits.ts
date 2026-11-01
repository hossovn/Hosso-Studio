import type { CollectionConfig, PayloadRequest } from 'payload'
import { inTransaction } from './transactions'

export const RATE_BUCKETS = 'commerce-rate-buckets'
export const CommerceRateBuckets: CollectionConfig = {
  slug: RATE_BUCKETS, admin: { hidden: true },
  access: { read: () => false, create: () => false, update: () => false, delete: () => false },
  fields: [{ name: 'key', type: 'text', required: true, unique: true }, { name: 'count', type: 'number', defaultValue: 0 }, { name: 'expiresAt', type: 'date', index: true }],
}

export function clientPrincipal(req: PayloadRequest) {
  // Only use a forwarding header that the deployment proxy overwrites; never trust it by default.
  const header = process.env.HOSSO_CLIENT_IP_HEADER
  return header ? (req.headers.get(header)?.split(',')[0].trim().slice(0, 100) || 'unknown') : 'shared-ingress'
}
export async function takeCommerceLimit(req: PayloadRequest, scope: string, principal: string, maximum: number, windowMs = 60000) {
  if (!req.payload.config.collections?.some(collection => String(collection.slug) === RATE_BUCKETS)) throw new Error('Commerce rate limiting is not installed')
  const window = Math.floor(Date.now() / windowMs)
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${scope}:${principal}:${window}`)))
  const key = Array.from(digest, b => b.toString(16).padStart(2, '0')).join('')
  try { return await inTransaction(req, async () => {
    const bucket = (await req.payload.find({ collection: RATE_BUCKETS as any, where: { key: { equals: key } }, limit: 1, depth: 0, overrideAccess: true, req })).docs[0] as any
    if (!bucket) {
      await req.payload.create({ collection: RATE_BUCKETS as any, req, overrideAccess: true, data: { key, count: 1, expiresAt: new Date((window + 1) * windowMs).toISOString() } }); return true
    }
    if (bucket.count >= maximum) return false
    return Boolean(await req.payload.db.updateOne({ collection: RATE_BUCKETS as any, req, where: { and: [{ id: { equals: bucket.id } }, { count: { equals: bucket.count } }] }, data: { count: bucket.count + 1 }, options: { atomic: true } }))
  }) } catch (error) {
    // A concurrent first insert loses the unique-key race. Deny this request; never bypass limits.
    const code = (error as any)?.code || (error as any)?.cause?.code
    if (['23505', 'SQLITE_CONSTRAINT_UNIQUE'].includes(code)) return false
    throw error
  }
}
