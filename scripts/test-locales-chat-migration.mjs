import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

assert.ok(process.env.COMMERCE_TEST_DATABASE_URL, 'Use a disposable migrated PostgreSQL database')
process.env.HOSSO_DATABASE_URL = process.env.COMMERCE_TEST_DATABASE_URL
process.env.HOSSO_SECRET = 'locales-chat-migration-test-only'
process.env.HOSSO_SCRIPT = '1'
process.env.HOSSO_SEED = 'false'
process.env.NODE_ENV = 'production'

const require = createRequire(new URL('../apps/studio/package.json', import.meta.url))
const { tsImport } = require('tsx/esm/api')
const { default: configPromise } = await tsImport('../apps/studio/src/payload.config.ts', {
  parentURL: import.meta.url,
  tsconfig: fileURLToPath(new URL('../apps/studio/tsconfig.json', import.meta.url)),
})
const config = await configPromise
config.jobs.autoRun = []
const { getPayload } = require('payload')
const payload = await getPayload({ config, disableOnInit: true })
try {
  // Exercise the real tables, indexes and localized version writes after the migration chain.
  const session = await payload.create({
    collection: 'chat-sessions',
    overrideAccess: true,
    data: {
      visitorName: 'Migration test',
      tokenHash: 'a'.repeat(64),
      locale: 'ko',
      status: 'open',
      unreadByStaff: 1,
      lastMessageAt: new Date().toISOString(),
      messages: [{ role: 'visitor', text: '안녕하세요' }],
    },
  })
  await payload.update({
    collection: 'chat-sessions', id: session.id, overrideAccess: true,
    data: { status: 'replied', unreadByStaff: 0, unreadByVisitor: 1 },
  })
  const savedSession = await payload.findByID({ collection: 'chat-sessions', id: session.id, overrideAccess: true })
  assert.equal(savedSession.status, 'replied')
  assert.equal(savedSession.unreadByVisitor, 1)
  assert.equal(savedSession.locale, 'ko')

  await payload.updateGlobal({
    slug: 'site-settings', locale: 'ko', overrideAccess: true,
    data: {
      _status: 'published',
      siteLocales: [{ code: 'vi', label: 'Tiếng Việt', shortLabel: 'VN' }, { code: 'ko', label: '한국어', shortLabel: 'KR' }],
      localeSwitcherStyle: 'pill-flag', floatingDockEnabled: true,
      floatingCallLabel: '전화 문의', liveChatEnabled: true,
      liveChatTitle: '채팅 지원', liveChatSubtitle: '온라인',
      liveChatGreeting: '안녕하세요', liveChatAccent: '#2563eb',
    },
  })
  const settings = await payload.findGlobal({ slug: 'site-settings', locale: 'ko', fallbackLocale: false, overrideAccess: true })
  assert.equal(settings.liveChatEnabled, true)
  assert.equal(settings.liveChatTitle, '채팅 지원')
  assert.equal(settings.liveChatGreeting, '안녕하세요')
  assert.equal(settings.localeSwitcherStyle, 'pill-flag')
  assert.deepEqual(settings.siteLocales.map(({ code }) => code), ['vi', 'ko'])

  // A normal page edit also traverses Payload's lock relations, which include chat-sessions.
  const { docs } = await payload.find({ collection: 'pages', limit: 1, overrideAccess: true })
  assert.ok(docs.length, 'Run the site-package roundtrip before this test')
  await payload.update({ collection: 'pages', id: docs[0].id, locale: 'ko', overrideAccess: true, data: { title: '마이그레이션 테스트', _status: 'published' } })
  await payload.delete({ collection: 'chat-sessions', id: session.id, overrideAccess: true })
  console.log('PASS migrated PostgreSQL supports chat sessions, Korean content, site locale settings and localized versions')
} finally {
  await payload.destroy()
}
process.exit(0)
