import type { Endpoint } from 'payload'

import hosso from '@hosso-config'
import fs from 'fs'

import { canModerate, hasRole } from './access'
import { adminOrService } from './kiln'
import { backupPath, createBackup, listBackups, templatePath } from './backup'
import { adminLang } from './admin-i18n'
import { both, msg } from './lang'
import { notify } from './notify'
import { makeShareToken } from './share'
import { importSitePackage } from './site-import'
import { buildSitePackage } from './site-package'
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
    await notify(req.payload, 'form', both(`Biểu mẫu mới: ${form.title}`, `New form submission: ${form.title}`), [...Object.entries(data).map(([k, v]) => `${k}: ${v}`), '', both('Xem trong Admin → Biểu mẫu → Đã gửi.', 'See Admin → Forms → Submissions.')])
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
    const rows = [[msg(req, 'Thời gian', 'Time'), msg(req, 'Ngôn ngữ', 'Language'), ...keys], ...res.docs.map((d) => [d.createdAt, d.locale ?? '', ...keys.map((k) => String(((d.data ?? {}) as Record<string, unknown>)[k] ?? ''))])]
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
    if (status !== 'spam') await notify(req.payload, 'comment', both(`Bình luận mới (${status === 'approved' ? 'đã duyệt' : 'chờ duyệt'}) trên "${post.title}"`, `New comment (${status === 'approved' ? 'approved' : 'pending'}) on "${post.title}"`), [`${name}${email ? ` <${email}>` : ''}`, '', content, '', both('Duyệt trong Admin → Bình luận.', 'Moderate in Admin → Comments.')])
    return json({ ok: true, status: status === 'spam' ? 'pending' : status })
  },
}

/** GET /api/site/share-link?c=pages|posts&id=..&locale=..: tạo link xem trước bản nháp (7 ngày) cho biên tập viên trở lên. */
export const shareLink: Endpoint = {
  path: '/site/share-link',
  method: 'get',
  handler: async (req) => {
    if (!hasRole(req.user as { roles?: string[] }, 'admin', 'publisher', 'editor', 'author')) return json({ error: 'forbidden' }, 403)
    const c = String(req.query?.c ?? '')
    if (c !== 'pages' && c !== 'posts') return json({ error: 'bad_request' }, 400)
    const doc = await req.payload.findByID({ collection: c, id: String(req.query?.id ?? ''), depth: 0, locale: (String(req.query?.locale ?? '') || undefined) as any, draft: true, user: req.user, overrideAccess: false }).catch(() => null)
    if (!doc) return json({ error: 'not_found' }, 404)
    const base = (process.env.HOSSO_PUBLIC_URL || new URL(req.url ?? 'http://localhost').origin).replace(/\/$/, '')
    const locale = String(req.query?.locale ?? '')
    const prefix = locale && locale !== hosso.locales[0]?.code ? `/${locale}` : ''
    const path = c === 'posts' ? `/bai-viet/${doc.slug}` : doc.slug === 'home' ? '' : `/${doc.slug}`
    return json({ url: `${base}${prefix}${path || '/'}?share=${makeShareToken(c, doc.id)}` })
  },
}

// ---------- Công cụ quản trị: sao lưu, khôi phục, mẫu site (admin, hoặc Kiln với token dịch vụ) ----------
const adminOnly = adminOrService

