'use client'
import { localizeHref, useLocale } from '@hosso/studio-blocks'
import React, { useState } from 'react'
import { addToCart, cartCount, cartTotal, clearCart, lineKey, removeFromCart, setQuantity, useCart } from '../cart'
import { vnd } from '../util'

const S = {
  vi: {
    cart: 'Giỏ hàng', add: 'Thêm vào giỏ', added: 'Đã thêm vào giỏ.', view: 'Xem giỏ hàng', soldOut: 'Hết hàng',
    empty: 'Giỏ hàng trống.', continue: 'Tiếp tục mua sắm', qty: 'Số lượng', remove: 'Xóa', total: 'Tổng cộng', checkout: 'Đặt hàng',
    name: 'Họ tên', phone: 'Số điện thoại', address: 'Địa chỉ giao hàng', note: 'Ghi chú (tùy chọn)',
    delivery: 'Giao tận nơi', pickup: 'Nhận tại cửa hàng', receive: 'Cách nhận hàng',
    pay: 'Thanh toán', cod: 'Thanh toán khi nhận hàng (COD)', bank: 'Chuyển khoản ngân hàng', bankInfo: 'Thông tin chuyển khoản', place: 'Đặt hàng', placing: 'Đang đặt…',
    errors: { name: 'Nhập họ tên.', phone: 'Số điện thoại không hợp lệ.', address: 'Nhập địa chỉ giao hàng.', empty: 'Giỏ hàng trống.', cart: 'Giỏ hàng không hợp lệ, hãy tải lại trang.', gone: 'Có sản phẩm không còn bán.', stock: 'không đủ hàng (còn {n}).', bad_request: 'Yêu cầu không hợp lệ.', network: 'Lỗi mạng, thử lại.' } as Record<string, string>,
    keep: 'Giỏ hàng của bạn vẫn được giữ nguyên.', variant: 'Loại', reviewTitle: 'Viết đánh giá', yourName: 'Tên của bạn', stars: 'Số sao', comment: 'Nhận xét', send: 'Gửi đánh giá', thanks: 'Cảm ơn bạn! Đánh giá sẽ hiện sau khi được duyệt.', reviewErr: 'Không gửi được, thử lại sau.', email: 'Email (tùy chọn, để nhận thông báo)', voucher: 'Mã giảm giá', apply: 'Áp dụng', bankAfter: 'Thông tin chuyển khoản sẽ hiện sau khi đặt hàng.', payStatus: 'Thanh toán', qr: 'Mã QR chuyển khoản',
    payStatuses: { unpaid: 'Chưa thanh toán', paid: 'Đã thanh toán', refunded: 'Đã hoàn tiền' } as Record<string, string>,
    lookup: 'Tra cứu đơn hàng', orderNo: 'Mã đơn hàng', last4: '4 số cuối điện thoại', go: 'Tra cứu', notFound: 'Không tìm thấy đơn. Kiểm tra lại mã đơn và 4 số cuối điện thoại.',
    status: 'Trạng thái', items: 'Sản phẩm', done: 'Đặt hàng thành công. Mã đơn của bạn:', keepCode: 'Hãy lưu mã đơn và 4 số cuối điện thoại để tra cứu.',
    statuses: { new: 'Mới', confirmed: 'Đã xác nhận', shipping: 'Đang giao', completed: 'Hoàn tất', cancelled: 'Đã hủy' } as Record<string, string>,
  },
  en: {
    cart: 'Cart', add: 'Add to cart', added: 'Added to your cart.', view: 'View cart', soldOut: 'Out of stock',
    empty: 'Your cart is empty.', continue: 'Continue shopping', qty: 'Quantity', remove: 'Remove', total: 'Total', checkout: 'Checkout',
    name: 'Full name', phone: 'Phone number', address: 'Delivery address', note: 'Note (optional)',
    delivery: 'Delivery', pickup: 'Store pickup', receive: 'How to receive',
    pay: 'Payment', cod: 'Cash on delivery (COD)', bank: 'Bank transfer', bankInfo: 'Bank transfer details', place: 'Place order', placing: 'Placing…',
    errors: { name: 'Enter your name.', phone: 'Invalid phone number.', address: 'Enter a delivery address.', empty: 'Your cart is empty.', cart: 'Invalid cart, please reload the page.', gone: 'A product is no longer available.', stock: 'is out of stock ({n} left).', bad_request: 'Invalid request.', network: 'Network error, try again.' } as Record<string, string>,
    keep: 'Your cart has been kept.', variant: 'Option', reviewTitle: 'Write a review', yourName: 'Your name', stars: 'Rating', comment: 'Comment', send: 'Submit review', thanks: 'Thank you! Your review will appear once approved.', reviewErr: 'Could not send, try again later.', email: 'Email (optional, for notifications)', voucher: 'Discount code', apply: 'Apply', bankAfter: 'Bank transfer details are shown after you place the order.', payStatus: 'Payment', qr: 'Bank transfer QR code',
    payStatuses: { unpaid: 'Unpaid', paid: 'Paid', refunded: 'Refunded' } as Record<string, string>,
    lookup: 'Track your order', orderNo: 'Order number', last4: 'Last 4 digits of phone', go: 'Track', notFound: 'Order not found. Check the order number and the last 4 digits of the phone.',
    status: 'Status', items: 'Items', done: 'Order placed. Your order number:', keepCode: 'Keep the order number and the last 4 digits of your phone to track it.',
    statuses: { new: 'New', confirmed: 'Confirmed', shipping: 'Shipping', completed: 'Completed', cancelled: 'Cancelled' } as Record<string, string>,
  },
}
const useS = () => {
  const { locale, defaultLocale } = useLocale()
  return { t: S[locale === 'en' ? 'en' : 'vi'], href: (p: string) => localizeHref(p, locale, defaultLocale), locale }
}

