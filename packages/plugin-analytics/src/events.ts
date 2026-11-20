import { createLocalReq, type CollectionConfig, type Endpoint, type Payload, type PayloadRequest, type Where } from 'payload'
import { inTransaction } from '@hosso/studio-blocks/transactions'
import { cleanAttribution, cleanExperiments } from '../../blocks/src/attribution'
import { limitedJSON } from '../../blocks/src/request-body'

export const FUNNEL = ['page_view', 'cta_click', 'form_start', 'form_submit', 'qualified_lead', 'view_item', 'add_to_cart', 'begin_checkout', 'order_placed', 'purchase'] as const
const CLIENT_EVENTS = new Set(['page_view', 'cta_click', 'form_start', 'view_item', 'add_to_cart', 'begin_checkout', 'experiment_view'])
const staff = ({ req }: { req: PayloadRequest }) => !!req.user?.roles?.some((role: string) => ['admin', 'publisher'].includes(role))
const COLLECTION = 'analytics-events' as any
const limits = new Map<string, { count: number; until: number }>()

export const AnalyticsEvents: CollectionConfig = {
  slug: COLLECTION, labels: { singular: 'Sự kiện chuyển đổi', plural: 'Sự kiện chuyển đổi' },
  admin: { group: 'Tiếp thị', defaultColumns: ['event', 'pagePath', 'campaign', 'value', 'createdAt'] },
  access: { create: () => false, read: staff, update: () => false, delete: staff },
  fields: [
    { name: 'key', type: 'text', required: true, unique: true },
    { name: 'event', type: 'text', required: true, index: true },
    { name: 'pagePath', type: 'text', index: true },
    { name: 'campaign', type: 'text', index: true },
    { name: 'source', type: 'text' },
    { name: 'session', type: 'text', index: true },
    { name: 'value', type: 'number', min: 0 },
    { name: 'reference', type: 'text' },
    { name: 'experiments', type: 'json' },
    { name: 'experimentKey', type: 'text', index: true },
    { name: 'variant', type: 'text', index: true },
  ],
}

export async function recordEvent(payload: Payload, input: { key: string; event: string; attribution?: unknown; session?: string; value?: number; reference?: string; experiments?: unknown }, req?: PayloadRequest) {
  const request = req || await createLocalReq({}, payload)
  const nested = Boolean(request.transactionID)
  for (let attempt = 0; ; attempt++) {
    try {
      await inTransaction(request, async () => {
        const prior = (await payload.find({ collection: COLLECTION, where: { key: { equals: input.key } }, limit: 1, depth: 0, overrideAccess: true, req: request })).docs[0] as any
        const attribution = cleanAttribution(input.attribution)
        const data = prior ? { key: prior.key, event: prior.event, pagePath: prior.pagePath, campaign: prior.campaign, source: prior.source, session: prior.session, value: prior.value, reference: prior.reference, experiments: cleanExperiments(prior.experiments) } : { key: input.key, event: input.event, pagePath: attribution.pagePath, campaign: attribution.utm_campaign, source: attribution.utm_source, session: input.session, value: input.value, reference: input.reference, experiments: cleanExperiments(input.experiments) }
        if (!prior) await payload.create({ collection: COLLECTION, overrideAccess: true, req: request, data })
        for (const [experimentKey, variant] of Object.entries(data.experiments)) {
          const key = data.event === 'experiment_view' && data.session ? `ab:${experimentKey}:${variant}:${data.session}` : `ab:${experimentKey}:${input.key}`
          const found = await payload.find({ collection: COLLECTION, where: { key: { equals: key } }, limit: 1, depth: 0, overrideAccess: true, req: request })
          if (!found.docs.length) await payload.create({ collection: COLLECTION, overrideAccess: true, req: request, data: { ...data, key, event: `ab_${data.event}`, experimentKey, variant } })
        }
      })
      return
    } catch (error: any) {
      const code = error?.cause?.code || error?.code
      if (nested || attempt >= 2 || !['23505', '40001', 'SQLITE_CONSTRAINT_UNIQUE'].includes(code)) throw error
    }
  }
}

