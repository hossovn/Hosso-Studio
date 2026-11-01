'use client'
import React, { useState } from 'react'
import { Minus, Plus, Search, Trash2, Check, ArrowRight } from 'lucide-react'

const money = (n: number) => `${n.toLocaleString('vi-VN')} đ`
type Product = { id: string; name: string; image?: string; price: number; salePrice?: number; variants?: { id: string; name: string; price: number; stock: number }[] }
type Line = { product: Product; variantId?: string; quantity: number }
async function api(path: string, body?: any) {
  const r = await fetch('/api/plugins/affiliate/' + path, body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const data = await r.json()
  if (!r.ok || data.ok === false) throw Object.assign(new Error(data.message || 'Không thực hiện được. Vui lòng thử lại.'), { resetCart: data.resetCart })
  return data
}

export function AssistedOrder({ preview }: { preview: boolean }) {
  const [query, setQuery] = useState(''), [found, setFound] = useState<Product[]>([]), [lines, setLines] = useState<Line[]>([])
  const [customer, setCustomer] = useState({ name: '', phone: '', email: '', address: '' })
  const [token, setToken] = useState(''), [verified, setVerified] = useState('')
  const [pay, setPay] = useState('cod'), [receive, setReceive] = useState('delivery')
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]), [branchId, setBranchId] = useState('')
  const [quote, setQuote] = useState<any>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [success, setSuccess] = useState<any>(null)
  const [cartId, setCartId] = useState(() => typeof crypto !== 'undefined' ? crypto.randomUUID() : '')
  React.useEffect(() => { if (preview) return; let active = true; void api('checkout-options').then((r) => { if (active) { setBranches(r.branches); setBranchId(r.branches[0]?.id || '') } }).catch(() => { if (active) setError('Chưa tải được danh sách chi nhánh. Hãy mở lại mục lên đơn hộ.') }); return () => { active = false } }, [preview])
  const input = () => ({ cartId, items: lines.map((l) => ({ productId: l.product.id, variantId: l.variantId, quantity: l.quantity })), customer, fulfillment: { type: receive, ...(receive === 'pickup' && branchId && { branchId }) }, payment: pay, meta: { assistedCustomerToken: verified || 'retail' } })
  const run = async (task: () => Promise<void>) => { if (preview || busy) return; setBusy(true); setError(''); try { await task() } catch (e) { setError(e instanceof Error ? e.message : 'Lỗi kết nối.'); setQuote(null); if ((e as { resetCart?: boolean })?.resetCart) setCartId(crypto.randomUUID()) } finally { setBusy(false) } }
  const changeLines = (next: Line[]) => { setLines(next); setQuote(null) }
  if (success) return <div className="af-success" role="status"><Check size={28} /><h3>Đã tạo đơn {success.order.id}</h3><p>{money(success.order.total)}</p><a href={`/trang-thai-don?id=${encodeURIComponent(success.order.id)}&token=${encodeURIComponent(success.lookupToken)}`}>Xem đơn hàng</a><button className="wp-btn" onClick={() => { setSuccess(null); changeLines([]); setCartId(crypto.randomUUID()) }}>Tạo đơn tiếp</button></div>
  return <div className="af-assisted">
    <section aria-label="Sản phẩm lên hộ"><h3>Tạo đơn cho khách</h3>
      <form className="wp-search" onSubmit={(e) => { e.preventDefault(); void run(async () => setFound((await api('products?q=' + encodeURIComponent(query))).items)) }}><input value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Tìm sản phẩm" placeholder="Tên hoặc mã sản phẩm" /><button className="wp-btn" title="Tìm sản phẩm" aria-label="Tìm sản phẩm"><Search size={18} /></button></form>
      <ul className="af-product-results">{found.map((p) => <li key={p.id}>{p.image && <img src={p.image} alt="" />}<div><strong>{p.name}</strong><span>{money(p.salePrice || p.price)}</span></div><button type="button" className="af-icon" title="Thêm sản phẩm" aria-label={`Thêm ${p.name}`} onClick={() => { const existing = lines.find((l) => l.product.id === p.id); changeLines(existing ? lines.map((l) => l === existing ? { ...l, quantity: Math.min(99, l.quantity + 1) } : l) : [...lines, { product: p, quantity: 1, variantId: p.variants?.find((v) => v.stock > 0)?.id }]) }}><Plus size={18} /></button></li>)}</ul>
      <ul className="af-product-results">{lines.map((l, i) => <li key={l.product.id} data-hs-part="assisted-line"><div><strong>{l.product.name}</strong>{Boolean(l.product.variants?.length) && <select aria-label={`Loại ${l.product.name}`} value={l.variantId || ''} onChange={(e) => changeLines(lines.map((x, n) => n === i ? { ...x, variantId: e.target.value } : x))}><option value="">Chọn loại</option>{l.product.variants?.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select>}</div><div className="af-stepper"><button type="button" aria-label="Giảm số lượng" disabled={l.quantity <= 1} onClick={() => changeLines(lines.map((x, n) => n === i ? { ...x, quantity: x.quantity - 1 } : x))}><Minus size={14} /></button><input type="number" min={1} max={99} value={l.quantity} aria-label={`Số lượng ${l.product.name}`} onChange={(e) => changeLines(lines.map((x, n) => n === i ? { ...x, quantity: Math.max(1, Math.min(99, Math.trunc(Number(e.target.value)) || 1)) } : x))} /><button type="button" aria-label="Tăng số lượng" disabled={l.quantity >= 99} onClick={() => changeLines(lines.map((x, n) => n === i ? { ...x, quantity: x.quantity + 1 } : x))}><Plus size={14} /></button></div><button type="button" className="af-icon" aria-label={`Xóa ${l.product.name}`} title="Xóa" onClick={() => changeLines(lines.filter((_, n) => n !== i))}><Trash2 size={16} /></button></li>)}</ul>
      {!lines.length && <p className="wp-note">Chưa có sản phẩm trong đơn.</p>}
    </section>
    <form className="wp-form" onSubmit={(e) => { e.preventDefault(); void run(async () => { if (!quote) setQuote(await api('assisted-quote', input())); else setSuccess(await api('assisted-checkout', { ...input(), quoteKey: quote.quoteKey })) }) }}>
      <h3>Người nhận và thanh toán</h3><div className="af-consent"><label>Mã đồng ý của khách<input value={token} onChange={(e) => { setToken(e.target.value); setVerified(''); setQuote(null) }} /></label><button type="button" className="wp-link" disabled={!token} onClick={() => void run(async () => { const result = await api('assisted-customer', { token }); setCustomer(result.customer); setVerified(token); setQuote(null) })}>Xác minh khách</button><p className="wp-note">{verified ? 'Đã xác minh. Giá theo hồ sơ khách được duyệt.' : 'Chưa xác minh: áp dụng giá khách lẻ.'}</p></div>
      {(['name', 'phone', 'email', 'address'] as const).map((k) => <label key={k}>{{ name: 'Họ tên', phone: 'Số điện thoại', email: 'Email', address: 'Địa chỉ' }[k]}<input value={customer[k]} type={k === 'email' ? 'email' : 'text'} required={k !== 'email' && (k !== 'address' || receive === 'delivery')} onChange={(e) => { setCustomer({ ...customer, [k]: e.target.value }); setQuote(null) }} /></label>)}
      <label>Nhận hàng<select value={receive} onChange={(e) => { setReceive(e.target.value); setQuote(null) }}><option value="delivery">Giao tận nơi</option><option value="pickup">Nhận tại cửa hàng</option></select></label>
      {receive === 'pickup' && branches.length > 0 && <label>Chi nhánh nhận hàng<select required value={branchId} onChange={(e) => { setBranchId(e.target.value); setQuote(null) }}>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>}
      <label>Thanh toán<select value={pay} onChange={(e) => { setPay(e.target.value); setQuote(null) }}><option value="cod">Khi nhận hàng</option><option value="bank">Chuyển khoản</option></select></label>
      {quote && <div className="af-quote" role="status">{quote.items.map((l: any) => <div key={`${l.productId}:${l.variantId || ''}`}><p>{l.name} × {l.quantity}<strong>{money(l.price * l.quantity)}</strong></p><span className="wp-note">{l.priceGroup ? 'Giá gara đã xác minh' : 'Giá khách lẻ'}</span></div>)}{quote.adjustments.map((a: any, n: number) => <p key={n}>{a.label}<strong>{money(a.amount)}</strong></p>)}<p>Tổng thanh toán<strong>{money(quote.total)}</strong></p>{quote.commissionPreview && <><p>Hoa hồng dự kiến<strong>{money(quote.commissionPreview.amount)}</strong></p><span className="wp-note">{quote.commissionPreview.review ? 'Cần đối soát quan hệ người mua trước khi duyệt.' : `Chỉ đủ điều kiện khi đã thu đủ tiền, hoàn tất và qua ${quote.commissionPreview.holdDays} ngày giữ.`}</span></>}{quote.shipments?.map((s: any) => <p key={s.key}>{s.label} · {s.deliveryBy === 'partner' ? 'Đối tác giao' : 'Cửa hàng giao'}<strong>{pay === 'cod' ? `Thu hộ ${money(s.codAmount || 0)}` : 'Không thu COD'}</strong></p>)}</div>}
      {error && <p role="alert" className="wp-note-error">{error}</p>}
      <button className="wp-btn af-action" disabled={preview || busy || !lines.length}>{busy ? 'Đang xử lý…' : quote ? 'Xác nhận tạo đơn' : 'Kiểm tra giá và tồn'}<ArrowRight size={18} /></button>
    </form>
  </div>
}