/** Liên kết giỏ hàng trên header (số lượng lấy từ localStorage). */
export function CartLink() {
  const { t, href } = useS()
  const n = cartCount(useCart())
  return (
    <a href={href('/gio-hang')} aria-label={`${t.cart} (${n})`}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ verticalAlign: 'middle' }}><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" /></svg>
      {n > 0 ? <sup> {n}</sup> : null}
    </a>
  )
}

export function AddToCart({ product, cartPath, inStock, variants }: { product: { id: string; name: string; price: number; image?: string }; cartPath: string; inStock: boolean; variants?: { id: string; name: string; price: number; stock: number }[] }) {
  const { t, href } = useS()
  const [added, setAdded] = useState(false)
  const [variantId, setVariantId] = useState(variants?.find((v) => v.stock > 0)?.id ?? '')
  const variant = variants?.find((v) => v.id === variantId)
  const price = variant?.price ?? product.price
  const canBuy = variants?.length ? Boolean(variant && variant.stock > 0) : inStock
  const n = cartCount(useCart())
  React.useEffect(() => {
    window.dispatchEvent(new CustomEvent('hs:view_item', { detail: { id: product.id, name: product.name, price: product.price } }))
  }, [product.id])
  return (
    <div className="sp-add">
      {variants && variants.length > 0 && (
        <label className="sp-variant">{t.variant}<select value={variantId} onChange={(e) => { setVariantId(e.target.value); setAdded(false) }}>{variants.map((v) => (<option key={v.id} value={v.id} disabled={v.stock <= 0}>{v.name} — {vnd(v.price)}{v.stock <= 0 ? ` (${t.soldOut})` : ''}</option>))}</select></label>
      )}
      <button className="sp-btn" type="button" disabled={!canBuy} onClick={() => { const name = variant ? `${product.name} (${variant.name})` : product.name; addToCart({ productId: product.id, variantId: variant?.id, name, price, image: product.image }); setAdded(true); window.dispatchEvent(new CustomEvent('hs:add_to_cart', { detail: { id: product.id, name, price } })) }}>
        {canBuy ? t.add : t.soldOut}
      </button>
      {(added || n > 0) && (
        <p className="sp-note" role="status">
          {added ? `${t.added} ` : ''}
          <a href={href(cartPath)}>{t.view} ({n})</a>
        </p>
      )}
    </div>
  )
}

