'use client'
import { localizeHref, useLocale, useEditorPreview, type FulfillmentGroup, type OrderExtras } from '@hosso/studio-blocks'
import React, { useState } from 'react'
import { ArrowLeft, ArrowRight, ImageOff, Minus, Plus, ShoppingBag, Trash2, Undo2 } from 'lucide-react'
import { addToCart, cartCount, cartTotal, consumeCart, checkoutIdentity, renewCart, lineKey, removeFromCart, refreshCart, setQuantity, useCart, type CartLine } from '../cart'
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
    lookup: 'Tra cứu đơn hàng', orderNo: 'Mã đơn hàng', go: 'Tra cứu', notFound: 'Không tìm thấy đơn. Kiểm tra lại mã đơn và mã bảo mật tra cứu.',
    status: 'Trạng thái', items: 'Sản phẩm', done: 'Đặt hàng thành công. Mã đơn của bạn:', keepCode: 'Hãy lưu liên kết tra cứu và giữ riêng mã bảo mật của đơn.',
    statuses: { pending: 'Đang chờ xác nhận', new: 'Mới', confirmed: 'Đã xác nhận', shipping: 'Đang giao', completed: 'Hoàn tất', cancelled: 'Đã hủy' } as Record<string, string>,
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
    lookup: 'Track your order', orderNo: 'Order number', go: 'Track', notFound: 'Order not found. Check the order number and private access code.',
    status: 'Status', items: 'Items', done: 'Order placed. Your order number:', keepCode: 'Keep your tracking link and private access code.',
    statuses: { pending: 'Awaiting confirmation', new: 'New', confirmed: 'Confirmed', shipping: 'Shipping', completed: 'Completed', cancelled: 'Cancelled' } as Record<string, string>,
  },
}
const useS = () => {
  const { locale, defaultLocale } = useLocale()
  return { t: S[locale === 'en' ? 'en' : 'vi'], href: (p: string) => localizeHref(p, locale, defaultLocale), locale }
}

