'use client'
import React, { useEffect, useState } from 'react'

const LABELS: Record<string, string> = { page_view: 'Xem trang', cta_click: 'Bấm CTA', form_start: 'Bắt đầu form', form_submit: 'Lead đã lưu', qualified_lead: 'Lead đủ điều kiện', view_item: 'Xem sản phẩm', add_to_cart: 'Thêm giỏ', begin_checkout: 'Bắt đầu checkout', order_placed: 'Đơn đã nhận', purchase: 'Đơn ghi nhận thanh toán' }
type Report = { counts: Record<string, number>; variants: Record<string, Record<string, number>>; experiment: string; note: string }
const cell: React.CSSProperties = { textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid #ccd8d0' }

export function AnalyticsClient() {
  const [days, setDays] = useState(30), [campaign, setCampaign] = useState(''), [page, setPage] = useState(''), [experiment, setExperiment] = useState('')
  const [query, setQuery] = useState('days=30'), [report, setReport] = useState<Report | null>(null), [error, setError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    setReport(null); setError('')
    void fetch(`/api/plugins/analytics/report?${query}`, { signal: controller.signal }).then(async (response) => {
      if (!response.ok) throw new Error('Không tải được báo cáo.')
      setReport(await response.json())
    }).catch((err) => { if (err.name !== 'AbortError') setError(err.message) })
    return () => controller.abort()
  }, [query])
  return <section style={{ maxWidth: 1100, paddingBottom: 32 }}>
    <h1>Phễu chuyển đổi</h1><p>Theo dõi từng bước từ xem trang đến lead và đơn hàng.</p>
    <form style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'end', margin: '24px 0' }} onSubmit={(event) => {
      event.preventDefault(); setQuery(new URLSearchParams({ days: String(days), campaign, page, experiment }).toString())
    }}>
      <label>Khoảng thời gian<br /><select value={days} onChange={(event) => setDays(Number(event.target.value))}>{[7, 30, 90].map((value) => <option key={value} value={value}>{value} ngày</option>)}</select></label>
      <label>UTM campaign<br /><input value={campaign} maxLength={120} onChange={(event) => setCampaign(event.target.value)} placeholder="Tất cả chiến dịch" /></label>
      <label>Đường dẫn<br /><input value={page} maxLength={300} onChange={(event) => setPage(event.target.value)} placeholder="/landing" /></label>
      <label>Mã thử nghiệm và phiên bản<br /><input value={experiment} maxLength={100} onChange={(event) => setExperiment(event.target.value)} placeholder="uu-dai_1" pattern="[a-zA-Z0-9_-]*" /></label>
      <button type="submit">Xem báo cáo</button>
    </form>
    {error && <p role="alert">{error}</p>}{!report && !error && <p role="status">Đang tải số liệu…</p>}
    {report && <>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}><caption style={{ textAlign: 'left' }}>Sự kiện theo bộ lọc</caption><thead><tr><th style={cell}>Bước</th><th style={cell}>Số sự kiện</th><th style={cell}>Tương quan</th></tr></thead>
        <tbody>{Object.entries(LABELS).map(([key, label]) => <tr key={key}>
          <th scope="row" style={{ ...cell, fontWeight: 500 }}>{label}</th><td style={cell}>{(report.counts[key] || 0).toLocaleString('vi-VN')}</td>
          <td style={{ ...cell, width: '35%' }}><div aria-hidden="true" style={{ height: 8, background: '#e8eeea', borderRadius: 4 }}><div style={{ height: '100%', background: '#2d7b57', borderRadius: 4, width: `${Math.min(100, (report.counts[key] || 0) / Math.max(1, ...Object.values(report.counts)) * 100)}%` }} /></div></td>
        </tr>)}</tbody>
      </table>
      {report.experiment && <section aria-label="Kết quả thử nghiệm A/B" style={{ marginTop: 32 }}>
        <h2>Thử nghiệm {report.experiment}</h2>
        <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr><th style={cell}>Phiên bản</th>{['Lượt xem theo phiên', 'Lead', 'Lead đủ điều kiện', 'Đơn đã nhận', 'Đã thanh toán'].map((label) => <th key={label} style={cell}>{label}</th>)}</tr></thead>
          <tbody>{['a', 'b'].map((variant) => <tr key={variant}><th scope="row" style={cell}>{variant.toUpperCase()}</th>{['experiment_view', 'form_submit', 'qualified_lead', 'order_placed', 'purchase'].map((event) => <td key={event} style={cell}>{(report.variants[variant]?.[event] || 0).toLocaleString('vi-VN')}</td>)}</tr>)}</tbody>
        </table></div>
        <p>Chưa tự kết luận phiên bản thắng. Lượt xem được chống trùng theo phiên trình duyệt; chuyển đổi có thể xảy ra ở phiên hoặc ngày khác. Không chia hai số này thành tỷ lệ chuyển đổi của một nhóm khách.</p>
        <p>Để dừng thử nghiệm, mở khối “Thử nghiệm A/B” trong Studio, chọn “Chỉ bản A” hoặc “Chỉ bản B”, rồi xuất bản. Tăng phiên bản khi thay nội dung để tách kết quả.</p>
      </section>}
      <p>{report.note}</p><p>Đo lường trên trình duyệt chỉ hoạt động khi khách cho phép. Số tổng là lượt sự kiện, không phải số người duy nhất. Lead và đơn hàng vẫn được ghi nhận trong báo cáo vận hành.</p>
      <a href="/admin/shop-reports">Đối chiếu báo cáo bán hàng và hoàn tiền</a>
    </>}
  </section>
}
