'use client'
import { localizeHref, useLocale, useEditorPreview } from '@hosso/studio-blocks'
import React, { useCallback, useEffect, useState } from 'react'
import { ClipboardList, UserRound, Wrench, ShieldCheck, Trash2, Plus, LogOut } from 'lucide-react'

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

type Me = { profile: { name: string; email: string; phone: string; addresses: { label: string; address: string }[]; garageStatus?: string; garageName?: string; garageReason?: string }; orders: { orderNo: string; status: string; total: number; paymentStatus: string; createdAt: string; lookupToken?: string }[] }
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
  try {
  if (m) localStorage.setItem('hs_customer', JSON.stringify({ name: m.profile.name, phone: m.profile.phone, email: m.profile.email, address: m.profile.addresses[0]?.address ?? '' }))
  else localStorage.removeItem('hs_customer')
  } catch { /* Checkout also accepts manual entry when browser storage is disabled. */ }
}

/** Liên kết "Tài khoản" trên header; đồng bộ thông tin tự điền khi thanh toán. */
export function AccountLink() {
  const { t, href } = useS()
  const [name, setName] = useState('')
  const preview = useEditorPreview()
  useEffect(() => {
    if (preview) return
    void api('me').then((r) => {
      remember(r.status === 200 ? r.data : null)
      setName(r.status === 200 ? r.data.profile.name : '')
    })
  }, [preview])
  return (
    <a href={href('/tai-khoan')} aria-label={name || t.account} title={name || t.account}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ verticalAlign: 'middle' }}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
    </a>
  )
}