function receiveCheckout(body: any, cart: { id: string; lines: CartLine[] }, customer: Record<string, unknown>, target: string) {
  window.dispatchEvent(new CustomEvent('hs:purchase', { detail: { id: body.order.id, total: body.order.total, items: cart.lines } }))
  consumeCart(cart.id)
  try {
    localStorage.setItem('hs_lookup_' + body.order.id, body.lookupToken)
    localStorage.setItem('hs_customer', JSON.stringify({ ...JSON.parse(localStorage.getItem('hs_customer') || '{}'), ...customer }))
    localStorage.removeItem('hs_checkout_pending_' + cart.id)
  } catch { /* The success link also carries the token. */ }
  window.location.href = body.redirectUrl || `${target}?id=${encodeURIComponent(body.order.id)}&token=${encodeURIComponent(body.lookupToken)}&new=1`
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

export function ProductImage({ src, name }: { src?: string; name: string }) {
  const [failed, setFailed] = useState(false)
  React.useEffect(() => setFailed(false), [src])
  return <div className="sp-line-image" data-hs-part="product-image">{src && !failed ? <img src={src} alt={name} loading="lazy" onError={() => setFailed(true)} /> : <ImageOff size={24} aria-label={name} />}</div>
}

export type CartOptions = { heading?: string; checkoutPath: string; shopPath: string; layout?: string; showImages?: string; stickySummary?: string; summaryHeading?: string; checkoutLabel?: string; emptyHeading?: string; emptyText?: string; preview?: boolean }
const PREVIEW_CART: { id: string; lines: CartLine[] } = { id: 'editor-preview', lines: [{ productId: 'preview', name: 'Sản phẩm xem trước', price: 0, quantity: 2 }] }

export function CartView({ heading, checkoutPath, shopPath, layout = 'split', showImages = 'yes', stickySummary = 'yes', summaryHeading, checkoutLabel, emptyHeading, emptyText, preview: canvasPreview }: CartOptions) {
  const { t, href } = useS()
  const editor = useEditorPreview()
  const preview = Boolean(canvasPreview || editor)
  const stored = useCart()
  const cart = preview ? PREVIEW_CART : stored
  const en = t === S.en
  const [removed, setRemoved] = useState<CartLine | null>(null)
  const [syncError, setSyncError] = useState('')
  const key = JSON.stringify(cart.lines.map(({ productId, variantId, quantity }) => ({ productId, variantId, quantity })))
  React.useEffect(() => {
    if (preview || !cart.lines.length) return
    const controller = new AbortController()
    void fetch('/api/plugins/shop/cart', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: JSON.parse(key) }), signal: controller.signal }).then((r) => r.json()).then((data) => {
      if (controller.signal.aborted) return
      if (data.ok) { refreshCart(data.items); setSyncError(data.issues?.length ? (en ? 'Some items need review at checkout.' : 'Có sản phẩm cần kiểm tra lại khi thanh toán.') : '') }
      else setSyncError(en ? 'Unable to refresh your cart. Try again at checkout.' : 'Chưa cập nhật được giỏ. Vui lòng kiểm tra lại khi thanh toán.')
    }).catch(() => { if (!controller.signal.aborted) setSyncError(en ? 'Connection interrupted. Your cart is kept.' : 'Kết nối bị gián đoạn. Giỏ hàng vẫn được giữ.') })
    return () => controller.abort()
  }, [key, preview, en])
  return (
    <section className="sp-section sp-commerce">
      <div className="sp-wrap">
        <header className="sp-commerce-heading" data-hs-part="cart-heading">{heading && <h2>{heading}</h2>}<span>{cartCount(cart)} {en ? 'items' : 'sản phẩm'}</span></header>
        {cart.lines.length === 0 ? (
          <div className="sp-empty" data-hs-part="cart-empty"><ShoppingBag size={40} strokeWidth={1.5} aria-hidden="true" /><h3>{emptyHeading || t.empty}</h3>{emptyText && <p>{emptyText}</p>}<a className="sp-btn sp-action" href={href(shopPath)}><ArrowLeft size={18} />{t.continue}</a></div>
        ) : (
          <div className={`sp-cart-layout${layout === 'single' ? ' sp-cart-single' : ''}`} data-hs-part="cart-layout">
            <div className="sp-cart-main">
            <ul className="sp-cart-lines" aria-label={t.items}>
              {cart.lines.map((l) => (
                <li key={lineKey(l)} className={showImages === 'no' ? 'sp-no-image' : undefined} data-hs-part="cart-line">
                  {showImages !== 'no' && <ProductImage src={l.image} name={l.name} />}
                  <div className="sp-line-info" data-hs-part="product-info"><strong>{l.name}</strong><span className="sp-meta">{vnd(l.price)} / {en ? 'item' : 'sản phẩm'}</span></div>
                  <div className="sp-quantity" data-hs-part="quantity" role="group" aria-label={`${t.qty}: ${l.name}`}>
                    <button type="button" title={en ? 'Decrease quantity' : 'Giảm số lượng'} aria-label={`${en ? 'Decrease quantity' : 'Giảm số lượng'}: ${l.name}`} disabled={preview || l.quantity <= 1} onClick={() => setQuantity(lineKey(l), l.quantity - 1)}><Minus size={16} /></button>
                    <input aria-label={`${t.qty}: ${l.name}`} type="number" inputMode="numeric" min={1} max={99} value={l.quantity} disabled={preview} onChange={(e) => setQuantity(lineKey(l), Number(e.target.value))} />
                    <button type="button" title={en ? 'Increase quantity' : 'Tăng số lượng'} aria-label={`${en ? 'Increase quantity' : 'Tăng số lượng'}: ${l.name}`} disabled={preview || l.quantity >= 99} onClick={() => setQuantity(lineKey(l), l.quantity + 1)}><Plus size={16} /></button>
                  </div>
                  <strong className="sp-line-total" data-hs-part="line-total">{vnd(l.price * l.quantity)}</strong>
                  <button className="sp-icon-button sp-remove" title={t.remove} aria-label={`${t.remove}: ${l.name}`} type="button" disabled={preview} onClick={() => { setRemoved(l); removeFromCart(lineKey(l)) }}><Trash2 size={18} /></button>
                </li>
              ))}
            </ul>
            <a className="sp-back sp-action" href={href(shopPath)}><ArrowLeft size={16} />{t.continue}</a>
            {removed && <div className="sp-cart-feedback" role="status"><span>{en ? 'Item removed.' : 'Đã xóa sản phẩm.'}</span><button className="sp-link sp-action" onClick={() => { addToCart(removed, removed.quantity); setRemoved(null) }}><Undo2 size={16} />{en ? 'Undo' : 'Hoàn tác'}</button></div>}
            {syncError && <p className="sp-note" role="status">{syncError}</p>}
            </div>
            <aside className={`sp-cart-totals${stickySummary === 'no' ? '' : ' sp-sticky'}`} data-hs-part="cart-summary" aria-label={summaryHeading || t.total}>
              <h3>{summaryHeading || (en ? 'Order summary' : 'Tóm tắt đơn hàng')}</h3>
              <dl><div><dt>{en ? 'Subtotal' : 'Tiền hàng'}</dt><dd>{vnd(cartTotal(cart))}</dd></div><div><dt>{en ? 'Delivery' : 'Phí giao hàng'}</dt><dd className="sp-meta">{en ? 'Calculated at checkout' : 'Tính khi thanh toán'}</dd></div></dl>
              <div className="sp-summary-total" data-hs-part="cart-total"><span>{en ? 'Estimated total' : 'Tạm tính'}</span><strong aria-live="polite" aria-atomic="true">{vnd(cartTotal(cart))}</strong></div>
              <a className="sp-btn sp-action sp-checkout-action" href={preview ? undefined : href(checkoutPath)} aria-disabled={preview} data-hs-part="checkout-button">{checkoutLabel || t.checkout}<ArrowRight size={18} /></a>
              <p className="sp-meta">{en ? 'Final prices, availability and delivery are confirmed at checkout.' : 'Giá, tồn kho và phí giao hàng được xác nhận ở bước thanh toán.'}</p>
            </aside>
          </div>
        )}
      </div>
    </section>
  )
}

