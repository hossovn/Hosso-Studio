'use client'
import { Gutter, useDocumentInfo, useFormModified, useTranslation } from '@payloadcms/ui'
import React, { useCallback, useEffect, useRef, useState } from 'react'

// Trang Nhập/xuất CSV sản phẩm trong admin (chỉ admin/publisher dùng được endpoint).
export const ImportView = () => {
  const en = /^en/i.test(useTranslation().i18n.language)
  const T = (vi: string, e: string) => (en ? e : vi)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ ok?: boolean; created?: number; updated?: number; errors?: string[]; message?: string } | null>(null)

  const upload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const file = (e.currentTarget.elements.namedItem('file') as HTMLInputElement).files?.[0]
    if (!file) return
    setBusy(true)
    try {
      const res = await fetch('/api/plugins/shop/import', { method: 'POST', headers: { 'Content-Type': 'text/csv' }, body: await file.text() })
      setResult(await res.json())
    } catch {
      setResult({ ok: false, message: T('Không gọi được máy chủ.', 'Could not reach the server.') })
    }
    setBusy(false)
  }

  return (
    <Gutter className="ha-workspace">
      <header className="ha-page-head"><div><h1>{T('Nhập / xuất sản phẩm', 'Import / export products')}</h1><p>{T('Cập nhật danh mục sản phẩm bằng tệp CSV.', 'Update your product catalog with a CSV file.')}</p></div><a className="ha-button" href="/admin/collections/shop-products">{T('Về danh sách sản phẩm', 'Back to products')}</a></header>
      <section className="ha-panel"><div className="ha-panel-head"><h2>{T('1. Chuẩn bị tệp CSV', '1. Prepare your CSV')}</h2></div><div className="ha-panel-body"><p>
        {T('Tải danh sách hiện có làm mẫu, chỉnh sửa rồi nhập lại. Sản phẩm có cùng mã sẽ được cập nhật; mã mới sẽ tạo sản phẩm mới.', 'Download your current catalog as a template, edit it and import it again. Existing product codes are updated; new codes create new products.')}
      </p><a className="ha-button" href="/api/plugins/shop/export">{T('Tải CSV sản phẩm hiện có', 'Download the current products CSV')}</a><details style={{ marginTop: 16 }}><summary>{T('Hướng dẫn các cột dữ liệu', 'CSV column reference')}</summary><p>
        {T('Cột: ', 'Columns: ')}<code>code, name, category, brand, price, salePrice, stock, makes, description, image, active</code>.{' '}
        {T('Cập nhật theo mã sản phẩm (code), chưa có thì tạo mới. Danh mục chưa có sẽ được tạo. Cột image là tên tệp đã có trong Media. Cột makes cách nhau bằng dấu ; (ví dụ toyota;kia).', 'Rows are matched by product code (code); new codes create products. Missing categories are created. The image column is a file name already in Media. Separate makes with ; (for example toyota;kia).')}
      </p></details></div></section>
      <section className="ha-panel" style={{ marginTop: 20 }}><div className="ha-panel-head"><h2>{T('2. Chọn tệp và nhập sản phẩm', '2. Select a file and import products')}</h2></div><div className="ha-panel-body">
      <form onSubmit={upload} className="ha-import-form" aria-busy={busy}>
        <label>{T('Tệp CSV', 'CSV file')}<input type="file" name="file" accept=".csv,text/csv" required disabled={busy} /></label>
        <button type="submit" disabled={busy} className="ha-button is-primary">
          {busy ? T('Đang nhập…', 'Importing…') : T('Nhập CSV', 'Import CSV')}
        </button>
      </form>
      {result && (
        <div role="status">
          {result.ok ? <p>{T(`Đã tạo ${result.created}, cập nhật ${result.updated}.`, `Created ${result.created}, updated ${result.updated}.`)}</p> : <p style={{ color: 'var(--theme-error-500)' }}>{result.message ?? T('Lỗi.', 'Error.')}</p>}
          {!!result.errors?.length && <ul>{result.errors.map((x, i) => <li key={i}>{x}</li>)}</ul>}
        </div>
      )}
      </div></section>
    </Gutter>
  )
}

