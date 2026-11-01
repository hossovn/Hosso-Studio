import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { LocaleProvider } from '@hosso/studio-blocks'
import { CartView, CheckoutForm, OrderLookup } from '../../../packages/plugin-shop/src/client/Shop'
import { addToCart } from '../../../packages/plugin-shop/src/cart'
import { Portal } from '../../../packages/plugin-affiliate/src/Portal'
import { AccountPortal } from '../../../packages/plugin-accounts/src/Account'
import { AffiliateAdmin } from '../../../packages/plugin-affiliate/src/admin'

const page = new URLSearchParams(location.search).has('id') ? 'order' : new URLSearchParams(location.search).get('view') || 'cart'
function App() {
  const [busy, setBusy] = useState(false)
  const demoCart = async () => { setBusy(true); const data = await fetch('/review/products').then((r) => r.json()); for (const product of data) addToCart({ productId: product.id, name: product.name, price: product.price, image: product.image }, product.quantity); location.href = '/?view=cart' }
  return <LocaleProvider locale="vi" defaultLocale="vi"><div className="review-banner">Bản duyệt local · Dữ liệu minh họa · Không kết nối WIM, WooCommerce hay ngân hàng thật</div><header className="review-header"><a href="/?view=cart"><img src="/assets/logo.webp" alt="Thành Cường Autoparts" /></a><nav>{[{ view: 'cart', label: 'Giỏ hàng' }, { view: 'checkout', label: 'Thanh toán' }, { view: 'affiliate', label: 'Cộng tác viên' }, { view: 'account', label: 'Tài khoản / Gara' }, { view: 'admin', label: 'Quản trị chi trả' }].map((item) => <a href={'/?view=' + item.view} key={item.view} aria-current={page === item.view ? 'page' : undefined}>{item.label}</a>)}</nav></header><main>
    {page === 'cart' && <CartView heading="Giỏ hàng của bạn" checkoutPath="/?view=checkout" shopPath="/?view=catalog" />}
    {page === 'catalog' && <section className="review-seed"><h1>Danh mục minh họa</h1><button className="sp-btn" onClick={demoCart} disabled={busy}>Thêm bộ sản phẩm mẫu vào giỏ</button></section>}
    {page === 'checkout' && <div className="sp-split"><CheckoutForm heading="Thanh toán" statusPath="/" cartPath="/?view=cart" branches={[]} /></div>}
    {page === 'affiliate' && <Portal heading="Không gian cộng tác viên" />}
    {page === 'account' && <AccountPortal heading="Tài khoản của bạn" />}
    {page === 'admin' && <AffiliateAdmin />}
    {new URLSearchParams(location.search).has('id') && <OrderLookup heading="Chi tiết đơn minh họa" />}
  </main><footer className="review-footer"><strong>THÀNH CƯỜNG AUTOPARTS</strong><span>Bản xem thử các khối dùng chung trong Studio</span><button onClick={demoCart} disabled={busy}>Nạp lại giỏ mẫu</button></footer></LocaleProvider>
}
createRoot(document.getElementById('root')!).render(<App />)
