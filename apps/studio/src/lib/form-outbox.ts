import { randomUUID } from 'node:crypto'
import { createHash } from 'node:crypto'
import type { PayloadRequest, TaskConfig, Where } from 'payload'
import { fetchExternal } from '@hosso/studio-blocks/server-security'
import { normalizeFormDelivery } from './form-delivery'

const COLLECTION = 'form-deliveries' as any
const MAX_ATTEMPTS = 8
export async function enqueueFormDelivery(req: PayloadRequest, form: any, submission: any) {
  let delivery: ReturnType<typeof normalizeFormDelivery> = {}
  try { delivery = normalizeFormDelivery(form.delivery) } catch { /* Invalid legacy settings must not discard a lead. */ }
  const site: any = await req.payload.findGlobal({ slug: 'site-settings', depth: 0, req, overrideAccess: true })
  const emails = [...new Set([delivery.email, ...(site.notifications?.onForm === false ? [] : String(site.notifications?.to || site.contact?.email || '').split(',').map((value) => value.trim()))].filter((value): value is string => !!value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)))].slice(0, 10)
  const targets = [...emails.map((destination) => ({ channel: 'email', destination })), ...(delivery.webhookUrl ? [{ channel: 'webhook', destination: delivery.webhookUrl }] : [])]
  for (const { channel, destination } of targets) {
    await req.payload.create({ collection: COLLECTION, req, overrideAccess: true, data: {
      key: `${submission.id}:${channel}:${createHash('sha256').update(destination).digest('hex').slice(0, 20)}`, submission: submission.id, channel, destination, status: 'pending', attempts: 0, nextAt: new Date().toISOString(),
    } })
  }
}

export async function runFormOutbox(req: PayloadRequest, now = new Date()) {
  const due: Where = { or: [
    { and: [{ status: { in: ['pending', 'retry'] } }, { nextAt: { less_than_equal: now.toISOString() } }] },
    { and: [{ status: { equals: 'sending' } }, { leaseUntil: { less_than_equal: now.toISOString() } }] },
  ] }
  const batch = await req.payload.find({ collection: COLLECTION, where: due, sort: 'nextAt', limit: 10, depth: 0, overrideAccess: true, req })
  for (const job of batch.docs as any[]) {
    const token = randomUUID(), attempts = (job.attempts || 0) + 1
    const claimed = await req.payload.db.updateOne({ collection: COLLECTION, req, where: { and: [{ id: { equals: job.id } }, due] }, data: {
      status: 'sending', attempts, leaseToken: token, leaseUntil: new Date(now.getTime() + 5 * 60_000).toISOString(),
    }, options: { atomic: true } })
    if (!claimed) continue
    let data: Record<string, unknown>
    try {
      const submission: any = await req.payload.findByID({ collection: 'form-submissions', id: job.submission, depth: 0, overrideAccess: true, req })
      if (job.channel === 'email') {
        if (!/^smtps?:\/\//i.test(process.env.HOSSO_SMTP_URL || '')) throw new Error('SMTP chưa được cấu hình.')
        await req.payload.sendEmail({ to: job.destination, subject: `[Hosso] ${submission.formTitle}`, messageId: `<hosso-form-${job.key.replace(':', '-')}@${new URL(req.payload.config.serverURL || 'http://localhost').hostname}>`, text: Object.entries(submission.data || {}).map(([key, value]) => `${key}: ${value}`).join('\n') })
      } else {
        const response = await fetchExternal(job.destination, { method: 'POST', timeoutMs: 5000, maxBytes: 64_000, headers: { 'Content-Type': 'application/json', 'X-Hosso-Event': 'form.submitted', 'X-Hosso-Submission': String(submission.id), 'Idempotency-Key': job.key }, body: JSON.stringify({ event: 'form.submitted', id: submission.id, title: submission.formTitle, values: submission.data, attribution: submission.attribution }) })
        if (!response.ok) throw new Error(`Webhook trả HTTP ${response.status}.`)
      }
      data = { status: 'sent', sentAt: new Date().toISOString(), lastError: null, leaseToken: null, leaseUntil: null }
    } catch (error) {
      const message = error instanceof Error && /^(SMTP chưa|Webhook trả HTTP)/.test(error.message) ? error.message : 'Không chuyển được lead. Kiểm tra cấu hình kết nối rồi thử lại.'
      data = { status: attempts >= MAX_ATTEMPTS ? 'failed' : 'retry', nextAt: new Date(now.getTime() + Math.min(24 * 3600_000, 60_000 * 2 ** (attempts - 1))).toISOString(), lastError: message, leaseToken: null, leaseUntil: null }
    }
    await req.payload.db.updateOne({ collection: COLLECTION, req, where: { and: [{ id: { equals: job.id } }, { leaseToken: { equals: token } }] }, data, options: { atomic: true } })
  }
}

export const formDeliveryTask: TaskConfig<any> = {
  slug: 'form-delivery-sweep', schedule: [{ cron: '* * * * *', queue: 'default' }],
  handler: async ({ req }) => { await runFormOutbox(req); return { output: {} } },
}
