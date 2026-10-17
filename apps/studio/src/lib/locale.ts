import hosso from '@hosso-config'
import { setLocale } from '@hosso/studio-blocks'
import { headers } from 'next/headers'

export const locales = hosso.locales
export const defaultLocaleCode = hosso.locales[0].code
export const isLocale = (v: string | undefined): v is string => Boolean(v) && locales.some((l) => l.code === v)

/** Ngôn ngữ của yêu cầu hiện tại (proxy gán header x-hosso-locale) và đặt cho hàm dịch phía server. */
export async function currentLocale(): Promise<string> {
  const h = (await headers()).get('x-hosso-locale') ?? undefined
  const code = isLocale(h) ? h : defaultLocaleCode
  setLocale(code, defaultLocaleCode)
  return code
}

/** Tách tiền tố ngôn ngữ khỏi các đoạn đường dẫn: ['en','gioi-thieu'] -> { locale: 'en', rest: ['gioi-thieu'] }. */
export function splitLocale(segments: string[]): { locale: string; rest: string[] } {
  if (segments.length && isLocale(segments[0]) && segments[0] !== defaultLocaleCode) return { locale: segments[0], rest: segments.slice(1) }
  return { locale: defaultLocaleCode, rest: segments }
}
