import { assertExternalUrl, fetchExternal } from '@hosso/studio-blocks/server-security'
import type { Payload } from 'payload'

export type FormDelivery = { email?: string; webhookUrl?: string; successHref?: string }

export function normalizeFormDelivery(value: unknown): FormDelivery {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const input = value as Record<string, unknown>
  const result: FormDelivery = {}
  const email = String(input.email ?? '').trim(), webhook = String(input.webhookUrl ?? '').trim(), successHref = String(input.successHref ?? '').trim()
  if (email) {
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Email nhận biểu mẫu không hợp lệ.')
    result.email = email
  }
  if (webhook) { if (webhook.length > 2000) throw new Error('Địa chỉ webhook quá dài.'); result.webhookUrl = assertExternalUrl(webhook).href }
  if (successHref) {
    if (!/^\/(?!\/)/.test(successHref) || /[\\\u0000-\u0020\u007f]/.test(successHref)) throw new Error('Trang cảm ơn phải là đường dẫn nội bộ, ví dụ /cam-on.')
    result.successHref = successHref.slice(0, 500)
  }
  return result
}

/** Delivery errors do not discard the saved lead. */
export async function deliverForm(payload: Payload, form: { slug: string; title: string; delivery?: unknown }, id: string | number, values: Record<string, unknown>) {
  let delivery: FormDelivery
  try { delivery = normalizeFormDelivery(form.delivery) } catch { return }
  if (delivery.email) {
    try { await payload.sendEmail({ to: delivery.email, subject: `[Hosso] ${form.title}`, text: Object.entries(values).map(([name, value]) => `${name}: ${value}`).join('\n') }) }
    catch { payload.logger.warn(`Form ${form.slug}: email delivery failed; submission ${id} is saved.`) }
  }
  if (delivery.webhookUrl) {
    try {
      const res = await fetchExternal(delivery.webhookUrl, { method: 'POST', timeoutMs: 5000, maxBytes: 64_000, headers: { 'Content-Type': 'application/json', 'X-Hosso-Event': 'form.submitted', 'X-Hosso-Submission': String(id) }, body: JSON.stringify({ event: 'form.submitted', id, form: form.slug, title: form.title, values }) })
      if (!res.ok) throw new Error()
    } catch { payload.logger.warn(`Form ${form.slug}: webhook delivery failed; submission ${id} is saved.`) }
  }
}
