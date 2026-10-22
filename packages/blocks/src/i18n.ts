import * as React from 'react'
import { strings as en } from './strings.en'
import { strings as vi, type StringKey } from './strings.vi'

export type { StringKey }

/** Từ điển theo ngôn ngữ. Thêm ngôn ngữ: tạo strings.<mã>.ts rồi đăng ký ở đây và trong hosso.config.ts. */
const dictionaries: Record<string, Record<StringKey, string>> = { vi, en }

export const DEFAULT_LOCALE = 'vi'

// Ngôn ngữ của yêu cầu hiện tại ở phía server: lưu bằng React cache (mỗi yêu cầu một bản).
// Layout, trang và not-found đều tự đặt lại từ header do proxy gán, nên không phụ thuộc thứ tự render.
type Store = { locale: string; defaultLocale: string }
const makeStore = (): Store => ({ locale: DEFAULT_LOCALE, defaultLocale: DEFAULT_LOCALE })
const reactCache = (React as unknown as { cache?: <T>(fn: () => T) => () => T }).cache
const shared = makeStore()
const store: () => Store = reactCache ? reactCache(makeStore) : () => shared

export const setLocale = (locale: string, defaultLocale?: string) => {
  const st = store()
  st.locale = locale
  if (defaultLocale) st.defaultLocale = defaultLocale
}
export const getLocale = () => store().locale
export const getDefaultLocale = () => store().defaultLocale

/** Dịch một chuỗi giao diện. Component server dùng `t(key)`; component client dùng `useT()`. */
export const translate = (key: StringKey, locale: string): string => dictionaries[locale]?.[key] ?? vi[key]
export const t = (key: StringKey, locale: string = getLocale()): string => translate(key, locale)

/** Thêm tiền tố ngôn ngữ cho đường dẫn nội bộ (ngôn ngữ mặc định không có tiền tố). */
export const localizeHref = (href: string, locale: string = getLocale(), defaultLocale: string = getDefaultLocale()): string => {
  if (locale === defaultLocale || !href.startsWith('/') || href.startsWith('//') || href.startsWith('/api/')) return href
  if (href === '/') return `/${locale}`
  return `/${locale}${href}`
}
