import assert from 'node:assert/strict'

import { localizeHref, setLocale, t, translate } from '../packages/blocks/src/i18n.ts'
import { strings as enStrings } from '../packages/blocks/src/strings.en.ts'
import { strings as koStrings } from '../packages/blocks/src/strings.ko.ts'
import { strings as viStrings } from '../packages/blocks/src/strings.vi.ts'
import {
  SUPPORTED_CONTENT_LOCALES,
  SUPPORTED_LOCALE_CODES,
  getPayloadLocalizationLocales,
  resolveSiteLocales,
  resolveSwitcherStyle,
} from '../apps/studio/src/lib/locales-catalog.ts'
import { ChatSessions } from '../apps/studio/src/collections/ChatSessions.ts'
import {
  chatInbox,
  chatPoll,
  chatReply,
  chatSend,
  chatStart,
  chatStatus,
  hashChatToken,
  mintChatToken,
  sanitizeChatText,
  verifyChatTokenHash,
} from '../apps/studio/src/lib/live-chat.ts'

// --- 1. Korean & Multi-Locale Storefront Dictionary Parity ---
const viKeys = Object.keys(viStrings).sort()
const enKeys = Object.keys(enStrings).sort()
const koKeys = Object.keys(koStrings).sort()

assert.deepEqual(enKeys, viKeys, 'English storefront strings must match Vietnamese keys')
assert.deepEqual(koKeys, viKeys, 'Korean storefront strings must match Vietnamese keys')

for (const key of ['chat.open', 'chat.close', 'chat.title', 'chat.subtitle', 'chat.greeting', 'chat.namePlaceholder', 'chat.phonePlaceholder', 'chat.inputPlaceholder', 'chat.send', 'chat.sending', 'chat.closedNote', 'chat.startNew', 'chat.zaloScan', 'chat.error']) {
  assert.ok(viKeys.includes(key), `Missing storefront key: ${key}`)
  assert.ok(viStrings[key]?.trim(), `Empty vi string for ${key}`)
  assert.ok(enStrings[key]?.trim(), `Empty en string for ${key}`)
  assert.ok(koStrings[key]?.trim(), `Empty ko string for ${key}`)
}

assert.equal(translate('contact.name', 'ko'), '성함')
assert.equal(translate('search.title', 'ko'), '검색')
assert.equal(translate('chat.send', 'ko'), '보내기')

setLocale('ko', 'vi')
assert.equal(t('notfound.home'), '홈으로 돌아가기')
assert.equal(localizeHref('/bang-gia', 'ko', 'vi'), '/ko/bang-gia')
assert.equal(localizeHref('/', 'ko', 'vi'), '/ko')
assert.equal(localizeHref('/bang-gia', 'vi', 'vi'), '/bang-gia')
assert.equal(localizeHref('/bang-gia', 'ko', 'ko'), '/bang-gia')
assert.equal(localizeHref('/bang-gia', 'vi', 'ko'), '/vi/bang-gia')
setLocale('vi', 'vi')

// --- 2. Dynamic Locale Catalog & Pure Resolvers ---
for (const code of ['vi', 'en', 'ko', 'ja', 'zh', 'fr', 'de', 'th']) {
  assert.ok(SUPPORTED_LOCALE_CODES.has(code), `Catalog must include ${code}`)
  assert.ok(SUPPORTED_CONTENT_LOCALES.some((l) => l.code === code), `Catalog list must include ${code}`)
}

const fallback = [
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'en', label: 'English' },
]

const payloadLocales = getPayloadLocalizationLocales([
  ...fallback,
  { code: 'es', label: 'Español' },
])
assert.ok(payloadLocales.some((l) => l.code === 'ko' && l.label === '한국어'))
assert.ok(payloadLocales.some((l) => l.code === 'es' && l.label === 'Español'))
assert.equal(new Set(payloadLocales.map((l) => l.code)).size, payloadLocales.length, 'No duplicate locale codes')

assert.deepEqual(resolveSiteLocales(undefined, fallback), [
  { code: 'vi', label: 'Tiếng Việt', shortLabel: 'VN' },
  { code: 'en', label: 'English', shortLabel: 'EN' },
])
assert.deepEqual(resolveSiteLocales([], fallback), [
  { code: 'vi', label: 'Tiếng Việt', shortLabel: 'VN' },
  { code: 'en', label: 'English', shortLabel: 'EN' },
])

const configured = resolveSiteLocales(
  [
    { code: 'vi', label: '', shortLabel: '' },
    { code: 'ko', label: '한국어', shortLabel: 'kr' },
    { code: 'vi', label: 'Bản trùng' },
    { code: 'invalid-xx', label: 'Unknown' },
  ],
  fallback,
)
assert.deepEqual(configured, [
  { code: 'vi', label: 'Tiếng Việt', shortLabel: 'VN' },
  { code: 'ko', label: '한국어', shortLabel: 'KR' },
])

