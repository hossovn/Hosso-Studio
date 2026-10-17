'use client'
import { useDocumentInfo } from '@payloadcms/ui'
import React from 'react'

import { useAdminT } from '@/lib/use-admin-t'

export const FormExportLink = () => {
  const T = useAdminT()
  const { id } = useDocumentInfo()
  if (!id) return null
  return (
    <p style={{ margin: '16px 0' }}>
      <a href={`/api/site/forms-export/${id}`} style={{ color: 'var(--hosso-brand)', fontWeight: 600 }}>
        {T('Tải CSV các lần gửi của biểu mẫu này')}
      </a>
    </p>
  )
}
