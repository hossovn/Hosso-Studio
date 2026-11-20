import definition from './browser'
import { withLicense } from '@hosso/studio-blocks'
import type { HossoPlugin } from '@hosso/studio-blocks'
import type { Config, Endpoint, GlobalConfig } from 'payload'
import { AnalyticsEvents, analyticsReport, collectEvent, recordEvent } from './events'
import { enqueueLeadEvent, recordAnalyticsTask } from './jobs'
import { allowsServerAnalytics, cleanAttribution, cleanExperiments } from '../../blocks/src/attribution'

type Roled = { roles?: string[] | null } | null | undefined
const isAdmin = ({ req }: { req: { user?: unknown } }) => Boolean((req.user as Roled)?.roles?.includes('admin'))
const bi = (vi: string, en: string) => ({ vi, en })
const SETTINGS = 'analytics-settings'

const Settings: GlobalConfig = {
  slug: SETTINGS,
  label: bi('Theo dõi và quảng cáo', 'Analytics and ads'),
  admin: { group: bi('Tiếp thị', 'Marketing') },
  access: { read: isAdmin, update: isAdmin },
  fields: [
    { name: 'ga4Id', type: 'text', label: bi('Google Analytics 4 (mã G-XXXXXXXXXX)', 'Google Analytics 4 (G-XXXXXXXXXX ID)') },
    { name: 'fbPixelId', type: 'text', label: bi('Meta (Facebook) Pixel ID', 'Meta (Facebook) Pixel ID'), admin: { description: bi('Chỉ gồm chữ số.', 'Digits only.') } },
  ],
}

const endpoints: Endpoint[] = [collectEvent, analyticsReport,
  {
    // Mã đo lường là công khai (nằm sẵn trong mã nguồn trang), trình duyệt đọc để nạp script.
    path: '/plugins/analytics/config',
    method: 'get',
    handler: async (req) => {
      const s = (await req.payload.findGlobal({ slug: SETTINGS as any, depth: 0, overrideAccess: true }).catch(() => null)) as { ga4Id?: string; fbPixelId?: string } | null
      return Response.json({ ga4Id: s?.ga4Id?.trim() || undefined, fbPixelId: s?.fbPixelId?.trim() || undefined }, { headers: { 'Cache-Control': 'public, max-age=300' } })
    },
  },
]

/** Plugin theo dõi: GA4 và Meta Pixel + sự kiện thương mại điện tử (`hs:view_item`, `hs:add_to_cart`, `hs:purchase`). */
const plugin: HossoPlugin = {
  ...definition,
  portable: { globals: [{ slug: SETTINGS, secretFields: [] }] },
  hooks: {
    beforeOrder: async ({ headers, draft }) => {
      const allowed = allowsServerAnalytics(headers)
      draft.meta.attribution = allowed ? cleanAttribution(draft.meta.attribution) : {}
      draft.meta.experiments = allowed ? cleanExperiments(draft.meta.experiments) : {}
    },
    onOrderReceived: async ({ payload, order, meta, request }) => { await recordEvent(payload, { key: `order:${order.id}`, event: 'order_placed', reference: order.id, value: order.total, attribution: meta?.attribution, experiments: meta?.experiments }, request) },
    onOrderPaid: async ({ payload, orderNo, amount, request }) => {
      const order = (await payload.find({ collection: 'shop-orders' as any, where: { orderNo: { equals: orderNo } }, limit: 1, depth: 0, overrideAccess: true, req: request })).docs[0] as any
      if (!order || amount < order.total) return
      await recordEvent(payload, { key: `purchase:${orderNo}`, event: 'purchase', reference: orderNo, value: order.total, attribution: order.checkoutDraft?.meta?.attribution, experiments: order.checkoutDraft?.meta?.experiments }, request)
    },
  },
  payload: (config: Config): Config => ({
    ...config, globals: [...(config.globals ?? []), Settings], endpoints: [...(config.endpoints ?? []), ...endpoints],
    collections: [...(config.collections ?? []).map((collection) => collection.slug !== 'form-submissions' ? collection : { ...collection, hooks: { ...collection.hooks, afterChange: [...(collection.hooks?.afterChange ?? []), async ({ doc, previousDoc, operation, req }: any) => {
      const event = operation === 'create' ? 'form_submit' : doc.leadStatus === 'qualified' && previousDoc?.leadStatus !== 'qualified' ? 'qualified_lead' : ''
      if (event) await enqueueLeadEvent(req, event, doc)
      return doc
    }] } }), AnalyticsEvents],
    jobs: { ...config.jobs, tasks: [...(config.jobs?.tasks ?? []), recordAnalyticsTask, { slug: 'analytics-retention', schedule: [{ cron: '10 3 * * *', queue: 'default' }], handler: async ({ req }) => { await req.payload.delete({ collection: 'analytics-events' as any, where: { createdAt: { less_than: new Date(Date.now() - 90 * 86400000).toISOString() } }, overrideAccess: true, req }); return { output: {} } } }] },
    admin: { ...config.admin, components: { ...config.admin?.components, views: { ...config.admin?.components?.views, analytics: { Component: '@hosso/plugin-analytics/admin#AnalyticsView', path: '/analytics' } } } },
  }),
}

export default withLicense(plugin)
