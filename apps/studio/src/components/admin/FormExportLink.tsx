'use client'
import { useDocumentInfo } from '@payloadcms/ui'
import React from 'react'

export const FormExportLink = () => {
  const { id } = useDocumentInfo()
  if (!id) return null
  return (
    <p style={{ margin: '16px 0' }}>
      <a href={`/api/site/forms-export/${id}`} style={{ color: 'var(--hosso-brand)', fontWeight: 600 }}>
        Tải CSV các lần gửi của biểu mẫu này
      </a>
    </p>
  )
}
