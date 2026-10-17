'use client'
import { ImageEditor } from '@hosso/studio-blocks'
import { useDocumentInfo } from '@payloadcms/ui'
import React, { useEffect, useState } from 'react'

type Doc = { filename?: string; mimeType?: string; alt?: string }

/** Nút "Sửa ảnh" trên trang chi tiết Media: xoay, lật, cắt, đổi kích thước, chỉnh màu; lưu ảnh mới hoặc thay ảnh gốc. */
export const MediaImageEditor = () => {
  const { id } = useDocumentInfo()
  const [doc, setDoc] = useState<Doc | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (id) fetch(`/api/media/${id}?depth=0`).then((r) => r.json()).then(setDoc).catch(() => {})
  }, [id])

  if (!id || !doc?.filename || !/^image\/(png|jpe?g|webp|avif)$/.test(doc.mimeType ?? '')) return null
  const src = `/api/media/file/${encodeURIComponent(doc.filename)}?t=${Date.now()}`

  const upload = async (blob: Blob, name: string, replace: boolean) => {
    const form = new FormData()
    form.append('file', new File([blob], name, { type: blob.type }))
    form.append('_payload', JSON.stringify({ alt: doc.alt || name.replace(/\.[^.]+$/, '') }))
    const res = await fetch(replace ? `/api/media/${id}` : '/api/media', { method: replace ? 'PATCH' : 'POST', body: form })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body?.errors?.[0]?.message ?? 'Không lưu được ảnh')
    window.location.href = `/admin/collections/media/${replace ? id : body.doc.id}`
  }

  return (
    <div style={{ marginBottom: 24 }}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{ background: 'var(--hosso-brand)', color: '#fff', border: 0, borderRadius: 4, padding: '10px 18px', fontWeight: 600, cursor: 'pointer' }}
      >
        Sửa ảnh
      </button>
      {open && (
        <ImageEditor
          src={src}
          filename={doc.filename}
          mime={doc.mimeType ?? 'image/jpeg'}
          onSaveNew={(b, n) => upload(b, n, false)}
          onReplace={(b) => upload(b, doc.filename!, true)}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  )
}
