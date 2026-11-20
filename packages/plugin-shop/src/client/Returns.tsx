'use client'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { CartLine } from '../cart'
const STATES: Record<string, string> = { requested: 'Chờ duyệt', approved: 'Đã duyệt — chờ nhận hàng', rejected: 'Từ chối', received: 'Đã nhận hàng', closed: 'Đã xử lý' }
const call = async (url: string, input?: unknown) => { const response = await fetch(`/api/plugins/shop/${url}`, input === undefined ? { cache: 'no-store' } : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) }); const data = await response.json(); if (!response.ok) throw new Error(data.message || 'Chưa thực hiện được. Vui lòng thử lại.'); return data }

function Evidence({ row, token = '', refresh }: { row: any; token?: string; refresh?: () => void }) {
  const [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const upload = async (file?: File) => {
    if (!file) return
    setError('')
    if (file.size > 1048576 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError('Chọn ảnh JPEG, PNG hoặc WebP tối đa 1 MB.'); return }
    setBusy(true)
    try {
      const image = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file) })
      await call('return-evidence', { id: row.id, revision: row.revision, token, image }); refresh?.()
    } catch (err) { setError(err instanceof Error ? err.message : 'Chưa tải được ảnh.') } finally { setBusy(false) }
  }
  return <div><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{Array.from({ length: row.evidenceCount || 0 }, (_, index) => <a key={index} href={`/api/plugins/shop/return-evidence?${new URLSearchParams({ id: row.id, index: String(index), token })}`} target="_blank" rel="noopener noreferrer">Ảnh bằng chứng {index + 1}</a>)}</div>{refresh && row.state === 'requested' && row.evidenceCount < 3 && <label>Đính kèm bằng chứng (tối đa 3 ảnh, 1 MB/ảnh)<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(event) => { void upload(event.target.files?.[0]); event.target.value = '' }} /></label>}{error && <p role="alert">{error}</p>}</div>
}