export function CartView({ heading, checkoutPath, shopPath }: { heading?: string; checkoutPath: string; shopPath: string }) {
  const { t, href } = useS()
  const cart = useCart()
  return (
    <section className="sp-section">
      <div className="sp-wrap">
        {heading && <h2>{heading}</h2>}
        {cart.lines.length === 0 ? (
          <p className="sp-note">{t.empty} <a href={href(shopPath)}>{t.continue}</a></p>
        ) : (
          <>
            <ul className="sp-cart">
              {cart.lines.map((l) => (
                <li key={lineKey(l)}>
                  <div><strong>{l.name}</strong><span className="sp-meta">{vnd(l.price)}</span></div>
                  <label><span className="sp-sr">{t.qty}</span><input type="number" min={1} max={99} value={l.quantity} onChange={(e) => setQuantity(lineKey(l), Number(e.target.value) || 1)} /></label>
                  <strong>{vnd(l.price * l.quantity)}</strong>
                  <button className="sp-link" type="button" onClick={() => removeFromCart(lineKey(l))}>{t.remove}</button>
                </li>
              ))}
            </ul>
            <p className="sp-total">{t.total}: <strong>{vnd(cartTotal(cart))}</strong></p>
            <a className="sp-btn sp-btn-link" href={href(checkoutPath)}>{t.checkout}</a>
          </>
        )}
      </div>
    </section>
  )
}

type Err = { code: string; name?: string; available?: number; text?: string }
type Quote = { subtotal: number; adjustments: { label: string; amount: number }[]; total: number }

