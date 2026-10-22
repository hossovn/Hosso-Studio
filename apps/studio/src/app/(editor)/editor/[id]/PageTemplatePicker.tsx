'use client'
import React, { useEffect, useRef, useState } from 'react'
import { Eye, Plus, X } from 'lucide-react'
import type { Pattern } from '@hosso/studio-blocks'
import { SectionPreview } from './BlockPanels'
import { PAGE_TEMPLATES, TEMPLATE_CATEGORIES, pageTemplatePattern, type PageTemplate } from './PageTemplates'

export function PageTemplatePicker({ query, onInsert }: { query: string; onInsert: (pattern: Pattern) => void }) {
  const [category, setCategory] = useState('all')
  const [preview, setPreview] = useState<PageTemplate | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => { if (preview) dialog.current?.showModal() }, [preview])
  const templates = PAGE_TEMPLATES.filter((t) => (category === 'all' || t.category === category) && (t.label + ' ' + TEMPLATE_CATEGORIES.find((c) => c.id === t.category)!.label).toLocaleLowerCase().includes(query))
  return <>
    <label className="cv-template-filter"><span>Danh mục</span><select aria-label="Danh mục mẫu" value={category} onChange={(e) => setCategory(e.target.value)}>
      <option value="all">Tất cả danh mục</option>
      {TEMPLATE_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
    </select></label>
    <div className="cv-template-results" role="status">{templates.length} mẫu trang</div>
    <div className="cv-template-list">
      {templates.map((t) => <article key={t.id} className="cv-template-card" data-template={t.id}>
        <button type="button" className="cv-template-thumb" aria-label={'Xem mẫu ' + t.label} onClick={() => setPreview(t)}><SectionPreview tpl={t.sections[0]} /></button>
        <div className="cv-template-info"><strong>{t.label}</strong><span>{TEMPLATE_CATEGORIES.find((c) => c.id === t.category)!.label} · {t.sections.length} phần</span></div>
        <div className="cv-template-actions">
          <button type="button" onClick={() => setPreview(t)}><Eye size={14} />Xem mẫu</button>
          <button type="button" onClick={() => onInsert(pageTemplatePattern(t))}><Plus size={14} />Chèn mẫu</button>
        </div>
      </article>)}
    </div>
    {!templates.length && <p className="cv-template-empty">Không có mẫu phù hợp.</p>}
    <dialog ref={dialog} className="cv-template-dialog" aria-labelledby="cv-template-title" onClose={() => setPreview(null)} onClick={(e) => { if (e.target === e.currentTarget) dialog.current?.close() }}>
      {preview && <>
        <header><div><strong id="cv-template-title">{preview.label}</strong><span>{preview.sections.length} phần · Nội dung mẫu</span></div><button type="button" className="cv-template-insert" onClick={() => { dialog.current?.close(); onInsert(pageTemplatePattern(preview)) }}><Plus size={16} />Chèn mẫu</button><button type="button" className="cv-ib" aria-label="Đóng xem mẫu" title="Đóng xem mẫu" onClick={() => dialog.current?.close()}><X size={18} /></button></header>
        <div className="cv-template-preview">{preview.sections.map((section) => <SectionPreview key={section.id} tpl={section} />)}</div>
      </>}
    </dialog>
  </>
}
