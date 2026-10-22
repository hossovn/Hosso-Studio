'use client'
import React, { useMemo, useRef, useState } from 'react'
import { LayoutTemplate, Search } from 'lucide-react'

import { useAdminT } from '@/lib/use-admin-t'
import type { WebsiteTemplate } from '@/lib/backup'

type Props = { templates: WebsiteTemplate[]; siteURL: string }

export function SiteTemplates({ templates, siteURL }: Props) {
  const T = useAdminT()
  const pending = useRef(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const categories = useMemo(() => [...new Set(templates.map((template) => template.category))], [templates])
  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase()
    return templates.filter((template) => (category === 'all' || template.category === category) && (!term || (template.title + ' ' + template.description + ' ' + template.category + ' ' + template.pages.map((page) => page.title).join(' ')).toLocaleLowerCase().includes(term)))
  }, [category, query, templates])

  const install = async (id: string) => {
    const template = templates.find((template) => template.id === id)
    if (!template || template.missing.length || pending.current) return
    const title = template.title
    if (!window.confirm(T('Dùng giao diện "{name}"? Các trang trùng đường dẫn, menu, header/footer và cài đặt sẽ được thay bằng mẫu. Hãy sao lưu trước khi áp dụng.', { name: title }))) return
    pending.current = true
    setBusy(true)
    setMsg(T('Đang áp dụng giao diện {name}', { name: title }))
    try {
      const response = await fetch('/api/site/template-install', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }),
      })
      const result = await response.json()
      if (!response.ok || result.ok !== true) throw new Error(result.error || `HTTP ${response.status}`)
      window.location.assign(siteURL)
    } catch (error) {
      setMsg(`${T('Lỗi')}: ${(error as Error).message}`)
    } finally {
      pending.current = false
      setBusy(false)
    }
  }

  return <div className="ht-gallery" aria-busy={busy}>
    <div className="ht-toolbar">
      <div className="ht-tabs" role="tablist" aria-label={T('Bộ lọc giao diện')}>
        {['all', ...categories].map((item) => <button key={item} type="button" className={'ht-tab' + ((category === item) ? ' is-active' : '')} role="tab" aria-selected={category === item} onClick={() => setCategory(item)}>{item === 'all' ? T('Tất cả') : item}</button>)}
      </div>
      <label className="ht-search"><Search size={17} aria-hidden="true" /><span className="sr-only">{T('Tìm giao diện')}</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={T('Tìm theo tên hoặc loại website')} /></label>
    </div>
    <div className="ht-result-line"><span>{filtered.length} {T('giao diện')}</span>{query && <button type="button" className="ht-clear" onClick={() => setQuery('')}>{T('Xóa tìm kiếm')}</button>}</div>
    {templates.length === 0 ? <div className="ht-empty"><LayoutTemplate size={30} aria-hidden="true" /><strong>{T('Chưa có mẫu website.')}</strong><p>{T('Thêm file .hosso-site.zip vào thư mục mẫu để bắt đầu.')}</p></div> : !filtered.length ? <div className="ht-empty"><Search size={30} aria-hidden="true" /><strong>{T('Không tìm thấy giao diện')}</strong><p>{T('Thử tìm bằng từ khóa khác.')}</p></div> : <div className="ht-grid">
      {filtered.map((template) => <article className="ht-template" key={template.id}>
        <div className="ht-cover">
          <LayoutTemplate size={40} aria-hidden="true" />
          {template.cover && <img src={'/api/site/template-cover?id=' + encodeURIComponent(template.id)} alt={template.title} loading="lazy" onError={(event) => { event.currentTarget.style.display = 'none' }} />}
          <button type="button" className="ht-use" disabled={busy || template.missing.length > 0} onClick={() => install(template.id)}>{T('Dùng')}</button>
        </div>
        <div className="ht-body">
          <div className="ht-title-row"><div><span className="ht-category">{template.category}</span><h4>{template.title}</h4></div><span className="ht-count">{template.pages.length} {T('trang')}</span></div>
          <p>{template.description}</p>
          <details><summary>{T('Xem các trang')}</summary><ul>{template.pages.map((page) => <li key={page.slug}>{page.title}</li>)}</ul></details>
          {template.missing.length > 0 && <p>{T('Chưa khả dụng. Còn thiếu: {names}', { names: template.missing.join(', ') })}</p>}
        </div>
      </article>)}
    </div>}
    <p className="ht-footnote"><a href="/api/site/backup" download>{T('Tải bản sao lưu')}</a><span>{T('Mẫu chỉ thay nội dung website, không thay mã nguồn plugin.')}</span></p>
    {msg && <p role="status" style={{ overflowWrap: 'anywhere' }}>{msg}</p>}
  </div>
}
