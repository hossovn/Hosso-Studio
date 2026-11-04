'use client'

import { ImageEditor, makeElement, type FreeElement } from '@hosso/studio-blocks'
import { Image, LoaderCircle, Pencil, Search, Upload, Video, X } from 'lucide-react'
import React, { useEffect, useMemo, useRef, useState } from 'react'

type Doc = { id: string | number; filename?: string; alt?: string; mimeType?: string; filesize?: number }
const urlOf = (doc: Doc) => `/api/media/file/${encodeURIComponent(doc.filename ?? '')}`

export function MediaLibraryPanel({ onInsert }: { onInsert: (elements: FreeElement[]) => void }) {
  const [docs, setDocs] = useState<Doc[]>([])
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<'all' | 'image' | 'video'>('all')
  const [busy, setBusy] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Doc | null>(null)
  const [page, setPage] = useState(1)
  const [hasNext, setHasNext] = useState(false)
  const request = useRef(0)

  const load = async (nextPage = 1) => {
    const current = ++request.current
    setBusy(true); setError('')
    try {
      const params = new URLSearchParams({ limit: '48', page: String(nextPage), sort: '-createdAt', depth: '0' })
      params.set('where[and][0][or][0][mimeType][contains]', kind === 'video' ? 'video/' : 'image/')
      if (kind === 'all') params.set('where[and][0][or][1][mimeType][contains]', 'video/')
      if (query.trim()) { params.set('where[and][1][or][0][filename][contains]', query.trim()); params.set('where[and][1][or][1][alt][contains]', query.trim()) }
      const res = await fetch('/api/media?' + params)
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.errors?.[0]?.message ?? 'Không tải được thư viện media.')
      if (current !== request.current) return
      setDocs((docs) => nextPage === 1 ? body.docs ?? [] : [...docs, ...body.docs ?? []]); setPage(nextPage); setHasNext(Boolean(body.hasNextPage))
    } catch (cause) { if (current === request.current) setError(cause instanceof Error ? cause.message : 'Không tải được thư viện media.') }
    finally { if (current === request.current) setBusy(false) }
  }
  useEffect(() => { const timer = setTimeout(() => load(), 250); return () => { clearTimeout(timer); request.current++ } }, [query, kind])

  const upload = async (file: File) => {
    setUploading(true); setError('')
    const form = new FormData()
    form.append('file', file)
    form.append('_payload', JSON.stringify({ alt: file.name.replace(/\.[^.]+$/, '') }))
    try {
      const res = await fetch('/api/media', { method: 'POST', body: form })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.errors?.[0]?.message ?? 'Không tải lên được.')
      setDocs((current) => [body.doc, ...current])
      return true
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không tải lên được.'); return false }
    finally { setUploading(false) }
  }

  const filtered = useMemo(() => docs.filter((doc) => {
    const mime = doc.mimeType ?? ''
    if (kind !== 'all' && !mime.startsWith(kind + '/')) return false
    const text = `${doc.filename ?? ''} ${doc.alt ?? ''}`.toLowerCase()
    return text.includes(query.trim().toLowerCase())
  }), [docs, query, kind])

  const insert = (doc: Doc) => {
    const src = urlOf(doc)
    if (doc.mimeType?.startsWith('video/')) onInsert([makeElement('video', { props: { url: src } })])
    else onInsert([makeElement('image', { props: { src, alt: doc.alt ?? doc.filename ?? '' } })])
  }

  return <section className="cv-media-library" aria-label="Thư viện media">
    <div className="cv-media-tools">
      <label className="cv-search"><Search size={15} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm ảnh hoặc video…" />{query && <button type="button" onClick={() => setQuery('')} aria-label="Xóa tìm kiếm"><X size={14} /></button>}</label>
      <label className="cv-media-upload"><Upload size={15} />{uploading ? 'Đang tải…' : 'Tải tệp'}<input hidden type="file" accept="image/*,video/*" disabled={uploading} onChange={(event) => event.target.files?.[0] && upload(event.target.files[0])} /></label>
    </div>
    <div className="cv-media-filter" role="tablist">{(['all', 'image', 'video'] as const).map((value) => <button key={value} type="button" role="tab" aria-selected={kind === value} onClick={() => setKind(value)}>{value === 'all' ? 'Tất cả' : value === 'image' ? 'Ảnh' : 'Video'}</button>)}</div>
    {busy && <div className="cv-media-state"><LoaderCircle className="cv-spin" size={20} />Đang tải thư viện…</div>}
    {error && <div className="cv-media-state is-error" role="alert">{error}<button type="button" onClick={() => load()}>Thử lại</button></div>}
    {!busy && !error && !filtered.length && <div className="cv-media-state">Chưa có tệp phù hợp.</div>}
    <p className="cv-tool-help">Bấm ảnh để chèn. Nút bút chì mở công cụ cắt, xoay, đổi kích thước và nén ảnh.</p>
    <div className="cv-media-grid">{filtered.map((doc) => <article key={doc.id} className="cv-media-item"><button type="button" title={`Chèn ${doc.alt || doc.filename || 'media'}`} onClick={() => insert(doc)}>{doc.mimeType?.startsWith('video/') ? <span><Video size={24} /><small>{doc.filename}</small></span> : <img src={urlOf(doc)} alt={doc.alt ?? ''} loading="lazy" />}<i>{doc.mimeType?.startsWith('video/') ? <Video size={12} /> : <Image size={12} />}{doc.alt || doc.filename}</i></button>{doc.mimeType?.startsWith('image/') && doc.mimeType !== 'image/svg+xml' && <button className="cv-media-edit" type="button" title="Sửa và nén ảnh" aria-label={`Sửa ảnh ${doc.alt || doc.filename}`} onClick={() => setEditing(doc)}><Pencil size={14} /></button>}</article>)}</div>
    {hasNext && <button className="cv-tool-button" type="button" disabled={busy} onClick={() => load(page + 1)}>Tải thêm</button>}
    {editing && <ImageEditor src={urlOf(editing)} filename={editing.filename ?? 'image'} mime={editing.mimeType ?? 'image/jpeg'} onClose={() => setEditing(null)} onSaveNew={async (blob, filename) => { if (!await upload(new File([blob], filename, { type: blob.type }))) throw new Error('Không lưu được ảnh. Hãy thử lại.'); setEditing(null) }} />}
  </section>
}
