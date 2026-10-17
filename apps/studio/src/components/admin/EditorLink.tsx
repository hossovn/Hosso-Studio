'use client'
import { useDocumentInfo, useLocale } from '@payloadcms/ui'
import React from 'react'

export const EditorLink = () => {
  const { id, collectionSlug } = useDocumentInfo()
  const locale = useLocale()
  const q = new URLSearchParams()
  if (collectionSlug && collectionSlug !== 'pages') q.set('c', collectionSlug)
  if (locale?.code) q.set('locale', locale.code)
  return (
    <div style={{ marginBottom: 24 }}>
      {id ? (
        <a
          href={`/editor/${id}?${q}`}
          style={{ background: 'var(--hosso-brand)', color: '#fff', padding: '10px 18px', borderRadius: 4, display: 'inline-block', textDecoration: 'none', fontWeight: 600 }}
        >
          Mở trình dựng kéo thả{locale?.code ? ` (${locale.code})` : ''}
        </a>
      ) : (
        <p>Lưu trước, sau đó mở trình dựng kéo thả.</p>
      )}
    </div>
  )
}
