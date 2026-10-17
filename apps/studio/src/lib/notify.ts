import type { Payload } from 'payload'

/**
 * Gửi email thông báo cho chủ site (Cài đặt site → Thông báo). Không bao giờ làm hỏng request của khách:
 * lỗi chỉ được ghi log. Chưa cấu hình SMTP (HOSSO_SMTP_URL) thì Payload ghi nội dung email ra console.
 */
export async function notify(payload: Payload, kind: 'comment' | 'form', subject: string, lines: string[]) {
  try {
    const s = (await payload.findGlobal({ slug: 'site-settings', depth: 0 })) as Record<string, any>
    const n = s.notifications ?? {}
    if (kind === 'comment' ? n.onComment === false : n.onForm === false) return
    const to = n.to || s.contact?.email
    if (!to) return
    await payload.sendEmail({ to, subject: `[${s.siteName || 'Hosso'}] ${subject}`, text: lines.join('\n') })
  } catch (e) {
    payload.logger.warn(`Không gửi được email thông báo: ${(e as Error).message}`)
  }
}
