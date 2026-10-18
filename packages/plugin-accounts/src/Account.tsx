'use client'
import { localizeHref, useLocale } from '@hosso/studio-blocks'
import React, { useCallback, useEffect, useState } from 'react'

const S = {
  vi: {
    title: 'Tài khoản của tôi', account: 'Tài khoản', register: 'Đăng ký', login: 'Đăng nhập', logout: 'Đăng xuất',
    name: 'Họ tên', email: 'Email', password: 'Mật khẩu (từ 8 ký tự)', phone: 'Số điện thoại',
    errors: { name: 'Nhập họ tên.', email: 'Email không hợp lệ.', password: 'Mật khẩu cần từ 8 ký tự.', exists: 'Email này đã đăng ký, hãy đăng nhập.', credentials: 'Sai email hoặc mật khẩu.', network: 'Lỗi mạng, thử lại.', bad_request: 'Yêu cầu không hợp lệ.' } as Record<string, string>,
    profile: 'Thông tin', save: 'Lưu', saved: 'Đã lưu', addresses: 'Địa chỉ giao hàng đã lưu', addAddr: 'Thêm địa chỉ', label: 'Tên gợi nhớ (nhà, công ty…)', address: 'Địa chỉ', remove: 'Xóa',
    orders: 'Đơn hàng của tôi', noOrders: 'Chưa có đơn hàng nào.', order: 'Mã đơn', date: 'Ngày', total: 'Tổng tiền', status: 'Trạng thái', paid: 'Thanh toán', trackLink: 'Xem',
    statuses: { new: 'Mới', confirmed: 'Đã xác nhận', shipping: 'Đang giao', completed: 'Hoàn tất', cancelled: 'Đã hủy' } as Record<string, string>,
    payStatuses: { unpaid: 'Chưa thanh toán', paid: 'Đã thanh toán', refunded: 'Đã hoàn tiền' } as Record<string, string>,
  },
  en: {
    title: 'My account', account: 'Account', register: 'Sign up', login: 'Log in', logout: 'Log out',
    name: 'Full name', email: 'Email', password: 'Password (8+ characters)', phone: 'Phone number',
    errors: { name: 'Enter your name.', email: 'Invalid email.', password: 'Password needs 8+ characters.', exists: 'This email is already registered, please log in.', credentials: 'Wrong email or password.', network: 'Network error, try again.', bad_request: 'Invalid request.' } as Record<string, string>,
    profile: 'Details', save: 'Save', saved: 'Saved', addresses: 'Saved delivery addresses', addAddr: 'Add address', label: 'Label (home, office…)', address: 'Address', remove: 'Remove',
    orders: 'My orders', noOrders: 'No orders yet.', order: 'Order', date: 'Date', total: 'Total', status: 'Status', paid: 'Payment', trackLink: 'View',
    statuses: { new: 'New', confirmed: 'Confirmed', shipping: 'Shipping', completed: 'Completed', cancelled: 'Cancelled' } as Record<string, string>,
    payStatuses: { unpaid: 'Unpaid', paid: 'Paid', refunded: 'Refunded' } as Record<string, string>,
  },
}
const useS = () => {
  const { locale, defaultLocale } = useLocale()
  return { t: S[locale === 'en' ? 'en' : 'vi'], href: (p: string) => localizeHref(p, locale, defaultLocale) }
}

