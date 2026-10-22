'use client'
import { Copy, Search as SearchIcon, Plus, FileText, PanelsTopLeft, Check, Pencil } from 'lucide-react'
import React, { useEffect, useState } from 'react'

import type { PageData } from './canvas-model'
import { copyPageMeta } from './page-copy'

export type NavCtx = { id: string; collection: string; locale: string; defaultLocale: string }

const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px', border: 0, borderRadius: 6, background: 'transparent', font: 'inherit', fontSize: 13, color: '#20242b', textAlign: 'left', cursor: 'pointer', textDecoration: 'none', boxSizing: 'border-box' }
const on: React.CSSProperties = { background: 'color-mix(in srgb, var(--hosso-brand, #15803d) 12%, #fff)', color: 'var(--hosso-brand, #15803d)', fontWeight: 700 }

const slugify = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
const editorUrl = (id: string | number, c: string, locale: string, defaultLocale: string) => {
  const q = new URLSearchParams()
  if (c !== 'pages') q.set('c', c)
  if (locale !== defaultLocale) q.set('locale', locale)
  const s = q.toString()
  return `/editor/${id}${s ? `?${s}` : ''}`
}
const api = async (path: string, init?: RequestInit) => {
  const r = await fetch(`/api/${path}`, { credentials: 'same-origin', ...init })
  if (!r.ok) throw new Error(String(r.status))
  return r.json()
}
function useDocs<T>(path: string) {
  const [docs, setDocs] = useState<T[] | null>(null)
  useEffect(() => {
    let live = true
    api(path).then((j) => live && setDocs(j.docs ?? [])).catch(() => live && setDocs([]))
    return () => { live = false }
  }, [path])
  return docs
}
const Search = ({ q, setQ }: { q: string; setQ: (s: string) => void }) => (
  <label className="cv-search"><SearchIcon size={16} aria-hidden="true" /><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm…" aria-label="Tìm" /></label>
)
const emptyDoc = { content: [], root: { props: {} } }

// ponytail: nhóm trang đoán theo mã đường dẫn; thêm cột "nhóm" vào collection pages khi cần nhóm tự chọn.
const GROUPS: { title: string; test: (slug: string) => boolean }[] = [
  { title: 'Trang chính', test: (s) => s === 'home' },
  { title: 'Trang cửa hàng', test: (s) => /^(san-pham|chi-tiet|gio-hang|thanh-toan|trang-thai-don|danh-muc|yeu-thich|cam-on)/.test(s) },
  { title: 'Khu thành viên', test: (s) => /^(tai-khoan|dang-nhap|dang-ky|quen-mat-khau|don-hang)/.test(s) },
  { title: 'Trang tùy chỉnh', test: () => true },
]

export function PagesPanel({ ctx }: { ctx: NavCtx }) {
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const docs = useDocs<{ id: number | string; title?: string; slug: string }>(`pages?limit=200&depth=0&sort=slug&locale=${ctx.locale}`)
  const go = (id: string | number) => { window.location.href = editorUrl(id, 'pages', ctx.locale, ctx.defaultLocale) }
  const create = async () => {
    const title = window.prompt('Tên trang mới')?.trim()
    if (!title || busy) return
    const slug = slugify(title)
    if (!slug) return window.alert('Tên trang không hợp lệ.')
    setBusy(true)
    try {
      const j = await api(`pages?locale=${ctx.locale}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title, slug, content: emptyDoc, _status: 'draft' }) })
      go(j.doc.id)
    } catch {
      window.alert('Không tạo được trang (mã đường dẫn có thể đã tồn tại).')
      setBusy(false)
    }
  }
  const duplicate = async (source: { id: string | number; title?: string; slug: string }) => {
    if (busy) return
    setBusy(true)
    try {
      const sourceDoc = await api(`pages/${source.id}?draft=true&locale=${ctx.locale}`)
      const doc = sourceDoc.doc ?? sourceDoc
      const meta = copyPageMeta(source.title ?? '', source.slug, (docs ?? []).map((d) => d.slug))
      const j = await api(`pages?locale=${ctx.locale}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: meta.title,
          slug: meta.slug,
          description: doc.description,
          seo: doc.seo,
          content: doc.content ?? emptyDoc,
          _status: 'draft',
        }),
      })
      go(j.doc.id)
    } catch {
      window.alert('Không nhân bản được trang.')
      setBusy(false)
    }
  }
  const m = q.trim().toLowerCase()
  const list = (docs ?? []).filter((d) => `${d.title} ${d.slug}`.toLowerCase().includes(m))
  const used = new Set<string | number>()
  return (
    <>
      <div className="cv-site-tools">
        <Search q={q} setQ={setQ} />
        <button type="button" className="cv-site-add" title="Tạo trang mới" aria-label="Tạo trang mới" disabled={busy} onClick={create}><Plus size={18} /></button>
      </div>
      {docs === null && <p style={{ opacity: 0.6, fontSize: 13 }}>Đang tải…</p>}
      {GROUPS.map((g) => {
        const items = list.filter((d) => !used.has(d.id) && g.test(d.slug))
        items.forEach((d) => used.add(d.id))
        if (!items.length) return null
        return (
          <section key={g.title} className="cv-site-group">
            <h3 className="cv-catalog-heading">{g.title}<span>{items.length}</span></h3>
            {items.map((d) => {
              const cur = ctx.collection === 'pages' && String(d.id) === ctx.id
              return (
                <div key={d.id} className="cv-site-row" data-current={cur}>
                  <button type="button" aria-label={d.title || d.slug} aria-current={cur ? 'page' : undefined} style={{ ...row, flex: 1, minWidth: 0, ...(cur ? on : {}) }} onClick={() => !cur && go(d.id)}>
                    <span className="cv-site-icon"><FileText size={17} aria-hidden="true" /></span>
                    <span className="cv-site-copy"><strong>{d.title || d.slug}</strong><span>{d.slug}</span></span>
                    {cur && <Check size={15} aria-hidden="true" />}
                  </button>
                  <button type="button" className="cv-ib" title="Nhân bản trang" aria-label={`Nhân bản ${d.title || d.slug}`} disabled={busy} onClick={() => duplicate(d)}>
                    <Copy size={15} />
                  </button>
                </div>
              )
            })}
          </section>
        )
      })}
      {docs && !list.length && <p style={{ opacity: 0.6, fontSize: 13 }}>Không có trang nào.</p>}
    </>
  )
}

