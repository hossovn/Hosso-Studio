import type { Endpoint } from 'payload'
import { getFieldsToSign, jwtSign } from 'payload'

import hosso from '@hosso-config'
import { randomUUID } from 'node:crypto'
import fs from 'fs'

import pkg from '../../package.json'
import { hasRole } from './access'
import { serviceTokenOk, verifySsoToken } from './kiln-auth'

const json = (body: unknown, status = 200) => Response.json(body, { status })

/** Người gọi là quản trị viên đã đăng nhập, hoặc Kiln với token dịch vụ. */
export const adminOrService = (req: { user?: unknown; headers: Headers }) => hasRole(req.user as { roles?: string[] }, 'admin') || serviceTokenOk(req.headers.get('authorization'))

/** GET /api/site/status: phiên bản, DB, đĩa, trạng thái từng plugin. Kiln gọi định kỳ để giám sát. */
export const siteStatus: Endpoint = {
  path: '/site/status',
  method: 'get',
  handler: async (req) => {
    if (!adminOrService(req)) return json({ error: 'forbidden' }, 403)
    const db = await req.payload.count({ collection: 'users' }).then(() => true, () => false)
    let disk: { freeBytes: number; totalBytes: number } | null = null
    try {
      const s = fs.statfsSync(process.env.HOSSO_MEDIA_DIR && fs.existsSync(process.env.HOSSO_MEDIA_DIR) ? process.env.HOSSO_MEDIA_DIR : process.cwd())
      disk = { freeBytes: s.bavail * s.bsize, totalBytes: s.blocks * s.bsize }
    } catch {
      /* hệ tệp không hỗ trợ statfs: bỏ qua */
    }
    const plugins = await Promise.all(
      hosso.plugins.map(async (p) => {
        const st = await p.status?.().catch((e: Error) => ({ ok: false, detail: e.message }))
        return { id: p.id, version: p.manifest?.version, ok: st?.ok ?? true, ...(st?.detail ? { detail: st.detail } : {}) }
      }),
    )
    return json({ ok: db && plugins.every((p) => p.ok), version: pkg.version, uptimeSec: Math.round(process.uptime()), db, disk, plugins, locales: hosso.locales.map((l) => l.code) })
  },
}

/** GET /api/site/sso?token=...: Kiln/WIM chuyển khách vào admin bằng token ngắn hạn, dùng một lần. Chỉ đăng nhập người dùng đã có sẵn. */
export const ssoLogin: Endpoint = {
  path: '/site/sso',
  method: 'get',
  handler: async (req) => {
    const publicUrl = process.env.HOSSO_PUBLIC_URL
    const r = verifySsoToken(String(req.query?.token ?? ''), { publicKey: process.env.HOSSO_SSO_PUBLIC_KEY, audience: publicUrl ? new URL(publicUrl).host : '' })
    const tenant = process.env.HOSSO_TENANT
    if (!r.ok || (tenant && r.claims.tenant !== tenant)) {
      req.payload.logger.warn(`[sso] từ chối: ${r.ok ? 'tenant' : r.reason}`)
      return json({ error: 'unauthorized' }, 401)
    }
    const found = await req.payload.find({ collection: 'users', where: { email: { equals: r.claims.sub } }, limit: 1, depth: 0, overrideAccess: true })
    const user = found.docs[0]
    if (!user) return json({ error: 'unauthorized' }, 401)

    // Tạo phiên giống lệnh đăng nhập của Payload: thêm session vào user rồi ký JWT mang sid.
    const config = req.payload.collections.users.config
    const tokenExpiration = (config.auth as { tokenExpiration: number }).tokenExpiration
    const now = new Date()
    const sid = randomUUID()
    const sessions = (user.sessions ?? []).filter((s) => new Date(s.expiresAt) > now)
    sessions.push({ id: sid, createdAt: now.toISOString(), expiresAt: new Date(now.getTime() + tokenExpiration * 1000).toISOString() })
    await req.payload.db.updateOne({ collection: 'users', id: user.id, data: { sessions, updatedAt: null }, req, returning: false })
    const fieldsToSign = getFieldsToSign({ collectionConfig: config, email: user.email, sid, user: { ...user, collection: 'users' } as never })
    const { token, exp } = await jwtSign({ fieldsToSign, secret: req.payload.secret, tokenExpiration })
    const secure = publicUrl?.startsWith('https:') ? '; Secure' : ''
    // Không dùng 302: chuỗi chuyển hướng bắt đầu từ Kiln (khác site) nên /admin nhận Sec-Fetch-Site: cross-site và Payload bỏ cookie (chống CSRF).
    // Trang HTML tự chuyển hướng thì /admin được mở từ chính site, là same-origin.
    return new Response('<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=/admin"><a href="/admin">/admin</a>', {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'Referrer-Policy': 'no-referrer',
        'Set-Cookie': `${req.payload.config.cookiePrefix}-token=${token}; Path=/; HttpOnly; SameSite=Lax; Expires=${new Date(exp * 1000).toUTCString()}${secure}`,
      },
    })
  },
}
