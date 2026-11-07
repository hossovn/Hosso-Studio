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

console.log('Task 1 dynamic locales & Korean i18n checks passed.')
