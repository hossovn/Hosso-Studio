'use client'
import { useLocale } from '@hosso/studio-blocks'
import React, { useCallback, useEffect, useState } from 'react'

const S = {
  vi: {
    title: 'Cổng cộng tác viên',
    register: 'Đăng ký', login: 'Đăng nhập', logout: 'Đăng xuất',
    name: 'Họ tên', email: 'Email', password: 'Mật khẩu (từ 8 ký tự)', bank: 'Thông tin nhận tiền (ngân hàng, số tài khoản, chủ tài khoản)',
    errors: { name: 'Nhập họ tên.', email: 'Email không hợp lệ.', password: 'Mật khẩu cần từ 8 ký tự.', exists: 'Email này đã đăng ký, hãy đăng nhập.', credentials: 'Sai email hoặc mật khẩu.', network: 'Lỗi mạng, thử lại.', bad_request: 'Yêu cầu không hợp lệ.' } as Record<string, string>,
    link: 'Link giới thiệu chung của bạn', copy: 'Sao chép', copied: 'Đã chép',
    pickTitle: 'Chọn sản phẩm để bán', search: 'Tìm sản phẩm theo tên hoặc mã', go: 'Tìm', add: 'Chọn', remove: 'Bỏ', picked: 'Sản phẩm bạn đang bán (mỗi sản phẩm có link riêng)', none: 'Chưa chọn sản phẩm nào.',
    earn: 'Hoa hồng', pending: 'Chờ duyệt', approved: 'Đã duyệt', paid: 'Đã chốt và trả', cancelled: 'Hủy',
    refs: 'Đơn bán được', order: 'Mã đơn', total: 'Giá trị', commission: 'Hoa hồng', status: 'Trạng thái', noRefs: 'Chưa có đơn nào.', save: 'Lưu thông tin nhận tiền', saved: 'Đã lưu',
    rate: 'Mức hoa hồng của bạn',
  },
  en: {
    title: 'Partner portal',
    register: 'Sign up', login: 'Log in', logout: 'Log out',
    name: 'Full name', email: 'Email', password: 'Password (8+ characters)', bank: 'Payout details (bank, account number, account holder)',
    errors: { name: 'Enter your name.', email: 'Invalid email.', password: 'Password needs 8+ characters.', exists: 'This email is already registered, please log in.', credentials: 'Wrong email or password.', network: 'Network error, try again.', bad_request: 'Invalid request.' } as Record<string, string>,
    link: 'Your general referral link', copy: 'Copy', copied: 'Copied',
    pickTitle: 'Choose products to sell', search: 'Search products by name or code', go: 'Search', add: 'Pick', remove: 'Remove', picked: 'Products you sell (each has its own link)', none: 'No products picked yet.',
    earn: 'Commission', pending: 'Pending', approved: 'Approved', paid: 'Settled and paid', cancelled: 'Cancelled',
    refs: 'Orders sold', order: 'Order', total: 'Total', commission: 'Commission', status: 'Status', noRefs: 'No orders yet.', save: 'Save payout details', saved: 'Saved',
    rate: 'Your commission rate',
  },
}

type Pick = { title: string; href: string }
type Me = {
  profile: { name: string; code: string; commissionPct: number; bankInfo: string; picks: Pick[] }
  totals: Record<string, number>
  referrals: { orderId: string; orderTotal: number; commission: number; status: string }[]
}

const vnd = (n: number) => `${Math.round(n || 0).toLocaleString('vi-VN')} đ`
const api = async (path: string, body?: unknown) => {
  try {
    const r = await fetch(`/api/plugins/affiliate/${path}`, body === undefined ? undefined : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    return { status: r.status, data: (await r.json().catch(() => ({}))) as any }
  } catch {
    return { status: 0, data: { message: 'network' } }
  }
}
const withRef = (href: string, code: string) => `${location.origin}${href}${href.includes('?') ? '&' : '?'}ref=${code}`

function Copy({ text, t }: { text: string; t: (typeof S)['vi'] }) {
  const [done, setDone] = useState(false)
  return (
    <button type="button" className="wp-link" onClick={() => navigator.clipboard?.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1500) })}>
      {done ? t.copied : t.copy}
    </button>
  )
}