export function AccountPortal({ heading, navigation = 'sidebar', showGarage = 'yes', canvasPreview }: { heading?: string; navigation?: string; showGarage?: string; canvasPreview?: boolean }) {
  const { t, href } = useS()
  const editor = useEditorPreview()
  const preview = Boolean(editor || canvasPreview)
  const en = t === S.en
  const [me, setMe] = useState<Me | null | undefined>(undefined)
  const [mode, setMode] = useState<'register' | 'login'>('login')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [addrs, setAddrs] = useState<{ label: string; address: string }[]>([])
  const [form, setForm] = useState({ name: '', phone: '' })
  const [tab, setTab] = useState('orders')
  const [consentToken, setConsentToken] = useState('')

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
  useEffect(() => { if (!preview) void load(); else setMe(editor?.account === 'guest' ? null : { profile: { name: 'Khách xem trước', email: '', phone: '', addresses: [], garageStatus: 'retail' }, orders: [] }) }, [load, preview, editor?.account])

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (preview) return
    setError('')
    const r = await api(mode, Object.fromEntries(new FormData(e.currentTarget)))
    if (r.data.ok) await load()
    else setError(t.errors[r.data.message] ?? t.errors.network)
  }

  if (me === undefined) return <section className="ac-section"><div className="ac-wrap" role="status">{en ? 'Loading account…' : 'Đang tải tài khoản…'}</div></section>
  return (
    <section className="ac-section">
      <div className={`ac-wrap ac-navigation-${navigation === 'tabs' ? 'tabs' : 'sidebar'}`}>
        <fieldset disabled={preview} className="ac-preview-boundary">
        <h2>{heading || t.title}</h2>
        {!me ? (
          <div className="ac-auth">
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
          </div>
        ) : (
          <div className="ac-shell">
            <nav className="ac-nav" aria-label={t.account}>{[{ id: 'orders', label: t.orders, icon: ClipboardList }, { id: 'profile', label: t.profile, icon: UserRound }, ...(showGarage === 'no' ? [] : [{ id: 'garage', label: en ? 'Garage' : 'Hồ sơ gara', icon: Wrench }]), { id: 'consent', label: en ? 'Assisted orders' : 'Ủy quyền lên đơn', icon: ShieldCheck }].map((item) => <button key={item.id} type="button" aria-current={tab === item.id ? 'page' : undefined} onClick={() => setTab(item.id)}><item.icon size={18} />{item.label}</button>)}<button type="button" onClick={async () => { const r = await api('logout', {}); if (r.data.ok) { remember(null); setMe(null) } else setError(t.errors.network) }}><LogOut size={18} />{t.logout}</button></nav>
            <div className="ac-content">
            <p className="ac-account-email">{me.profile.email}</p>
            {error && <p className="ac-error" role="alert">{error}</p>}
            <div hidden={tab !== 'profile'}>
            <h3>{t.profile}</h3>
            <form className="ac-form" onSubmit={async (e) => { e.preventDefault(); const r = await api('profile', { ...form, addresses: addrs }); if (r.data.ok) { setSaved(true); await load() } else setError(t.errors.network) }}>
              <label>{t.name}<input value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); setSaved(false) }} required maxLength={120} /></label>
              <label>{t.phone}<input value={form.phone} onChange={(e) => { setForm({ ...form, phone: e.target.value }); setSaved(false) }} inputMode="tel" /></label>
              <h3>{t.addresses}</h3>
              {addrs.map((a, i) => (
                <div key={i} className="ac-addr">
                  <input aria-label={t.label} placeholder={t.label} value={a.label} onChange={(e) => setAddrs(addrs.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                  <input aria-label={t.address} placeholder={t.address} value={a.address} onChange={(e) => setAddrs(addrs.map((x, j) => (j === i ? { ...x, address: e.target.value } : x)))} />
                  <button type="button" className="ac-icon" title={t.remove} aria-label={t.remove} onClick={() => setAddrs(addrs.filter((_, j) => j !== i))}><Trash2 size={18} /></button>
                </div>
              ))}
              <button type="button" className="ac-link ac-action" disabled={addrs.length >= 10} onClick={() => setAddrs([...addrs, { label: '', address: '' }])}><Plus size={16} />{t.addAddr}</button>
              <button className="ac-btn">{saved ? t.saved : t.save}</button>
            </form>
            </div>
            <div hidden={tab !== 'garage'}>
              <h3>{en ? 'Garage application' : 'Hồ sơ gara'}</h3>
              <p role="status">{({ retail: en ? 'Retail customer' : 'Khách lẻ', pending: en ? 'Awaiting approval' : 'Chờ duyệt hồ sơ', approved: en ? 'Approved garage' : 'Gara đã được duyệt', rejected: en ? 'Rejected' : 'Hồ sơ bị từ chối', suspended: en ? 'Suspended' : 'Tạm khóa' } as Record<string,string>)[me.profile.garageStatus || 'retail']}</p>
              {me.profile.garageReason && <p>{me.profile.garageReason}</p>}
              {['retail', 'rejected'].includes(me.profile.garageStatus || 'retail') && <form className="ac-form" onSubmit={async (e) => { e.preventDefault(); const r = await api('garage', Object.fromEntries(new FormData(e.currentTarget))); if (r.data.ok) await load(); else setError(r.data.message || t.errors.network) }}><label>{en ? 'Garage name' : 'Tên gara'}<input name="garageName" required minLength={2} maxLength={120} /></label><label>{en ? 'Tax ID' : 'Mã số thuế'}<input name="garageTaxId" maxLength={40} /></label><label>{en ? 'Garage address' : 'Địa chỉ gara'}<input name="garageAddress" required minLength={5} maxLength={300} /></label><button className="ac-btn">{en ? 'Submit application' : 'Gửi hồ sơ xét duyệt'}</button></form>}
            </div>
            <div hidden={tab !== 'consent'}><h3>{en ? 'Authorize a partner' : 'Đồng ý cho CTV lên đơn hộ'}</h3><form className="ac-form" onSubmit={async (e) => { e.preventDefault(); const r = await api('assisted-consent', Object.fromEntries(new FormData(e.currentTarget))); if (r.data.ok) setConsentToken(r.data.token); else setError(r.data.message || t.errors.network) }}><label>{en ? 'Partner referral code' : 'Mã giới thiệu của CTV'}<input name="code" required maxLength={40} /></label><button className="ac-btn">{en ? 'Create authorization code' : 'Tạo mã đồng ý'}</button></form>{consentToken && <div role="status"><p>{en ? 'Valid for 15 minutes for the selected partner.' : 'Mã có hiệu lực 15 phút cho CTV đã chọn.'}</p><textarea className="ac-consent-token" aria-label={en ? 'Authorization code' : 'Mã đồng ý'} readOnly value={consentToken} onFocus={(e) => e.target.select()} /></div>}</div>
            <div hidden={tab !== 'orders'}>
            <h3>{t.orders}</h3>
            {me.orders.length === 0 ? <p>{t.noOrders}</p> : (
              <div className="ac-table-scroll"><table className="ac-table">
                <thead><tr><th>{t.order}</th><th>{t.date}</th><th>{t.total}</th><th>{t.status}</th><th>{t.paid}</th><th /></tr></thead>
                <tbody>
                  {me.orders.map((o) => (
                    <tr key={o.orderNo}>
                      <td>{o.orderNo}</td><td>{o.createdAt.slice(0, 10)}</td><td>{vnd(o.total)}</td>
                      <td>{t.statuses[o.status] ?? o.status}</td><td>{t.payStatuses[o.paymentStatus] ?? o.paymentStatus}</td>
                      <td>{o.lookupToken && <a href={`${href('/trang-thai-don')}?id=${encodeURIComponent(o.orderNo)}&token=${encodeURIComponent(o.lookupToken)}`}>{t.trackLink}</a>}</td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            )}
            </div>
            </div>
          </div>
        )}
        </fieldset>
      </div>
    </section>
  )
}