const AREA_LINKS = [
  { id: 'siteHeader', label: 'Header của site' },
  { id: 'siteFooter', label: 'Footer của site' },
]

export function GlobalPanel({ ctx, data, addReusable }: { ctx: NavCtx; data: PageData; addReusable: (slug: string) => void }) {
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const docs = useDocs<{ id: number | string; title: string; slug: string }>(`reusable-blocks?limit=200&depth=0&sort=title&locale=${ctx.locale}`)
  const usedSlugs = new Set((data.content ?? []).filter((b: any) => b.type === 'Reusable').map((b: any) => String(b.props?.slug ?? '')))
  const create = async () => {
    const title = window.prompt('Tên phần dùng chung mới')?.trim()
    if (!title || busy) return
    const slug = slugify(title)
    if (!slug) return window.alert('Tên không hợp lệ.')
    setBusy(true)
    try {
      const j = await api(`reusable-blocks?locale=${ctx.locale}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title, slug, content: emptyDoc, _status: 'draft' }) })
      window.location.href = editorUrl(j.doc.id, 'reusable-blocks', ctx.locale, ctx.defaultLocale)
    } catch {
      window.alert('Không tạo được (mã có thể đã tồn tại).')
      setBusy(false)
    }
  }
  const m = q.trim().toLowerCase()
  const list = (docs ?? []).filter((d) => `${d.title} ${d.slug}`.toLowerCase().includes(m))
  return (
    <>
      <div className="cv-site-tools">
        <Search q={q} setQ={setQ} />
        <button type="button" className="cv-site-add" title="Tạo phần dùng chung" aria-label="Tạo phần dùng chung" disabled={busy} onClick={create}><Plus size={18} /></button>
      </div>
      <h3 className="cv-catalog-heading">Header và footer</h3>
      <div style={{ marginBottom: 14 }}>
        {AREA_LINKS.filter((a) => a.label.toLowerCase().includes(m)).map((a) => (
          <a key={a.id} className="cv-site-link" href={editorUrl(a.id, 'area', ctx.locale, ctx.defaultLocale)} style={{ ...row, ...(ctx.collection === 'area' && ctx.id === a.id ? on : {}) }}>
            <span className="cv-site-icon"><PanelsTopLeft size={17} aria-hidden="true" /></span>
            <span style={{ flex: 1 }}>{a.label}</span>
          </a>
        ))}
      </div>
      <h3 className="cv-catalog-heading">Phần dùng chung</h3>
      {docs === null && <p style={{ opacity: 0.6, fontSize: 13 }}>Đang tải…</p>}
      {list.map((d) => (
        <div key={d.id} className="cv-site-row">
          <button type="button" style={{ ...row, flex: 1, minWidth: 0 }} title="Thêm vào trang đang sửa" disabled={ctx.collection === 'reusable-blocks' && String(d.id) === ctx.id} onClick={() => addReusable(d.slug)}>
            <span className="cv-site-icon"><PanelsTopLeft size={17} aria-hidden="true" /></span>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title}</span>
            {usedSlugs.has(d.slug) && <Check size={15} aria-label="Đang dùng trên trang này" style={{ color: 'var(--hosso-brand, #15803d)' }} />}
          </button>
          <a className="cv-ib" href={editorUrl(d.id, 'reusable-blocks', ctx.locale, ctx.defaultLocale)} title="Sửa phần này" aria-label={`Sửa ${d.title}`}><Pencil size={15} /></a>
        </div>
      ))}
      {docs && !list.length && <p style={{ opacity: 0.6, fontSize: 13 }}>Chưa có phần dùng chung.</p>}
    </>
  )
}
