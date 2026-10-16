'use client'
import { useDocumentInfo } from '@payloadcms/ui'
import React from 'react'

export const EditorLink = () => {
  const { id, collectionSlug } = useDocumentInfo()
  return (
    <div style={{ marginBottom: 24 }}>
      {id ? (
        <a
          href={`/editor/${id}${collectionSlug === 'posts' ? '?c=posts' : ''}`}
          style={{ background: 'var(--hosso-brand)', color: '#fff', padding: '10px 18px', borderRadius: 4, display: 'inline-block', textDecoration: 'none', fontWeight: 600 }}
        >
          Mở trình dựng kéo thả
        </a>
      ) : (
        <p>Lưu trang trước, sau đó mở trình dựng kéo thả.</p>
      )}
    </div>
  )
}
