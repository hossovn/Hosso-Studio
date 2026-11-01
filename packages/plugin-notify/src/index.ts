import { withLicense, type HossoPlugin, type PluginManifest } from '@hosso/studio-blocks'
import type { Config, GlobalConfig } from 'payload'
import manifest from '../hosso.json'
import { deliverOrderEmail, queueOrderEmail, TASK, type MailJob } from './delivery'

type Roled = { roles?: string[] | null } | null | undefined
const isAdmin = ({ req }: { req: { user?: unknown } }) => Boolean((req.user as Roled)?.roles?.includes('admin'))
const bi = (vi: string, en: string) => ({ vi, en })
const Settings: GlobalConfig = {
  slug: 'notify-settings', label: bi('Thông báo đơn hàng', 'Order notifications'),
  admin: { group: bi('Thông báo', 'Notifications') }, access: { read: isAdmin, update: isAdmin },
  fields: [
    { name: 'adminEmail', type: 'text', label: bi('Email nhận đơn mới (chủ shop)', 'Email for new orders (shop owner)'), admin: { description: bi('Có thể nhiều địa chỉ, cách nhau bằng dấu phẩy. Để trống thì không báo chủ shop.', 'Several addresses separated by commas. Leave empty to skip owner notifications.') } },
    { name: 'toCustomer', type: 'checkbox', defaultValue: true, label: bi('Gửi email cho khách (nếu khách nhập email)', 'Email customers (when they enter an email)') },
    { name: 'onStatus', type: 'checkbox', defaultValue: true, label: bi('Báo khách khi đổi trạng thái đơn', 'Tell customers when the order status changes') },
  ],
}

const plugin: HossoPlugin = {
  id: 'notify', manifest: manifest as PluginManifest,
  adminEn: { 'Thông báo': 'Notifications' },
  adminNav: [{ label: 'Thông báo đơn hàng', href: '/admin/globals/notify-settings', roles: ['admin'] }],
  payload: (config: Config): Config => ({ ...config, globals: [...(config.globals ?? []), Settings], jobs: { ...config.jobs, deleteJobOnComplete: false,
    jobsCollectionOverrides: (args) => {
      const collection = config.jobs?.jobsCollectionOverrides?.(args) || args.defaultJobsCollection
      return { ...collection, fields: [...collection.fields, { name: 'notifyOrderNo', type: 'text', index: true, admin: { hidden: true } }] }
    }, tasks: [...(config.jobs?.tasks ?? []), {
    slug: TASK, retries: { attempts: 8, backoff: { type: 'exponential', delay: 60000 } },
    inputSchema: [{ name: 'orderNo', type: 'text', required: true }, { name: 'kind', type: 'text', required: true }, { name: 'audience', type: 'text', required: true }, { name: 'status', type: 'text' }],
    handler: async ({ req, input }) => { await deliverOrderEmail(req.payload, input as MailJob, req); return { output: {} } },
  }] } }),
  commerce: {
    notifyShortage: async (payload, orderNo, request) => {
      await queueOrderEmail(payload, { orderNo, kind: 'status', status: 'awaiting_customer', audience: 'customer' }, request)
      await queueOrderEmail(payload, { orderNo, kind: 'status', status: 'awaiting_customer', audience: 'owner' }, request)
    },
    resendOrderEmail: async (payload, orderNo, request) => { await queueOrderEmail(payload, { orderNo, kind: 'resend', audience: 'customer' }, request) },
  },
  hooks: {
    onOrderReceived: async ({ payload, request, order, customer }) => {
      await queueOrderEmail(payload, { orderNo: order.id, kind: 'received', audience: 'owner' }, request)
      if (customer.email) await queueOrderEmail(payload, { orderNo: order.id, kind: 'received', audience: 'customer' }, request)
    },
    onOrderStatusChanged: async ({ payload, request, order, to }) => {
      await queueOrderEmail(payload, { orderNo: order.id, kind: 'status', status: to, audience: 'customer' }, request)
    },
    onOrderPaid: async ({ payload, request, orderNo }) => {
      await queueOrderEmail(payload, { orderNo, kind: 'paid', audience: 'customer' }, request)
    },
  },
}
export default withLicense(plugin)
