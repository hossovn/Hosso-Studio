import config from '@payload-config'
import { getPayload } from 'payload'

import { allow, clientIp } from '@/lib/ratelimit'

const ok = (body: object, status = 200) => Response.json(body, { status })

// Block Đặt lịch gửi JSON tới đây; lưu vào collection bookings (trạng thái "new"). Tối đa 5 lịch mỗi giờ mỗi địa chỉ.
export async function POST(request: Request) {
  const b = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>
  const str = (k: string, max: number) => String(b[k] ?? '').trim().slice(0, max)
  if (str('website', 10)) return ok({ ok: true }) // ô bẫy bot: giả vờ thành công
  const data = { name: str('name', 120), phone: str('phone', 20), email: str('email', 120), service: str('service', 120), date: str('date', 10), time: str('time', 5), note: str('note', 1000), guests: Math.floor(Number(b.guests)) || undefined }
  if (!data.name || !/^(\+?84|0)\d{8,10}$/.test(data.phone) || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) return ok({ ok: false }, 400)
  if (!allow(`booking:${clientIp(request.headers)}`, 5, 3600_000)) return ok({ ok: false }, 429)
  const payload = await getPayload({ config })
  await payload.create({ collection: 'bookings', data: { ...data, email: data.email || undefined, status: 'new' } })
  return ok({ ok: true })
}
