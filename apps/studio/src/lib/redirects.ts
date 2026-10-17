import config from '@payload-config'
import { permanentRedirect, redirect } from 'next/navigation'
import { getPayload } from 'payload'

/** Gọi khi không tìm thấy nội dung: nếu có luật chuyển hướng cho đường dẫn này thì chuyển (308/307), không thì trả về. */
export async function followRedirect(path: string) {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({ collection: 'redirects', where: { from: { equals: path } }, limit: 1, depth: 0, overrideAccess: true })
  const r = docs[0]
  if (!r) return
  const to = /^(https?:)?\/\//.test(r.to) || r.to.startsWith('/') ? r.to : `/${r.to}`
  if (to === path) return
  r.permanent === false ? redirect(to) : permanentRedirect(to)
}
