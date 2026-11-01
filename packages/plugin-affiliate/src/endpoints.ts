import type { Endpoint, Payload, PayloadRequest, Where } from 'payload'
import type { HossoPlugin } from '@hosso/studio-blocks'
import { all, rateLimit, snapshot } from './service'
import { adminEndpoints, displayStatus } from './admin-endpoints'
import { DAY, REF_COOKIE, sameOrigin, commission, eligibleAmount } from './core'
import { hashPassword, makeSession, readSession, sessionCookie, verifyPassword } from './auth'
import { requestWithdrawal, withdrawalPolicy } from './withdrawals'
import { AffiliateError } from './core'
import { card } from '@hosso/plugin-shop/loaders'
import { placeOrder, prepare, priced, quoteKey } from '@hosso/plugin-shop/server'

// Mọi thao tác của cộng tác viên đi qua các endpoint này (overrideAccess), collection thì chỉ admin đọc/ghi được.


const json = (body: unknown, status = 200, cookie?: string) =>
  Response.json(body, { status, headers: cookie !== undefined ? { 'Set-Cookie': cookie, 'Cache-Control': 'no-store' } : { 'Cache-Control': 'no-store' } })
const err = (status: number, message: string) => json({ ok: false, message }, status)
const body = async (req: PayloadRequest) => ((await req.json?.().catch(() => null)) ?? {}) as Record<string, unknown>
const str = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max)

type Aff = { id: string | number; name: string; email: string; code: string; passwordHash: string; active?: boolean; approval?: string; commissionType?: string; commissionFixed?: number; commissionPct?: number; bankInfo?: string; picks?: { title: string; href: string }[] }

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const newCode = () => Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => ALPHABET[b % ALPHABET.length]).join('')

const find = async (payload: Payload, where: Where) =>
  (await payload.find({ collection: 'affiliates' as any, where, limit: 1, depth: 0, overrideAccess: true })).docs[0] as unknown as Aff | undefined

/** Cộng tác viên đang đăng nhập (hoặc undefined). Tài khoản bị tắt thì coi như chưa đăng nhập. */
async function current(req: PayloadRequest) {
  const id = await readSession(req.payload.secret, req.headers)
  if (!id) return undefined
  const a = await find(req.payload, { id: { equals: id } })
  return a?.active ? a : undefined
}

const publicProfile = (a: Aff) => ({ name: a.name, email: a.email, code: a.code, approval: a.approval, active: a.active, commissionType: a.commissionType ?? 'percent', commissionFixed: a.commissionFixed ?? 0, commissionPct: a.commissionPct ?? 0, bankInfo: a.bankInfo ?? '', picks: a.picks ?? [] })

async function startSession(req: PayloadRequest, a: Aff) {
  return json({ ok: true }, 200, sessionCookie(await makeSession(req.payload.secret, a.id)))
}

