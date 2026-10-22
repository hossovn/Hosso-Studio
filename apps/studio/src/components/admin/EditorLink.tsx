'use client'
import { useDocumentInfo, useLocale } from '@payloadcms/ui'
import React, { useState } from 'react'

import { useAdminT } from '@/lib/use-admin-t'

const btn: React.CSSProperties = { background: 'var(--hosso-brand)', color: '#fff', padding: '10px 18px', borderRadius: 4, display: 'inline-block', textDecoration: 'none', fontWeight: 600, border: 0, cursor: 'pointer', font: 'inherit' }

export const EditorLink = () => {
  const T = useAdminT()
  const { id, collectionSlug } = useDocumentInfo()
  const locale = useLocale()
  const [msg, setMsg] = useState('')
  const q = new URLSearchParams()
  if (collectionSlug && collectionSlug !== 'pages') q.set('c', collectionSlug)
  if (locale?.code) q.set('locale', locale.code)

  // Link xem trước bản nháp (7 ngày) cho người chưa có tài khoản.
  const share = async () => {
    setMsg(T('Đang tạo link…'))
    try {
      const r = await fetch(`/api/site/share-link?c=${collectionSlug}&id=${id}&locale=${locale?.code ?? ''}`, { credentials: 'include' })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error)
      await navigator.clipboard.writeText(j.url).catch(() => window.prompt(T('Sao chép link:'), j.url))
      setMsg(T('Đã sao chép link xem trước (hiệu lực 7 ngày, chỉ xem bản nháp mới nhất đã lưu).'))
    } catch {
      setMsg(T('Không tạo được link, hãy lưu tài liệu trước.'))
    }
  }

  if (!id) return <p style={{ marginBottom: 24 }}>{T('Lưu trước, sau đó mở trình dựng kéo thả.')}</p>
  return (
    <div style={{ marginBottom: 24, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
      <a href={`/editor/${id}?${q}`} style={btn}>
        {T('Mở trình dựng kéo thả')}
        {locale?.code ? ` (${locale.code})` : ''}
      </a>
      {(collectionSlug === 'pages' || collectionSlug === 'posts') && (
        <button type="button" onClick={share} style={{ ...btn, background: 'transparent', color: 'inherit', border: '1px solid var(--theme-elevation-300)' }}>
          {T('Link xem trước chia sẻ')}
        </button>
      )}
      {msg && <span style={{ fontSize: 13 }}>{msg}</span>}
    </div>
  )
}