type Me = { profile: { name: string; email: string; phone: string; addresses: { label: string; address: string }[] }; orders: { orderNo: string; status: string; total: number; paymentStatus: string; createdAt: string }[] }
const vnd = (n: number) => `${Math.round(n || 0).toLocaleString('vi-VN')} đ`
const api = async (path: string, body?: unknown) => {
  try {
    const r = await fetch(`/api/plugins/accounts/${path}`, body === undefined ? undefined : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    return { status: r.status, data: (await r.json().catch(() => ({}))) as any }
  } catch {
    return { status: 0, data: { message: 'network' } }
  }
}

// Thông tin để plugin Cửa hàng tự điền khi thanh toán (hợp đồng ngầm qua localStorage: khóa hs_customer).
const remember = (m: Me | null) => {
  if (m) localStorage.setItem('hs_customer', JSON.stringify({ name: m.profile.name, phone: m.profile.phone, email: m.profile.email, address: m.profile.addresses[0]?.address ?? '' }))
  else localStorage.removeItem('hs_customer')
}

/** Liên kết "Tài khoản" trên header; đồng bộ thông tin tự điền khi thanh toán. */
export function AccountLink() {
  const { t, href } = useS()
  const [name, setName] = useState('')
  useEffect(() => {
    void api('me').then((r) => {
      remember(r.status === 200 ? r.data : null)
      setName(r.status === 200 ? r.data.profile.name : '')
    })
  }, [])
  return <a href={href('/tai-khoan')}>{name ? name.split(' ').slice(-1)[0] : t.account}</a>
}

export function AccountPortal({ heading }: { heading?: string }) {
  const { t, href } = useS()
  const [me, setMe] = useState<Me | null | undefined>(undefined)
  const [mode, setMode] = useState<'register' | 'login'>('login')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [addrs, setAddrs] = useState<{ label: string; address: string }[]>([])
  const [form, setForm] = useState({ name: '', phone: '' })

  const load = useCallback(async () => {
    const r = await api('me')
    const m = r.status === 200 ? (r.data as Me) : null
    setMe(m)
    remember(m)
    if (m) {
      setAddrs(m.profile.addresses)
      setForm({ name: m.profile.name, phone: m.profile.phone })
    }
  }, [])
  useEffect(() => { void load() }, [load])

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const r = await api(mode, Object.fromEntries(new FormData(e.currentTarget)))
    if (r.data.ok) await load()
    else setError(t.errors[r.data.message] ?? t.errors.network)
  }

  if (me === undefined) return null
  return (
    <section className="ac-section">
      <div className="ac-wrap">
        <h2>{heading || t.title}</h2>
        {!me ? (
          <>
            <p>
              <button type="button" className="ac-link" onClick={() => setMode('login')} aria-pressed={mode === 'login'}>{t.login}</button>{' · '}
              <button type="button" className="ac-link" onClick={() => setMode('register')} aria-pressed={mode === 'register'}>{t.register}</button>
            </p>
            <form className="ac-form" onSubmit={submit}>
              {mode === 'register' && <label>{t.name}<input name="name" required maxLength={120} autoComplete="name" /></label>}
              <label>{t.email}<input name="email" type="email" required autoComplete="email" /></label>
              {mode === 'register' && <label>{t.phone}<input name="phone" inputMode="tel" autoComplete="tel" /></label>}
              <label>{t.password}<input name="password" type="password" required minLength={mode === 'register' ? 8 : undefined} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} /></label>
              <input className="ac-hp" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
              {error && <p className="ac-error" role="alert">{error}</p>}
              <button className="ac-btn">{mode === 'register' ? t.register : t.login}</button>
            </form>
          </>
        ) : (
          <>
            <p>{me.profile.email} <button type="button" className="ac-link" onClick={async () => { await api('logout', {}); remember(null); setMe(null) }}>{t.logout}</button></p>

            <h3>{t.profile}</h3>
            <form className="ac-form" onSubmit={async (e) => { e.preventDefault(); await api('profile', { ...form, addresses: addrs }); setSaved(true); await load() }}>
              <label>{t.name}<input value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); setSaved(false) }} required maxLength={120} /></label>
              <label>{t.phone}<input value={form.phone} onChange={(e) => { setForm({ ...form, phone: e.target.value }); setSaved(false) }} inputMode="tel" /></label>
              <h3>{t.addresses}</h3>
              {addrs.map((a, i) => (
                <div key={i} className="ac-addr">
                  <input aria-label={t.label} placeholder={t.label} value={a.label} onChange={(e) => setAddrs(addrs.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                  <input aria-label={t.address} placeholder={t.address} value={a.address} onChange={(e) => setAddrs(addrs.map((x, j) => (j === i ? { ...x, address: e.target.value } : x)))} />
                  <button type="button" className="ac-link" onClick={() => setAddrs(addrs.filter((_, j) => j !== i))}>{t.remove}</button>
                </div>
              ))}
              <button type="button" className="ac-link" onClick={() => setAddrs([...addrs, { label: '', address: '' }])}>+ {t.addAddr}</button>
              <button className="ac-btn">{saved ? t.saved : t.save}</button>
            </form>

            <h3>{t.orders}</h3>
            {me.orders.length === 0 ? <p>{t.noOrders}</p> : (
              <table className="ac-table">
                <thead><tr><th>{t.order}</th><th>{t.date}</th><th>{t.total}</th><th>{t.status}</th><th>{t.paid}</th><th /></tr></thead>
                <tbody>
                  {me.orders.map((o) => (
                    <tr key={o.orderNo}>
                      <td>{o.orderNo}</td><td>{o.createdAt.slice(0, 10)}</td><td>{vnd(o.total)}</td>
                      <td>{t.statuses[o.status] ?? o.status}</td><td>{t.payStatuses[o.paymentStatus] ?? o.paymentStatus}</td>
                      <td><a href={`${href('/trang-thai-don')}?id=${o.orderNo}&phone=${me.profile.phone.slice(-4)}`}>{t.trackLink}</a></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </section>
  )
}