type Err = { code: string; name?: string; available?: number; text?: string }
type Quote = { subtotal: number; adjustments: { label: string; amount: number }[]; total: number; items?: CartLine[]; quoteKey?: string; shipments?: FulfillmentGroup[] }

export function ShipmentSummary({ groups, items, payment, en, tracking = [] }: { groups?: FulfillmentGroup[]; items: Pick<CartLine, 'productId' | 'variantId' | 'name'>[]; payment: string; en: boolean; tracking?: NonNullable<OrderExtras['shipments']> }) {
  if (!groups?.length) return null
  const statuses: Record<string, string> = en ? { pending: 'Awaiting pickup', handed_over: 'Handed to carrier', delivering: 'Out for delivery', delivered: 'Delivered', returned: 'Returned', cancelled: 'Cancelled' } : { pending: 'Chờ lấy hàng', handed_over: 'Đã bàn giao', delivering: 'Đang giao', delivered: 'Đã giao', returned: 'Hoàn hàng', cancelled: 'Đã hủy' }
  return <section className="sp-shipments" data-hs-part="shipment-groups"><h3>{en ? 'Delivery groups' : 'Phân nhóm giao hàng'}</h3><ul>{groups.map((g) => {
    const live = tracking.find((s) => s.key === g.key)
    return <li key={g.key} data-hs-part="shipment-group"><strong>{g.label}</strong><span className="sp-meta">{g.deliveryBy === 'partner' ? (en ? 'Delivered by partner' : 'Đối tác giao trực tiếp') : (en ? 'Prepared by store' : 'Cửa hàng chuẩn bị')}</span><ul>{items.filter((l) => g.lineKeys.includes(lineKey(l))).map((l) => <li key={lineKey(l)}>{l.name}</li>)}</ul><dl><div><dt>{en ? 'Delivery fee' : 'Phí giao'}</dt><dd>{vnd(g.fee)}</dd></div>{payment === 'cod' && <div><dt>{en ? 'Collect on receipt' : 'Thu khi nhận'}</dt><dd>{vnd(g.codAmount || 0)}</dd></div>}</dl>{payment === 'cod' && <span className="sp-meta">{g.codCollector === 'partner' ? (en ? 'Partner collects payment' : 'Đối tác thu hộ') : (en ? 'Store collects payment' : 'Cửa hàng thu hộ')}</span>}{live && <p>{statuses[live.status] || live.status}{live.carrier && ` · ${live.carrier}`}{live.trackingCode && <span> · {live.trackingCode}</span>}{live.url && <a href={live.url} target="_blank" rel="noopener noreferrer">{en ? 'Track shipment' : 'Theo dõi vận đơn'}</a>}</p>}</li>
  })}</ul></section>
}

