import crypto from 'node:crypto'
import type { Endpoint, PayloadRequest } from 'payload'

import { canModerate } from './access'
import { allow, clientIp } from './ratelimit'

export type ChatMessage = {
  id: string
  sender: 'visitor' | 'staff' | 'system'
  author?: string
  text: string
  createdAt: string
}

export type ChatSessionStatus = 'open' | 'replied' | 'closed'

const MAX_MESSAGES_PER_SESSION = 200
const HEX_64 = /^[0-9a-f]{64}$/
const NO_STORE = { 'Cache-Control': 'no-store' }

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: NO_STORE })

export function mintChatToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export function hashChatToken(token: string): string {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex')
}

export function verifyChatTokenHash(rawToken: unknown, expectedHash: unknown): boolean {
  if (typeof rawToken !== 'string' || typeof expectedHash !== 'string') return false
  const token = rawToken.trim().toLowerCase()
  const expected = expectedHash.trim().toLowerCase()
  if (!HEX_64.test(token) || !HEX_64.test(expected)) return false
  const actualBuf = Buffer.from(hashChatToken(token), 'hex')
  const expectedBuf = Buffer.from(expected, 'hex')
  if (actualBuf.length !== expectedBuf.length) return false
  return crypto.timingSafeEqual(actualBuf, expectedBuf)
}

/** Loại bỏ ký tự điều khiển (trừ xuống dòng), chuẩn hóa CRLF và giới hạn độ dài để chống tràn/XSS. */
export function sanitizeChatText(raw: unknown, maxLen = 1000): string {
  if (typeof raw !== 'string') return ''
  return raw
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '')
    .trim()
    .slice(0, maxLen)
}

const sanitizeInline = (raw: unknown, maxLen: number): string =>
  sanitizeChatText(raw, maxLen).replace(/\s+/g, ' ')

const defaultVisitorName = (locale: string): string => {
  if (locale === 'ko') return '방문자'
  if (locale === 'en') return 'Visitor'
  return 'Khách truy cập'
}

const normalizeMessages = (raw: unknown): ChatMessage[] => {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((m): m is ChatMessage => Boolean(m && typeof m === 'object' && typeof (m as ChatMessage).text === 'string'))
    .slice(-MAX_MESSAGES_PER_SESSION)
}

const appendMessage = (existing: unknown, msg: ChatMessage): ChatMessage[] => {
  const list = normalizeMessages(existing)
  list.push(msg)
  return list.length > MAX_MESSAGES_PER_SESSION ? list.slice(list.length - MAX_MESSAGES_PER_SESSION) : list
}

const extractVisitorToken = (req: PayloadRequest, bodyToken?: unknown): string => {
  const fromHeader = req.headers.get('x-hosso-chat-token')
  if (fromHeader) return fromHeader.trim()
  if (typeof bodyToken === 'string') return bodyToken.trim()
  return ''
}

const publicSessionShape = (doc: Record<string, any>) => ({
  id: String(doc.id),
  visitorName: String(doc.visitorName ?? ''),
  visitorPhone: doc.visitorPhone ? String(doc.visitorPhone) : undefined,
  visitorEmail: doc.visitorEmail ? String(doc.visitorEmail) : undefined,
  locale: String(doc.locale ?? 'vi'),
  pagePath: doc.pagePath ? String(doc.pagePath) : undefined,
  status: (['open', 'replied', 'closed'].includes(doc.status) ? doc.status : 'open') as ChatSessionStatus,
  unreadByStaff: Number(doc.unreadByStaff ?? 0),
  unreadByVisitor: Number(doc.unreadByVisitor ?? 0),
  lastMessageAt: String(doc.lastMessageAt ?? doc.updatedAt ?? doc.createdAt ?? new Date().toISOString()),
  lastMessagePreview: String(doc.lastMessagePreview ?? ''),
  messages: normalizeMessages(doc.messages),
})