export function CheckoutForm({ heading, bankInfo, statusPath, cartPath }: { heading?: string; bankInfo?: string; statusPath: string; cartPath: string }) {
  const { t, href, locale } = useS()
  const cart = useCart()
  const formRef = React.useRef<HTMLFormElement>(null)
  const [type, setType] = useState<'delivery' | 'pickup'>('delivery')
  const [pay, setPay] = useState<'cod' | 'bank'>('cod')
  const [voucher, setVoucher] = useState('')
  const [quote, setQuote] = useState<Quote | null>(null)
  const [quoteError, setQuoteError] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<Err | null>(null)

  const items = cart.lines.map((l) => ({ productId: l.productId, variantId: l.variantId, quantity: l.quantity }))
  const itemsKey = JSON.stringify(items)

  // Tính lại tổng tiền (phí ship, giảm giá do plugin khác thêm) khi giỏ, cách nhận hàng, địa chỉ hoặc mã giảm giá đổi.
  const runQuote = React.useCallback(async () => {
    if (!items.length) return
    const f = formRef.current ? new FormData(formRef.current) : null
    const r = await fetch('/api/plugins/shop/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, customer: { address: f?.get('address') ?? '' }, fulfillment: { type }, payment: pay, meta: { voucher: voucher.trim(), locale } }),
    }).catch(() => null)
    const j = await r?.json().catch(() => null)
    if (j?.ok) {
      setQuote(j)
      setQuoteError('')
    } else if (j?.message && j.code !== 'out_of_stock' && j.code !== 'product_not_found') {
      setQuoteError(String(j.message))
      setQuote(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey, type, pay, voucher, locale])
  React.useEffect(() => {
    void runQuote()
  }, [itemsKey, type, pay, runQuote])

  // Tự điền từ tài khoản khách (plugin Tài khoản lưu thông tin ở localStorage khóa hs_customer).
  const hasLines = cart.lines.length > 0
  React.useEffect(() => {
    try {
      const c = JSON.parse(localStorage.getItem('hs_customer') || 'null') as Record<string, string> | null
      const f = formRef.current
      if (!c || !f) return
      for (const k of ['name', 'phone', 'email', 'address']) {
        const el = f.elements.namedItem(k) as HTMLInputElement | null
        if (el && !el.value && c[k]) el.value = c[k]
      }
    } catch {
      // dữ liệu hỏng: bỏ qua
    }
  }, [hasLines, type])

  if (cart.lines.length === 0)
    return (
      <section className="sp-section"><div className="sp-wrap"><p className="sp-note">{t.empty} <a href={href(cartPath)}>{t.view}</a></p></div></section>
    )

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/plugins/shop/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartId: cart.id,
          items,
          customer: { name: f.get('name'), phone: f.get('phone'), email: f.get('email'), address: f.get('address'), note: f.get('note') },
          fulfillment: { type },
          payment: pay,
          meta: { voucher: voucher.trim(), locale },
          website: f.get('website'),
        }),
      })
      const body = await res.json().catch(() => null)
      if (body?.ok) {
        window.dispatchEvent(new CustomEvent('hs:purchase', { detail: { id: body.order.id, total: body.order.total, items: cart.lines } }))
        clearCart()
        window.location.href = body.redirectUrl || `${href(statusPath)}?id=${encodeURIComponent(body.order.id)}&phone=${encodeURIComponent(body.phone4)}&new=1`
        return
      }
      const known = body?.code === 'bad_request' || body?.code === 'out_of_stock' || body?.code === 'product_not_found'
      setError(body ? { code: body.code === 'bad_request' ? body.message : body.code, name: body.name, available: body.available, text: known ? undefined : body.message } : { code: 'network' })
    } catch {
      setError({ code: 'network' })
    }
    setBusy(false)
  }

  const msg = (e: Err) =>
    e.text ?? (e.code === 'out_of_stock' ? `${e.name ?? ''} ${t.errors.stock.replace('{n}', String(e.available ?? 0))}` : t.errors[e.code === 'product_not_found' ? 'gone' : e.code] ?? t.errors.bad_request)
  const total = quote?.total ?? cartTotal(cart)

  return (
    <section className="sp-section">
      <div className="sp-wrap sp-checkout">
        {heading && <h2>{heading}</h2>}
        <ul className="sp-cart sp-cart-summary">
          {cart.lines.map((l) => (<li key={lineKey(l)}><span>{l.name} × {l.quantity}</span><strong>{vnd(l.price * l.quantity)}</strong></li>))}
          {quote?.adjustments.map((a, n) => (<li key={n}><span>{a.label}</span><strong>{a.amount < 0 ? '−' : '+'}{vnd(Math.abs(a.amount))}</strong></li>))}
        </ul>
        <p className="sp-total">{t.total}: <strong>{vnd(total)}</strong></p>
        <form className="sp-form" onSubmit={submit} ref={formRef}>
          <label>{t.name}<input name="name" required maxLength={120} autoComplete="name" /></label>
          <label>{t.phone}<input name="phone" required inputMode="tel" autoComplete="tel" /></label>
          <label>{t.email}<input name="email" type="email" autoComplete="email" /></label>
          <fieldset>
            <legend>{t.receive}</legend>
            <label className="sp-radio"><input type="radio" checked={type === 'delivery'} onChange={() => setType('delivery')} /> {t.delivery}</label>
            <label className="sp-radio"><input type="radio" checked={type === 'pickup'} onChange={() => setType('pickup')} /> {t.pickup}</label>
          </fieldset>
          {type === 'delivery' && <label>{t.address}<textarea name="address" required rows={2} maxLength={300} autoComplete="street-address" onBlur={() => void runQuote()} /></label>}
          <label>{t.note}<textarea name="note" rows={2} maxLength={500} /></label>
          <div className="sp-voucher">
            <label>{t.voucher}<input value={voucher} onChange={(e) => setVoucher(e.target.value)} maxLength={40} autoCapitalize="characters" /></label>
            <button type="button" className="sp-btn" onClick={() => void runQuote()}>{t.apply}</button>
          </div>
          {quoteError && <p className="sp-note sp-error" role="alert">{quoteError}</p>}
          <fieldset>
            <legend>{t.pay}</legend>
            <label className="sp-radio"><input type="radio" checked={pay === 'cod'} onChange={() => setPay('cod')} /> {t.cod}</label>
            <label className="sp-radio"><input type="radio" checked={pay === 'bank'} onChange={() => setPay('bank')} /> {t.bank}</label>
            {pay === 'bank' && bankInfo && <p className="sp-note"><strong>{t.bankInfo}:</strong><br /><span style={{ whiteSpace: 'pre-line' }}>{bankInfo}</span></p>}
            {pay === 'bank' && !bankInfo && <p className="sp-note">{t.bankAfter}</p>}
          </fieldset>
          <input className="sp-hp" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
          {error && <p className="sp-note sp-error" role="alert">{msg(error)} {t.keep}</p>}
          <button className="sp-btn" disabled={busy || Boolean(quoteError)}>{busy ? t.placing : t.place}</button>
        </form>
      </div>
    </section>
  )
}

type Order = { id: string; status: string; total: number; subtotal: number; adjustments: { label: string; amount: number }[]; payment: string; paymentStatus: string; items: { name: string; quantity: number; price: number }[] }
type Extras = { payment?: { qrUrl?: string; note?: string } }

