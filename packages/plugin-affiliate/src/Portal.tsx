'use client'
import { useLocale, useEditorPreview } from '@hosso/studio-blocks'
import React, { useCallback, useEffect, useState } from 'react'
import { ChartNoAxesCombined, Link2, ShoppingBag, Wallet, UserRound, Copy as CopyIcon, Check, LogOut, Plus, Search } from 'lucide-react'
import { AssistedOrder } from './AssistedOrder'

const S = {
  vi: {
    title: 'Cổng cộng tác viên',
    register: 'Đăng ký', login: 'Đăng nhập', logout: 'Đăng xuất',
    name: 'Họ tên', email: 'Email', password: 'Mật khẩu (từ 8 ký tự)', bank: 'Thông tin nhận tiền (ngân hàng, số tài khoản, chủ tài khoản)',
    errors: { name: 'Nhập họ tên.', email: 'Email không hợp lệ.', password: 'Mật khẩu cần từ 8 ký tự.', exists: 'Email này đã đăng ký, hãy đăng nhập.', credentials: 'Sai email hoặc mật khẩu.', network: 'Lỗi mạng, thử lại.', bad_request: 'Yêu cầu không hợp lệ.', rate_limit: 'Thử quá nhiều lần. Vui lòng chờ vài phút.' } as Record<string, string>,
    link: 'Link giới thiệu chung của bạn', copy: 'Sao chép', copied: 'Đã chép',
    pickTitle: 'Chọn sản phẩm để bán', search: 'Tìm sản phẩm theo tên hoặc mã', go: 'Tìm', add: 'Chọn', remove: 'Bỏ', picked: 'Sản phẩm bạn đang bán (mỗi sản phẩm có link riêng)', none: 'Chưa chọn sản phẩm nào.',
    earn: 'Hoa hồng', pending: 'Chờ duyệt', approved: 'Đã duyệt', paid: 'Đã chốt và trả', cancelled: 'Hủy',
    refs: 'Đơn bán được', order: 'Mã đơn', total: 'Giá trị', commission: 'Hoa hồng', status: 'Trạng thái', noRefs: 'Chưa có đơn nào.', save: 'Lưu thông tin nhận tiền', saved: 'Đã lưu',
    rate: 'Mức hoa hồng của bạn', fixed: 'mỗi đơn', waiting: 'Tài khoản chưa được duyệt tham gia. Link chỉ ghi nhận hoa hồng sau khi chủ shop duyệt.', holding: 'Đang giữ', eligible: 'Đủ điều kiện', review: 'Cần đối soát', clicks: 'Lượt click', orders: 'Đơn giới thiệu', history: 'Lịch sử chi trả', reference: 'Mã giao dịch', date: 'Ngày', available: 'Ngày đủ điều kiện', prev: 'Trang trước', next: 'Trang sau', all: 'Tất cả trạng thái',
  },
  en: {
    title: 'Partner portal',
    register: 'Sign up', login: 'Log in', logout: 'Log out',
    name: 'Full name', email: 'Email', password: 'Password (8+ characters)', bank: 'Payout details (bank, account number, account holder)',
    errors: { name: 'Enter your name.', email: 'Invalid email.', password: 'Password needs 8+ characters.', exists: 'This email is already registered, please log in.', credentials: 'Wrong email or password.', network: 'Network error, try again.', bad_request: 'Invalid request.', rate_limit: 'Too many attempts. Please wait a few minutes.' } as Record<string, string>,
    link: 'Your general referral link', copy: 'Copy', copied: 'Copied',
    pickTitle: 'Choose products to sell', search: 'Search products by name or code', go: 'Search', add: 'Pick', remove: 'Remove', picked: 'Products you sell (each has its own link)', none: 'No products picked yet.',
    earn: 'Commission', pending: 'Pending', approved: 'Approved', paid: 'Settled and paid', cancelled: 'Cancelled',
    refs: 'Orders sold', order: 'Order', total: 'Total', commission: 'Commission', status: 'Status', noRefs: 'No orders yet.', save: 'Save payout details', saved: 'Saved',
    rate: 'Your commission rate', fixed: 'per order', waiting: 'Your account is not approved for participation. Links earn commission only after shop approval.', holding: 'Holding', eligible: 'Eligible', review: 'Needs review', clicks: 'Clicks', orders: 'Referred orders', history: 'Payout history', reference: 'Transfer reference', date: 'Date', available: 'Eligible on', prev: 'Previous', next: 'Next', all: 'All statuses',
  },
}

