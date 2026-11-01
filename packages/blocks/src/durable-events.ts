import type { CollectionConfig, CollectionSlug, Config, Payload, PayloadRequest } from 'payload'
import type { HossoPlugin } from './types'
import { inTransaction } from './transactions'
import { CommerceRateBuckets, RATE_BUCKETS } from './rate-limits'

export const EVENT_OUTBOX = 'commerce-events' as CollectionSlug
export const CommerceEvents: CollectionConfig = {
  slug: EVENT_OUTBOX,
  admin: { group: { vi: 'Vận hành', en: 'Operations' }, useAsTitle: 'key', defaultColumns: ['kind', 'consumer', 'state', 'attempts', 'nextAttemptAt'] },
  access: { read: ({ req }) => Boolean((req.user as { roles?: string[] } | null)?.roles?.includes('admin')), create: () => false, update: () => false, delete: () => false },
  fields: [
    { name: 'key', type: 'text', required: true, unique: true },
    { name: 'kind', type: 'select', required: true, options: ['onOrderPaid', 'onOrderStatusChanged'] },
    { name: 'consumer', type: 'text', required: true },
    { name: 'body', type: 'json', required: true },
    { name: 'orderNo', type: 'text', required: true, index: true },
    { name: 'state', type: 'select', required: true, defaultValue: 'pending', options: ['pending', 'processing', 'done', 'failed'] },
    { name: 'attempts', type: 'number', defaultValue: 0 },
    { name: 'nextAttemptAt', type: 'date', index: true },
    { name: 'leaseUntil', type: 'date', index: true },
    { name: 'leaseToken', type: 'text' },
    { name: 'lastError', type: 'text' },
    { name: 'completedAt', type: 'date' },
  ],
}

export function withCommerceEvents(config: Config): Config {
  if (config.collections?.some((collection) => collection.slug === EVENT_OUTBOX)) return config
  return { ...config, collections: [...(config.collections || []), CommerceEvents, CommerceRateBuckets], jobs: { ...config.jobs,
    autoRun: config.jobs?.autoRun ?? [{ cron: '* * * * *', limit: 1, queue: 'default' }],
    tasks: [...(config.jobs?.tasks || []), { slug: 'commerce-event-delivery', schedule: [{ cron: '* * * * *', queue: 'default' }], handler: async ({ req }) => {
      await drainCommerceEvents(req.payload)
      const expired = await req.payload.find({ collection: RATE_BUCKETS as any, where: { expiresAt: { less_than: new Date(Date.now() - 3600000).toISOString() } }, limit: 1000, depth: 0, overrideAccess: true })
      for (const row of expired.docs) await req.payload.delete({ collection: RATE_BUCKETS as any, id: row.id, overrideAccess: true })
      return { output: {} }
    } }],
  } }
}

export async function retryOrderEvents(req: PayloadRequest, orderNo: string) {
  const rows = await req.payload.find({ collection: EVENT_OUTBOX as any, where: { and: [{ state: { equals: 'failed' } }, { orderNo: { equals: orderNo } }] }, limit: 100, depth: 0, req, overrideAccess: true })
  for (const row of rows.docs) await req.payload.update({ collection: EVENT_OUTBOX as any, id: row.id, req, overrideAccess: true, data: { state: 'pending', attempts: 0, leaseUntil: null, nextAttemptAt: new Date().toISOString() } })
}

export async function enqueueCommerceEvent(payload: Payload, kind: 'onOrderPaid' | 'onOrderStatusChanged', input: Record<string, any>, eventId: string, request?: PayloadRequest) {
  if (!payload.config.collections?.some((collection) => String(collection.slug) === EVENT_OUTBOX)) throw new Error('Durable commerce events are not installed')
  const req = request || { payload, headers: new Headers(), context: {} } as PayloadRequest
  const { request: _request, payload: _payload, ...body } = input
  await inTransaction(req, async () => {
    for (const plugin of (payload.config.custom?.hossoPlugins || []) as HossoPlugin[]) {
      if (!plugin.hooks?.[kind]) continue
      const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${kind}:${eventId}:${plugin.id}`)))
      const key = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
      const existing = await payload.find({ collection: EVENT_OUTBOX as any, where: { key: { equals: key } }, limit: 1, depth: 0, req, overrideAccess: true })
      if (existing.docs.length) continue
      await payload.create({ collection: EVENT_OUTBOX as any, data: { key, kind, consumer: plugin.id, body, orderNo: input.orderNo || input.order?.id, state: 'pending', nextAttemptAt: new Date().toISOString() }, req, overrideAccess: true })
    }
  })
}

export async function drainCommerceEvents(payload: Payload, limit = 25) {
  const req = { payload, headers: new Headers(), context: {} } as PayloadRequest
  const now = new Date().toISOString()
  const rows = await payload.find({ collection: EVENT_OUTBOX as any, depth: 0, limit, sort: 'nextAttemptAt', overrideAccess: true,
    where: { or: [{ and: [{ state: { equals: 'pending' } }, { nextAttemptAt: { less_than_equal: now } }] }, { and: [{ state: { equals: 'processing' } }, { leaseUntil: { less_than: now } }] }] } })
  for (const row of rows.docs as any[]) {
    const token = crypto.randomUUID()
    const claimed = await inTransaction(req, () => payload.db.updateOne({ collection: EVENT_OUTBOX, req, where: { and: [{ id: { equals: row.id } }, { state: { equals: row.state } }, ...(row.state === 'processing' ? [{ leaseToken: { equals: row.leaseToken } }] : [])] }, data: { state: 'processing', leaseToken: token, leaseUntil: new Date(Date.now() + 5 * 60000).toISOString(), attempts: (row.attempts || 0) + 1 }, options: { atomic: true } }))
    if (!claimed) continue
    try {
      const plugin = ((payload.config.custom?.hossoPlugins || []) as HossoPlugin[]).find((p) => p.id === row.consumer)
      const handler = plugin?.hooks?.[row.kind as 'onOrderPaid' | 'onOrderStatusChanged']
      if (!handler) throw new Error('Event consumer is unavailable')
      await handler({ ...row.body, payload, eventId: row.key } as any)
      await inTransaction(req, () => payload.db.updateOne({ collection: EVENT_OUTBOX, req, where: { and: [{ id: { equals: row.id } }, { state: { equals: 'processing' } }, { leaseToken: { equals: token } }] }, data: { state: 'done', completedAt: new Date().toISOString(), leaseUntil: null, lastError: null }, options: { atomic: true } }))
    } catch {
      const attempts = (row.attempts || 0) + 1
      await inTransaction(req, () => payload.db.updateOne({ collection: EVENT_OUTBOX, req, where: { and: [{ id: { equals: row.id } }, { leaseToken: { equals: token } }] }, data: { state: attempts >= 20 ? 'failed' : 'pending', leaseUntil: null, nextAttemptAt: new Date(Date.now() + Math.min(3600000, 1000 * 2 ** Math.min(attempts, 12)) + Math.floor(Math.random() * 1000)).toISOString(), lastError: 'Consumer failed; retry from Orders after checking the integration' }, options: { atomic: true } }))
      payload.logger.error({ event: row.key, consumer: row.consumer }, '[commerce] Event delivery pending')
    }
  }
}
