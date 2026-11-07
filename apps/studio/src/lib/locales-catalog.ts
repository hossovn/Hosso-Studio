export type CatalogLocale = {
  code: string
  label: string
  shortLabel: string
  ogLocale: string
}

export type SiteLocaleItem = {
  code: string
  label: string
  shortLabel: string
}

export type LocaleSwitcherStyle = 'code' | 'pill-flag' | 'dropdown-flag'

/**
 * Danh mục ngôn ngữ nội dung được khai báo sẵn cho Payload localization (SQLite + Postgres enum).
 * Quản trị viên bật/tắt, đổi nhãn và sắp xếp ngôn ngữ hiển thị ngay trong Cài đặt website mà không cần sửa mã nguồn.
 */
export const SUPPORTED_CONTENT_LOCALES: readonly CatalogLocale[] = [
  { code: 'vi', label: 'Tiếng Việt', shortLabel: 'VN', ogLocale: 'vi_VN' },
  { code: 'en', label: 'English', shortLabel: 'EN', ogLocale: 'en_US' },
  { code: 'ko', label: '한국어', shortLabel: 'KR', ogLocale: 'ko_KR' },
  { code: 'ja', label: '日本語', shortLabel: 'JP', ogLocale: 'ja_JP' },
  { code: 'zh', label: '中文', shortLabel: 'CN', ogLocale: 'zh_CN' },
  { code: 'fr', label: 'Français', shortLabel: 'FR', ogLocale: 'fr_FR' },
  { code: 'de', label: 'Deutsch', shortLabel: 'DE', ogLocale: 'de_DE' },
  { code: 'th', label: 'ไทย', shortLabel: 'TH', ogLocale: 'th_TH' },
] as const

const catalogMap = new Map<string, CatalogLocale>(SUPPORTED_CONTENT_LOCALES.map((item) => [item.code, item]))

export const SUPPORTED_LOCALE_CODES = new Set<string>(SUPPORTED_CONTENT_LOCALES.map((item) => item.code))

/** Gộp danh mục ngôn ngữ chuẩn với mọi ngôn ngữ khai báo thêm trong hosso.config.ts để đăng ký cho Payload. */
export function getPayloadLocalizationLocales(configLocales: readonly { code: string; label: string }[]): { code: string; label: string }[] {
  const seen = new Set<string>()
  const out: { code: string; label: string }[] = []
  for (const item of [...configLocales, ...SUPPORTED_CONTENT_LOCALES]) {
    const code = String(item?.code ?? '').trim().toLowerCase()
    if (!code || seen.has(code)) continue
    seen.add(code)
    out.push({ code, label: String(item.label ?? '').trim() || catalogMap.get(code)?.label || code.toUpperCase() })
  }
  return out
}

const cleanShortLabel = (raw: unknown, code: string): string => {
  const trimmed = typeof raw === 'string' ? raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4) : ''
  if (trimmed) return trimmed
  return catalogMap.get(code)?.shortLabel ?? code.toUpperCase().slice(0, 4)
}

/**
 * Chuẩn hóa danh sách ngôn ngữ hoạt động từ SiteSettings.siteLocales.
 * Nếu chưa cấu hình (hoặc không có mã hợp lệ), tự động rơi về danh sách mặc định trong hosso.config.ts.
 */
export function resolveSiteLocales(
  rawSiteLocales: unknown,
  fallbackLocales: readonly { code: string; label: string }[],
): SiteLocaleItem[] {
  const allowed = new Set<string>([
    ...SUPPORTED_LOCALE_CODES,
    ...fallbackLocales.map((l) => l.code),
  ])
  if (Array.isArray(rawSiteLocales) && rawSiteLocales.length > 0) {
    const seen = new Set<string>()
    const resolved: SiteLocaleItem[] = []
    for (const row of rawSiteLocales) {
      if (!row || typeof row !== 'object') continue
      const code = String((row as { code?: unknown }).code ?? '').trim().toLowerCase()
      if (!code || !allowed.has(code) || seen.has(code)) continue
      seen.add(code)
      const fallbackItem = fallbackLocales.find((l) => l.code === code)
      const defaultLabel = catalogMap.get(code)?.label ?? fallbackItem?.label ?? code.toUpperCase()
      const customLabel = typeof (row as { label?: unknown }).label === 'string' ? (row as { label: string }).label.trim().slice(0, 40) : ''
      resolved.push({
        code,
        label: customLabel || defaultLabel,
        shortLabel: cleanShortLabel((row as { shortLabel?: unknown }).shortLabel, code),
      })
    }
    if (resolved.length > 0) return resolved
  }

  return fallbackLocales.map((l) => ({
    code: l.code,
    label: l.label || catalogMap.get(l.code)?.label || l.code.toUpperCase(),
    shortLabel: cleanShortLabel(undefined, l.code),
  }))
}

export function resolveSwitcherStyle(raw: unknown): LocaleSwitcherStyle {
  if (raw === 'pill-flag' || raw === 'dropdown-flag' || raw === 'code') return raw
  return 'code'
}

export function ogLocaleFor(code: string): string {
  return catalogMap.get(code)?.ogLocale ?? code
}
