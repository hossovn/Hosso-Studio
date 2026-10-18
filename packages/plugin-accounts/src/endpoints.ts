import { hashPassword, sessionOf, verifyPassword } from '@hosso/studio-blocks'
import type { Endpoint, Payload, PayloadRequest } from 'payload'

export const COOKIE = 'hs_cust'
export const session = sessionOf(COOKIE)

const json = (body: unknown, status = 200, cookie?: string) => Response.json(body, { status, headers: cookie !== undefined ? { 'Set-Cookie': cookie } : undefined })
const err = (status: number, message: string) => json({ ok: false, message }, status)
const body = async (req: PayloadRequest) => ((await req.json?.().catch(() => null)) ?? {}) as Record<string, unknown>
const str = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max)

export type Customer = { id: number | string; name: string; email: string; phone?: string; passwordHash: string; addresses?: { label?: string; address: string }[] }

const find = async (payload: Payload, where: object) =>
  (await payload.find({ collection: 'customers' as any, where: where as any, limit: 1, depth: 0, overrideAccess: true })).docs[0] as unknown as Customer | undefined

export async function current(req: PayloadRequest) {
  const id = await session.read(req.payload.secret, req.headers)
  return id ? find(req.payload, { id: { equals: id } }) : undefined
}

const profileOf = (c: Customer) => ({ name: c.name, email: c.email, phone: c.phone ?? '', addresses: (c.addresses ?? []).map(({ label, address }) => ({ label: label ?? '', address })) })

const startSession = async (req: PayloadRequest, c: Customer) => json({ ok: true }, 200, session.cookie(await session.make(req.payload.secret, c.id)))

// ponytail: chưa giới hạn tần suất đăng ký/đăng nhập; thêm khi site bị lạm dụng.
export const endpoints: Endpoint[] = [
  {
    path: '/plugins/accounts/register',
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
      const c = (await req.payload.create({ collection: 'customers' as any, overrideAccess: true, data: { name, email, phone: str(b.phone, 20), passwordHash: await hashPassword(password) } })) as unknown as Customer
      return startSession(req, c)
    },
  },
  {
    path: '/plugins/accounts/login',
    method: 'post',
    handler: async (req) => {
      const b = await body(req)
      const c = await find(req.payload, { email: { equals: str(b.email, 200).toLowerCase() } })
      // Cùng một thông báo cho sai email và sai mật khẩu.
      if (!c || !(await verifyPassword(String(b.password ?? ''), c.passwordHash))) return err(401, 'credentials')
      return startSession(req, c)
    },
  },
  { path: '/plugins/accounts/logout', method: 'post', handler: async () => json({ ok: true }, 200, session.cookie('')) },
  {
    // Hồ sơ + lịch sử đơn (nối với đơn của plugin Cửa hàng nếu có).
    path: '/plugins/accounts/me',
    method: 'get',
    handler: async (req) => {
      const c = await current(req)
      if (!c) return err(401, 'unauthorized')
      const links = (await req.payload.find({ collection: 'customer-orders' as any, where: { customer: { equals: c.id } }, sort: '-createdAt', limit: 100, depth: 0, pagination: false, overrideAccess: true })).docs as unknown as { orderNo: string }[]
      let orders: { orderNo: string; status: string; total: number; paymentStatus: string; createdAt: string }[] = []
      if (links.length && req.payload.collections['shop-orders' as never]) {
        orders = (await req.payload.find({ collection: 'shop-orders' as any, where: { orderNo: { in: links.map((l) => l.orderNo) } }, sort: '-createdAt', limit: 100, depth: 0, pagination: false, overrideAccess: true })).docs.map((o: any) => ({ orderNo: o.orderNo, status: o.status, total: o.total, paymentStatus: o.paymentStatus, createdAt: o.createdAt }))
      }
      return json({ ok: true, profile: profileOf(c), orders })
    },
  },
  {
    path: '/plugins/accounts/profile',
    method: 'post',
    handler: async (req) => {
      const c = await current(req)
      if (!c) return err(401, 'unauthorized')
      const b = await body(req)
      const data: Record<string, unknown> = {}
      if ('name' in b && str(b.name, 120).length >= 2) data.name = str(b.name, 120)
      if ('phone' in b) data.phone = str(b.phone, 20)
      if (Array.isArray(b.addresses)) data.addresses = b.addresses.slice(0, 10).map((a: any) => ({ label: str(a?.label, 60), address: str(a?.address, 300) })).filter((a) => a.address)
      await req.payload.update({ collection: 'customers' as any, id: c.id, data, overrideAccess: true })
      return json({ ok: true })
    },
  },
]
