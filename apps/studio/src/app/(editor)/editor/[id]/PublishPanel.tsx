'use client'
import React, { useEffect, useMemo, useState } from 'react'
import { ExternalLink, Save } from 'lucide-react'
import { inspectPage } from '@/lib/publish-checks'
import type { PageData, Sel } from './canvas-model'
import type { NavCtx } from './SitePanels'

export type PageMetadata = { title?: string; description?: string; excerpt?: string; slug?: string; seo?: { title?: string; noindex?: boolean; image?: string | number | { id: string | number } | null } }
type Meta = PageMetadata
export function PublishPanel({ nav, data, config, setSel, onDevice, metadata, onMetadataChange }: { nav?: NavCtx; data: PageData; config: any; setSel: (sel: Sel) => void; onDevice: (device: 'desktop' | 'tablet' | 'mobile') => void; metadata?: Meta; onMetadataChange?: (metadata: Meta) => void }) {
  const [meta, setMeta] = useState<Meta>(metadata ?? {})
  const [images, setImages] = useState<{ id: string | number; alt?: string; filename?: string }[]>([])
  const [paths, setPaths] = useState<Set<string>>(new Set(['/', '/tim-kiem', '/bai-viet', '/danh-muc', '/the']))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [hostname, setHostname] = useState('Website')
  useEffect(() => { setHostname(window.location.hostname) }, [])
  useEffect(() => {
    if (!nav) return
    let live = true
    const read = async (url: string) => { const res = await fetch(url); if (!res.ok) throw new Error(); return res.json() }
    Promise.all([
      read('/api/pages?limit=1000&depth=0&draft=true'),
      read('/api/posts?limit=1000&depth=0&draft=true'),
      read('/api/media?limit=100&depth=0&sort=-createdAt&where[mimeType][contains]=image/'),
    ]).then(([pages, posts, media]) => { if (!live) return; setPaths(new Set(['/', '/tim-kiem', '/bai-viet', '/danh-muc', '/the', ...(pages.docs ?? []).map((page: Meta) => page.slug === 'home' ? '/' : '/' + page.slug), ...(posts.docs ?? []).map((post: Meta) => '/bai-viet/' + post.slug)])); setImages(media.docs ?? []) }).catch(() => { if (live) setError('Không tải được dữ liệu SEO.') })
    return () => { live = false }
  }, [nav?.id, nav?.locale])
  const issues = useMemo(() => inspectPage({ ...meta, content: data }, { paths, blockTypes: new Set(Object.keys(config.components)), locale: nav?.locale ?? 'vi', locales: nav?.locales?.length ? nav.locales : ['vi', 'en'], seo: !nav || ['pages', 'posts'].includes(nav.collection) }), [meta, data, config, paths, nav])
  const change = (next: Meta) => { setMeta(next); onMetadataChange?.(next); setMessage('') }
  const save = async () => {
    if (!nav || !['pages', 'posts'].includes(nav.collection)) return
    setBusy(true); setError('')
    try {
      const image = typeof meta.seo?.image === 'object' ? meta.seo.image?.id : meta.seo?.image
      const res = await fetch(`/api/${nav.collection}/${nav.id}?draft=true&locale=${nav.locale}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ description: meta.description, excerpt: meta.excerpt, seo: { ...meta.seo, image }, _status: 'draft' }) })
      const body = await res.json().catch(() => ({})); if (!res.ok) throw new Error(body?.errors?.[0]?.message || 'Không lưu được SEO.')
      setMessage('Đã lưu SEO vào bản nháp.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không lưu được SEO.') }
    finally { setBusy(false) }
  }
  return <div className="cv-workbench-panel">
    {(!nav || ['pages', 'posts'].includes(nav.collection)) && <>
      <h3 className="cv-catalog-heading">SEO và chia sẻ</h3>
      <label className="cv-tool-field">Tiêu đề SEO <small>{(meta.seo?.title || meta.title || '').length}/60</small><input value={meta.seo?.title ?? ''} placeholder={meta.title} onChange={(event) => change({ ...meta, seo: { ...meta.seo, title: event.target.value } })} /></label>
      <label className="cv-tool-field">Mô tả <small>{(meta.description ?? meta.excerpt ?? '').length}/160</small><textarea rows={3} value={meta.description ?? meta.excerpt ?? ''} onChange={(event) => change(nav?.collection === 'posts' ? { ...meta, excerpt: event.target.value } : { ...meta, description: event.target.value })} /></label>
      <label className="cv-tool-field">Ảnh chia sẻ<select value={String(typeof meta.seo?.image === 'object' ? meta.seo.image?.id ?? '' : meta.seo?.image ?? '')} onChange={(event) => change({ ...meta, seo: { ...meta.seo, image: event.target.value || null } })}><option value="">Ảnh mặc định</option>{images.map((image) => <option key={image.id} value={image.id}>{image.alt || image.filename}</option>)}</select></label>
      <label className="cv-tool-check"><input type="checkbox" checked={Boolean(meta.seo?.noindex)} onChange={(event) => change({ ...meta, seo: { ...meta.seo, noindex: event.target.checked } })} />Không lập chỉ mục trang này</label>
      <div className="cv-social-preview"><small>{hostname}</small><strong>{meta.seo?.title || meta.title || 'Tiêu đề trang'}</strong><p>{meta.description || meta.excerpt || 'Mô tả trang sẽ xuất hiện tại đây.'}</p></div>
      <button className="cv-tool-button" type="button" disabled={busy || !nav} onClick={save}><Save size={14} />{busy ? 'Đang lưu…' : 'Lưu SEO nháp'}</button>
    </>}
    {error && <p className="cv-tool-error" role="alert">{error}</p>}{message && <p className="cv-tool-success" role="status">{message}</p>}
    <h3 className="cv-catalog-heading">Kiểm tra trước xuất bản <span>{issues.length}</span></h3>
    <p className="cv-tool-help">Kiểm tra cấu trúc, ID, liên kết, nội dung mẫu, mô tả ảnh, H1 và tràn khung theo ba thiết bị.</p>
    {!issues.length && <p className="cv-tool-success">Không có vấn đề được phát hiện.</p>}
    {issues.map((issue, index) => <button type="button" className="cv-issue-row" key={index} data-severity={issue.severity} onClick={() => { if (['desktop', 'tablet', 'mobile'].includes(issue.device ?? '')) onDevice(issue.device as 'desktop'); if (issue.block) setSel({ block: issue.block, el: issue.element ?? '' }) }}><strong>{issue.message}</strong><small>{[issue.severity === 'error' ? 'Lỗi' : 'Lưu ý', issue.device, issue.path].filter(Boolean).join(' · ')}</small></button>)}
    <a className="cv-tool-button is-primary" href="/admin/releases" target="_blank" rel="noreferrer"><ExternalLink size={14} />Mở quản lý bản phát hành</a>
    <a className="cv-tool-button" href="/admin/globals/site-settings" target="_blank" rel="noreferrer">Cài đặt favicon, thương hiệu và website</a>
  </div>
}
