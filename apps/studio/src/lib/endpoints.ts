import type { Endpoint } from 'payload'

import { canModerate } from './access'
import { allow, clientIp } from './ratelimit'

const json = (body: unknown, status = 200) => Response.json(body, { status })
const str = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max)
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type FormField = { label: string; name: string; type: string; options?: string | null; required?: boolean | null }

/** POST /api/site/forms/:slug: kiểm tra theo định nghĩa biểu mẫu rồi lưu vào "Biểu mẫu đã gửi". */
export const formSubmit: Endpoint = {
  path: '/site/forms/:slug',
  method: 'post',
  handler: async (req) => {
    const slug = String(req.routeParams?.slug ?? '')
    if (!allow(`form:${clientIp(req.headers)}:${slug}`, 8, 10 * 60_000)) return json({ ok: false, code: 'rate_limited' }, 429)
    let body: any
    try {
      body = await req.json?.()
    } catch {
      return json({ ok: false, code: 'bad_request' }, 400)
    }
    if (body?.website) return json({ ok: false, code: 'bad_request' }, 400) // ô bẫy bot

    const locale = str(body?.locale, 8) || undefined
    const found = await req.payload.find({ collection: 'forms', where: { slug: { equals: slug } }, limit: 1, depth: 0, locale: locale as any, overrideAccess: true })
    const form = found.docs[0]
    if (!form) return json({ ok: false, code: 'not_found' }, 404)

    const input = (body?.values ?? {}) as Record<string, unknown>
    const data: Record<string, string | number | boolean> = {}
    const errors: Record<string, string> = {}
    for (const f of (form.fields ?? []) as FormField[]) {
      const raw = input[f.name]
      if (f.type === 'checkbox') {
        data[f.name] = raw === true || raw === 'true' || raw === 'on'
        if (f.required && !data[f.name]) errors[f.name] = 'required'
        continue
      }
      const v = str(raw, f.type === 'textarea' ? 5000 : 500)
      if (!v) {
        if (f.required) errors[f.name] = 'required'
        continue
      }
      if (f.type === 'email' && !EMAIL.test(v)) errors[f.name] = 'invalid'
      else if (f.type === 'tel' && !/^[+\d][\d\s.\-()]{5,20}$/.test(v)) errors[f.name] = 'invalid'
      else if (f.type === 'number' && !Number.isFinite(Number(v))) errors[f.name] = 'invalid'
      else if (f.type === 'select' && !(f.options ?? '').split(',').map((o) => o.trim()).includes(v)) errors[f.name] = 'invalid'
      else data[f.name] = f.type === 'number' ? Number(v) : v
    }
    if (Object.keys(errors).length) return json({ ok: false, code: 'invalid', errors }, 400)

    await req.payload.create({
      collection: 'form-submissions',
      data: { form: form.id, formTitle: form.title, data, locale },
      overrideAccess: true,
    })
    return json({ ok: true })
  },
}

const csv = (rows: string[][]) =>
  '﻿' + rows.map((r) => r.map((c) => (/[",\n\r]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(',')).join('\r\n')

/** GET /api/site/forms-export/:id: tải CSV các lần gửi của một biểu mẫu (kiểm duyệt trở lên). */
export const formExport: Endpoint = {
  path: '/site/forms-export/:id',
  method: 'get',
  handler: async (req) => {
    if (!canModerate(req.user as { roles?: string[] })) return json({ error: 'forbidden' }, 403)
    const id = String(req.routeParams?.id ?? '')
    const res = await req.payload.find({ collection: 'form-submissions', where: { form: { equals: id } }, sort: 'createdAt', limit: 10000, depth: 0, overrideAccess: true })
    const keys = [...new Set(res.docs.flatMap((d) => Object.keys((d.data ?? {}) as object)))]
    const rows = [['Thời gian', 'Ngôn ngữ', ...keys], ...res.docs.map((d) => [d.createdAt, d.locale ?? '', ...keys.map((k) => String(((d.data ?? {}) as Record<string, unknown>)[k] ?? ''))])]
    return new Response(csv(rows), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="form-${id}.csv"` } })
  },
}

/** POST /api/site/comments: bình luận của khách (chống spam: ô bẫy, giới hạn tần suất, quá nhiều liên kết). */
export const commentSubmit: Endpoint = {
  path: '/site/comments',
  method: 'post',
  handler: async (req) => {
    if (!allow(`comment:${clientIp(req.headers)}`, 5, 10 * 60_000)) return json({ ok: false, code: 'rate_limited' }, 429)
    let body: any
    try {
      body = await req.json?.()
    } catch {
      return json({ ok: false, code: 'bad_request' }, 400)
    }
    if (body?.website) return json({ ok: false, code: 'bad_request' }, 400)

    const name = str(body?.name, 80)
    const email = str(body?.email, 200)
    const content = str(body?.content, 2000)
    if (!name || content.length < 3 || (email && !EMAIL.test(email))) return json({ ok: false, code: 'invalid' }, 400)

    const settings = (await req.payload.findGlobal({ slug: 'site-settings', depth: 0 })) as Record<string, any>
    if (settings.commentsEnabled === false) return json({ ok: false, code: 'disabled' }, 403)

    const post = await req.payload
      .findByID({ collection: 'posts', id: String(body?.postId ?? ''), depth: 0, overrideAccess: false })
      .catch(() => null)
    if (!post || post._status !== 'published' || post.commentsEnabled === false) return json({ ok: false, code: 'not_found' }, 404)

    const links = (content.match(/https?:\/\//gi) ?? []).length
    const status = links > 2 ? 'spam' : settings.commentsAutoApprove ? 'approved' : 'pending'
    await req.payload.create({
      collection: 'comments',
      data: { post: post.id, authorName: name, authorEmail: email || undefined, content, status, locale: str(body?.locale, 8) },
      overrideAccess: true,
    })
    return json({ ok: true, status: status === 'spam' ? 'pending' : status })
  },
}