/** Liên kết "In đơn và phiếu giao hàng" trong trang sửa đơn hàng. */
export const PrintLink = () => {
  const en = /^en/i.test(useTranslation().i18n.language)
  const { id } = useDocumentInfo()
  const modified = useFormModified()
  const [data, setData] = useState<any>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [cancel, setCancel] = useState(false)
  const [reason, setReason] = useState('')
  const [paymentForm, setPaymentForm] = useState(false)
  const [refundForm, setRefundForm] = useState(false)
  const [refundAmount, setRefundAmount] = useState('')
  const [refundReference, setRefundReference] = useState('')
  const refundFields = useRef<HTMLDivElement>(null)
  const lifecycle = useRef(0)
  const T = (vi: string, english: string) => en ? english : vi
  const labels: Record<string, string> = { confirm: T('Xác nhận & xử lý', 'Approve and process'), prepare: T('Chuẩn bị hàng', 'Prepare order'), ship: T('Bắt đầu giao', 'Start delivery'), paid: T('Ghi nhận thu tiền', 'Record payment'), complete: T('Hoàn tất đơn', 'Complete order'), cancel: T('Hủy đơn', 'Cancel order'), resend: T('Gửi lại email', 'Resend email'), retry: T('Thử đồng bộ lại', 'Retry processing') }
  const messages: Record<string, string> = { source_pending: T('Đơn đang chờ nguồn hàng xác nhận. Hệ thống sẽ tự thử lại.', 'Awaiting source confirmation. The server will retry.'), payment_pending: T('Đang khởi tạo thanh toán. Hệ thống sẽ tự thử lại.', 'Payment is being prepared. The server will retry.'), order_changed: T('Đơn vừa được cập nhật. Tải lại trang để thao tác tiếp.', 'The order changed. Reload before continuing.'), cancellation_reason_required: T('Nhập lý do hủy đơn.', 'Enter a cancellation reason.'), processing_busy: T('Hệ thống đang xử lý đơn. Thử lại sau ít phút.', 'The order is processing. Try again shortly.'), cancellation_pending: T('Chưa hủy được tại nguồn hàng. Kiểm tra đồng bộ rồi thử lại.', 'Source cancellation is not confirmed. Reconcile and retry.'), email_unavailable: T('Đơn chưa có email hoặc thông báo email chưa được bật.', 'No customer email or email notifications are unavailable.') }
  const load = useCallback(async (signal?: AbortSignal) => {
    const generation = lifecycle.current
    const res = await fetch(`/api/plugins/shop/manage-order?id=${encodeURIComponent(String(id))}`, { cache: 'no-store', signal })
    const body = await res.json()
    if (!res.ok) throw new Error(body.message)
    if (!signal?.aborted && generation === lifecycle.current) setData(body)
  }, [id])
  useEffect(() => {
    lifecycle.current++
    const controller = new AbortController()
    setData(null)
    if (id) void load(controller.signal).catch(() => { if (!controller.signal.aborted) setMessage(en ? 'Could not load order actions. Reload the page.' : 'Chưa tải được thao tác đơn hàng. Hãy tải lại trang.') })
    return () => { lifecycle.current++; controller.abort() }
  }, [id, load, en])
  useEffect(() => {
    if (!id || !data?.order.processing || busy) return
    const controller = new AbortController()
    let running = false
    const timer = window.setInterval(() => {
      if (running) return
      running = true
      void load(controller.signal).catch(() => { if (!controller.signal.aborted) setMessage(en ? 'Could not refresh progress. Reload the order.' : 'Chưa cập nhật được tiến độ. Thử tải lại đơn.') }).finally(() => { running = false })
    }, 4000)
    return () => { window.clearInterval(timer); controller.abort() }
  }, [id, data?.order.processing, busy, load, en])
  const act = async (action: string) => {
    if (busy || modified || !data) return
    const generation = lifecycle.current
    setBusy(true); setMessage('')
    try {
      const res = await fetch('/api/plugins/shop/manage-order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action, version: data.order.version, reason, ...(action === 'refund' && { amount: Number(refundAmount), reference: refundReference }) }) })
      const result = await res.json()
      if (generation !== lifecycle.current) return
      if (!res.ok) setMessage(messages[result.message] || T('Thao tác chưa hoàn tất. Tải lại đơn để kiểm tra trước khi thử lại.', 'Action did not finish. Reload the order before retrying.'))
      else {
        setCancel(false); setPaymentForm(false); setRefundForm(false); setRefundAmount(''); setRefundReference(''); setReason(''); await load()
        setMessage(action === 'resend' ? T('Email đã vào hàng đợi gửi. Máy chủ tự thử lại nếu gửi lỗi.', 'Email queued. The server retries delivery failures.') : T('Đã cập nhật đơn hàng.', 'Order updated.'))
      }
    } catch { if (generation === lifecycle.current) setMessage(T('Mất kết nối. Tải lại đơn để kiểm tra kết quả.', 'Connection lost. Reload the order to check the result.')) }
    finally { if (generation === lifecycle.current) setBusy(false) }
  }
  if (!id) return null
  const o = data?.order
  const active = o && ['new', 'confirmed'].includes(o.status) && !['fulfilling', 'cancelling'].includes(o.workflowState)
  labels.refund = T('Ghi nhận hoàn tiền', 'Record refund')
  const sourceLabels: Record<string, string> = { pending: T('Chờ xử lý', 'Pending'), processing: T('Đang giữ hàng', 'Reserving'), accepted: T('Đã giữ hàng', 'Reserved'), missing: T('Thiếu hàng hoặc đổi giá', 'Unavailable or repriced'), unknown: T('Đang đối soát', 'Reconciling'), attention: T('Cần kiểm tra', 'Needs attention'), cancelling: T('Đang hủy', 'Cancelling'), cancelled: T('Đã hủy', 'Cancelled'), fulfilled: T('Đã bàn giao', 'Dispatched') }
  const actions = o ? [...(!o.processing && o.status === 'new' ? ['confirm'] : []), ...(!o.processing && o.status === 'confirmed' ? ['prepare', ...(o.fulfillment !== 'pickup' ? ['ship'] : [])] : []), ...(!o.processing && ['confirmed', 'shipping'].includes(o.status) ? ['complete'] : []), ...(o.status !== 'cancelled' && o.paymentStatus !== 'paid' ? ['paid'] : []), ...(o.canEmail ? ['resend'] : []), ...(o.processing || o.processingIssue ? ['retry'] : [])] : []
  return (
    <section className="ha-panel hs-order-actions" style={{ marginBottom: 24 }} aria-busy={busy}>
      <style>{`.hs-order-actions .hs-order-buttons{display:flex;flex-wrap:wrap;gap:8px}.hs-order-actions button,.hs-order-actions .ha-button{min-height:44px}.hs-order-actions .hs-order-history{padding-left:20px;display:grid;gap:10px}.hs-order-actions .hs-order-history time{font-size:12px;color:var(--theme-elevation-600);margin-left:8px}.hs-order-actions details{margin-top:20px}.hs-order-actions summary{cursor:pointer;padding:10px 0;font-weight:600}.hs-order-actions textarea{display:block;width:100%;max-width:560px;min-height:88px;margin:8px 0;font:inherit;padding:12px;border:1px solid var(--theme-elevation-200);background:var(--theme-input-bg);color:var(--theme-text)}.hs-order-actions .hs-order-warning{border-left:1px solid var(--theme-elevation-200);padding:12px 16px;background:var(--theme-elevation-50)}.hs-order-actions .hs-order-status{font-size:13px;color:var(--theme-elevation-600)}`}</style>
      <header className="ha-panel-head"><h2>{T('Xử lý đơn hàng', 'Manage order')}</h2><a href={`/api/plugins/shop/print?id=${id}`} target="_blank" rel="noopener noreferrer">{T('In đơn và phiếu giao', 'Print order and delivery slip')}</a></header>
      <div className="ha-panel-body">
        <style>{`
          .hs-order-actions{overflow-wrap:anywhere}
          .hs-order-actions .hs-order-sources{list-style:none;margin:0 0 24px;padding:0;border-top:1px solid var(--theme-elevation-200)}
          .hs-order-sources li{display:grid;grid-template-columns:minmax(0,1fr) minmax(120px,auto);gap:20px;padding:14px 0;border-bottom:1px solid var(--theme-elevation-200)}
          .hs-order-sources small{display:block;font-size:13px;color:var(--theme-elevation-600);margin-top:4px}
          .hs-order-source-state{text-align:right;font-size:14px}
          .hs-order-actions .hs-order-warning{border-left:1px solid var(--theme-elevation-200);padding:12px 16px;line-height:1.6}
          .hs-order-refund{display:grid;gap:16px;max-width:560px;margin-top:24px;padding-top:20px;border-top:1px solid var(--theme-elevation-200)}
          .hs-order-refund label{display:grid;gap:6px;font-size:14px;font-weight:600}
          .hs-order-refund input{width:100%;min-height:44px;padding:10px 12px;border:1px solid var(--theme-elevation-200);border-radius:4px;background:var(--theme-input-bg);color:var(--theme-text);font:inherit}
          .hs-order-refund button{justify-self:start}
          .hs-order-actions :is(button,a,input,textarea,summary):focus-visible{outline:2px solid var(--theme-text);outline-offset:3px}
          @media(max-width:600px){.hs-order-sources li{grid-template-columns:minmax(0,1fr);gap:8px}.hs-order-source-state{text-align:left}.hs-order-actions .ha-panel-head{flex-wrap:wrap;gap:12px}.hs-order-actions .hs-order-buttons{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.hs-order-actions .hs-order-buttons button{white-space:normal;padding:10px;line-height:1.4}}
        `}</style>
        {o?.workflowState === 'fulfilling' && <p role="status" className="hs-order-status">{T('Đang xác nhận xuất kho tại các nguồn hàng.', 'Confirming dispatch with each source.')}</p>}
        {o?.workflowState === 'cancelling' && <p role="status" className="hs-order-status">{T('Đang hủy đơn nguồn và giải phóng hàng đã giữ.', 'Cancelling source orders and releasing reserved stock.')}</p>}
        {o?.approvalState === 'awaiting' && <p className="hs-order-warning">{T('Đơn mới đang chờ cửa hàng xác nhận.', 'New order awaiting store approval.')}</p>}
        {o?.workflowState === 'awaiting_customer' && <p className="hs-order-warning">{T('Đang giữ phần còn hàng và chờ khách lựa chọn qua liên kết tra cứu đơn.', 'Available items are held while the customer chooses through the private order link.')}</p>}
        {!!o?.refundDue && <p className="hs-order-warning">{T('Cần hoàn cho khách: ', 'Customer refund due: ')}{new Intl.NumberFormat(en ? 'en-GB' : 'vi-VN', { style: 'currency', currency: 'VND' }).format(o.refundDue)}</p>}
        {!!data?.groups?.length && <ul className="hs-order-sources" aria-label={T('Tình trạng nguồn hàng', 'Source progress')}>{data.groups.map((group: any) => <li key={group.key}><div><strong>{group.label}</strong><small>{group.source === 'shop' ? T('Tại cửa hàng', 'Store stock') : group.source === 'wim' ? 'WIM' : T('Nhà cung cấp', 'Supplier')}</small></div><div className="hs-order-source-state"><span>{group.result?.fulfillmentStage === 'completed' ? T('Đã giao', 'Delivered') : sourceLabels[group.state] || group.state}</span>{group.issue && <small>{T('Chờ đồng bộ', 'Sync pending')}{group.nextAttemptAt ? ` · ${new Date(group.nextAttemptAt).toLocaleTimeString(en ? 'en-GB' : 'vi-VN', { hour: '2-digit', minute: '2-digit' })}` : ''}</small>}</div></li>)}</ul>}
        {modified && <p className="hs-order-warning">{T('Lưu thay đổi thông tin đơn trước khi thực hiện thao tác.', 'Save the order changes before using these actions.')}</p>}
        {o?.processing && <p className="hs-order-warning">{messages[o.processingIssue] || T('Đã nhận đơn. Máy chủ đang xử lý nguồn hàng và thanh toán; khách có thể tiếp tục mua sắm.', 'Order received. Source and payment processing continue on the server; the customer can keep shopping.')}</p>}
        {!o?.processing && o?.processingIssue && <p className="hs-order-warning">{T('Một bước xử lý chưa hoàn tất. Hãy thử đồng bộ lại.', 'A processing step is pending. Retry processing.')}</p>}
        <div className="hs-order-buttons">{actions.map((action, index) => <button key={action} type="button" className={`ha-button ${index === 0 ? 'is-primary' : ''}`} disabled={busy || modified} onClick={() => action === 'paid' ? (setPaymentForm(!paymentForm), setCancel(false), setReason('')) : void act(action)}>{labels[action]}</button>)}
          {o?.tracking && <button type="button" className="ha-button" disabled={busy} onClick={() => void navigator.clipboard.writeText(new URL(o.tracking, window.location.origin).href).then(() => setMessage(T('Đã sao chép liên kết tra cứu.', 'Tracking link copied.'))).catch(() => setMessage(T('Không sao chép được. Kiểm tra quyền clipboard của trình duyệt.', 'Could not copy. Check browser clipboard permissions.')))}>{T('Sao chép liên kết', 'Copy tracking link')}</button>}
          {!!o?.refundDue && !['fulfilling', 'cancelling'].includes(o.workflowState) && <button type="button" className="ha-button" disabled={busy || modified} onClick={() => { setRefundForm(!refundForm); setRefundAmount(String(o.refundDue)); setPaymentForm(false); setCancel(false); setReason('') }}>{T('Ghi nhận hoàn tiền', 'Record refund')}</button>}
          {active && <button type="button" className="ha-button" disabled={busy || modified} onClick={() => { setCancel(!cancel); setRefundForm(false); setPaymentForm(false); setReason('') }}>{labels.cancel}</button>}
        </div>
        {refundForm && <div ref={refundFields} className="hs-order-refund" role="group" aria-label={labels.refund}><label>{T('Số tiền đã hoàn (đ)', 'Refund sent (VND)')}<input type="number" inputMode="numeric" min={1} max={o?.refundDue} step={1} required value={refundAmount} onChange={e => setRefundAmount(e.target.value)} /></label><label>{T('Mã giao dịch hoàn tiền', 'Refund transaction reference')}<input required minLength={3} maxLength={160} value={refundReference} onChange={e => setRefundReference(e.target.value)} /></label><label>{T('Chứng từ hoặc ghi chú xác minh', 'Transfer evidence')}<textarea required minLength={3} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} /></label><button type="button" className="ha-button is-primary" disabled={busy || modified} onClick={() => { if (refundFields.current && Array.from(refundFields.current.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input,textarea')).every(field => field.reportValidity())) void act('refund') }}>{T('Xác nhận đã hoàn tiền', 'Confirm refund sent')}</button></div>}
        {paymentForm && <div className="hs-order-warning" style={{ marginTop: 16 }}><label>{T('Mã giao dịch hoặc chứng từ thu tiền', 'Payment reference or receipt')}<textarea value={reason} maxLength={500} onChange={e => setReason(e.target.value)} /></label><p>{T('Chỉ ghi nhận khi đã kiểm tra tiền thực nhận. Hệ thống ghi chứng từ vào sổ thanh toán.', 'Record only verified funds received. The server keeps an immutable receipt.')}</p><button type="button" className="ha-button" disabled={busy || modified || !reason.trim()} onClick={() => void act('paid')}>{labels.paid}</button></div>}
        {cancel && <div className="hs-order-warning" style={{ marginTop: 16 }}><label>{T('Lý do hủy đơn', 'Cancellation reason')}<textarea value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} /></label><p>{T('Đơn đã thu tiền cần được đối soát hoàn tiền riêng.', 'Payments already collected need separate refund reconciliation.')}</p><button type="button" className="ha-button" disabled={busy || modified || !reason.trim()} onClick={() => void act('cancel')}>{T('Xác nhận hủy đơn', 'Confirm cancellation')}</button></div>}
        {message && <p role="status">{message}</p>}
        {!!data?.notifications?.length && <details><summary>{T('Thông báo email', 'Email notifications')}</summary><ul>{data.notifications.map((n: any, i: number) => <li key={i}>{n.audience === 'owner' ? T('Cửa hàng', 'Store') : T('Khách hàng', 'Customer')} · {({ sent: T('Đã gửi đến máy chủ email', 'Accepted by mail server'), queued: T('Chờ gửi', 'Queued'), retrying: T('Gửi lỗi, đang thử lại', 'Retrying delivery'), failed: T('Gửi thất bại, dùng nút Gửi lại email', 'Delivery failed; use Resend email') } as Record<string, string>)[n.state]}<time dateTime={n.at}> · {new Date(n.at).toLocaleString(en ? 'en-GB' : 'vi-VN')}</time></li>)}</ul></details>}
        {o && <details><summary>{T('Lịch sử xử lý', 'Order history')} · {o.history.length}</summary>{!o.history.length ? <p className="hs-order-status">{T('Các thao tác mới sẽ được ghi tại đây.', 'New actions will appear here.')}</p> : <ol className="hs-order-history">{o.history.map((h: any, i: number) => <li key={i}><strong>{labels[h.action] || h.action}</strong><time dateTime={h.at}>{new Date(h.at).toLocaleString(en ? 'en-GB' : 'vi-VN')}</time>{h.reason && <p>{h.reason}</p>}</li>)}</ol>}</details>}
        {!!data?.extras?.shipments?.length && <details><summary>{T('Tiến độ giao hàng', 'Delivery progress')}</summary><ul>{data.extras.shipments.map((s: any) => <li key={s.key}>{s.carrier || T('Kiện hàng', 'Shipment')} · {s.trackingCode || s.status}{s.url && <a href={s.url} target="_blank" rel="noopener noreferrer"> · {T('Theo dõi vận đơn', 'Track shipment')}</a>}</li>)}</ul></details>}
      </div>
    </section>
  )
}
