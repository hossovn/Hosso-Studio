import config from '@payload-config'
import { getPayload } from 'payload'

// Form liên hệ không cần JS: nhận form, lưu tin nhắn, quay lại trang trước kèm neo hiển thị lời cảm ơn.
export async function POST(request: Request) {
  const form = await request.formData()
  const back = new URL(request.headers.get('referer') || '/', request.url)
  back.hash = ''

  const str = (k: string, max: number) => String(form.get(k) ?? '').trim().slice(0, max)
  const data = { name: str('name', 120), phone: str('phone', 20), message: str('message', 2000) }

  // Ô "website" là bẫy bot: người thật không thấy nên không điền.
  if (!str('website', 10) && data.name && data.phone && data.message) {
    const payload = await getPayload({ config })
    await payload.create({ collection: 'contact-messages', data })
  }
  back.hash = 'da-gui'
  return Response.redirect(back, 303)
}
