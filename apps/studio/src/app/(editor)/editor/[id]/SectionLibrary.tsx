'use client'
import React, { useEffect, useState } from 'react'
import { Clock, Plus, Search, Star } from 'lucide-react'
import { SectionPreview } from './BlockPanels'
import type { SectionTemplate } from './SectionTemplates'

const categories = [
  { id: 'all', label: 'Tất cả mẫu', test: () => true },
  { id: 'intro', label: 'Chào đón & giới thiệu', test: (id: string) => /hero|banner|intro|welcome/.test(id) },
  { id: 'content', label: 'Nội dung & dịch vụ', test: (id: string) => /features|steps|faq|interactive|icon-grid|stats|statistics|team|about|process|benefit|service|compare|usp/.test(id) },
  { id: 'images', label: 'Hình ảnh & chuyển động', test: (id: string) => /gallery|motion|comparison|showcase|portfolio|collage/.test(id) },
  { id: 'commerce', label: 'Bán hàng & đánh giá', test: (id: string) => /pricing|promo|testimonials|logos|product|offer|price|review|deal/.test(id) },
  { id: 'contact', label: 'Liên hệ & đăng ký', test: (id: string) => /contact|cta|newsletter|booking|map|social|subscribe/.test(id) },
  { id: 'layout', label: 'Bố cục trống', test: (id: string) => id.startsWith('container-') },
]

const FAV_KEY = 'hosso-section-favs:v1', RECENT_KEY = 'hosso-section-recent:v1'
const read = (key: string): string[] => { try { const value = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [] } catch { return [] } }
const write = (key: string, value: string[]) => { try { localStorage.setItem(key, JSON.stringify(value)) } catch {} }

export function SectionLibrary({ templates, query, areaKind, onInsert }: {
  templates: SectionTemplate[]
  query: string
  areaKind: string
  onInsert: (template: { height: number; bg?: string; els: ReturnType<SectionTemplate['build']>; extraProps?: Record<string, unknown> }) => void
}) {
  const [category, setCategory] = useState('all')
  const [favs, setFavs] = useState<string[]>([]), [recent, setRecent] = useState<string[]>([])
  useEffect(() => { setFavs(read(FAV_KEY)); setRecent(read(RECENT_KEY)) }, [])
  const toggleFav = (id: string) => setFavs((current) => { const next = current.includes(id) ? current.filter((item) => item !== id) : [id, ...current]; write(FAV_KEY, next); return next })
  const remember = (id: string) => setRecent((current) => { const next = [id, ...current.filter((item) => item !== id)].slice(0, 8); write(RECENT_KEY, next); return next })
  const special = category === 'fav' || category === 'recent'
  const active = categories.find((item) => item.id === category) ?? categories[0]
  const matches = (item: SectionTemplate) => item.label.toLocaleLowerCase().includes(query) && (areaKind || (category === 'fav' ? favs.includes(item.id) : category === 'recent' ? recent.includes(item.id) : active.test(item.id)))
  const list = templates.filter(matches)
  if (category === 'recent') list.sort((a, b) => recent.indexOf(a.id) - recent.indexOf(b.id))
  const title = areaKind === 'header' ? 'Đầu trang' : areaKind === 'footer' ? 'Chân trang' : category === 'fav' ? 'Yêu thích' : category === 'recent' ? 'Dùng gần đây' : active.label
  return <div className="cv-gallery-layout">
    {!areaKind && <nav className="cv-gallery-categories" aria-label="Danh mục phần">
      <button type="button" aria-pressed={category === 'fav'} onClick={() => setCategory('fav')}><Star size={14} />Yêu thích<small>{favs.length}</small></button>
      <button type="button" aria-pressed={category === 'recent'} onClick={() => setCategory('recent')}><Clock size={14} />Gần đây<small>{recent.length}</small></button>
      <hr aria-hidden="true" />
      {categories.map((item) => <button type="button" key={item.id} aria-pressed={item.id === category} onClick={() => setCategory(item.id)}>{item.label}<small>{templates.filter((tpl) => item.test(tpl.id)).length}</small></button>)}
    </nav>}
    <div className="cv-gallery-content">
      <div className="cv-gallery-intro"><div><h3>{title}</h3><p>Bấm để thêm, kéo vào vị trí bạn muốn, hoặc đánh dấu sao để lưu mẫu yêu thích.</p></div><span role="status">{list.length} mẫu</span></div>
      <div className="cv-section-grid">
        {!query && category === 'all' && <button type="button" className="cv-blank-template" draggable onDragStart={(e) => { e.dataTransfer.setData('text/plain', 'hosso-section:blank'); e.dataTransfer.effectAllowed = 'copy' }} onClick={() => onInsert({ height: 400, els: [] })}><span><Plus size={30} strokeWidth={1.3} /></span><strong>Phần trống</strong><small>Tự thiết kế theo ý bạn</small></button>}
        {list.map((template) => <div className="cv-section-item" key={template.id}>
          <button type="button" className="cv-section-card" aria-label={`Thêm phần ${template.label}`} draggable onDragStart={(e) => { e.dataTransfer.setData('text/plain', 'hosso-section:' + template.id); e.dataTransfer.effectAllowed = 'copy' }} onClick={() => { remember(template.id); onInsert({ height: template.height, bg: template.bg, els: template.build(), extraProps: template.extraProps }) }}>
            <div className="cv-section-art"><SectionPreview tpl={template} /><span className="cv-section-add"><Plus size={18} /></span></div><strong>{template.label}</strong>
          </button>
          <button type="button" className="cv-section-fav" aria-pressed={favs.includes(template.id)} aria-label={favs.includes(template.id) ? `Bỏ yêu thích ${template.label}` : `Yêu thích ${template.label}`} title={favs.includes(template.id) ? 'Bỏ yêu thích' : 'Đánh dấu yêu thích'} onClick={() => toggleFav(template.id)}><Star size={16} /></button>
        </div>)}
      </div>
      {!list.length && <div className="cv-empty">{special ? <Star size={28} /> : <Search size={28} />}<p>{category === 'fav' ? 'Chưa có mẫu yêu thích. Bấm biểu tượng sao trên một mẫu để lưu lại.' : category === 'recent' ? 'Bạn chưa dùng mẫu nào. Các mẫu vừa thêm sẽ hiện ở đây.' : 'Không tìm thấy mẫu phù hợp. Thử từ khóa khác.'}</p></div>}
    </div>
  </div>
}