/** GET /api/site/backup: tải gói site (zip) hiện tại. ?name=... tải một bản đã lưu. */
export const backupDownload: Endpoint = {
  path: '/site/backup',
  method: 'get',
  handler: async (req) => {
    if (!adminOnly(req)) return json({ error: 'forbidden' }, 403)
    const name = String(req.query?.name ?? '')
    if (name) {
      const p = backupPath(name)
      if (!p || !fs.existsSync(p)) return json({ error: 'not_found' }, 404)
      return new Response(new Uint8Array(fs.readFileSync(p)), { headers: { 'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename="${name}"` } })
    }
    const r = await buildSitePackage(req.payload)
    return new Response(new Uint8Array(r.data), { headers: { 'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename="hosso-site-${new Date().toISOString().slice(0, 10)}.zip"` } })
  },
}

/** POST /api/site/backups: sao lưu ngay vào thư mục sao lưu của máy chủ. */
export const backupCreate: Endpoint = {
  path: '/site/backups',
  method: 'post',
  handler: async (req) => {
    if (!adminOnly(req)) return json({ error: 'forbidden' }, 403)
    return json({ ok: true, ...(await createBackup(req.payload)), backups: listBackups() })
  },
}

const MAX_PACKAGE = 300 * 1024 * 1024

/** POST /api/site/package-import: khôi phục từ gói zip gửi lên (nội dung thô). Trùng slug thì cập nhật; không xóa dữ liệu khác. */
export const packageImport: Endpoint = {
  path: '/site/package-import',
  method: 'post',
  handler: async (req) => {
    if (!adminOnly(req)) return json({ error: 'forbidden' }, 403)
    const buf = new Uint8Array(await (req as unknown as Request).arrayBuffer())
    if (!buf.length || buf.length > MAX_PACKAGE) return json({ ok: false, error: 'bad_size' }, 400)
    const lines: string[] = []
    try {
      const r = await importSitePackage(req.payload, buf, (m) => lines.push(m), adminLang(req.i18n?.language))
      return json({ ok: true, log: lines, stats: r.stats })
    } catch (e) {
      return json({ ok: false, error: (e as Error).message, log: lines }, 400)
    }
  },
}

/** POST /api/site/template-install {id}: cài một mẫu site có sẵn. */
export const templateInstall: Endpoint = {
  path: '/site/template-install',
  method: 'post',
  handler: async (req) => {
    if (!adminOnly(req)) return json({ error: 'forbidden' }, 403)
    const body = (await req.json?.().catch(() => ({}))) as { id?: string }
    const p = templatePath(String(body?.id ?? ''))
    if (!p || !fs.existsSync(p)) return json({ ok: false, error: 'not_found' }, 404)
    const lines: string[] = []
    try {
      const r = await importSitePackage(req.payload, new Uint8Array(fs.readFileSync(p)), (m) => lines.push(m), adminLang(req.i18n?.language))
      return json({ ok: true, log: lines, stats: r.stats })
    } catch (e) {
      return json({ ok: false, error: (e as Error).message, log: lines }, 400)
    }
  },
}

// ---------- Khóa sửa trong trình dựng ----------
const LOCK_TTL = 60_000

/** POST /api/site/lock {key, takeover?, release?}: nhận/gia hạn/nhả khóa sửa. Người khác đang giữ (chưa hết hạn) thì trả holder, trừ khi takeover. */
export const editLock: Endpoint = {
  path: '/site/lock',
  method: 'post',
  handler: async (req) => {
    const user = req.user as { id: string | number; email?: string; roles?: string[] } | null
    if (!hasRole(user, 'admin', 'publisher', 'editor', 'author')) return json({ error: 'forbidden' }, 403)
    const body = (await req.json?.().catch(() => ({}))) as { key?: string; takeover?: boolean; release?: boolean }
    const key = str(body?.key, 120)
    if (!/^(pages|posts|reusable-blocks|area):[\w-]+:[\w-]+$/.test(key)) return json({ error: 'bad_request' }, 400)
    const me = String(user!.id)
    const found = await req.payload.find({ collection: 'edit-locks', where: { key: { equals: key } }, limit: 1, depth: 0, overrideAccess: true })
    const cur = found.docs[0]
    const held = cur && cur.userId !== me && new Date(cur.expiresAt).getTime() > Date.now()
    if (body.release) {
      if (cur && cur.userId === me) await req.payload.delete({ collection: 'edit-locks', id: cur.id, overrideAccess: true })
      return json({ ok: true })
    }
    if (held && !body.takeover) return json({ ok: false, holder: cur.email || 'người khác / someone else' })
    const data = { key, userId: me, email: user!.email ?? '', expiresAt: new Date(Date.now() + LOCK_TTL).toISOString() }
    if (cur) await req.payload.update({ collection: 'edit-locks', id: cur.id, data, overrideAccess: true })
    else await req.payload.create({ collection: 'edit-locks', data, overrideAccess: true })
    return json({ ok: true })
  },
}
