import config from '@payload-config'
import hosso from '@hosso-config'
import { setLocale } from '@hosso/studio-blocks'
import { headers } from 'next/headers'
import { getPayload, type Payload } from 'payload'
import { cache } from 'react'

import {
  resolveSiteLocales,
  resolveSwitcherStyle,
  type LocaleSwitcherStyle,
  type SiteLocaleItem,
} from './locales-catalog'
import { sitePreview } from './site-preview'

export const locales = hosso.locales
export const defaultLocaleCode = hosso.locales[0].code
export const isLocale = (v: string | undefined, list: readonly { code: string }[] = locales): v is string =>
  Boolean(v) && list.some((l) => l.code === v)

/** Lấy cấu hình ngôn ngữ hoạt động từ Cài đặt website thông qua đối tượng Payload có sẵn. */
export async function getPayloadSiteLocales(
  payload: Payload,
  draft = false,
): Promise<{ locales: SiteLocaleItem[]; defaultLocale: string; switcherStyle: LocaleSwitcherStyle }> {
  const settings = (await payload
    .findGlobal({ slug: 'site-settings', draft, depth: 0 })
    .catch(() => ({}))) as Record<string, unknown>
  const active = resolveSiteLocales(settings.siteLocales, hosso.locales)
  return {
    locales: active,
    defaultLocale: active[0].code,
    switcherStyle: resolveSwitcherStyle(settings.localeSwitcherStyle),
  }
}

/** Cấu hình ngôn ngữ hoạt động của yêu cầu hiện tại (cache theo mỗi yêu cầu RSC). */
export const getSiteLocaleConfig = cache(async (editorDraft = false) => {
  const payload = await getPayload({ config })
  return getPayloadSiteLocales(payload, editorDraft || (await sitePreview()))
})

/** Ngôn ngữ của yêu cầu hiện tại (proxy gán header x-hosso-locale) và đặt cho hàm dịch phía server. */
export async function currentLocale(): Promise<string> {
  const [{ locales: active, defaultLocale: activeDefault }, reqHeaders] = await Promise.all([
    getSiteLocaleConfig(),
    headers(),
  ])
  const h = reqHeaders.get('x-hosso-locale') ?? undefined
  const code = isLocale(h, active) ? h : activeDefault
  setLocale(code, activeDefault)
  return code
}

/** Tách tiền tố ngôn ngữ khỏi các đoạn đường dẫn: ['ko','gioi-thieu'] -> { locale: 'ko', rest: ['gioi-thieu'] }. */
export function splitLocale(
  segments: string[],
  activeLocales: readonly { code: string }[] = locales,
  activeDefault: string = defaultLocaleCode,
): { locale: string; rest: string[] } {
  if (segments.length && isLocale(segments[0], activeLocales) && segments[0] !== activeDefault) {
    return { locale: segments[0], rest: segments.slice(1) }
  }
  return { locale: activeDefault, rest: segments }
}