export function OrderLookup({ heading }: { heading?: string }) {
  const { t } = useS()
  const [order, setOrder] = useState<Order | null | undefined>(undefined)
  const [extras, setExtras] = useState<Extras>({})
  const [isNew, setIsNew] = useState(false)

  const find = async (id: string, phone: string) => {
    const r = await fetch(`/api/plugins/shop/order?${new URLSearchParams({ id, phone })}`).catch(() => null)
    const j = r?.ok ? await r.json() : null
    setOrder(j?.order ?? null)
    setExtras(j?.extras ?? {})
  }
  // Mở từ trang đặt hàng thành công: ?id=...&phone=...&new=1 -> tra cứu ngay.
  React.useEffect(() => {
    const q = new URLSearchParams(location.search)
    if (q.get('id') && q.get('phone')) {
      setIsNew(q.get('new') === '1')
      void find(q.get('id')!, q.get('phone')!)
    }
  }, [])

  return (
    <section className="sp-section">
      <div className="sp-wrap">
        <h2>{heading || t.lookup}</h2>
        <form className="sp-form" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); setIsNew(false); void find(String(f.get('id')).trim(), String(f.get('phone')).trim()) }}>
          <label>{t.orderNo}<input name="id" required maxLength={40} /></label>
          <label>{t.last4}<input name="phone" required inputMode="numeric" pattern="\d{4}" maxLength={4} /></label>
          <button className="sp-btn">{t.go}</button>
        </form>
        {order === null && <p className="sp-note sp-error" role="alert">{t.notFound}</p>}
        {order && (
          <div className="sp-order" role="status">
            {isNew && <p><strong>{t.done} {order.id}</strong><br />{t.keepCode}</p>}
            <p>{t.orderNo}: <strong>{order.id}</strong> · {t.status}: <strong>{t.statuses[order.status] ?? order.status}</strong> · {t.payStatus}: <strong>{t.payStatuses[order.paymentStatus] ?? order.paymentStatus}</strong></p>
            <ul className="sp-cart sp-cart-summary">
              {order.items.map((i, n) => (<li key={n}><span>{i.name} × {i.quantity}</span><strong>{vnd(i.price * i.quantity)}</strong></li>))}
              {order.adjustments.map((a, n) => (<li key={`a${n}`}><span>{a.label}</span><strong>{a.amount < 0 ? '−' : '+'}{vnd(Math.abs(a.amount))}</strong></li>))}
            </ul>
            <p className="sp-total">{t.total}: <strong>{vnd(order.total)}</strong></p>
            {order.paymentStatus !== 'paid' && order.payment === 'bank' && extras.payment && (
              <div className="sp-qr">
                {extras.payment.qrUrl && <img src={extras.payment.qrUrl} alt={t.qr} width={240} height={240} />}
                {extras.payment.note && <p style={{ whiteSpace: 'pre-line' }}>{extras.payment.note}</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

export function ReviewForm({ productId }: { productId: string }) {
  const { t } = useS()
  const [state, setState] = useState<'idle' | 'busy' | 'ok' | 'err'>('idle')
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setState('busy')
    const r = await fetch('/api/plugins/shop/review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId, name: f.get('name'), rating: f.get('rating'), comment: f.get('comment'), website: f.get('website') }) }).catch(() => null)
    setState(r?.ok ? 'ok' : 'err')
  }
  if (state === 'ok') return <p className="sp-note" role="status">{t.thanks}</p>
  return (
    <form className="sp-form" onSubmit={submit}>
      <h3>{t.reviewTitle}</h3>
      <label>{t.yourName}<input name="name" required maxLength={80} /></label>
      <label>{t.stars}<select name="rating" defaultValue="5">{[5, 4, 3, 2, 1].map((n) => (<option key={n} value={n}>{'★'.repeat(n)}</option>))}</select></label>
      <label>{t.comment}<textarea name="comment" rows={3} maxLength={1000} /></label>
      <input className="sp-hp" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      {state === 'err' && <p className="sp-note sp-error" role="alert">{t.reviewErr}</p>}
      <button className="sp-btn" disabled={state === 'busy'}>{t.send}</button>
    </form>
  )
}