const routes: Endpoint[] = [
  ...adminEndpoints,
  { path: '/plugins/affiliate/checkout-options', method: 'get', handler: async (req) => {
    if ((await current(req))?.approval !== 'approved') return err(403, 'unauthorized')
    const branches = []
    for (const plugin of (req.payload.config.custom?.hossoPlugins || []) as HossoPlugin[]) {
      const data = await plugin.commerce?.checkoutData?.(req.payload)
      if (data) branches.push(...data.branches)
    }
    return json({ ok: true, branches })
  } },
  { path: '/plugins/affiliate/products', method: 'get', handler: async (req) => {
    const a = await current(req)
    if (a?.approval !== 'approved') return err(403, 'unauthorized')
    const q = str(new URL(req.url!).searchParams.get('q'), 80)
    const products = await req.payload.find({ collection: 'shop-products' as any, where: { and: [{ active: { equals: true } }, ...(q ? [{ or: [{ name: { contains: q } }, { code: { contains: q } }] }] : [])] }, limit: 20, depth: 1, overrideAccess: true, req })
    return json({ ok: true, items: products.docs.map((p: any) => card(p)) })
  } },
  { path: '/plugins/affiliate/assisted-customer', method: 'post', handler: async (req) => {
    const a = await current(req)
    if (a?.approval !== 'approved') return err(403, 'unauthorized')
    const b = await body(req)
    const plugins = (req.payload.config.custom?.hossoPlugins || []) as HossoPlugin[]
    const resolver = plugins.find((p) => p.commerce?.assistedCustomer)?.commerce?.assistedCustomer
    if (!resolver || !b.token) return err(400, 'Cần mã đồng ý từ tài khoản khách hàng.')
    try {
      const customer = await resolver(req.payload, req.headers, String(b.token))
      return customer ? json({ ok: true, customer }) : err(400, 'Mã khách hàng không hợp lệ.')
    } catch { return err(400, 'Mã đồng ý đã hết hạn hoặc không dành cho bạn. Hãy nhờ khách cấp mã mới.') }
  } },
  ...(['quote', 'checkout'] as const).map((action): Endpoint => ({ path: `/plugins/affiliate/assisted-${action}`, method: 'post', handler: async (req) => {
    const a = await current(req)
    if (a?.approval !== 'approved') return err(403, 'unauthorized')
    const input: any = await body(req)
    input.meta = { voucher: input.meta?.voucher || '', locale: input.meta?.locale || 'vi', assistedCustomerToken: input.meta?.assistedCustomerToken || 'retail', assisted: true, assistedAffiliate: String(a.id) }
    req.context = { ...req.context, assistedAffiliate: a.id }
    if (action === 'checkout') return placeOrder(req, input)
    const prepared = await prepare(req, input, true)
    if (prepared instanceof Response) return prepared
    const price = await priced(req, prepared)
    if (price instanceof Response) return price
    const policy = await snapshot(req, eligibleAmount(prepared.draft.subtotal, prepared.draft.adjustments), prepared.draft.customer.email, prepared.draft.items)
    return json({ ok: true, ...price, items: prepared.draft.items, shipments: prepared.draft.shipments, commissionPreview: policy ? { amount: commission(policy), review: policy.selfReferral, holdDays: policy.holdDays } : null, subtotal: prepared.draft.subtotal, adjustments: prepared.draft.adjustments, quoteKey: await quoteKey(prepared.draft, price.total) })
  } })),
  { path: '/plugins/affiliate/withdraw', method: 'post', handler: async (req) => {
    const a = await current(req)
    if (!a) return err(401, 'unauthorized')
    if (!await rateLimit(req, `withdraw:${a.id}`, 5, 1)) return err(429, 'rate_limit')
    try { return json({ ok: true, request: await requestWithdrawal(req, a) }) }
    catch (error) { if (error instanceof AffiliateError) return err(400, error.message); throw error }
  } },
  { path: '/plugins/affiliate/click', method: 'post', handler: async (req) => {
    const b = await body(req)
    const code = typeof b.code === 'string' ? b.code.trim() : ''
    if (!/^[\w-]{1,40}$/.test(code)) return err(400, 'bad_request')
    const a = await find(req.payload, { code: { equals: code }, active: { equals: true }, approval: { equals: 'approved' } })
    if (!a) return json({ ok: false }, 200)
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (v) => v.toString(16).padStart(2, '0')).join('')
    const path = str(b.path, 500).split('?')[0]
    await req.payload.create({ collection: 'affiliate-clicks' as any, data: { affiliate: a.id, token, path: path.startsWith('/') && !path.startsWith('//') ? path : '/', expiresAt: new Date(Date.now() + 30 * DAY).toISOString() }, overrideAccess: true, req })
    return json({ ok: true }, 200, REF_COOKIE + '=' + token + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000' + (process.env.NODE_ENV === 'production' ? '; Secure' : ''))
  } },
  {
    path: '/plugins/affiliate/register',
    method: 'post',
    handler: async (req) => {
      if (!await rateLimit(req, 'register', 20, 1)) return err(429, 'rate_limit')
      const b = await body(req)
      if (b.website) return err(400, 'bad_request') // ô bẫy bot
      const name = str(b.name, 120)
      const email = str(b.email, 200).toLowerCase()
      const password = String(b.password ?? '')
      if (name.length < 2) return err(400, 'name')
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return err(400, 'email')
      if (password.length < 8 || password.length > 200) return err(400, 'password')
      if (await find(req.payload, { email: { equals: email } })) return err(409, 'exists')
      const created = (await req.payload.create({
        collection: 'affiliates' as any,
        overrideAccess: true,
        data: { name, email, passwordHash: await hashPassword(password), code: newCode(), bankInfo: str(b.bankInfo, 500), active: true, approval: 'pending' },
      })) as unknown as Aff
      return startSession(req, created)
    },
  },
  {
    path: '/plugins/affiliate/login',
    method: 'post',
    handler: async (req) => {
      const b = await body(req)
      const email = str(b.email, 200).toLowerCase()
      if (!await rateLimit(req, 'login:' + email) || !await rateLimit(req, 'login', 100, 1)) return err(429, 'rate_limit')
      const a = await find(req.payload, { email: { equals: email } })
      // Cùng một thông báo cho sai email và sai mật khẩu.
      if (!a?.active || !a.passwordHash || String(b.password ?? '').length > 200 || !(await verifyPassword(String(b.password ?? ''), a.passwordHash))) return err(401, 'credentials')
      return startSession(req, a)
    },
  },
  { path: '/plugins/affiliate/logout', method: 'post', handler: async () => json({ ok: true }, 200, sessionCookie('')) },
  {
    // Hồ sơ + lượt giới thiệu + tổng hoa hồng theo trạng thái. Chưa đăng nhập: 401.
    path: '/plugins/affiliate/me',
    method: 'get',
    handler: async (req) => {
      const a = await current(req)
      if (!a) return err(401, 'unauthorized')
      const params = new URL(req.url!).searchParams
      const page = Math.max(1, Math.min(100000, Math.floor(Number(params.get('page')) || 1)))
      const payoutPage = Math.max(1, Math.min(100000, Math.floor(Number(params.get('payoutPage')) || 1)))
      const refs = await all(req, 'affiliate-referrals', { affiliate: { equals: a.id } })
      refs.sort((x, y) => String(y.createdAt).localeCompare(String(x.createdAt)))
      const totals: Record<string, number> = { pending: 0, holding: 0, eligible: 0, approved: 0, paid: 0, cancelled: 0, review: 0 }
      for (const r of refs) { const status = displayStatus(r); totals[status] = (totals[status] ?? 0) + (r.commission ?? 0) }
      const status = params.get('status')
      const filtered = status ? refs.filter((r) => displayStatus(r) === status) : refs
      const payouts = await req.payload.find({ collection: 'affiliate-payouts' as any, where: { affiliate: { equals: a.id } }, sort: '-paidAt', limit: 20, page: payoutPage, depth: 0, overrideAccess: true, req })
      const clicks = await req.payload.count({ collection: 'affiliate-clicks' as any, where: { affiliate: { equals: a.id } }, overrideAccess: true, req })
      const withdrawals = await req.payload.find({ collection: 'affiliate-withdrawals' as any, where: { affiliate: { equals: a.id } }, sort: '-createdAt', limit: 20, depth: 0, overrideAccess: true, req })
      const policy = await withdrawalPolicy(req)
      return json({ ok: true, profile: { ...publicProfile(a), commissionPct: a.commissionPct ?? policy.defaultRate }, totals, clicks: clicks.totalDocs, orderCount: refs.filter((r) => !r.parent).length, page, hasNextPage: filtered.length > page * 20, payoutPage, hasNextPayoutPage: payouts.hasNextPage,
        referrals: filtered.slice((page - 1) * 20, page * 20).map((r) => ({ id: r.id, source: r.source, orderId: r.orderId, orderTotal: r.orderTotal, commission: r.commission, status: displayStatus(r), eligibleAt: r.eligibleAt, createdAt: r.createdAt })),
        payouts: payouts.docs.map((p: any) => ({ id: p.id, amount: p.amount, reference: p.reference, evidence: p.evidence, paidAt: p.paidAt })),
        withdrawalPolicy: { ...policy, enabled: req.payload.db.name !== 'sqlite' }, withdrawals: withdrawals.docs.map((w: any) => ({ id: w.id, amount: w.amount, status: w.status, reason: w.reason, createdAt: w.createdAt })),
      })
    },
  },
  {
    // Cộng tác viên chọn sản phẩm để bán và nhập thông tin nhận tiền.
    path: '/plugins/affiliate/profile',
    method: 'post',
    handler: async (req) => {
      const a = await current(req)
      if (!a) return err(401, 'unauthorized')
      const b = await body(req)
      const data: Record<string, unknown> = {}
      if ('bankInfo' in b) data.bankInfo = str(b.bankInfo, 500)
      if (Array.isArray(b.picks))
        data.picks = b.picks
          .slice(0, 50)
          .map((p: any) => ({ title: str(p?.title, 200), href: str(p?.href, 300) }))
          .filter((p) => p.title && p.href.startsWith('/') && !p.href.startsWith('//'))
      await req.payload.update({ collection: 'affiliates' as any, id: a.id, data, overrideAccess: true })
      return json({ ok: true })
    },
  },
  {
    // Tìm sản phẩm để chọn: gom kết quả `search` của mọi plugin bán hàng khác, không phụ thuộc plugin cụ thể.
    path: '/plugins/affiliate/search',
    method: 'get',
    handler: async (req) => {
      if (!(await current(req))) return err(401, 'unauthorized')
      const q = str(new URL(req.url!).searchParams.get('q'), 80)
      if (!q) return json({ items: [] })
      const plugins = (req.payload.config.custom?.hossoPlugins ?? []) as HossoPlugin[]
      const lists = await Promise.all(plugins.filter((p) => p.id !== 'affiliate' && p.search).map((p) => p.search!(q, req.payload).catch(() => [])))
      return json({ items: lists.flat().slice(0, 20) })
    },
  },
]

export const endpoints: Endpoint[] = routes.map((endpoint): Endpoint => endpoint.method !== 'post' ? endpoint : { ...endpoint, handler: async (req) => {
  try { sameOrigin(req.headers, req.url!); return await endpoint.handler(req) }
  catch (error) { req.payload.logger.error(error, '[affiliate] request failed'); return err(400, 'bad_request') }
} })