export function Portal({ heading }: { heading?: string }) {
  const t = S[useLocale().locale === 'en' ? 'en' : 'vi']
  const [me, setMe] = useState<Me | null | undefined>(undefined)
  const [mode, setMode] = useState<'register' | 'login'>('register')
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [found, setFound] = useState<(Pick & { description?: string })[]>([])
  const [bank, setBank] = useState('')
  const [saved, setSaved] = useState(false)

  const load = useCallback(async () => {
    const r = await api('me')
    if (r.status === 200) {
      setMe(r.data)
      setBank(r.data.profile.bankInfo)
    } else setMe(null)
  }, [])
  useEffect(() => { void load() }, [load])

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>
    const r = await api(mode, f)
    if (r.data.ok) await load()
    else setError(t.errors[r.data.message] ?? t.errors.network)
  }

  const savePicks = async (picks: Pick[]) => {
    await api('profile', { picks })
    await load()
  }

  if (me === undefined) return null
  return (
    <section className="wp-section">
      <div className="wp-wrap wp-aff">
        <h2>{heading || t.title}</h2>
        {!me ? (
          <>
            <p>
              <button type="button" className="wp-link" onClick={() => setMode('register')} aria-pressed={mode === 'register'}>{t.register}</button>{' · '}
              <button type="button" className="wp-link" onClick={() => setMode('login')} aria-pressed={mode === 'login'}>{t.login}</button>
            </p>
            <form className="wp-form" onSubmit={submit}>
              {mode === 'register' && <label>{t.name}<input name="name" required maxLength={120} autoComplete="name" /></label>}
              <label>{t.email}<input name="email" type="email" required autoComplete="email" /></label>
              <label>{t.password}<input name="password" type="password" required minLength={mode === 'register' ? 8 : undefined} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} /></label>
              {mode === 'register' && <label>{t.bank}<textarea name="bankInfo" rows={2} maxLength={500} /></label>}
              <input className="wp-hp" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
              {error && <p className="wp-note wp-note-error" role="alert">{error}</p>}
              <button className="wp-btn">{mode === 'register' ? t.register : t.login}</button>
            </form>
          </>
        ) : (
          <>
            <p className="wp-note">
              {me.profile.name} · {t.rate}: {me.profile.commissionPct}%{' '}
              <button type="button" className="wp-link" onClick={async () => { await api('logout', {}); setMe(null) }}>{t.logout}</button>
            </p>

            <h3>{t.earn}</h3>
            <ul className="wp-grid">
              {(['pending', 'approved', 'paid'] as const).map((k) => (
                <li key={k} className="wp-card"><span className="wp-meta">{t[k]}</span><strong className="wp-price">{vnd(me.totals[k])}</strong></li>
              ))}
            </ul>

            <h3>{t.link}</h3>
            <p><code>{`${location.origin}/?ref=${me.profile.code}`}</code> <Copy text={`${location.origin}/?ref=${me.profile.code}`} t={t} /></p>

            <h3>{t.pickTitle}</h3>
            <form className="wp-search" onSubmit={async (e) => { e.preventDefault(); setFound((await api(`search?q=${encodeURIComponent(q)}`)).data.items ?? []) }}>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search} aria-label={t.search} />
              <button className="wp-btn">{t.go}</button>
            </form>
            <ul className="wp-cart wp-found">
              {found.map((p) => (
                <li key={p.href}>
                  <div><strong>{p.title}</strong><span className="wp-meta">{p.description}</span></div>
                  <button type="button" className="wp-btn" disabled={me.profile.picks.some((x) => x.href === p.href)} onClick={() => savePicks([...me.profile.picks, { title: p.title, href: p.href }])}>{t.add}</button>
                </li>
              ))}
            </ul>

            <h3>{t.picked}</h3>
            {me.profile.picks.length === 0 ? <p className="wp-note">{t.none}</p> : (
              <ul className="wp-cart">
                {me.profile.picks.map((p) => (
                  <li key={p.href}>
                    <div><strong>{p.title}</strong><code className="wp-meta">{withRef(p.href, me.profile.code)}</code></div>
                    <Copy text={withRef(p.href, me.profile.code)} t={t} />
                    <button type="button" className="wp-link" onClick={() => savePicks(me.profile.picks.filter((x) => x.href !== p.href))}>{t.remove}</button>
                  </li>
                ))}
              </ul>
            )}

            <h3>{t.refs}</h3>
            {me.referrals.length === 0 ? <p className="wp-note">{t.noRefs}</p> : (
              <table>
                <thead><tr><th>{t.order}</th><th>{t.total}</th><th>{t.commission}</th><th>{t.status}</th></tr></thead>
                <tbody>{me.referrals.map((r) => <tr key={r.orderId}><td>{r.orderId}</td><td>{vnd(r.orderTotal)}</td><td>{vnd(r.commission)}</td><td>{t[r.status as 'pending'] ?? r.status}</td></tr>)}</tbody>
              </table>
            )}

            <form className="wp-form" onSubmit={async (e) => { e.preventDefault(); await api('profile', { bankInfo: bank }); setSaved(true) }}>
              <label>{t.bank}<textarea value={bank} onChange={(e) => { setBank(e.target.value); setSaved(false) }} rows={2} maxLength={500} /></label>
              <button className="wp-btn">{saved ? t.saved : t.save}</button>
            </form>
          </>
        )}
      </div>
    </section>
  )
}
