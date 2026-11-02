'use client'
import React, { useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { SectionPreview } from './BlockPanels'
import type { SectionTemplate } from './SectionTemplates'

const categories = [
  { id: 'all', label: 'Tất cả mẫu', test: () => true },
  { id: 'intro', label: 'Chào đón & giới thiệu', test: (id: string) => /hero|banner|intro/.test(id) },
  { id: 'content', label: 'Nội dung & dịch vụ', test: (id: string) => /features|steps|faq|icon-grid|stats|team/.test(id) },
  { id: 'images', label: 'Hình ảnh & chuyển động', test: (id: string) => /gallery|motion/.test(id) },
  { id: 'commerce', label: 'Bán hàng & đánh giá', test: (id: string) => /pricing|promo|testimonials|logos/.test(id) },
  { id: 'contact', label: 'Liên hệ & đăng ký', test: (id: string) => /contact|cta|newsletter/.test(id) },
  { id: 'layout', label: 'Bố cục trống', test: (id: string) => id.startsWith('container-') },
]

export function SectionLibrary({ templates, query, areaKind, onInsert }: {
  templates: SectionTemplate[]
  query: string
  areaKind: string
  onInsert: (template: { height: number; bg?: string; els: ReturnType<SectionTemplate['build']> }) => void
}) {
  const [category, setCategory] = useState('all')
  const active = categories.find((item) => item.id === category) ?? categories[0]
  const list = templates.filter((item) => item.label.toLocaleLowerCase().includes(query) && (areaKind || active.test(item.id)))
  return <div className="cv-gallery-layout">
    {!areaKind && <nav className="cv-gallery-categories" aria-label="Danh mục phần">
      {categories.map((item) => <button type="button" key={item.id} aria-pressed={item.id === category} onClick={() => setCategory(item.id)}>{item.label}</button>)}
    </nav>}
    <div className="cv-gallery-content">
      <div className="cv-gallery-intro"><div><h3>{areaKind === 'header' ? 'Đầu trang' : areaKind === 'footer' ? 'Chân trang' : active.label}</h3><p>Bấm để thêm, hoặc kéo mẫu vào vị trí bạn muốn.</p></div><span role="status">{list.length} mẫu</span></div>
      <div className="cv-section-grid">
        {!query && category === 'all' && <button type="button" className="cv-blank-template" draggable onDragStart={(e) => { e.dataTransfer.setData('text/plain', 'hosso-section:blank'); e.dataTransfer.effectAllowed = 'copy' }} onClick={() => onInsert({ height: 400, els: [] })}><span><Plus size={30} strokeWidth={1.3} /></span><strong>Phần trống</strong><small>Tự thiết kế theo ý bạn</small></button>}
        {list.map((template) => <button type="button" className="cv-section-card" key={template.id} aria-label={`Thêm phần ${template.label}`} draggable onDragStart={(e) => { e.dataTransfer.setData('text/plain', 'hosso-section:' + template.id); e.dataTransfer.effectAllowed = 'copy' }} onClick={() => onInsert({ height: template.height, bg: template.bg, els: template.build() })}>
          <div className="cv-section-art"><SectionPreview tpl={template} /><span className="cv-section-add"><Plus size={18} /></span></div><strong>{template.label}</strong>
        </button>)}
      </div>
      {!list.length && <div className="cv-empty"><Search size={28} /><p>Không tìm thấy mẫu phù hợp. Thử từ khóa khác.</p></div>}
    </div>
  </div>
}
