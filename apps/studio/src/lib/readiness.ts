import type { Endpoint, PayloadRequest } from 'payload'
import type { HossoPlugin } from '@hosso/studio-blocks'
import { canPublish } from './access'

export type ReadinessCheck = { id: string; label: string; state: 'ok' | 'warning' | 'error'; detail: string; href?: string }
export async function inspectReadiness(req: PayloadRequest) {
  const checks: ReadinessCheck[] = []
  const add = (id: string, label: string, state: ReadinessCheck['state'], detail: string, href?: string) => checks.push({ id, label, state, detail, href })
  try {
    await req.payload.count({ collection: 'users', overrideAccess: true, req })
    add('db', 'Cơ sở dữ liệu', 'ok', 'Truy vấn thành công.')
  } catch { add('db', 'Cơ sở dữ liệu', 'error', 'Không truy vấn được. Kiểm tra kết nối và migration.') }
  add('smtp', 'Email nhận lead', /^smtps?:\/\//i.test(process.env.HOSSO_SMTP_URL || '') ? 'ok' : 'warning', process.env.HOSSO_SMTP_URL ? 'Đã khai báo SMTP. Cần nghiệm thu gửi và nhận trên môi trường triển khai.' : 'Chưa cấu hình SMTP; lead vẫn lưu trong Studio, email sẽ chờ xử lý.', '/admin/leads')
  add('url', 'Địa chỉ công khai', /^https:\/\//.test(req.payload.config.serverURL || '') ? 'ok' : 'warning', 'Dùng HOSSO_PUBLIC_URL với HTTPS để callback và liên kết đúng tên miền.')
  add('worker', 'Lịch chạy tác vụ', req.payload.config.jobs?.autoRun?.length ? 'ok' : 'warning', 'Cấu hình lịch không chứng minh worker đang chạy. Đối chiếu tác vụ gần nhất và hàng đợi bên dưới.', '/admin/collections/payload-jobs')
  try {
    const pending = await req.payload.count({ collection: 'form-deliveries' as any, where: { status: { in: ['pending', 'retry', 'sending'] } }, overrideAccess: true, req })
    const failed = await req.payload.count({ collection: 'form-deliveries' as any, where: { status: { equals: 'failed' } }, overrideAccess: true, req })
    const stale = await req.payload.count({ collection: 'form-deliveries' as any, where: { and: [{ status: { in: ['pending', 'retry', 'sending'] } }, { updatedAt: { less_than: new Date(Date.now() - 15 * 60000).toISOString() } }] }, overrideAccess: true, req })
    add('outbox', 'Gửi lead', failed.totalDocs || stale.totalDocs ? 'warning' : 'ok', `${pending.totalDocs} đang chờ; ${failed.totalDocs} thất bại; ${stale.totalDocs} chưa cập nhật trong 15 phút.`, '/admin/leads')
  } catch { add('outbox', 'Gửi lead', 'error', 'Chưa đọc được hàng đợi. Kiểm tra migration platform.', '/admin/leads') }
  try {
    const jobs = await req.payload.find({ collection: 'payload-jobs', where: { completedAt: { exists: true } }, sort: '-completedAt', limit: 1, depth: 0, overrideAccess: true, req })
    add('jobs', 'Lần hoàn tất tác vụ gần nhất', jobs.docs.length ? 'ok' : 'warning', jobs.docs[0]?.completedAt || 'Chưa có bằng chứng tác vụ hoàn tất.', '/admin/collections/payload-jobs')
  } catch { add('jobs', 'Tác vụ nền', 'error', 'Không đọc được lịch sử tác vụ.', '/admin/collections/payload-jobs') }
  for (const plugin of (req.payload.config.custom?.hossoPlugins || []) as HossoPlugin[]) {
    if (!plugin.checklist) continue
    try {
      for (const [index, item] of (await plugin.checklist(req.payload)).entries()) add(`${plugin.id}-${index}`, item.label, item.done ? 'ok' : 'warning', item.done ? 'Đủ cấu hình kiểm tra cục bộ; cần nghiệm thu nhà cung cấp.' : 'Còn thiết lập cần hoàn thành.', item.href)
    } catch { add(plugin.id, `Tích hợp ${plugin.id}`, 'error', 'Không kiểm tra được cấu hình. Mở cài đặt plugin để kiểm tra.') }
  }
  return { checkedAt: new Date().toISOString(), checks, ready: checks.every((check) => check.state !== 'error') }
}
export const readiness: Endpoint = { path: '/site/readiness', method: 'get', handler: async (req) => {
  if (!canPublish(req.user)) return Response.json({ error: 'Forbidden' }, { status: 403 })
  return Response.json(await inspectReadiness(req), { headers: { 'Cache-Control': 'no-store' } })
} }
