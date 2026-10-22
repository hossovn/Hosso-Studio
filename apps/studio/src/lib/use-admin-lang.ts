'use client'
import hosso from '@hosso-config'
import { trLabel } from '@hosso/studio-blocks'
import { useTranslation } from '@payloadcms/ui'

import { adminLang } from './admin-i18n'

const extra = Object.assign({}, ...hosso.plugins.map((p) => p.adminEn ?? {}))

/** Dịch nhãn block/trường (khóa = nhãn tiếng Việt) theo ngôn ngữ admin; gồm từ điển của plugin. */
export const useAdminLang = () => {
  const lang = adminLang(useTranslation().i18n.language)
  return (vi: string) => trLabel(lang, vi, extra)
}
