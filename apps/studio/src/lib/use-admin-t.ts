'use client'
import { useTranslation } from '@payloadcms/ui'

import { adminLang, makeT, type AdminT } from './admin-i18n'

/** Hook dịch cho component client trong admin theo ngôn ngữ đã chọn trong Payload. */
export const useAdminT = (): AdminT => makeT(adminLang(useTranslation().i18n.language))