/** POST /api/site/chat/start: khách mở phiên trò chuyện mới kèm tin nhắn đầu tiên. */
export const chatStart: Endpoint = {
  path: '/site/chat/start',
  method: 'post',
  handler: async (req) => {
    const ip = clientIp(req.headers)
    if (!allow(`chat-start:${ip}`, 8, 10 * 60_000)) return json({ error: 'rate_limited' }, 429)

    const body = (await req.json?.().catch(() => null)) as Record<string, unknown> | null
    if (!body || typeof body !== 'object') return json({ error: 'bad_request' }, 400)
    if (body.website) return json({ ok: true, sessionId: '0', token: '0'.repeat(64), status: 'open', messages: [] })

    const locale = sanitizeInline(body.locale, 12).toLowerCase() || 'vi'
    const settings = (await req.payload.findGlobal({ slug: 'site-settings', locale: locale as any, depth: 0 }).catch(() => ({}))) as Record<string, any>
    if (!settings.liveChatEnabled) return json({ error: 'chat_disabled' }, 403)

    const text = sanitizeChatText(body.text, 1000)
    if (!text) return json({ error: 'empty_message' }, 400)

    const visitorName = sanitizeInline(body.name, 80) || defaultVisitorName(locale)
    const visitorPhone = sanitizeInline(body.phone, 30) || undefined
    const rawEmail = sanitizeInline(body.email, 120)
    const visitorEmail = rawEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail) ? rawEmail : undefined
    const pagePath = sanitizeInline(body.pagePath, 240) || undefined

    const now = new Date().toISOString()
    const greeting = sanitizeChatText(settings.liveChatGreeting, 500)
    const messages: ChatMessage[] = []
    if (greeting) {
      messages.push({
        id: crypto.randomUUID(),
        sender: 'system',
        text: greeting,
        createdAt: now,
      })
    }
    messages.push({
      id: crypto.randomUUID(),
      sender: 'visitor',
      author: visitorName,
      text,
      createdAt: now,
    })

    const token = mintChatToken()
    const tokenHash = hashChatToken(token)
    const doc = await req.payload.create({
      collection: 'chat-sessions' as any,
      data: {
        visitorName,
        visitorPhone,
        visitorEmail,
        locale,
        pagePath,
        status: 'open',
        unreadByStaff: 1,
        unreadByVisitor: 0,
        lastMessageAt: now,
        lastMessagePreview: text.slice(0, 140),
        tokenHash,
        messages,
      } as any,
      overrideAccess: true,
    })

    return json({
      ok: true,
      sessionId: String(doc.id),
      token,
      status: 'open',
      messages,
    })
  },
}

/** POST /api/site/chat/send: khách gửi thêm tin nhắn vào phiên đang có (yêu cầu x-hosso-chat-token hợp lệ). */
export const chatSend: Endpoint = {
  path: '/site/chat/send',
  method: 'post',
  handler: async (req) => {
    const ip = clientIp(req.headers)
    if (!allow(`chat-send:${ip}`, 30, 60_000)) return json({ error: 'rate_limited' }, 429)

    const body = (await req.json?.().catch(() => null)) as Record<string, unknown> | null
    if (!body || typeof body !== 'object') return json({ error: 'bad_request' }, 400)
    if (body.website) return json({ ok: true })

    const sessionId = sanitizeInline(body.sessionId, 64)
    const token = extractVisitorToken(req, body.token)
    const text = sanitizeChatText(body.text, 1000)
    if (!sessionId || !text) return json({ error: 'bad_request' }, 400)

    const doc = (await req.payload.findByID({ collection: 'chat-sessions' as any, id: sessionId, depth: 0, overrideAccess: true }).catch(() => null)) as Record<string, any> | null
    if (!doc || !verifyChatTokenHash(token, doc.tokenHash)) return json({ error: 'forbidden' }, 403)

    const now = new Date().toISOString()
    const messages = appendMessage(doc.messages, {
      id: crypto.randomUUID(),
      sender: 'visitor',
      author: String(doc.visitorName || ''),
      text,
      createdAt: now,
    })

    await req.payload.update({
      collection: 'chat-sessions' as any,
      id: doc.id,
      data: {
        status: 'open',
        unreadByStaff: Number(doc.unreadByStaff ?? 0) + 1,
        unreadByVisitor: 0,
        lastMessageAt: now,
        lastMessagePreview: text.slice(0, 140),
        messages,
      } as any,
      overrideAccess: true,
    })

    return json({ ok: true, status: 'open', messages })
  },
}

/** GET /api/site/chat/poll?sessionId=..&ack=1: khách lấy danh sách tin nhắn mới (token truyền qua header x-hosso-chat-token). */
export const chatPoll: Endpoint = {
  path: '/site/chat/poll',
  method: 'get',
  handler: async (req) => {
    const ip = clientIp(req.headers)
    if (!allow(`chat-poll:${ip}`, 90, 60_000)) return json({ error: 'rate_limited' }, 429)

    const sp = new URL(req.url || 'http://localhost', 'http://localhost').searchParams
    const sessionId = sanitizeInline(req.query?.sessionId ?? sp.get('sessionId'), 64)
    const ack = String(req.query?.ack ?? sp.get('ack') ?? '') === '1'
    const token = extractVisitorToken(req)
    if (!sessionId) return json({ error: 'bad_request' }, 400)

    const doc = (await req.payload.findByID({ collection: 'chat-sessions' as any, id: sessionId, depth: 0, overrideAccess: true }).catch(() => null)) as Record<string, any> | null
    if (!doc || !verifyChatTokenHash(token, doc.tokenHash)) return json({ error: 'forbidden' }, 403)

    let unreadByVisitor = Number(doc.unreadByVisitor ?? 0)
    if (ack && unreadByVisitor > 0) {
      unreadByVisitor = 0
      await req.payload.update({
        collection: 'chat-sessions' as any,
        id: doc.id,
        data: { unreadByVisitor: 0 } as any,
        overrideAccess: true,
      })
    }

    return json({
      ok: true,
      status: (['open', 'replied', 'closed'].includes(doc.status) ? doc.status : 'open') as ChatSessionStatus,
      unreadByVisitor,
      messages: normalizeMessages(doc.messages),
    })
  },
}

