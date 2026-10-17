'use client'
import React, { useEffect, useState } from 'react'
import { ImageEditor } from './ImageEditor'

type Doc = { id: string | number; filename?: string; alt?: string; mimeType?: string }

const urlOf = (d: Doc) => `/api/media/file/${encodeURIComponent(d.filename ?? '')}`
const matches = (d: Doc, kind: 'image' | 'video') => d.mimeType?.startsWith(`${kind}/`)

const box: React.CSSProperties = { display: 'grid', gap: 8 }
const btn: React.CSSProperties = { padding: '6px 10px', border: '1px solid #c9ccd1', borderRadius: 4, background: '#fff', color: '#111', cursor: 'pointer', font: 'inherit', fontSize: 13 }

/**
 * Trường chọn ảnh cho trình dựng: chọn từ thư viện Media, tải ảnh lên, hoặc dán địa chỉ.
 * Giá trị lưu là URL (chuỗi) nên nội dung trang không phụ thuộc id media và export/import không cần ánh xạ lại.
 */
export function MediaField({ value, onChange, readOnly, kind = 'image' }: { value?: string; onChange: (v: string) => void; readOnly?: boolean; kind?: 'image' | 'video' }) {
  const [open, setOpen] = useState(false)
  const [docs, setDocs] = useState<Doc[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)

  const load = async () => {
    const res = await fetch('/api/media?limit=60&sort=-createdAt&depth=0')
    setDocs(res.ok ? ((await res.json()).docs ?? []) : [])
  }
  useEffect(() => {
    if (open) load()
  }, [open])

  const upload = async (file: File) => {
    setBusy(true)
    setError('')
    const form = new FormData()
    form.append('file', file)
    form.append('_payload', JSON.stringify({ alt: file.name.replace(/\.[^.]+$/, '') }))
    const res = await fetch('/api/media', { method: 'POST', body: form })
    const body = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) return setError(body?.errors?.[0]?.message ?? 'Không tải lên được')
    onChange(urlOf(body.doc))
    setOpen(false)
  }

  const editable = kind === 'image' && !!value && /^\/api\/media\/file\/[^?]+\.(png|jpe?g|webp|avif)$/i.test(value)
  const saveEdited = async (blob: Blob, name: string) => {
    const form = new FormData()
    form.append('file', new File([blob], name, { type: blob.type }))
    form.append('_payload', JSON.stringify({ alt: name.replace(/\.[^.]+$/, '') }))
    const res = await fetch('/api/media', { method: 'POST', body: form })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body?.errors?.[0]?.message ?? 'Không lưu được ảnh')
    onChange(urlOf(body.doc))
  }

  return (
    <div style={box}>
      {editing && value && <ImageEditor src={value} filename={decodeURIComponent(value.split('/').pop() ?? 'anh')} mime={/\.png$/i.test(value) ? 'image/png' : /\.webp$/i.test(value) ? 'image/webp' : 'image/jpeg'} onSaveNew={saveEdited} onClose={() => setEditing(false)} />}
      {kind === 'image' && value && /\.(png|jpe?g|gif|webp|svg|avif)(\?|$)/i.test(value) && (
        <img src={value} alt="" style={{ maxWidth: '100%', maxHeight: 120, objectFit: 'contain', background: '#f3f4f6', borderRadius: 4 }} />
      )}
      <input
        type="text"
        value={value ?? ''}
        readOnly={readOnly}
        placeholder={kind === 'video' ? 'Link YouTube/Vimeo hoặc tệp video' : '/api/media/file/anh.jpg hoặc https://…'}
        onChange={(e) => onChange(e.target.value)}
        style={{ padding: 8, border: '1px solid #c9ccd1', borderRadius: 4, font: 'inherit' }}
      />
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button type="button" style={btn} onClick={() => setOpen(!open)}>
          {open ? 'Đóng thư viện' : 'Chọn từ thư viện'}
        </button>
        <label style={{ ...btn, display: 'inline-block' }}>
          {busy ? 'Đang tải lên…' : kind === 'video' ? 'Tải video lên' : 'Tải ảnh lên'}
          <input type="file" accept={kind === 'video' ? 'video/*' : 'image/*'} hidden disabled={busy} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </label>
        {editable && (
          <button type="button" style={btn} onClick={() => setEditing(true)}>
            Sửa ảnh
          </button>
        )}
        {value && (
          <button type="button" style={btn} onClick={() => onChange('')}>
            Bỏ ảnh
          </button>
        )}
      </div>
      {error && <p style={{ color: '#b91c1c', margin: 0, fontSize: 13 }}>{error}</p>}
      {open && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, maxHeight: 240, overflow: 'auto' }}>
          {docs.length === 0 && <span style={{ gridColumn: '1 / -1', fontSize: 13 }}>Thư viện trống.</span>}
          {docs.filter((d) => matches(d, kind)).map((d) => (
            <button
              key={d.id}
              type="button"
              title={d.alt || d.filename}
              onClick={() => {
                onChange(urlOf(d))
                setOpen(false)
              }}
              style={{ ...btn, padding: 2, aspectRatio: '1', display: 'grid', placeItems: 'center', overflow: 'hidden' }}
            >
              {kind === 'video' ? <span style={{ fontSize: 11, wordBreak: 'break-all' }}>{d.filename}</span> : <img src={urlOf(d)} alt={d.alt ?? ''} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'cover' }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
