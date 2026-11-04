'use client'
import { Eye, EyeOff, Lock, Unlock, GripVertical, ChevronDown, ChevronRight, Pencil, Trash2, Group, Ungroup, Search } from 'lucide-react'
import React, { useState } from 'react'
import type { FreeElement } from '@hosso/studio-blocks'
import { PAGE, blockId, elsOf, floatOf, patchBlock, patchElProps, removeBlock, removeEl, type PageData, type Sel } from './canvas-model'
import { arrangeElements, groupElements, reorderLayer, ungroupElement, type ArrangeAction } from './editor-tools'

const ARRANGE: { id: ArrangeAction; label: string }[] = [
  { id: 'left', label: 'Trái' }, { id: 'center', label: 'Giữa ngang' }, { id: 'right', label: 'Phải' },
  { id: 'top', label: 'Trên' }, { id: 'middle', label: 'Giữa dọc' }, { id: 'bottom', label: 'Dưới' },
  { id: 'horizontal', label: 'Đều ngang' }, { id: 'vertical', label: 'Đều dọc' },
]

export function LayersPanel({ data, sel, setSel, commit, labelOf, elLabel }: {
  data: PageData; sel: Sel; setSel: (sel: Sel) => void; commit: (data: PageData, key?: string) => void
  labelOf: (type: string) => string; elLabel: (el: FreeElement) => string
}) {
  const [query, setQuery] = useState('')
  const [closed, setClosed] = useState<Record<string, boolean>>({})
  const [rename, setRename] = useState<{ id: string; value: string } | null>(null)
  const [multi, setMulti] = useState<{ owner: string; ids: string[] }>({ owner: '', ids: [] })
  const [drag, setDrag] = useState<{ owner: string; id: string; block?: boolean } | null>(null)
  const all = [...data.content.flatMap(elsOf), ...floatOf(data)]
  const ids = multi.ids.filter((id) => all.some((el) => el.id === id))
  const q = query.trim().toLocaleLowerCase()
  const toggle = (id: string) => setClosed((value) => ({ ...value, [id]: !value[id] }))
  const select = (owner: string, el: FreeElement, extend = false) => {
    setSel({ block: owner, el: el.id })
    setMulti((value) => ({ owner, ids: extend && value.owner === owner ? value.ids.includes(el.id) ? value.ids.filter((id) => id !== el.id) : [...value.ids, el.id] : [el.id] }))
  }
  const editName = (id: string, fallback: string, save: (value: string) => void) => rename?.id === id
    ? <input className="cv-layer-rename" aria-label="Tên lớp" autoFocus value={rename.value} maxLength={80} onChange={(event) => setRename({ id, value: event.target.value })} onBlur={() => { save(rename.value.trim()); setRename(null) }} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); if (event.key === 'Escape') { event.preventDefault(); setRename(null) } }} />
    : <span className="cv-layer-name">{fallback}</span>

  const rows = (owner: string, list: FreeElement[], parent?: string, visited = new Set<string>()): React.ReactNode => {
    const roots = list.filter((el) => parent ? el.parentId === parent : !el.parentId || !list.some((item) => item.id === el.parentId))
    return [...roots].reverse().map((el) => {
      if (visited.has(el.id)) return null
      const nextVisited = new Set([...visited, el.id])
      const familyMatches = (id: string, seen = new Set<string>()): boolean => {
        if (seen.has(id)) return false
        seen.add(id)
        const item = list.find((candidate) => candidate.id === id)
        return Boolean(item && (elLabel(item).toLocaleLowerCase().includes(q) || list.some((child) => child.parentId === id && familyMatches(child.id, seen))))
      }
      if (q && !familyMatches(el.id)) return null
      const kids = list.some((item) => item.parentId === el.id)
      const name = elLabel(el), locked = Boolean(el.props._locked), hidden = Boolean(el.props._hidden)
      return <div key={el.id} role="treeitem" aria-selected={sel.el === el.id} aria-expanded={kids ? !closed[el.id] : undefined}>
        <div className="cv-layer-row" data-selected={sel.el === el.id || (multi.owner === owner && ids.includes(el.id))} data-hidden={hidden}
          draggable={!locked && rename?.id !== el.id}
          onDragStart={(event) => { event.stopPropagation(); event.dataTransfer.setData('text/plain', 'hosso-layer'); setDrag({ owner, id: el.id }) }} onDragEnd={() => setDrag(null)}
          onDragOver={(event) => { if (drag?.owner === owner && !drag.block) { event.preventDefault(); event.stopPropagation() } }}
          onDrop={(event) => { if (drag?.owner !== owner || drag.block) return; event.preventDefault(); event.stopPropagation(); commit(reorderLayer(data, owner, drag.id, el.id)); setDrag(null) }}>
          <GripVertical size={12} className="cv-layer-grip" />
          {kids ? <button type="button" className="cv-layer-icon" aria-label="Thu gọn nhóm" onClick={() => toggle(el.id)}>{closed[el.id] ? <ChevronRight size={13} /> : <ChevronDown size={13} />}</button> : <span className="cv-layer-spacer" />}
          <input type="checkbox" aria-label={`Chọn ${name} để căn chỉnh`} checked={multi.owner === owner && ids.includes(el.id)} onChange={() => select(owner, el, true)} />
          <button type="button" className="cv-layer-select" title={name} onClick={(event) => select(owner, el, event.shiftKey)} onDoubleClick={() => setRename({ id: el.id, value: String(el.props._name ?? '') })}>
            {rename?.id !== el.id && <span className="cv-layer-kind">{el.type === 'container' ? '▣' : el.type === 'text' || el.type === 'heading' ? 'T' : '◇'}</span>}
            {rename?.id !== el.id && editName(el.id, name, () => {})}
          </button>
          {rename?.id === el.id && editName(el.id, name, (value) => commit(patchElProps(data, el.id, { _name: value })))}
          <button type="button" className="cv-layer-icon" aria-label={hidden ? 'Hiện lớp' : 'Ẩn lớp'} title={hidden ? 'Hiện lớp' : 'Ẩn lớp'} onClick={() => commit(patchElProps(data, el.id, { _hidden: !hidden }))}>{hidden ? <EyeOff size={14} /> : <Eye size={14} />}</button>
          <button type="button" className="cv-layer-icon" aria-label={locked ? 'Mở khóa lớp' : 'Khóa lớp'} title={locked ? 'Mở khóa lớp' : 'Khóa lớp'} onClick={() => commit(patchElProps(data, el.id, { _locked: !locked }))}>{locked ? <Lock size={14} /> : <Unlock size={14} />}</button>
          <button type="button" className="cv-layer-icon cv-layer-delete" aria-label="Xóa lớp" disabled={locked} onClick={() => { commit(removeEl(data, el.id)); setSel({ block: owner, el: '' }) }}><Trash2 size={13} /></button>
        </div>
        {kids && (!closed[el.id] || q) && <div role="group" className="cv-layer-children">{rows(owner, list, el.id, nextVisited)}</div>}
      </div>
    })
  }

  return <div className="cv-layers-panel">
    <label className="cv-search"><Search size={15} /><input type="search" placeholder="Tìm lớp…" aria-label="Tìm lớp" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
    <p className="cv-tool-help">Nhấp đúp để đổi tên. Kéo tay nắm để sắp xếp; Shift + bấm hoặc đánh dấu để chọn nhiều lớp cùng section.</p>
    {ids.length > 1 && <div className="cv-arrange-panel"><strong>{ids.length} lớp đã chọn</strong><div>{ARRANGE.map((action) => <button type="button" key={action.id} disabled={(action.id === 'horizontal' || action.id === 'vertical') && ids.length < 3} onClick={() => commit(arrangeElements(data, multi.owner, ids, action.id))}>{action.label}</button>)}</div><button type="button" onClick={() => { const result = groupElements(data, multi.owner, ids); if (result.id) { commit(result.data); setSel({ block: multi.owner, el: result.id }); setMulti({ owner: multi.owner, ids: [result.id] }) } }}><Group size={14} />Gom nhóm</button></div>}
    {sel.el && all.find((el) => el.id === sel.el)?.type === 'container' && <button className="cv-tool-button" type="button" onClick={() => { commit(ungroupElement(data, sel.block, sel.el)); setSel({ block: sel.block, el: '' }) }}><Ungroup size={14} />Tách nhóm</button>}
    <div role="tree" aria-label="Cấu trúc trang">
      {floatOf(data).length > 0 && <div role="treeitem" aria-expanded><h3 className="cv-catalog-heading">Lớp nổi toàn trang</h3><div role="group">{rows(PAGE, floatOf(data))}</div></div>}
      {data.content.map((block, index) => {
        const id = blockId(block), name = String(block.props._name || `${labelOf(block.type)} ${index + 1}`), list = elsOf(block)
        if (q && !`${name} ${list.map(elLabel).join(' ')}`.toLocaleLowerCase().includes(q)) return null
        return <div key={id} className="cv-layer-section" role="treeitem" aria-expanded={!closed[id]} aria-selected={sel.block === id && !sel.el}>
          <div className="cv-layer-section-head" draggable={rename?.id !== id} onDragStart={(event) => { event.dataTransfer.setData('text/plain', 'hosso-layer'); setDrag({ owner: '', id, block: true }) }} onDragEnd={() => setDrag(null)} onDragOver={(event) => { if (drag?.block) event.preventDefault() }} onDrop={(event) => { if (!drag?.block || drag.id === id) return; event.preventDefault(); const content = data.content.filter((item) => blockId(item) !== drag.id), moving = data.content.find((item) => blockId(item) === drag.id); if (moving) { content.splice(content.findIndex((item) => blockId(item) === id), 0, moving); commit({ ...data, content }) } setDrag(null) }}>
            <GripVertical size={13} /><button type="button" className="cv-layer-icon" aria-label="Thu gọn phần" onClick={() => toggle(id)}>{closed[id] ? <ChevronRight size={14} /> : <ChevronDown size={14} />}</button>
            {rename?.id === id ? editName(id, name, (value) => commit(patchBlock(data, id, { _name: value }))) : <button type="button" className="cv-layer-select" title={name} onClick={() => setSel({ block: id, el: '' })} onDoubleClick={() => setRename({ id, value: String(block.props._name ?? '') })}><span className="cv-layer-name">{name}</span></button>}
            <button type="button" className="cv-layer-icon" aria-label="Đổi tên phần" onClick={() => setRename({ id, value: name })}><Pencil size={13} /></button>
            <button type="button" className="cv-layer-icon" aria-label="Xóa phần" onClick={() => { commit(removeBlock(data, id)); setSel({ block: '', el: '' }) }}><Trash2 size={13} /></button>
          </div>
          {(!closed[id] || q) && <div role="group">{rows(id, list)}</div>}
        </div>
      })}
      {!data.content.length && !floatOf(data).length && <p className="cv-tool-help">Trang chưa có phần nào.</p>}
    </div>
  </div>
}