/** GET /api/site/chat/inbox: danh sách phiên chat cho quản trị viên/kiểm duyệt viên. */
export const chatInbox: Endpoint = {
  path: '/site/chat/inbox',
  method: 'get',
  handler: async (req) => {
    if (!canModerate(req.user as { roles?: string[] } | null)) return json({ error: 'forbidden' }, 403)

    const sp = new URL(req.url || 'http://localhost', 'http://localhost').searchParams
    const statusFilter = sanitizeInline(req.query?.status ?? sp.get('status'), 16)
    const q = sanitizeInline(req.query?.q ?? sp.get('q'), 100)

    const clauses: Record<string, unknown>[] = []
    if (statusFilter && ['open', 'replied', 'closed'].includes(statusFilter)) {
      clauses.push({ status: { equals: statusFilter } })
    }
    if (q) {
      clauses.push({
        or: [
          { visitorName: { contains: q } },
          { visitorPhone: { contains: q } },
          { lastMessagePreview: { contains: q } },
        ],
      })
    }

    const [found, unread] = await Promise.all([
      req.payload.find({
        collection: 'chat-sessions' as any,
        where: clauses.length ? ({ and: clauses } as any) : undefined,
        sort: '-lastMessageAt',
        limit: 50,
        depth: 0,
        overrideAccess: true,
      }),
      req.payload.count({
        collection: 'chat-sessions' as any,
        where: { unreadByStaff: { greater_than: 0 } } as any,
        overrideAccess: true,
      }),
    ])

    return json({
      sessions: (found.docs as Record<string, any>[]).map(publicSessionShape),
      unreadCount: unread.totalDocs,
    })
  },
}

/** POST /api/site/chat/reply: nhân viên phản hồi phiên chat. */
export const chatReply: Endpoint = {
  path: '/site/chat/reply',
  method: 'post',
  handler: async (req) => {
    const user = req.user as { id?: string | number; email?: string; roles?: string[] } | null
    if (!canModerate(user)) return json({ error: 'forbidden' }, 403)

    const body = (await req.json?.().catch(() => null)) as Record<string, unknown> | null
    const sessionId = sanitizeInline(body?.sessionId, 64)
    const text = sanitizeChatText(body?.text, 1000)
    if (!sessionId || !text) return json({ error: 'bad_request' }, 400)

    const doc = (await req.payload.findByID({ collection: 'chat-sessions' as any, id: sessionId, depth: 0, overrideAccess: true }).catch(() => null)) as Record<string, any> | null
    if (!doc) return json({ error: 'not_found' }, 404)

    const now = new Date().toISOString()
    const staffAuthor = sanitizeInline(body?.authorName, 60) || (user?.email ? user.email.split('@')[0] : 'Hỗ trợ')
    const messages = appendMessage(doc.messages, {
      id: crypto.randomUUID(),
      sender: 'staff',
      author: staffAuthor,
      text,
      createdAt: now,
    })

    const updated = (await req.payload.update({
      collection: 'chat-sessions' as any,
      id: doc.id,
      data: {
        status: 'replied',
        unreadByStaff: 0,
        unreadByVisitor: Number(doc.unreadByVisitor ?? 0) + 1,
        lastMessageAt: now,
        lastMessagePreview: text.slice(0, 140),
        messages,
      } as any,
      overrideAccess: true,
    })) as Record<string, any>

    return json({ ok: true, session: publicSessionShape(updated) })
  },
}

/** POST /api/site/chat/status: nhân viên đổi trạng thái phiên chat (mở lại / đóng) hoặc đánh dấu đã đọc. */
export const chatStatus: Endpoint = {
  path: '/site/chat/status',
  method: 'post',
  handler: async (req) => {
    if (!canModerate(req.user as { roles?: string[] } | null)) return json({ error: 'forbidden' }, 403)

    const body = (await req.json?.().catch(() => null)) as Record<string, unknown> | null
    const sessionId = sanitizeInline(body?.sessionId, 64)
    if (!sessionId) return json({ error: 'bad_request' }, 400)

    const doc = (await req.payload.findByID({ collection: 'chat-sessions' as any, id: sessionId, depth: 0, overrideAccess: true }).catch(() => null)) as Record<string, any> | null
    if (!doc) return json({ error: 'not_found' }, 404)

    const nextStatus = body?.status
    const patch: Record<string, unknown> = { unreadByStaff: 0 }
    if (typeof nextStatus === 'string' && ['open', 'replied', 'closed'].includes(nextStatus)) {
      patch.status = nextStatus
    }

    const updated = (await req.payload.update({
      collection: 'chat-sessions' as any,
      id: doc.id,
      data: patch as any,
      overrideAccess: true,
    })) as Record<string, any>

    return json({ ok: true, session: publicSessionShape(updated) })
  },
}
