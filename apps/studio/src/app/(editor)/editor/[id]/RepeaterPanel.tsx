'use client'
import React, { useState } from 'react'
import { cloneElements, elementFamily, type FreeElement } from '@hosso/studio-blocks'
import { inheritedElementFlag } from '../../../../../../../packages/blocks/src/free-geometry'
import { DEFAULT_REPEAT_TEMPLATE, REPEAT_FIELDS, REPEAT_TYPES } from '../../../../../../../packages/blocks/src/repeater-data'
import { blockId, elsOf, findEl, insertBlock, newBlockId, patchBlock, patchElProps, removeBlock, setBlockEls, type PageData, type Sel } from './canvas-model'

export function RepeaterPanel({ data, sel, commit, setSel, onAdd }: { data: PageData; sel: Sel; commit: (data: PageData) => void; setSel: (sel: Sel) => void; onAdd: () => void }) {
  const [error, setError] = useState('')
  const selected = findEl(data, sel.el), block = data.content.find((b) => blockId(b) === sel.block), el = selected?.el
  const repeater = el?.type === 'widget' && el.props.widget?.type === 'DataRepeater' ? el.props.widget.props : block?.type === 'DataRepeater' ? block.props : undefined
  const root = block && elsOf(block).find((candidate) => candidate.props._repeatTarget)
  const editTarget = block?.props._repeatTarget ?? root?.props._repeatTarget
  const save = () => {
    if (!root || !block) return
    const target = root.props._repeatTarget, family = elementFamily(elsOf(block), root.id)
    if (family.some((item) => !REPEAT_TYPES.has(item.type))) { setError('Ô mẫu hỗ trợ chữ, ảnh, nút, hình, video, biểu tượng và khung.'); return }
    const template = family.map((item) => { const { _repeatTarget, ...props } = item.props; return { ...item, props } })
    let next = data
    if (target.el) { const found = findEl(data, target.el); if (!found || found.el.props.widget?.type !== 'DataRepeater') { setError('Danh sách gốc đã bị xóa.'); return } next = patchElProps(data, target.el, { widget: { ...found.el.props.widget, props: { ...found.el.props.widget.props, _template: template } } }) }
    else { if (!data.content.some((b) => blockId(b) === target.block)) { setError('Danh sách gốc đã bị xóa.'); return } next = patchBlock(data, target.block, { _template: template }) }
    commit(removeBlock(next, blockId(block))); setSel({ block: target.block, el: target.el || '' }); setError('')
  }
  const open = () => {
    if (!repeater) return
    const template = cloneElements(repeater._template?.length ? repeater._template : DEFAULT_REPEAT_TEMPLATE, 0)
    const roots = template.filter((item: FreeElement) => !template.some((p: FreeElement) => p.id === item.parentId))
    const main = roots[0]
    if (!main) return
    main.props = { ...main.props, _frame: true, _repeatTarget: { block: sel.block, ...(el?.type === 'widget' ? { el: el.id } : {}) } }
    const id = newBlockId('FreeCanvas')
    commit(insertBlock(data, { type: 'FreeCanvas', props: { id, _repeatTarget: main.props._repeatTarget, height: Math.max(450, ...template.map((item: FreeElement) => item.y + item.h + 80)), _els: template } }, data.content.at(-1)?.props.id)); setSel({ block: id, el: main.id })
  }
  const convert = () => {
    if (!el || el.type !== 'container' || !selected) return
    const family = elementFamily(elsOf(selected.block), el.id)
    if (family.some((item) => inheritedElementFlag(selected ? elsOf(selected.block) : [], item.id, '_locked'))) { setError('Mở khóa khung và nội dung trước khi áp dụng.'); return }
    if (family.some((item) => !REPEAT_TYPES.has(item.type))) { setError('Ô mẫu hỗ trợ chữ, ảnh, nút, hình, video, biểu tượng và khung.'); return }
    const template = family.map((item) => ({ ...item, x: item.x - el.x, y: item.y - el.y, parentId: item.id === el.id ? undefined : item.parentId }))
    const id = newBlockId('DataRepeater')
    commit(insertBlock(setBlockEls(data, blockId(selected.block), elsOf(selected.block).filter((item) => !family.includes(item))), { type: 'DataRepeater', props: { id, source: 'manual', columns: 3, gap: 24, count: 6, _template: template, items: [{ title: 'Nội dung đầu tiên', excerpt: 'Sửa dữ liệu trong thuộc tính', cover: '/editor-demo/mountain.jpg', href: '' }] } }, data.content.at(-1)?.props.id)); setSel({ block: id, el: '' })
  }
  const props = el?.props ?? {}, binding = props._bind ?? {}
  const bindKeys = el?.type === 'image' ? ['src', 'alt', 'href'] : el && ['text', 'heading', 'button'].includes(el.type) ? ['text', 'href'] : el?.type === 'number' ? ['value'] : []
  return <section className="cv-workbench-panel cv-repeater-panel"><h3 className="cv-catalog-heading">Danh sách dữ liệu</h3><p className="cv-tool-help">Thiết kế một ô rồi lặp từ dữ liệu thủ công, bài viết hoặc sản phẩm.</p><div className="cv-repeat-mini" aria-hidden="true">{[1, 2, 3].map((n) => <div key={n}><i /><b /><span /></div>)}</div>
    <button type="button" className="cv-tool-button" onClick={onAdd}>Chèn danh sách mẫu</button>
    {el?.type === 'container' && !root && <button type="button" className="cv-tool-button" onClick={convert}>Dùng khung đang chọn làm ô mẫu</button>}
    {repeater && <button type="button" className="cv-tool-button is-primary" onClick={open}>Mở ô mẫu trên canvas</button>}
    {editTarget && <><p className="cv-tool-help">Chọn từng lớp để nối trường dữ liệu. Sửa kích thước, chữ, ảnh và màu như bình thường.</p><button type="button" className="cv-tool-button is-primary" disabled={!root} onClick={save}>Áp dụng ô mẫu cho danh sách</button><button type="button" className="cv-tool-button" onClick={() => { commit(removeBlock(data, blockId(block!))); setSel({ block: editTarget.block, el: editTarget.el || '' }) }}>Hủy sửa ô mẫu</button></>}
    {el && bindKeys.map((key) => <label className="cv-tool-field" key={key}>Nối {key === 'text' ? 'nội dung chữ' : key === 'src' ? 'ảnh' : key === 'href' ? 'liên kết' : key}<select aria-label={`Nối dữ liệu ${key}`} value={binding[key] || ''} onChange={(e) => commit(patchElProps(data, el.id, { _bind: { ...binding, [key]: e.target.value } }))}><option value="">Giá trị cố định</option>{REPEAT_FIELDS.map((field) => <option key={field} value={field}>{field}</option>)}</select></label>)}
    {error && <p role="alert" className="cv-tool-error">{error}</p>}
  </section>
}