export function CheckoutForm({ heading, bankInfo, statusPath, cartPath, branches = [], preview: canvasPreview }: { heading?: string; bankInfo?: string; statusPath: string; cartPath: string; branches?: { id: string; name: string }[]; preview?: boolean }) {
  const { t, href, locale } = useS()
  const editor = useEditorPreview()
  const preview = Boolean(canvasPreview || editor)
  const stored = useCart()
  const cart = preview ? PREVIEW_CART : stored
  const formRef = React.useRef<HTMLFormElement>(null)
  const formId = React.useId()
  const [type, setType] = useState<'delivery' | 'pickup'>('delivery')
  const [branchId, setBranchId] = useState(branches[0]?.id || '')
  const [pay, setPay] = useState<'cod' | 'bank'>('cod')
  const [voucher, setVoucher] = useState('')
  const [quote, setQuote] = useState<Quote | null>(null)
  const [quoteError, setQuoteError] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<Err | null>(null)
  const [quoting, setQuoting] = useState(false)
  const [issues, setIssues] = useState<{ productId: string; variantId?: string; code: string; available?: number; name?: string }[]>([])
  const quoteRequest = React.useRef<AbortController | null>(null)
  const submitting = React.useRef(false)

  const items = cart.lines.map((l) => ({ productId: l.productId, variantId: l.variantId, quantity: l.quantity }))
  const itemsKey = JSON.stringify(items)

  // Tính lại tổng tiền (phí ship, giảm giá do plugin khác thêm) khi giỏ, cách nhận hàng, địa chỉ hoặc mã giảm giá đổi.
  const runQuote = React.useCallback(async () => {
    quoteRequest.current?.abort()
    if (preview || !items.length) return
    const controller = new AbortController()
    quoteRequest.current = controller
    setQuoting(true)
    setQuote(null)
    const f = formRef.current ? new FormData(formRef.current) : null
    const r = await fetch('/api/plugins/shop/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({ items, customer: { address: f?.get('address') ?? '' }, fulfillment: { type, ...(type === 'pickup' && branchId && { branchId }) }, payment: pay, meta: { voucher: voucher.trim(), locale } }),
    }).catch(() => null)
    const j = await r?.json().catch(() => null)
    if (controller.signal.aborted) return
    setQuoting(false)
    if (j?.ok) {
      setQuote(j)
      setQuoteError('')
      setIssues([])
      if (j.items) refreshCart(j.items)
    } else {
      setIssues(j?.issues || [])
      setQuoteError(j?.code === 'out_of_stock' || j?.code === 'product_not_found' ? (locale === 'en' ? 'Some items are unavailable. Review your cart below.' : 'Một số sản phẩm không đủ hàng. Vui lòng kiểm tra danh sách bên dưới.') : j?.message && !t.errors[j.message] ? String(j.message) : t.errors[j?.message] || t.errors.network)
      setQuote(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey, type, branchId, pay, voucher, locale, preview])
  React.useEffect(() => {
    void runQuote()
    return () => quoteRequest.current?.abort()
  }, [itemsKey, type, pay, runQuote])

  // Tự điền từ tài khoản khách (plugin Tài khoản lưu thông tin ở localStorage khóa hs_customer).
  const hasLines = cart.lines.length > 0
  React.useEffect(() => {
    if (preview || !cart.id) return
    let pending: any
    try { pending = JSON.parse(localStorage.getItem('hs_checkout_pending_' + cart.id) || 'null') } catch { return }
    if (!pending?.checkoutId) return
    let live = true
    submitting.current = true; setBusy(true)
    void fetch('/api/plugins/shop/receipt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pending) }).then((r) => r.json()).then((body) => {
      if (live && body?.ok) receiveCheckout(body, cart, pending.customer, href(statusPath))
    }).catch(() => {}).finally(() => { if (live) { submitting.current = false; setBusy(false) } })
    return () => { live = false; submitting.current = false; setBusy(false) }
    // A basket generation changes only when the customer edits the items.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart.id, preview])
  React.useEffect(() => {
    if (preview) return
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
  }, [hasLines, type, preview])

  if (cart.lines.length === 0)
    return (
      <section className="sp-section"><div className="sp-wrap"><p className="sp-note">{t.empty} <a href={href(cartPath)}>{t.view}</a></p></div></section>
    )

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (preview || submitting.current || busy || quoting || !quote) return
    const f = new FormData(e.currentTarget)
    submitting.current = true
    setBusy(true)
    setError(null)
    try {
      const customer = { name: String(f.get('name') || '').trim(), phone: String(f.get('phone') || '').trim(), email: String(f.get('email') || '').trim(), address: String(f.get('address') || '').trim(), note: String(f.get('note') || '').trim() }
      const intent = { items, customer, fulfillment: { type, ...(type === 'pickup' && branchId && { branchId }) }, payment: pay, meta: { voucher: voucher.trim(), locale } }
      const checkoutId = await checkoutIdentity(cart.id, intent)
      const request = { cartId: cart.id, checkoutId, quoteKey: quote.quoteKey, ...intent, website: f.get('website') }
      try { localStorage.setItem('hs_checkout_pending_' + cart.id, JSON.stringify(request)) } catch { /* Same-page retries still use the stable identity. */ }
      const res = await fetch('/api/plugins/shop/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      })
      const body = await res.json().catch(() => null)
      if (body?.ok) {
        receiveCheckout(body, cart, customer, href(statusPath))
        return
      }
      const known = body?.code === 'bad_request' || body?.code === 'out_of_stock' || body?.code === 'product_not_found'
      if (body?.resetCart) renewCart()
      if (body?.code === 'quote_changed') void runQuote()
      setError(body ? { code: body.code === 'bad_request' ? body.message : body.code, name: body.name, available: body.available, text: known ? undefined : body.message } : { code: 'network' })
    } catch {
      setError({ code: 'network' })
    }
    submitting.current = false
    setBusy(false)
  }

  const msg = (e: Err) =>
    e.text ?? (e.code === 'out_of_stock' ? `${e.name ?? ''} ${t.errors.stock.replace('{n}', String(e.available ?? 0))}` : t.errors[e.code === 'product_not_found' ? 'gone' : e.code] ?? t.errors.bad_request)
  const total = quote?.total ?? cartTotal(cart)

  return (
    <section className="sp-section sp-commerce">
      <div className="sp-wrap sp-checkout">
        {heading && <h2>{heading}</h2>}
        <div className="sp-checkout-body">
        <form id={formId} className="sp-form" onSubmit={submit} ref={formRef}>
          <h3>{locale === 'en' ? 'Contact details' : 'Thông tin người nhận'}</h3>
          <label>{t.name}<input name="name" required maxLength={120} autoComplete="name" /></label>
          <label>{t.phone}<input name="phone" required inputMode="tel" autoComplete="tel" /></label>
          <label>{t.email}<input name="email" type="email" autoComplete="email" /></label>
          <fieldset data-hs-part="fulfillment-options">
            <legend>{t.receive}</legend>
            <label className="sp-radio"><input type="radio" checked={type === 'delivery'} onChange={() => setType('delivery')} /> {t.delivery}</label>
            <label className="sp-radio"><input type="radio" checked={type === 'pickup'} onChange={() => setType('pickup')} /> {t.pickup}</label>
          </fieldset>
          {type === 'pickup' && branches.length > 0 && <label>{locale === 'en' ? 'Pickup branch' : 'Chi nhánh nhận hàng'}<select value={branchId} onChange={(e) => setBranchId(e.target.value)} required>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>}
          {type === 'delivery' && <label>{t.address}<textarea name="address" required rows={2} maxLength={300} autoComplete="street-address" onBlur={() => void runQuote()} /></label>}
          <label>{t.note}<textarea name="note" rows={2} maxLength={500} /></label>
          <div className="sp-voucher">
            <label>{t.voucher}<input value={voucher} onChange={(e) => setVoucher(e.target.value)} maxLength={40} autoCapitalize="characters" /></label>
            <button type="button" className="sp-btn" onClick={() => void runQuote()}>{t.apply}</button>
          </div>
          {quoteError && <p className="sp-note sp-error" role="alert">{quoteError}</p>}
          {issues.length > 0 && <div className="sp-availability"><ul>{issues.map((issue) => <li key={`${issue.productId}:${issue.variantId || ''}`}>{issue.name || cart.lines.find((l) => l.productId === issue.productId)?.name}: {issue.code === 'out_of_stock' ? (locale === 'en' ? `Only ${issue.available ?? 0} available` : `Còn ${issue.available ?? 0}`) : (locale === 'en' ? 'Unavailable' : 'Không còn bán')}</li>)}</ul><button className="sp-link" type="button" onClick={() => { for (const issue of issues) { const k = lineKey(issue); if (issue.code === 'out_of_stock' && (issue.available ?? 0) > 0) setQuantity(k, issue.available!); else if (['out_of_stock', 'product_not_found'].includes(issue.code)) removeFromCart(k) } }}>{locale === 'en' ? 'Keep available items and review total' : 'Chỉ giữ phần còn hàng và xem lại tổng'}</button></div>}
          <fieldset>
            <legend>{t.pay}</legend>
            <label className="sp-radio"><input type="radio" checked={pay === 'cod'} onChange={() => setPay('cod')} /> {t.cod}</label>
            <label className="sp-radio"><input type="radio" checked={pay === 'bank'} onChange={() => setPay('bank')} /> {t.bank}</label>
            {pay === 'bank' && <p className="sp-note">{t.bankAfter}</p>}
          </fieldset>
          <input className="sp-hp" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
          {error && <p className="sp-note sp-error" role="alert">{msg(error)} {t.keep}</p>}
        </form>
        <aside className="sp-cart-totals" data-hs-part="checkout-summary" aria-busy={quoting}>
          <h3>{locale === 'en' ? 'Your order' : 'Đơn hàng của bạn'}</h3>
          <ul className="sp-checkout-lines">{cart.lines.map((l) => (<li key={lineKey(l)} data-hs-part="checkout-line"><ProductImage src={l.image} name={l.name} /><div><strong>{l.name}</strong><span className="sp-meta">{t.qty}: {l.quantity}</span><span>{vnd(l.price * l.quantity)}</span></div></li>))}</ul>
          <dl>{quote?.adjustments.map((a, n) => (<div key={n}><dt>{a.label}</dt><dd>{a.amount < 0 ? '−' : '+'}{vnd(Math.abs(a.amount))}</dd></div>))}</dl>
          <div className="sp-summary-total"><span>{t.total}</span><strong aria-live="polite">{vnd(total)}</strong></div>
          <ShipmentSummary groups={quote?.shipments} items={quote?.items || cart.lines} payment={pay} en={locale === 'en'} />
          <button type="submit" form={formId} className="sp-btn sp-action sp-checkout-action" disabled={preview || busy || quoting || !quote || Boolean(quoteError)}>{busy ? t.placing : quoting ? (locale === 'en' ? 'Checking prices…' : 'Đang kiểm tra giá…') : t.place}</button>
          <a className="sp-action sp-back" href={preview ? undefined : href(cartPath)}><ArrowLeft size={16} />{t.view}</a>
        </aside>
        </div>
      </div>
    </section>
  )
}

type Order = { id: string; status: string; total: number; subtotal: number; adjustments: { label: string; amount: number }[]; payment: string; paymentStatus: string; items: CartLine[]; shipments?: FulfillmentGroup[] }
type Extras = OrderExtras

export function OrderLookup({ heading }: { heading?: string }) {
  const { t, locale, href } = useS()
  const [order, setOrder] = useState<Order | null | undefined>(undefined)
  const [extras, setExtras] = useState<Extras>({})
  const [isNew, setIsNew] = useState(false)
  const [accessCode, setAccessCode] = useState('')

  const find = async (id: string, token: string) => {
    setAccessCode(token)
    const r = await fetch(`/api/plugins/shop/order?${new URLSearchParams({ id, token })}`).catch(() => null)
    const j = r?.ok ? await r.json() : null
    setOrder(j?.order ?? null)
    setExtras(j?.extras ?? {})
  }
  // Mở từ trang đặt hàng thành công bằng mã tra cứu riêng.
  React.useEffect(() => {
    const q = new URLSearchParams(location.search)
    if (q.get('id') && q.get('token')) {
      setIsNew(q.get('new') === '1')
      void find(q.get('id')!, q.get('token')!)
    }
  }, [])

  const lookupForm = <form className="sp-form" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); setIsNew(false); const id = String(f.get('id')).trim(); let token = String(f.get('token')).trim(); try { token ||= localStorage.getItem('hs_lookup_' + id) || '' } catch {} void find(id, token) }}>
          <label>{t.orderNo}<input name="id" required maxLength={40} /></label>
          <label>{locale === 'en' ? 'Order access code' : 'Mã bảo mật tra cứu đơn'}<input name="token" autoComplete="off" maxLength={64} /></label>
          <button className="sp-btn">{t.go}</button>
        </form>

  return (
    <section className="sp-section">
      <div className="sp-wrap">
        <h2>{heading || t.lookup}</h2>
        {!order && lookupForm}
        {order === null && <p className="sp-note sp-error" role="alert">{t.notFound}</p>}
        {order && (
          <div className="sp-order" role="status">
            {isNew && <header className="sp-receipt-head"><span className="sp-meta">{locale === 'en' ? 'ORDER RECEIVED' : 'ĐÃ NHẬN ĐƠN HÀNG'}</span><h3>{locale === 'en' ? 'Thank you for your order' : 'Cảm ơn bạn đã đặt hàng'}</h3><p>{locale === 'en' ? 'The store will confirm and prepare your order. You can continue shopping now.' : 'Cửa hàng sẽ xác nhận và chuẩn bị đơn. Bạn có thể tiếp tục mua sắm ngay.'}</p><div className="sp-receipt-actions"><a className="sp-btn" href={href('/san-pham')}>{t.continue}<ArrowRight size={16} /></a><a className="sp-link" href={`?${new URLSearchParams({ id: order.id, token: accessCode })}`}>{locale === 'en' ? 'View order' : 'Xem đơn hàng'}</a></div></header>}
            {isNew && <details className="sp-receipt-code"><summary>{locale === 'en' ? 'Private order access code' : 'Mã bảo mật tra cứu đơn'}</summary><p>{t.keepCode}</p><code style={{ overflowWrap: 'anywhere' }}>{accessCode}</code></details>}
            <p>{t.orderNo}: <strong>{order.id}</strong> · {t.status}: <strong>{t.statuses[order.status] ?? order.status}</strong> · {t.payStatus}: <strong>{t.payStatuses[order.paymentStatus] ?? order.paymentStatus}</strong></p>
            <ul className="sp-checkout-lines">{order.items.map((i, n) => (<li key={n}><ProductImage src={i.image} name={i.name} /><div><strong>{i.name}</strong><span>{t.qty}: {i.quantity}</span><strong>{vnd(i.price * i.quantity)}</strong></div></li>))}</ul>
            <ul className="sp-cart sp-cart-summary">{order.adjustments.map((a, n) => (<li key={`a${n}`}><span>{a.label}</span><strong>{a.amount < 0 ? '−' : '+'}{vnd(Math.abs(a.amount))}</strong></li>))}</ul>
            <p className="sp-total">{t.total}: <strong>{vnd(order.total)}</strong></p>
            <ShipmentSummary groups={order.shipments} items={order.items} payment={order.payment} en={locale === 'en'} tracking={extras.shipments} />
            {order.paymentStatus !== 'paid' && order.payment === 'bank' && extras.payment && (
              <div className="sp-qr">
                {extras.payment.qrUrl && <img src={extras.payment.qrUrl} alt={t.qr} width={240} height={240} referrerPolicy="no-referrer" />}
                {extras.payment.note && <p style={{ whiteSpace: 'pre-line' }}>{extras.payment.note}</p>}
              </div>
            )}
          </div>
        )}
        {order && <details className="sp-lookup-another"><summary>{locale === 'en' ? 'Look up another order' : 'Tra cứu đơn hàng khác'}</summary>{lookupForm}</details>}
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