assert.equal(resolveSwitcherStyle('dropdown-flag'), 'dropdown-flag')
assert.equal(resolveSwitcherStyle('pill-flag'), 'pill-flag')
assert.equal(resolveSwitcherStyle('code'), 'code')
assert.equal(resolveSwitcherStyle('unexpected'), 'code')
assert.equal(resolveSwitcherStyle(undefined), 'code')

// --- 3. Live Chat Cryptographic Token Core, Sanitizers & Hardened Endpoints ---
assert.equal(ChatSessions.slug, 'chat-sessions')
const tokenHashField = ChatSessions.fields.find((f) => 'name' in f && f.name === 'tokenHash')
assert.ok(tokenHashField, 'ChatSessions must define tokenHash field')
assert.equal(tokenHashField.access.read({}), false, 'tokenHash must never be readable via Payload API')

const rawToken = mintChatToken()
assert.match(rawToken, /^[0-9a-f]{64}$/)
const digest = hashChatToken(rawToken)
assert.match(digest, /^[0-9a-f]{64}$/)
assert.notEqual(digest, rawToken)
assert.equal(verifyChatTokenHash(rawToken, digest), true)
assert.equal(verifyChatTokenHash(mintChatToken(), digest), false)
assert.equal(verifyChatTokenHash('not-hex', digest), false)
assert.equal(verifyChatTokenHash('', digest), false)

assert.equal(sanitizeChatText('  Xin chào\r\nMenuMate\u0000\u0007!  '), 'Xin chào\nMenuMate!')
assert.equal(sanitizeChatText('   \u0000  '), '')
assert.equal(sanitizeChatText('a'.repeat(1500)).length, 1000)

// Mock Payload DB for endpoint security & roundtrip tests
let liveChatEnabled = false
let nextSessionId = 1
const sessionDb = new Map()

const mockPayload = {
  findGlobal: async ({ slug }) => {
    if (slug === 'site-settings') {
      return {
        liveChatEnabled,
        liveChatGreeting: '안녕하세요! MenuMate 상담팀입니다.',
        notifications: { onForm: false },
      }
    }
    return {}
  },
  create: async ({ collection, data }) => {
    assert.equal(collection, 'chat-sessions')
    const id = String(nextSessionId++)
    const doc = { id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...data }
    sessionDb.set(id, doc)
    return doc
  },
  findByID: async ({ collection, id }) => {
    assert.equal(collection, 'chat-sessions')
    const doc = sessionDb.get(String(id))
    if (!doc) throw new Error('Not Found')
    return doc
  },
  update: async ({ collection, id, data }) => {
    assert.equal(collection, 'chat-sessions')
    const cur = sessionDb.get(String(id))
    if (!cur) throw new Error('Not Found')
    const updated = { ...cur, ...data, updatedAt: new Date().toISOString() }
    sessionDb.set(String(id), updated)
    return updated
  },
  find: async ({ collection }) => {
    assert.equal(collection, 'chat-sessions')
    const docs = [...sessionDb.values()].sort((a, b) => String(b.lastMessageAt).localeCompare(String(a.lastMessageAt)))
    return { docs, totalDocs: docs.length }
  },
  count: async ({ collection }) => {
    assert.equal(collection, 'chat-sessions')
    const unread = [...sessionDb.values()].filter((d) => (d.unreadByStaff || 0) > 0).length
    return { totalDocs: unread }
  },
}

const makeReq = ({ url = 'http://localhost:3000/api/site/chat/start', ip = '10.0.0.1', headers = {}, body = null, query = {}, user = null } = {}) => ({
  url,
  query,
  user,
  payload: mockPayload,
  headers: new Headers({ 'x-forwarded-for': ip, ...headers }),
  json: async () => body,
})

// 3a. Disabled Live Chat rejects start with 403
{
  const res = await chatStart.handler(makeReq({ body: { text: 'Hello' } }))
  assert.equal(res.status, 403)
}

// 3b. Enable Live Chat; honeypot silently drops bot without DB write
liveChatEnabled = true
{
  const res = await chatStart.handler(makeReq({ body: { text: 'Buy spam links', website: 'https://bot.invalid' } }))
  assert.equal(res.status, 200)
  assert.equal(sessionDb.size, 0, 'Honeypot must not write to chat-sessions')
}

// 3c. Visitor starts Korean chat session
let visitorSessionId = ''
let visitorToken = ''
{
  const res = await chatStart.handler(
    makeReq({
      ip: '10.0.0.2',
      body: {
        name: 'Kim Minji',
        phone: '0909 123 456',
        text: '안녕하세요 태블릿 메뉴 렌탈 문의합니다',
        locale: 'ko',
        pagePath: '/ko',
      },
    }),
  )
  assert.equal(res.status, 200)
  const json = await res.json()
  assert.equal(json.ok, true)
  assert.ok(json.sessionId)
  assert.match(json.token, /^[0-9a-f]{64}$/)
  assert.equal(json.messages.length, 2, 'Should include greeting + visitor message')
  assert.equal(json.messages[0].sender, 'system')
  assert.equal(json.messages[1].sender, 'visitor')
  visitorSessionId = json.sessionId
  visitorToken = json.token

  const stored = sessionDb.get(visitorSessionId)
  assert.notEqual(stored.tokenHash, visitorToken, 'Raw visitor token must never be stored in DB')
  assert.equal(stored.unreadByStaff, 1)
}

