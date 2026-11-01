import type { Payload, PayloadRequest } from 'payload'
import { renderOrderEmail, type OrderEmail } from './template'

export const TASK = 'notify-order-email'
export type MailJob = { orderNo: string; kind: OrderEmail['kind']; audience: 'customer' | 'owner'; status?: string }
const settings = async (payload: Payload, req?: PayloadRequest) => await payload.findGlobal({ slug: 'notify-settings' as any, depth: 0, overrideAccess: true, req }).catch(() => ({})) as { adminEmail?: string; toCustomer?: boolean; onStatus?: boolean }

export async function queueOrderEmail(payload: Payload, input: MailJob, req?: PayloadRequest) {
  const c = await settings(payload, req)
  if (input.audience === 'owner' ? !c.adminEmail : c.toCustomer === false || (input.kind === 'status' && c.onStatus === false)) return
  const job = await payload.jobs.queue({ task: TASK, input, req, queue: 'default' } as any)
  await payload.db.updateOne({ collection: 'payload-jobs', req, where: { id: { equals: job.id } }, data: { notifyOrderNo: input.orderNo }, options: { atomic: true } })
}

/** SMTP errors throw to Payload's durable queue, which retries each recipient separately. */
export async function deliverOrderEmail(payload: Payload, input: MailJob, req?: PayloadRequest) {
  const c = await settings(payload, req)
  const o = (await payload.find({ collection: 'shop-orders' as any, where: { orderNo: { equals: input.orderNo } }, limit: 1, depth: 0, overrideAccess: true, req })).docs[0] as any
  if (!o) throw new Error('Order not found for notification')
  const to = input.audience === 'owner' ? c.adminEmail : c.toCustomer === false ? undefined : o.email
  if (!to || (input.kind === 'status' && c.onStatus === false)) return
  const site = await payload.findGlobal({ slug: 'site-settings' as any, depth: 0, overrideAccess: true, req }).catch(() => null) as any
  const origin = payload.config.serverURL || process.env.HOSSO_PUBLIC_URL || ''
  if (!/^https?:\/\//.test(origin)) throw new Error('Public website URL is required for order emails')
  const en = o.checkoutDraft?.meta?.locale === 'en'
  const pages = payload.collections.pages ? await payload.find({ collection: 'pages', where: { _status: { equals: 'published' } }, pagination: false, limit: 0, depth: 0, overrideAccess: true, req }) : null
  const candidates = pages?.docs.filter((p: any) => p.content?.content?.some((x: any) => ['ShopOrderStatus', 'WimOrderStatus'].includes(x.type))) || []
  const page = (candidates.find((p: any) => p.slug === 'trang-thai-don') || candidates[0]) as any
  const path = page?.slug ? `/${page.slug}` : '/trang-thai-don'
  const route = typeof path === 'string' && /^\/(?!\/)/.test(path) ? path : '/trang-thai-don'
  const trackingUrl = `${origin.replace(/\/$/, '')}${en ? '/en' : ''}${route}?${new URLSearchParams({ id: o.orderNo, token: o.lookupToken || '' })}`
  if (input.audience === 'customer' && !/^[a-f0-9]{64}$/.test(o.lookupToken || '')) throw new Error('Private order access code is missing')
  const message = renderOrderEmail({ brand: site?.siteName || 'TCAP', orderNo: o.orderNo, kind: input.kind, audience: input.audience, locale: en ? 'en' : 'vi', status: input.status || (o.checkoutDraft && !o.checkoutComplete && o.status !== 'cancelled' ? 'pending' : o.status), paymentStatus: input.kind === 'paid' ? 'paid' : o.paymentStatus, payment: o.paymentMethod, fulfillment: o.fulfillmentType, customer: { name: o.customerName, phone: o.phone, address: o.address }, items: o.items || [], subtotal: o.subtotal ?? o.total, adjustments: o.adjustments || [], total: o.total, trackingUrl: input.audience === 'owner' ? `${origin}/admin/collections/shop-orders/${o.id}` : trackingUrl, accessCode: input.audience === 'owner' ? '' : o.lookupToken, cancellationReason: o.cancellationReason })
  await payload.sendEmail({ to, ...message })
}
