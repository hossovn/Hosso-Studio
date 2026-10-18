import type { Endpoint, Payload, PayloadRequest, Where } from 'payload'
import type { HossoPlugin } from '@hosso/studio-blocks'
import { hashPassword, makeSession, readSession, sessionCookie, verifyPassword } from './auth'

// Mọi thao tác của cộng tác viên đi qua các endpoint này (overrideAccess), collection thì chỉ admin đọc/ghi được.
// ponytail: chưa giới hạn tần suất đăng ký/đăng nhập; thêm khi site bị lạm dụng.

const json = (body: unknown, status = 200, cookie?: string) =>
  Response.json(body, { status, headers: cookie !== undefined ? { 'Set-Cookie': cookie } : undefined })
const err = (status: number, message: string) => json({ ok: false, message }, status)
const body = async (req: PayloadRequest) => ((await req.json?.().catch(() => null)) ?? {}) as Record<string, unknown>
const str = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max)

type Aff = { id: string | number; name: string; email: string; code: string; passwordHash: string; active?: boolean; commissionPct?: number; bankInfo?: string; picks?: { title: string; href: string }[] }

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

const publicProfile = (a: Aff) => ({ name: a.name, email: a.email, code: a.code, commissionPct: a.commissionPct ?? 0, bankInfo: a.bankInfo ?? '', picks: a.picks ?? [] })

async function startSession(req: PayloadRequest, a: Aff) {
  return json({ ok: true }, 200, sessionCookie(await makeSession(req.payload.secret, a.id)))
}

export const endpoints: Endpoint[] = [
  {
    path: '/plugins/affiliate/register',
    method: 'post',
    handler: async (req) => {
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
        data: { name, email, passwordHash: await hashPassword(password), code: newCode(), bankInfo: str(b.bankInfo, 500), active: true },
      })) as unknown as Aff
      return startSession(req, created)
    },
  },
  {
    path: '/plugins/affiliate/login',
    method: 'post',
    handler: async (req) => {
      const b = await body(req)
      const a = await find(req.payload, { email: { equals: str(b.email, 200).toLowerCase() } })
      // Cùng một thông báo cho sai email và sai mật khẩu.
      if (!a?.active || !(await verifyPassword(String(b.password ?? ''), a.passwordHash))) return err(401, 'credentials')
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
      const refs = (await req.payload.find({ collection: 'affiliate-referrals' as any, where: { affiliate: { equals: a.id } }, sort: '-createdAt', limit: 500, depth: 0, overrideAccess: true })).docs as unknown as {
        orderId: string
        orderTotal: number
        commission: number
        status: string
        createdAt: string
      }[]
      const totals: Record<string, number> = { pending: 0, approved: 0, paid: 0, cancelled: 0 }
      for (const r of refs) totals[r.status] = (totals[r.status] ?? 0) + (r.commission ?? 0)
      return json({ ok: true, profile: publicProfile(a), totals, referrals: refs.slice(0, 50) })
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
    // Tìm sản phẩm để chọn: gom kết quả `search` của mọi plugin bán hàng khác (WIM, ...), không phụ thuộc plugin cụ thể.
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