type Pick = { title: string; href: string }
type Me = {
  withdrawalPolicy?: { minimum: number; allowOffCycle: boolean; nextDate: string; timeZone: string; enabled: boolean }
  withdrawals?: { id: string | number; amount: number; status: string; reason?: string; createdAt: string }[]
  profile: { approval?: string; active?: boolean; commissionType?: string; commissionFixed?: number; name: string; code: string; commissionPct: number; bankInfo: string; picks: Pick[] }
  totals: Record<string, number>
  page?: number; hasNextPage?: boolean; payoutPage?: number; hasNextPayoutPage?: boolean; clicks?: number; orderCount?: number
  payouts?: { id: string | number; amount: number; reference: string; evidence: string; paidAt: string }[]
  referrals: { id?: string | number; source?: string; eligibleAt?: string; orderId: string; orderTotal: number; commission: number; status: string }[]
}

const vnd = (n: number) => `${Math.round(n || 0).toLocaleString('vi-VN')} đ`
const PREVIEW_ME: Me = { profile: { approval: 'approved', name: 'Preview Partner', code: 'PREVIEW', commissionPct: 0, bankInfo: '', picks: [] }, totals: {}, referrals: [] }
const api = async (path: string, body?: unknown) => {
  try {
    const r = await fetch(`/api/plugins/affiliate/${path}`, body === undefined ? undefined : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    return { status: r.status, data: (await r.json().catch(() => ({}))) as any }
  } catch {
    return { status: 0, data: { message: 'network' } }
  }
}
const withRef = (href: string, code: string) => { const url = new URL(href, typeof location === 'undefined' ? 'https://preview.invalid' : location.origin); url.searchParams.set('ref', code); return url.toString() }

function Copy({ text, t }: { text: string; t: (typeof S)['vi'] }) {
  const [done, setDone] = useState(false)
  const [failed, setFailed] = useState(false)
  return (
    <button type="button" className="af-icon" title={failed ? (t === S.vi ? 'Không chép được. Chọn và chép liên kết.' : 'Select and copy the link manually.') : done ? t.copied : t.copy} aria-label={done ? t.copied : t.copy} onClick={() => { if (!navigator.clipboard) { setFailed(true); return }; void navigator.clipboard.writeText(text).then(() => { setDone(true); setFailed(false); setTimeout(() => setDone(false), 1500) }).catch(() => setFailed(true)) }}>
      {done ? <Check size={18} /> : <CopyIcon size={18} />}
    </button>
  )
}

export function Portal({ heading, navigation = 'sidebar', showAssisted = 'yes', showWithdrawals = 'yes', policyText, canvasPreview }: { heading?: string; navigation?: string; showAssisted?: string; showWithdrawals?: string; policyText?: string; canvasPreview?: boolean }) {
  const t = S[useLocale().locale === 'en' ? 'en' : 'vi']
  const editor = useEditorPreview()
  const preview = editor || (canvasPreview ? { account: 'member' } : null)
  const [sessionMe, setMe] = useState<Me | null | undefined>(undefined)
  const me = preview ? preview.account === 'member' ? PREVIEW_ME : null : sessionMe
  const origin = typeof location === 'undefined' ? '' : location.origin
  const [mode, setMode] = useState<'register' | 'login'>('register')
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [found, setFound] = useState<(Pick & { description?: string })[]>([])
  const [bank, setBank] = useState('')
  const [saved, setSaved] = useState(false)
  const [page, setPage] = useState(1)
  const [payoutPage, setPayoutPage] = useState(1)
  const [status, setStatus] = useState('')
  const [tab, setTab] = useState('overview')
  const [withdrawing, setWithdrawing] = useState(false)
  const withdrawalReasonId = React.useId()
  const en = t === S.en

  const load = useCallback(async () => {
    const r = await api(`me?page=${page}&payoutPage=${payoutPage}&status=${status}`)
    if (r.status === 200) {
      setMe(r.data)
      setBank(r.data.profile.bankInfo)
    } else setMe(null)
  }, [page, payoutPage, status])
  useEffect(() => { if (!preview) void load() }, [load, preview])

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (preview) return
    setError('')
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>
    const r = await api(mode, f)
    if (r.data.ok) await load()
    else setError(t.errors[r.data.message] ?? t.errors.network)
  }

  const savePicks = async (picks: Pick[]) => {
    if (preview) return
    const result = await api('profile', { picks })
    if (!result.data.ok) { setError(t.errors.network); return }
    await load()
  }

  if (me === undefined) return <section className="wp-section"><div className="wp-aff"><p role="status">{en ? 'Loading your account…' : 'Đang tải tài khoản…'}</p></div></section>
  const availableBalance = (me?.totals.eligible ?? 0) + (me?.totals.approved ?? 0)
  const minimumWithdrawal = me?.withdrawalPolicy?.minimum ?? 100000
  const withdrawalBlock = !me?.withdrawalPolicy?.enabled
    ? (en ? 'Payouts are not enabled in this environment.' : 'Môi trường này chưa bật xử lý chi trả.')
    : me.profile.active === false
      ? (en ? 'Your partner account is locked. Contact the shop to restore access.' : 'Tài khoản cộng tác viên đang bị khóa. Liên hệ cửa hàng để được mở lại.')
      : me.profile.approval !== 'approved'
      ? t.waiting
      : !me.profile.bankInfo?.trim()
        ? (en ? 'Save your payout details before requesting a withdrawal.' : 'Lưu thông tin nhận tiền trước khi yêu cầu rút.')
        : me.withdrawals?.some((w) => ['pending', 'approved'].includes(w.status))
          ? (en ? 'Your current withdrawal is being processed.' : 'Yêu cầu rút hiện tại đang được xử lý.')
          : availableBalance < minimumWithdrawal
            ? (en ? `Your available balance must reach ${vnd(minimumWithdrawal)}.` : `Số dư khả dụng cần đạt ${vnd(minimumWithdrawal)}.`)
            : ''
  return (
    <section className="wp-section">
      <div className={`wp-wrap wp-aff af-navigation-${navigation === 'tabs' ? 'tabs' : 'sidebar'}`}>
        <fieldset disabled={Boolean(preview)} style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>
        <header className="af-header"><h2>{heading || t.title}</h2>{me && <span>{me.profile.name}</span>}</header>
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
          <div className="af-shell">
            <nav className="af-navigation" aria-label={en ? 'Partner account' : 'Tài khoản cộng tác viên'}>{[
              { id: 'overview', label: en ? 'Overview' : 'Tổng quan', icon: ChartNoAxesCombined },
              { id: 'links', label: en ? 'Referral links' : 'Liên kết bán hàng', icon: Link2 },
              { id: 'orders', label: t.refs, icon: ShoppingBag },
              ...(showAssisted !== 'no' ? [{ id: 'assisted', label: en ? 'Create order' : 'Lên đơn hộ', icon: Plus }] : []),
              ...(showWithdrawals !== 'no' ? [{ id: 'wallet', label: en ? 'Payouts' : 'Chi trả', icon: Wallet }] : []),
              { id: 'profile', label: en ? 'Payout details' : 'Thông tin nhận tiền', icon: UserRound },
            ].map((item) => <button type="button" key={item.id} aria-current={tab === item.id ? 'page' : undefined} onClick={() => { setTab(item.id); setError('') }}><item.icon size={18} />{item.label}</button>)}<button type="button" onClick={async () => { if (preview) return; const r = await api('logout', {}); if (r.data.ok) setMe(null); else setError(t.errors.network) }}><LogOut size={18} />{t.logout}</button></nav>
            <div className="af-content">
            <div hidden={tab !== 'overview'} data-hs-part="affiliate-overview">
            <p className="wp-note">
              {me.profile.name} · {t.rate}: {me.profile.commissionType === 'fixed' ? `${vnd(me.profile.commissionFixed ?? 0)} / ${t.fixed}` : `${me.profile.commissionPct}%`}{' '}
            </p>

            {error && <p role="alert">{error}</p>}
            {me.profile.approval !== 'approved' && <p role="status" className="wp-note">{t.waiting}</p>}
            <p>{t.clicks}: {me.clicks ?? 0} · {t.orders}: {me.orderCount ?? 0}</p>
            <h3>{t.earn}</h3>
            <ul className="wp-grid">
              {(['pending', 'holding', 'eligible', 'approved', 'paid', 'review'] as const).map((k) => (
                <li key={k} className="wp-card"><span className="wp-meta">{t[k]}</span><strong className="wp-price">{vnd(me.totals[k])}</strong></li>
              ))}
            </ul>
            {policyText && <p className="af-policy">{policyText}</p>}
            <p className="af-policy">{en ? 'Last eligible click: 30 days. Fully paid and completed orders are held for 14 days. Shipping is excluded.' : 'Ghi nhận click hợp lệ cuối trong 30 ngày. Đơn thu đủ tiền và hoàn tất được giữ 14 ngày. Hoa hồng không tính phí giao hàng.'}</p>
            </div>

            <div hidden={tab !== 'links'} data-hs-part="affiliate-links">
            {me.profile.approval === 'approved' ? <>
            <h3>{t.link}</h3>
            <div className="af-ref-link"><code>{`${origin}/?ref=${me.profile.code}`}</code> <Copy text={`${origin}/?ref=${me.profile.code}`} t={t} /></div>

            <h3>{t.pickTitle}</h3>
            <form className="wp-search" onSubmit={async (e) => { e.preventDefault(); if (preview) return; setFound((await api(`search?q=${encodeURIComponent(q)}`)).data.items ?? []) }}>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search} aria-label={t.search} />
              <button className="wp-btn" title={t.go} aria-label={t.go}><Search size={18} /></button>
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

            </> : <p className="wp-note">{t.waiting}</p>}
            </div>
            {tab === 'assisted' && (me.profile.approval === 'approved' ? <AssistedOrder preview={Boolean(preview)} /> : <p>{t.waiting}</p>)}
            <div hidden={tab !== 'orders'} data-hs-part="affiliate-orders">
            <h3>{t.refs}</h3>
            <label>{t.status} <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}><option value="">{t.all}</option>{(['pending', 'holding', 'eligible', 'approved', 'paid', 'cancelled', 'review'] as const).map((k) => <option key={k} value={k}>{t[k]}</option>)}</select></label>
            {me.referrals.length === 0 ? <p className="wp-note">{t.noRefs}</p> : (
              <div className="af-table-scroll"><table>
                <thead><tr><th>{t.order}</th><th>{t.total}</th><th>{t.commission}</th><th>{t.status}</th><th>{t.available}</th></tr></thead>
                <tbody>{me.referrals.map((r) => <tr key={r.id ?? `${r.source}:${r.orderId}`}><td>{r.orderId}</td><td>{vnd(r.orderTotal)}</td><td>{vnd(r.commission)}</td><td>{t[r.status as 'pending'] ?? r.status}</td><td>{r.eligibleAt ? new Date(r.eligibleAt).toLocaleDateString() : '—'}</td></tr>)}</tbody>
              </table></div>
            )}

            <nav aria-label={t.refs}><button type="button" disabled={page === 1} onClick={() => setPage(page - 1)}>{t.prev}</button> {page} <button type="button" disabled={!me.hasNextPage} onClick={() => setPage(page + 1)}>{t.next}</button></nav>
            </div>
            <div hidden={tab !== 'wallet'} data-hs-part="affiliate-wallet">
            <h3>{en ? 'Withdraw commission' : 'Rút hoa hồng'}</h3>
            <p>{en ? 'Available balance' : 'Số dư khả dụng'}: <strong className="wp-price">{vnd(availableBalance)}</strong></p>
            <p className="af-policy">{en ? 'Includes eligible and approved commission, less refund adjustments. The balance is checked again when you submit.' : 'Gồm hoa hồng đủ điều kiện và đã duyệt, sau điều chỉnh hoàn tiền. Số dư được kiểm tra lại khi gửi yêu cầu.'}</p>
            <p>{en ? 'Next scheduled payout' : 'Kỳ chi tiếp theo'}: <strong>{me.withdrawalPolicy?.nextDate || '—'}</strong></p>
            <p>{en ? 'Minimum withdrawal' : 'Rút tối thiểu'}: {vnd(minimumWithdrawal)}</p>
            <button type="button" className="wp-btn" aria-describedby={withdrawalBlock ? withdrawalReasonId : undefined} disabled={withdrawing || Boolean(withdrawalBlock)} onClick={async () => { if (preview) return; setWithdrawing(true); setError(''); const result = await api('withdraw', {}); if (result.data.ok) await load(); else setError(result.data.message || t.errors.network); setWithdrawing(false) }}>{withdrawing ? (en ? 'Sending…' : 'Đang gửi…') : (en ? 'Request all available commission' : 'Yêu cầu rút toàn bộ số dư khả dụng')}</button>
            {error && <p className="wp-note-error" role="alert">{error}</p>}
            {withdrawalBlock && <p id={withdrawalReasonId} className="wp-note">{withdrawalBlock}</p>}
            {!me.withdrawals?.length && <p className="wp-note">{en ? 'No withdrawal requests yet.' : 'Chưa có yêu cầu rút tiền.'}</p>}
            <div className="af-table-scroll"><table><thead><tr><th>{t.date}</th><th>{t.commission}</th><th>{t.status}</th></tr></thead><tbody>{me.withdrawals?.map((w) => <tr key={w.id}><td>{new Date(w.createdAt).toLocaleDateString(en ? 'en-GB' : 'vi-VN')}</td><td>{vnd(w.amount)}</td><td>{({ pending: en ? 'Requested' : 'Đã yêu cầu', approved: t.approved, paid: t.paid, rejected: en ? 'Rejected' : 'Từ chối' } as Record<string,string>)[w.status]}{w.reason && <p>{w.reason}</p>}</td></tr>)}</tbody></table></div>
            <h3>{t.history}</h3>
            {!me.payouts?.length && <p className="wp-note">{en ? 'No payouts recorded yet.' : 'Chưa có khoản chi trả nào.'}</p>}
            <div className="af-table-scroll"><table><thead><tr><th>{t.date}</th><th>{t.commission}</th><th>{t.reference}</th></tr></thead><tbody>{me.payouts?.map((p) => <tr key={p.id}><td>{new Date(p.paidAt).toLocaleDateString()}</td><td>{vnd(p.amount)}</td><td>{p.reference}</td></tr>)}</tbody></table></div>
            <nav aria-label={t.history}><button type="button" disabled={payoutPage === 1} onClick={() => setPayoutPage(payoutPage - 1)}>{t.prev}</button> {payoutPage} <button type="button" disabled={!me.hasNextPayoutPage} onClick={() => setPayoutPage(payoutPage + 1)}>{t.next}</button></nav>
            </div>
            <div hidden={tab !== 'profile'}>
            <form className="wp-form" onSubmit={async (e) => { e.preventDefault(); if (preview) return; const r = await api('profile', { bankInfo: bank }); if (r.data.ok) { await load(); setSaved(true) } else setError(t.errors.network) }}>
              <label>{t.bank}<textarea value={bank} onChange={(e) => { setBank(e.target.value); setSaved(false) }} rows={2} maxLength={500} /></label>
              <button className="wp-btn">{saved ? t.saved : t.save}</button>
            </form>
            </div>
            </div>
          </div>
        )}
        </fieldset>
      </div>
    </section>
  )
}
