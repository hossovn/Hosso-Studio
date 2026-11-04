import React from 'react'
import { FreeElementView, type FreeElement } from './FreeCanvas'
import { bindRepeatTemplate, DEFAULT_REPEAT_TEMPLATE, type RepeatItem } from './repeater-data'
import { constrainedElements } from './layout-constraints'
export function DataRepeater({ id, heading, columns = 3, gap = 24, items = [], _template, data, _data, _noFree }: { id: string; heading?: string; columns?: number; gap?: number; items?: RepeatItem[]; _template?: FreeElement[]; data?: { status: string; items?: RepeatItem[] }; _data?: { status: string; items?: RepeatItem[] }; _noFree?: boolean }) {
  const template = Array.isArray(_template) && _template.length ? _template : DEFAULT_REPEAT_TEMPLATE
  const loaded = data ?? _data, source = (loaded?.items ?? items).slice(0, 60)
  const x = Math.min(...template.map((el) => el.x)), y = Math.min(...template.map((el) => el.y)), w = Math.max(1, ...template.map((el) => el.x + el.w - x)), h = Math.max(1, ...template.map((el) => el.y + el.h - y))
  return <section className="hs-repeater" aria-label={heading || 'Danh sách dữ liệu'}>
    <style>{'.hs-repeater-grid{display:grid;grid-template-columns:repeat(var(--repeat-cols),minmax(0,1fr));gap:var(--repeat-gap)}@media(max-width:600px){.hs-repeater-grid{grid-template-columns:1fr}}'}</style>
    {heading && <h2>{heading}</h2>}
    {loaded?.status === 'loading' && <div className="hs-repeater-grid" aria-busy="true" aria-label="Đang tải danh sách" style={{ '--repeat-cols': Math.max(1, Math.min(6, Number(columns) || 3)), '--repeat-gap': '24px' } as React.CSSProperties}>{[0, 1, 2].map((key) => <div key={key} style={{ height: 260, borderRadius: 10, background: 'linear-gradient(125deg,#f0f4f1,#e0e9e3)' }} />)}</div>}
    {loaded?.status === 'loading' ? null : loaded?.status === 'error' ? <p role="status">Không tải được dữ liệu.</p> : !source.length ? <p role="status">Chưa có nội dung trong danh sách.</p> : <div className="hs-repeater-grid" style={{ '--repeat-cols': Math.max(1, Math.min(6, Math.round(Number(columns) || 3))), '--repeat-gap': `${Math.max(0, Math.min(100, Number(gap) || 0))}px` } as React.CSSProperties}>
      {source.map((item, index) => {
        const els = constrainedElements(bindRepeatTemplate(template, item, `${id}-${index}`), 'desktop')
        const height = Math.max(h, ...els.map((el) => el.y + el.h - y))
        return <article key={index} data-repeat-item={index} style={{ containerType: 'inline-size', minWidth: 0 }}><div style={{ position: 'relative', height: `${height / w * 100}cqw` }}>{els.filter((el) => !el.props._hidden).map((el) => <div key={el.id} style={{ position: 'absolute', left: `${(el.x - x) / w * 100}%`, top: `${(el.y - y) / height * 100}%`, width: `${el.w / w * 100}%`, height: `${el.h / height * 100}%`, pointerEvents: el.type === 'container' ? 'none' : undefined }}><FreeElementView el={el} unit={w} editing={Boolean(_noFree)} /></div>)}</div></article>
      })}
    </div>}
  </section>
}
