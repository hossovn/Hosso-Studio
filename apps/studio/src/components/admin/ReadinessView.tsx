import React from 'react'
import { Gutter } from '@payloadcms/ui'
import type { AdminViewServerProps } from 'payload'
import { canPublish } from '@/lib/access'
import { inspectReadiness } from '@/lib/readiness'

export async function ReadinessView({ initPageResult }: AdminViewServerProps) {
  if (!canPublish(initPageResult.req.user)) return <Gutter><p>Bạn chưa có quyền kiểm tra vận hành.</p></Gutter>
  const report = await inspectReadiness(initPageResult.req)
  const labels = { ok: 'Đã kiểm tra', warning: 'Cần xem', error: 'Cần xử lý' }
  return <Gutter><h1>Kiểm tra vận hành</h1><p>Cấu hình, hàng đợi và kết quả xử lý gần nhất. Các kiểm tra này không thay thế một đơn thử hoặc lần gửi email được người nhận xác nhận.</p>
    <p><a href="/admin/readiness">Kiểm tra lại</a> · <a href="/admin/releases">Kiểm tra nội dung và xuất bản</a></p>
    <div style={{ overflowX: 'auto' }}><table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: 1100 }}><thead><tr><th>Hạng mục</th><th>Trạng thái</th><th>Kết quả</th></tr></thead><tbody>{report.checks.map((check) => <tr key={check.id}>
      <th scope="row" style={{ textAlign: 'left', padding: '16px 8px', borderBottom: '1px solid #ddd' }}>{check.href ? <a href={check.href}>{check.label}</a> : check.label}</th><td style={{ padding: 8, whiteSpace: 'nowrap' }}>{labels[check.state]}</td><td style={{ padding: 8 }}>{check.detail}</td>
    </tr>)}</tbody></table></div>
    <p>Cập nhật: {new Date(report.checkedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</p>
  </Gutter>
}
