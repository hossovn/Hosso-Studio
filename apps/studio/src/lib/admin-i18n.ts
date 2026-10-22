import hosso from '@hosso-config'

import { adminEn } from './admin-en'

// Từ điển bổ sung do plugin cung cấp (nhãn tiếng Việt của plugin).
const pluginEn: Record<string, string> = Object.assign({}, ...hosso.plugins.map((p) => p.adminEn ?? {}))

export type AdminLang = 'vi' | 'en'

/** Payload gọi ngôn ngữ admin là 'vi' | 'en' (có thể kèm vùng, ví dụ 'en-US'); mặc định Tiếng Việt. */
export const adminLang = (code?: string | null): AdminLang => (String(code ?? '').toLowerCase().startsWith('en') ? 'en' : 'vi')

export type AdminT = (vi: string, vars?: Record<string, string | number>) => string

/**
 * Dịch chuỗi giao diện admin/trình dựng. Khóa chính là câu tiếng Việt (bản gốc); thiếu bản tiếng Anh thì giữ tiếng Việt.
 * Chỗ chèn giá trị dùng {tên}: T('...', { name }).
 */
export const makeT =
  (lang: AdminLang): AdminT =>
  (vi, vars) => {
    const s = lang === 'en' ? (adminEn[vi] ?? pluginEn[vi] ?? vi) : vi
    return vars ? s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`)) : s
  }
