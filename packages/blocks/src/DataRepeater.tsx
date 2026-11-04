import React from 'react'
import { FreeElementView, type FreeElement } from './FreeCanvas'
import { bindRepeatTemplate, DEFAULT_REPEAT_TEMPLATE, type RepeatItem } from './repeater-data'
import { constrainedElements } from './layout-constraints'
import { repeatPrefix } from './repeater-query'
type Loaded = { status: string; items?: RepeatItem[]; page?: number; pages?: number; total?: number; categories?: { value: string; label: string }[]; current?: { q?: string; category?: string; sort?: string }; preserved?: Record<string, string> }
export function DataRepeater({ id, heading, columns = 3, gap = 24, items = [], _template, data, _data, _noFree, search, filter, sorting, paginate, source: sourceKind }: { id: string; heading?: string; columns?: number; gap?: number; items?: RepeatItem[]; _template?: FreeElement[]; data?: Loaded; _data?: Loaded; _noFree?: boolean; search?: string; filter?: string; sorting?: string; paginate?: string; source?: string }) {
  const template = Array.isArray(_template) && _template.length ? _template : DEFAULT_REPEAT_TEMPLATE
  const loaded = data ?? _data, source = (loaded?.items ?? items).slice(0, 60)
  const prefix = repeatPrefix(id), current = loaded?.current ?? {}, preserved = loaded?.preserved ?? {}
  const link = (page: number) => { const params = new URLSearchParams(preserved); for (const key of ['q', 'category', 'sort'] as const) if (current[key]) params.set(prefix + key, current[key]!); params.set(prefix + 'page', String(page)); return '?' + params.toString() }
  const x = Math.min(...template.map((el) => el.x)), y = Math.min(...template.map((el) => el.y)), w = Math.max(1, ...template.map((el) => el.x + el.w - x)), h = Math.max(1, ...template.map((el) => el.y + el.h - y))
  return <section className="hs-repeater" aria-label={heading || 'Danh sách dữ liệu'}>
    <style>{'.hs-repeater-controls label{display:grid;gap:6px;min-width:150px;flex:1;font-size:13px}.hs-repeater-controls input,.hs-repeater-controls select{box-sizing:border-box;width:100%;min-height:42px;padding:9px 12px;border:1px solid #d6dfd9;border-radius:6px;background:#fff;color:#263b2e;font:inherit}.hs-repeater-controls button{align-self:end;min-height:42px;padding:9px 20px;border:0;border-radius:6px;background:var(--hs-primary,#2d7b57);color:var(--hs-on-primary,#fff);font:600 13px system-ui;cursor:pointer}.hs-repeater-controls :focus-visible{outline:2px solid var(--hs-primary,#2d7b57);outline-offset:2px}.hs-repeater-grid{display:grid;grid-template-columns:repeat(var(--repeat-cols),minmax(0,1fr));gap:var(--repeat-gap)}@media(max-width:600px){.hs-repeater-grid{grid-template-columns:1fr}}'}</style>
    {heading && <h2>{heading}</h2>}
    {(search === 'yes' || filter === 'yes' || sorting === 'yes') && <form method="get" className="hs-repeater-controls" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
      {Object.entries(preserved).map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />)}
      {search === 'yes' && <label>Tìm kiếm<input type="search" name={prefix + 'q'} defaultValue={current.q} maxLength={160} /></label>}
      {filter === 'yes' && <label>Danh mục<select name={prefix + 'category'} defaultValue={current.category || ''}><option value="">Tất cả</option>{loaded?.categories?.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}</select></label>}
      {sorting === 'yes' && <label>Sắp xếp<select name={prefix + 'sort'} defaultValue={current.sort || ''}><option value="">Mặc định</option><option value="title">Tên A–Z</option>{sourceKind !== 'products' && <option value="title-desc">Tên Z–A</option>}{sourceKind !== 'posts' && <><option value="price">Giá tăng dần</option><option value="-price">Giá giảm dần</option></>}</select></label>}
      <button type="submit">Áp dụng</button>
    </form>}
    {loaded?.status === 'loading' && <div className="hs-repeater-grid" aria-busy="true" aria-label="Đang tải danh sách" style={{ '--repeat-cols': Math.max(1, Math.min(6, Number(columns) || 3)), '--repeat-gap': '24px' } as React.CSSProperties}>{[0, 1, 2].map((key) => <div key={key} style={{ height: 260, borderRadius: 10, background: 'linear-gradient(125deg,#f0f4f1,#e0e9e3)' }} />)}</div>}
    {loaded?.status === 'loading' ? null : loaded?.status === 'error' ? <p role="status">Không tải được dữ liệu.</p> : !source.length ? <p role="status">Chưa có nội dung trong danh sách.</p> : <div className="hs-repeater-grid" style={{ '--repeat-cols': Math.max(1, Math.min(6, Math.round(Number(columns) || 3))), '--repeat-gap': `${Math.max(0, Math.min(100, Number(gap) || 0))}px` } as React.CSSProperties}>
      {source.map((item, index) => {
        const els = constrainedElements(bindRepeatTemplate(template, item, `${id}-${index}`), 'desktop')
        const height = Math.max(h, ...els.map((el) => el.y + el.h - y))
        return <article key={index} data-repeat-item={index} style={{ containerType: 'inline-size', minWidth: 0 }}><div style={{ position: 'relative', height: `${height / w * 100}cqw` }}>{els.filter((el) => !el.props._hidden).map((el) => <div key={el.id} style={{ position: 'absolute', left: `${(el.x - x) / w * 100}%`, top: `${(el.y - y) / height * 100}%`, width: `${el.w / w * 100}%`, height: `${el.h / height * 100}%`, pointerEvents: el.type === 'container' ? 'none' : undefined }}><FreeElementView el={el} unit={w} editing={Boolean(_noFree)} /></div>)}</div></article>
      })}
    </div>}
    {paginate === 'yes' && (loaded?.pages ?? 1) > 1 && <nav aria-label="Phân trang danh sách" style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 20 }}>{(loaded?.page ?? 1) > 1 && <a href={link((loaded?.page ?? 1) - 1)}>Trang trước</a>}<span>Trang {loaded?.page ?? 1} / {loaded?.pages}</span>{(loaded?.page ?? 1) < (loaded?.pages ?? 1) && <a href={link((loaded?.page ?? 1) + 1)}>Trang sau</a>}</nav>}
  </section>
}
