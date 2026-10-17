'use client'
import hosso from '@hosso-config'
import { AdminLangProvider } from '@hosso/studio-blocks'
import { useTranslation } from '@payloadcms/ui'
import React from 'react'

import { adminLang } from '@/lib/admin-i18n'

const extra = Object.assign({}, ...hosso.plugins.map((p) => p.adminEn ?? {}))

/** Bọc các trường/trình sửa dùng chung (chọn ảnh, sửa ảnh...) để chúng theo ngôn ngữ admin đang chọn trong Payload. */
export const AdminLang = ({ children }: { children: React.ReactNode }) => (
  <AdminLangProvider lang={adminLang(useTranslation().i18n.language)} extra={extra}>
    {children}
  </AdminLangProvider>
)