export const collectEvent: Endpoint = { path: '/plugins/analytics/events', method: 'post', handler: async (req) => {
  if (req.headers.get('dnt') === '1' || req.headers.get('sec-gpc') === '1') return new Response(null, { status: 204 })
  const expected = req.payload.config.serverURL || (req.url ? new URL(req.url).origin : '')
  if (req.headers.get('origin') && req.headers.get('origin') !== expected) return new Response(null, { status: 403 })
  if (Number(req.headers.get('content-length') || 0) > 4096) return new Response(null, { status: 413 })
  let input: any
  try { input = await limitedJSON(req, 4096) } catch (error) { return new Response(null, { status: error instanceof RangeError ? 413 : 400 }) }
  if (JSON.stringify(input || {}).length > 4096) return new Response(null, { status: 413 })
  if (!input || input.consent !== true || !CLIENT_EVENTS.has(input.event) || !/^[a-f0-9-]{36}$/i.test(input.id || '') || !/^[a-f0-9-]{36}$/i.test(input.session || '')) return new Response(null, { status: 400 })
  const now = Date.now(), ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
  if (limits.size >= 10000) for (const [key, item] of limits) if (item.until <= now) limits.delete(key)
  const limit = limits.get(ip)
  if (!limit && limits.size >= 10000) return new Response(null, { status: 429 })
  if (limit && limit.until > now && limit.count >= 120) return new Response(null, { status: 429 })
  limits.set(ip, { until: limit && limit.until > now ? limit.until : now + 60_000, count: limit && limit.until > now ? limit.count + 1 : 1 })
  const experiments = cleanExperiments(input.experiments)
  if (input.event === 'experiment_view' && Object.keys(experiments).length !== 1) return new Response(null, { status: 400 })
  try { await recordEvent(req.payload, { key: `client:${input.id}`, event: input.event, attribution: input.attribution, session: input.session, experiments }) }
  catch { return new Response(null, { status: 503 }) }
  return new Response(null, { status: 204 })
} }

export const analyticsReport: Endpoint = { path: '/plugins/analytics/report', method: 'get', handler: async (req) => {
  if (!staff({ req })) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const query = new URL(req.url || '', 'http://localhost').searchParams
  const days = Math.max(1, Math.min(90, Number(query.get('days')) || 30)), campaign = (query.get('campaign') || '').slice(0, 120), page = (query.get('page') || '').slice(0, 300)
  const conditions: Where[] = [{ createdAt: { greater_than_equal: new Date(Date.now() - days * 86400_000).toISOString() } }]
  if (campaign) conditions.push({ campaign: { equals: campaign } })
  if (page) conditions.push({ pagePath: { equals: page } })
  const counts: Record<string, number> = {}
  for (const event of FUNNEL) counts[event] = (await req.payload.count({ collection: COLLECTION, where: { and: [...conditions, { event: { equals: event } }] }, overrideAccess: true, req })).totalDocs
  const experiment = (query.get('experiment') || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100)
  const variants: Record<string, Record<string, number>> = {}
  if (experiment) for (const variant of ['a', 'b']) {
    variants[variant] = {}
    for (const event of ['experiment_view', 'form_submit', 'qualified_lead', 'order_placed', 'purchase']) variants[variant][event] = (await req.payload.count({ collection: COLLECTION, where: { and: [...conditions, { experimentKey: { equals: experiment } }, { variant: { equals: variant } }, { event: { equals: `ab_${event}` } }] }, overrideAccess: true, req })).totalDocs
  }
  return Response.json({ counts, variants, experiment, days, campaign, page, note: 'Lượt sự kiện; form và đơn hàng được xác nhận phía máy chủ. Purchase là đơn đã thanh toán đủ, không phải doanh thu thuần sau hoàn tiền. Dữ liệu đo lường được giữ 90 ngày.' }, { headers: { 'Cache-Control': 'no-store' } })
} }