export function ReturnPortal({ order, token }: { order: { id: string; status: string; items: CartLine[] }; token: string }) {
  const [rows, setRows] = useState<any[]>([]), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const requestId = useRef('')
  const refresh = useCallback(() => { void call(`returns?${new URLSearchParams({ order: order.id, token })}`).then((data) => setRows(data.docs)).catch((err) => setError(err.message)) }, [order.id, token])
  useEffect(refresh, [refresh])
  if (order.status !== 'completed' && !rows.length) return null
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (busy) return
    const form = event.currentTarget, values = new FormData(form)
    const items = order.items.map((line, index) => ({ productId: line.productId, variantId: line.variantId, quantity: Number(values.get(`qty-${index}`)) })).filter((line) => line.quantity > 0)
    requestId.current ||= crypto.randomUUID(); setBusy(true); setError('')
    try { await call('returns', { order: order.id, token, requestId: requestId.current, items, reason: values.get('reason'), resolution: values.get('resolution') }); requestId.current = ''; form.reset(); refresh() } catch (err) { setError(err instanceof Error ? err.message : 'Chưa gửi được yêu cầu.') } finally { setBusy(false) }
  }
  return <section style={{ marginTop: 24 }} aria-label="Yêu cầu đổi trả"><h3>Đổi trả và hỗ trợ sau mua</h3>{rows.map((row) => <article key={row.id} className="sp-note"><strong>#{row.id} · {STATES[row.state]}</strong><p>{row.reason}</p><ul>{row.items.map((item: any, index: number) => <li key={index}>{item.name} × {item.quantity}</li>)}</ul>{row.refundAmount > 0 && <p>Số tiền hoàn được duyệt: {row.refundAmount.toLocaleString('vi-VN')} đ</p>}{row.history?.map((step: any, index: number) => <p key={index}>{STATES[step.state]}: {step.reason}</p>)}<Evidence row={row} token={token} refresh={refresh} /></article>)}{order.status === 'completed' && <details><summary>Gửi yêu cầu đổi / trả hàng</summary><form className="sp-form" onSubmit={submit}>{order.items.map((line, index) => <label key={index}>{line.name} (đã mua {line.quantity})<input name={`qty-${index}`} type="number" min={0} max={line.quantity} step={1} defaultValue={0} /></label>)}<label>Mong muốn<select name="resolution"><option value="refund">Trả hàng / hoàn tiền</option><option value="exchange">Đổi sản phẩm</option></select></label><label>Lý do<textarea name="reason" required minLength={10} maxLength={2000} /></label><p>Cửa hàng sẽ xem xét theo chính sách đổi trả. Sau khi gửi, bạn có thể đính kèm ảnh bằng chứng.</p><button type="submit" className="sp-btn" disabled={busy}>{busy ? 'Đang gửi…' : 'Gửi yêu cầu'}</button></form></details>}{error && <p role="alert">{error}</p>}</section>
}

export function ReturnsAdmin() {
  const [rows, setRows] = useState<any[]>([]), [page, setPage] = useState(1), [pages, setPages] = useState(1), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const refresh = useCallback(() => { void call(`returns?page=${page}`).then((data) => { setRows(data.docs); setPages(data.pages) }).catch((err) => setError(err.message)) }, [page])
  useEffect(refresh, [refresh])
  const act = async (event: React.FormEvent<HTMLFormElement>, row: any) => {
    event.preventDefault(); if (busy) return
    const data = new FormData(event.currentTarget), action = (event.nativeEvent as SubmitEvent).submitter?.getAttribute('value')
    setBusy(true); setError('')
    try { await call('manage-return', { id: row.id, revision: row.revision, action, reason: data.get('reason'), refundAmount: Number(data.get('amount') || 0), restock: data.get('restock') === 'on', reference: data.get('reference'), transferred: data.get('transferred') === 'on' }); refresh() } catch (err) { setError(err instanceof Error ? err.message : 'Lỗi kết nối.') } finally { setBusy(false) }
  }
  return <section><h1>Xử lý đổi trả</h1><p>Ghi nhận hàng nhận lại, điều chỉnh kho Studio và khoản cần hoàn. Việc chuyển tiền và giao hàng đổi được thực hiện ngoài màn hình này; ghi mã đối soát khi hoàn tất.</p>{error && <p role="alert">{error}</p>}{!rows.length && <p>Chưa có yêu cầu.</p>}{rows.map((row) => <article key={row.id} className="ha-panel" style={{ padding: 20, marginBottom: 16 }}><h2>#{row.id} · {row.orderNo} · {STATES[row.state]}</h2><p>{row.resolution === 'exchange' ? 'Khách muốn đổi sản phẩm' : 'Khách muốn trả hàng / hoàn tiền'} — {row.reason}</p><ul>{row.items.map((item: any, i: number) => <li key={i}>{item.name} × {item.quantity}</li>)}</ul><Evidence row={row} />{row.history?.map((step: any, i: number) => <p key={i}>{STATES[step.state]}: {step.reason}</p>)}{!['closed', 'rejected'].includes(row.state) && <form onSubmit={(event) => void act(event, row)} style={{ display: 'grid', gap: 12, maxWidth: 650 }}><label>Ghi chú / hướng dẫn cho khách<textarea name="reason" required maxLength={1000} style={{ display: 'block', width: '100%' }} /></label>{row.state === 'approved' && <><label>Khoản hoàn được duyệt (VND)<input name="amount" type="number" min={0} step={1} defaultValue={0} disabled={row.resolution === 'exchange'} /></label><label><input type="checkbox" name="restock" /> Nhập lại hàng vào kho Studio (chỉ hàng do Studio quản lý)</label></>}{row.state === 'received' && row.refundAmount > 0 && <><p>Cần hoàn: {row.refundAmount.toLocaleString('vi-VN')} đ</p><label>Mã giao dịch hoàn tiền đã thực hiện<input name="reference" required minLength={3} maxLength={120} /></label><label><input type="checkbox" name="transferred" required /> Đã chuyển tiền thực tế; ghi nhận vào sổ hoàn tiền</label></>}<div style={{ display: 'flex', gap: 12 }}>{(row.state === 'requested' ? [['approve', 'Duyệt'], ['reject', 'Từ chối']] : row.state === 'approved' ? [['receive', 'Xác nhận đã nhận hàng']] : [['close', row.resolution === 'exchange' ? 'Đã giao hàng đổi — đóng yêu cầu' : 'Hoàn tất xử lý']]).map(([action, label]) => <button key={action} className="ha-button" type="submit" value={action} disabled={busy}>{label}</button>)}</div></form>}</article>)}<div><button disabled={page <= 1} onClick={() => setPage(page - 1)}>Trước</button> {page} / {pages} <button disabled={page >= pages} onClick={() => setPage(page + 1)}>Sau</button></div></section>
}
