import { getLocale, localizeHref } from '@hosso/studio-blocks'
import { s as en } from './strings.en'
import { s as vi, type Key } from './strings.vi'

const dictionaries: Record<string, Record<Key, string>> = { vi, en }

/** Chuỗi giao diện của plugin theo ngôn ngữ (server: ngôn ngữ của yêu cầu; client: dùng useTr). */
export const trFor = (locale: string) => (k: Key) => dictionaries[locale]?.[k] ?? vi[k]
export const tr = (k: Key) => trFor(getLocale())(k)
/** Đường dẫn nội bộ theo ngôn ngữ hiện tại của yêu cầu. */
export const lh = (path: string) => localizeHref(path)
