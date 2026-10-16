'use client'
import React, { useState } from 'react'
import { addToCart, cartCount, cartTotal, clearCart, removeFromCart, setQuantity, useCart } from '../cart'
import { formatVnd } from '../format'
import { tr } from '../strings.vi'

type Branch = { id: string; name: string }

/** Nút thêm vào giỏ ở trang chi tiết. */
export function AddToCart({ product, cartPath, inStock }: { product: { id: string; name: string; price: number }; cartPath: string; inStock: boolean }) {
  const [added, setAdded] = useState(false)
  const cart = useCart()
  return (
    <div className="wp-add">
      <button
        className="wp-btn"
        type="button"
        disabled={!inStock}
        onClick={() => {
          addToCart({ productId: product.id, name: product.name, price: product.price })
          setAdded(true)
        }}
      >
        {inStock ? tr('cart.add') : tr('product.outOfStock')}
      </button>
      {(added || cartCount(cart) > 0) && (
        <p className="wp-note" role="status">
          {added ? `${tr('cart.added')} ` : ''}
          <a href={cartPath}>
            {tr('cart.view')} ({cartCount(cart)})
          </a>
        </p>
      )}
    </div>
  )
}

/** Giỏ hàng: sửa số lượng, xóa dòng, sang thanh toán. */
export function CartView({ heading, checkoutPath, shopPath }: { heading?: string; checkoutPath: string; shopPath: string }) {
  const cart = useCart()
  return (
    <section className="wp-section">
      <div className="wp-wrap">
        {heading && <h2>{heading}</h2>}
        {cart.lines.length === 0 ? (
          <p className="wp-note">
            {tr('cart.empty')} <a href={shopPath}>{tr('cart.continue')}</a>
          </p>
        ) : (
          <>
            <ul className="wp-cart">
              {cart.lines.map((l) => (
                <li key={l.productId}>
                  <div>
                    <strong>{l.name}</strong>
                    <span className="wp-meta">{formatVnd(l.price)}</span>
                  </div>
                  <label>
                    <span className="wp-sr">{tr('cart.qty')}</span>
                    <input type="number" min={1} max={99} value={l.quantity} onChange={(e) => setQuantity(l.productId, Number(e.target.value) || 1)} />
                  </label>
                  <strong>{formatVnd(l.price * l.quantity)}</strong>
                  <button className="wp-link" type="button" onClick={() => removeFromCart(l.productId)}>
                    {tr('cart.remove')}
                  </button>
                </li>
              ))}
            </ul>
            <p className="wp-total">
              {tr('cart.total')}: <strong>{formatVnd(cartTotal(cart))}</strong>
            </p>
            <p className="wp-meta">{tr('cart.priceNote')}</p>
            <a className="wp-btn wp-btn-link" href={checkoutPath}>
              {tr('cart.checkout')}
            </a>
          </>
        )}
      </div>
    </section>
  )
}

type CheckoutError = { code: string; message: string; productId?: string; available?: number }

/** Thanh toán: COD (giao tận nơi) hoặc nhận tại chi nhánh. Lỗi thì giữ nguyên giỏ hàng. */
export function CheckoutForm({ heading, branches, statusPath, cartPath }: { heading?: string; branches: Branch[]; statusPath: string; cartPath: string }) {
  const cart = useCart()
  const [type, setType] = useState<'delivery' | 'pickup'>('delivery')
  const [branchId, setBranchId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<CheckoutError | null>(null)

  if (cart.lines.length === 0) {
    return (
      <section className="wp-section">
        <div className="wp-wrap">
          <p className="wp-note">
            {tr('cart.empty')} <a href={cartPath}>{tr('cart.view')}</a>
          </p>
        </div>
      </section>
    )
  }

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/plugins/wim/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartId: cart.id,
          items: cart.lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
          customer: { name: f.get('name'), phone: f.get('phone'), address: f.get('address'), note: f.get('note') },
          fulfillment: { type, branchId: type === 'pickup' ? branchId : undefined },
          website: f.get('website'),
        }),
      })
      const body = await res.json().catch(() => null)
      if (body?.ok) {
        clearCart()
        window.location.href = `${statusPath}?id=${encodeURIComponent(body.order.id)}&phone=${encodeURIComponent(body.phone4)}`
        return
      }
      setError(body ? { code: body.code, message: body.message, productId: body.productId, available: body.available } : { code: 'network', message: tr('checkout.networkError') })
    } catch {
      setError({ code: 'network', message: tr('checkout.networkError') })
    }
    setBusy(false)
  }

  const bad = error?.productId
  return (
    <section className="wp-section">
      <div className="wp-wrap wp-checkout">
        {heading && <h2>{heading}</h2>}
        <ul className="wp-cart wp-cart-summary">
          {cart.lines.map((l) => (
            <li key={l.productId} className={bad === l.productId ? 'wp-bad' : undefined}>
              <span>
                {l.name} × {l.quantity}
              </span>
              <strong>{formatVnd(l.price * l.quantity)}</strong>
            </li>
          ))}
        </ul>
        <p className="wp-total">
          {tr('cart.total')}: <strong>{formatVnd(cartTotal(cart))}</strong>
        </p>

        {error && (
          <div className="wp-note wp-note-error" role="alert">
            <p>{error.message}</p>
            {error.code === 'out_of_stock' && (
              <p>
                {tr('checkout.keepCart')} <a href={cartPath}>{tr('cart.view')}</a>
                {typeof error.available === 'number' && ` (${tr('product.inStock')}: ${error.available})`}
              </p>
            )}
          </div>
        )}

        <form className="wp-form" onSubmit={submit}>
          <fieldset>
            <legend>{tr('checkout.fulfillment')}</legend>
            <label className="wp-radio">
              <input type="radio" name="type" checked={type === 'delivery'} onChange={() => setType('delivery')} /> {tr('checkout.delivery')}
            </label>
            <label className="wp-radio">
              <input type="radio" name="type" checked={type === 'pickup'} onChange={() => setType('pickup')} /> {tr('checkout.pickup')}
            </label>
          </fieldset>

          {type === 'pickup' && (
            <label>
              {tr('checkout.branch')}
              <select value={branchId} onChange={(e) => setBranchId(e.target.value)} required>
                <option value="">{tr('vehicle.choose')}</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            {tr('checkout.name')}
            <input name="name" required maxLength={120} autoComplete="name" />
          </label>
          <label>
            {tr('checkout.phone')}
            <input name="phone" type="tel" required maxLength={20} autoComplete="tel" inputMode="tel" />
          </label>
          {type === 'delivery' && (
            <label>
              {tr('checkout.address')}
              <input name="address" required maxLength={300} autoComplete="street-address" />
            </label>
          )}
          <label>
            {tr('checkout.note')}
            <textarea name="note" rows={3} maxLength={500} />
          </label>
          <input className="wp-hp" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
          <p className="wp-meta">{type === 'delivery' ? tr('checkout.codNote') : tr('checkout.pickupNote')}</p>
          <button className="wp-btn" type="submit" disabled={busy}>
            {busy ? tr('checkout.placing') : tr('checkout.place')}
          </button>
        </form>
      </div>
    </section>
  )
}
