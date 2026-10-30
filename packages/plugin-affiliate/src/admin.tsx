'use client'
import React, { useCallback, useEffect, useState } from 'react'

const vnd = (n: number) => `${(n ?? 0).toLocaleString('vi-VN')} đ`
const cell: React.CSSProperties = { padding: '.65rem', borderBottom: '1px solid var(--theme-elevation-150)', textAlign: 'left' }
const labels: Record<string, string> = { pending: 'Chưa thu tiền', holding: 'Đang giữ', eligible: 'Đủ điều kiện', approved: 'Đã duyệt', paid: 'Đã trả', cancelled: 'Đã hủy', review: 'Cần đối soát' }
export function AffiliateAdmin() {
  const [data, setData] = useState<any>()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [page, setPage] = useState(1)
  const [chosen, setChosen] = useState<any[]>([])
  const selected = chosen.map((r) => r.id)
  const load = useCallback(async () => {
    const res = await fetch(`/api/plugins/affiliate/dashboard?page=${page}`, { cache: 'no-store' })
    const body = await res.json()
    if (!res.ok) throw new Error(body.message || 'Không thể tải dữ liệu. Cần quyền quản trị viên.')
    setData(body)
  }, [page])
  useEffect(() => { void load().catch((e) => setError(e.message)) }, [load])
  async function manage(input: any) {
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/plugins/affiliate/manage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Thao tác thất bại; tải lại trước khi thử lại.')
      setChosen([])
      await load()
      return result
    } catch (e) { setError(e instanceof Error ? e.message : 'Thao tác thất bại'); return null }
    finally { setBusy(false) }
  }
  const rows: any[] = data?.referrals ?? []
  const affiliate = chosen[0]?.affiliate
  const affiliateId = (a: any) => a && typeof a === 'object' ? a.id : a
  const name = (a: any) => a && typeof a === 'object' ? a.name : String(a ?? '')
  return <main style={{ padding: '2rem', maxWidth: '100rem', margin: 'auto' }}>
    <h1>Tiếp thị liên kết · CPS</h1>
    <p>Hoa hồng chỉ được chi sau khi đã thu đủ tiền, hoàn tất đơn và hết thời gian giữ. Đơn cũ thiếu chính sách cần đối soát riêng.</p>
    {error && <p role="alert" style={{ color: 'var(--theme-error-500)' }}>{error}</p>}
    <fieldset disabled={busy} style={{ border: 0, padding: 0, minWidth: 0 }}>
      <button type="button" onClick={() => void load().catch((e) => setError(e.message))}>Tải lại</button>{' '}
      <button type="button" onClick={async () => { for (let p = 1; ; p++) { const result = await manage({ action: 'reconcile', page: p }); if (!result?.hasNextPage) break } }}>Đối soát toàn bộ đơn Shop</button>
      <h2>Đối tác</h2>
      <p><a href="/admin/collections/affiliates">Cài mức hoa hồng, số ngày giữ và thông tin đối tác</a></p>
      <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr>{['Đối tác', 'Mã', 'Duyệt', 'Thao tác'].map((h) => <th key={h} style={cell}>{h}</th>)}</tr></thead>
        <tbody>{data?.affiliates.map((a: any) => <tr key={a.id}><td style={cell}>{a.name}</td><td style={cell}>{a.code}</td><td style={cell}>{a.approval} {!a.active && '· Đang khóa'}</td><td style={cell}>{a.approval !== 'approved' && <button onClick={() => manage({ action: 'approve-affiliate', id: a.id })}>Duyệt</button>} {a.approval !== 'rejected' && <button onClick={() => manage({ action: 'reject-affiliate', id: a.id })}>Từ chối</button>}</td></tr>)}</tbody>
      </table></div>
      <h2>Hoa hồng</h2>
      <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr>{['Chọn chi', 'Đơn', 'Đối tác', 'Hoa hồng', 'Trạng thái', 'Ngày đủ điều kiện', 'Thao tác'].map((h) => <th key={h} style={cell}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((r) => <tr key={r.id}>
          <td style={cell}><input type="checkbox" aria-label={`Chọn hoa hồng ${r.orderId}`} checked={selected.includes(r.id)} disabled={r.status !== 'approved' || (affiliate && String(affiliateId(affiliate)) !== String(affiliateId(r.affiliate)))} onChange={(e) => setChosen(e.target.checked ? [...chosen, r] : chosen.filter((item) => item.id !== r.id))} /></td>
          <td style={cell}>{r.source ?? 'Cũ'} · {r.orderId}{r.parent && ' · Điều chỉnh hoàn tiền'}</td><td style={cell}>{name(r.affiliate)}</td><td style={cell}>{vnd(r.commission)}</td><td style={cell}>{!r.policy ? 'Cần đối soát dữ liệu cũ' : labels[r.status] ?? r.status}</td><td style={cell}>{r.eligibleAt ? new Date(r.eligibleAt).toLocaleDateString('vi-VN') : '—'}</td>
          <td style={cell}>{r.policy && <button onClick={() => manage({ action: 'refresh', id: r.id })}>Đối soát</button>} {r.status === 'eligible' && <button onClick={() => manage({ action: 'approve', id: r.id })}>Duyệt chi</button>} {r.policy && !r.parent && !['paid', 'cancelled'].includes(r.status) && <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); void manage({ action: 'reject', id: r.id, reason: f.get('reason') }) }}><input name="reason" required minLength={3} maxLength={500} aria-label={"Lý do từ chối " + r.orderId} placeholder="Lý do từ chối" /><button>Từ chối</button></form>}</td>
        </tr>)}</tbody>
      </table></div>
      <form onSubmit={(e) => { e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget)); void manage({ action: 'payout', affiliate: affiliateId(affiliate), ids: selected, ...f }) }} style={{ display: 'grid', gap: '.75rem', maxWidth: '40rem', marginTop: '1rem' }}>
        <h3>Ghi nhận chuyển khoản</h3>
        {data && !data.canPayout && <p role="status">Môi trường hiện tại chỉ hỗ trợ xem thử và tracking. Cần PostgreSQL để ghi nhận chi trả.</p>}
        <p>{name(affiliate)} · {selected.length} khoản · Tổng chi: <strong>{vnd(chosen.reduce((sum, r) => sum + r.commission, 0))}</strong></p>
        <ul>{chosen.map((r) => <li key={r.id}>{r.orderId}: {vnd(r.commission)} <button type="button" onClick={() => setChosen(chosen.filter((x) => x.id !== r.id))}>Bỏ chọn</button></li>)}</ul>
        <p>Chọn cả các khoản điều chỉnh âm còn nợ. Chỉ xác nhận sau khi chuyển khoản thành công; hệ thống không tự chuyển tiền.</p>
        <label>Mã giao dịch ngân hàng<input name="reference" required minLength={3} maxLength={120} style={{ display: 'block', width: '100%' }} /></label>
        <label>Chứng từ (đường dẫn hoặc thông tin đối soát)<textarea name="evidence" required minLength={3} maxLength={1000} style={{ display: 'block', width: '100%' }} /></label>
        <button disabled={!data?.canPayout || !selected.length || chosen.reduce((sum, r) => sum + r.commission, 0) <= 0}>Xác nhận đã chuyển khoản</button>
      </form>
      <h2>Đơn WIM</h2>
      <p>Trạng thái đơn được đọc từ WIM. Chủ shop xác nhận thu đủ tiền COD hoặc số tiền hàng đã hoàn bằng chứng từ.</p>
      {data?.orders.map((o: any) => <form key={o.id} onSubmit={(e) => { e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget)); void manage({ ...f, id: o.id, amount: Number(f.amount), fullRefund: f.fullRefund === 'on' }) }} style={{ borderBottom: '1px solid var(--theme-elevation-150)', padding: '1rem 0', display: 'flex', flexWrap: 'wrap', gap: '.75rem', alignItems: 'end' }}>
        <strong>{o.orderId || 'Chưa liên kết đơn'} · {o.orderStatus} · {o.paymentStatus} · {vnd(o.total)}</strong>
        <label>Thao tác<select name="action" style={{ display: 'block' }} defaultValue={o.orderId ? 'external-refresh' : 'external-link'}>{o.orderId ? <><option value="external-refresh">Đọc lại trạng thái WIM</option><option value="external-payment">Xác nhận đã thu đủ tiền</option><option value="external-refund">Ghi nhận hoàn tiền hàng</option></> : <option value="external-link">Liên kết đơn WIM đã tạo</option>}</select></label>
        {!o.orderId && <label>Mã đơn WIM<input name="orderId" required /></label>}
        <label>Số tiền (đ)<input name="amount" type="number" min={0} step={1} /></label>
        <label>Mã chứng từ<input name="reference" maxLength={120} /></label>
        <label><input name="fullRefund" type="checkbox" /> Hoàn toàn bộ đơn</label><button>Thực hiện</button>
      </form>)}
      <h2>Lịch sử chi trả</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr>{['Đối tác', 'Số tiền', 'Mã giao dịch', 'Ngày trả', 'Chứng từ'].map((h) => <th style={cell} key={h}>{h}</th>)}</tr></thead><tbody>{data?.payouts.map((p: any) => <tr key={p.id}><td style={cell}>{name(p.affiliate)}</td><td style={cell}>{vnd(p.amount)}</td><td style={cell}>{p.reference}</td><td style={cell}>{new Date(p.paidAt).toLocaleString('vi-VN')}</td><td style={cell}>{p.evidence}</td></tr>)}</tbody></table>
      <p><a href="/admin/collections/affiliate-audit-logs">Nhật ký đối soát và chi trả</a></p>
      <nav aria-label="Phân trang"><button disabled={page === 1} onClick={() => setPage(page - 1)}>Trang trước</button> {page} <button disabled={!data?.hasNextPage} onClick={() => setPage(page + 1)}>Trang sau</button></nav>
    </fieldset>
  </main>
}