// 3d. IDOR protection: wrong or missing token returns 403 on both poll & send
{
  const badPoll = await chatPoll.handler(
    makeReq({
      url: `http://localhost:3000/api/site/chat/poll?sessionId=${visitorSessionId}`,
      query: { sessionId: visitorSessionId },
      headers: { 'x-hosso-chat-token': mintChatToken() },
    }),
  )
  assert.equal(badPoll.status, 403)

  const badSend = await chatSend.handler(
    makeReq({
      headers: { 'x-hosso-chat-token': mintChatToken() },
      body: { sessionId: visitorSessionId, text: 'Hijack attempt' },
    }),
  )
  assert.equal(badSend.status, 403)
  assert.equal(sessionDb.get(visitorSessionId).messages.length, 2, 'Hijack attempt must not append messages')
}

// 3e. Staff RBAC protection: guest and author cannot access inbox or reply
for (const unauthorizedUser of [null, { id: 'u2', roles: ['author'] }, { id: 'u3', roles: ['editor'] }]) {
  const r1 = await chatInbox.handler(makeReq({ user: unauthorizedUser }))
  assert.equal(r1.status, 403)
  const r2 = await chatReply.handler(makeReq({ user: unauthorizedUser, body: { sessionId: visitorSessionId, text: 'Nope' } }))
  assert.equal(r2.status, 403)
  const r3 = await chatStatus.handler(makeReq({ user: unauthorizedUser, body: { sessionId: visitorSessionId, status: 'closed' } }))
  assert.equal(r3.status, 403)
}

// 3f. Moderator reads inbox (no tokenHash leaked), replies, and visitor polls reply + acknowledges unread
const moderator = { id: 'staff-1', email: 'support@menumate.vn', roles: ['moderator'] }
{
  const inboxRes = await chatInbox.handler(makeReq({ user: moderator }))
  assert.equal(inboxRes.status, 200)
  const inboxData = await inboxRes.json()
  assert.equal(inboxData.unreadCount, 1)
  assert.equal(inboxData.sessions.length, 1)
  assert.equal('tokenHash' in inboxData.sessions[0], false, 'Inbox response must strip tokenHash')

  const replyRes = await chatReply.handler(
    makeReq({
      user: moderator,
      body: { sessionId: visitorSessionId, text: '네 안녕하세요! 서울/호치민 모두 설치 지원 가능합니다.' },
    }),
  )
  assert.equal(replyRes.status, 200)
  assert.equal(sessionDb.get(visitorSessionId).status, 'replied')
  assert.equal(sessionDb.get(visitorSessionId).unreadByStaff, 0)
  assert.equal(sessionDb.get(visitorSessionId).unreadByVisitor, 1)

  const pollRes = await chatPoll.handler(
    makeReq({
      url: `http://localhost:3000/api/site/chat/poll?sessionId=${visitorSessionId}&ack=1`,
      query: { sessionId: visitorSessionId, ack: '1' },
      headers: { 'x-hosso-chat-token': visitorToken },
    }),
  )
  assert.equal(pollRes.status, 200)
  const pollData = await pollRes.json()
  assert.equal(pollData.messages.length, 3)
  assert.equal(pollData.messages[2].sender, 'staff')
  assert.equal(sessionDb.get(visitorSessionId).unreadByVisitor, 0)
}

// 3g. Moderator closes thread; visitor follow-up automatically reopens thread
{
  const closeRes = await chatStatus.handler(
    makeReq({ user: moderator, body: { sessionId: visitorSessionId, status: 'closed' } }),
  )
  assert.equal(closeRes.status, 200)
  assert.equal(sessionDb.get(visitorSessionId).status, 'closed')

  const followRes = await chatSend.handler(
    makeReq({
      ip: '10.0.0.2',
      headers: { 'x-hosso-chat-token': visitorToken },
      body: { sessionId: visitorSessionId, text: '견적서도 부탁드립니다!' },
    }),
  )
  assert.equal(followRes.status, 200)
  assert.equal(sessionDb.get(visitorSessionId).status, 'open')
  assert.equal(sessionDb.get(visitorSessionId).unreadByStaff, 1)
  assert.equal(sessionDb.get(visitorSessionId).messages.length, 4)
}

// 3h. Rate limiting blocks chatStart flood from a single IP
{
  let lastStatus = 200
  for (let i = 0; i < 10; i++) {
    const r = await chatStart.handler(makeReq({ ip: '10.99.99.99', body: { text: `Flood ${i}` } }))
    lastStatus = r.status
  }
  assert.equal(lastStatus, 429, 'Exceeding chatStart IP rate limit must return 429')
}

console.log('Task 1 & Task 2 dynamic locales + live chat security checks passed.')
