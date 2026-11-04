'use client'
import React, { useContext } from 'react'
import { FREE_FONTS, type FreeElement } from '@hosso/studio-blocks'
import { inheritedElementFlag } from '../../../../../../../packages/blocks/src/free-geometry.ts'
import { elementStyleProps, setBlockEls, type PageData } from './canvas-model'
import { selectionOwners } from './canvas-selection'
import { batchStyle } from './batch-style'
import { StyleClipboardContext } from './FreeCanvasEditor'

export function BatchStylePanel({ data, owner, list: ownerList, ids, commit, allOwners = false }: { data: PageData; owner: string; list: FreeElement[]; allOwners?: boolean; ids: string[]; commit: (data: PageData, key?: string) => void }) {
  const clipboard = useContext(StyleClipboardContext)
  const owners = allOwners ? selectionOwners(data) : [{ id: owner, list: ownerList }], list = owners.flatMap((group) => group.list)
  const selected = list.filter((el) => ids.includes(el.id)), first = selected[0]
  if (!first || ids.length < 2) return null
  const editable = selected.filter((el) => !inheritedElementFlag(list, el.id, '_locked'))
  const put = (patch: Record<string, unknown>) => {
    let next = data
    for (const group of owners) if (group.list.some((el) => ids.includes(el.id))) next = setBlockEls(next, group.id, batchStyle(group.list, ids, patch))
    commit(next, 'batch:' + ids.join(','))
  }
  const mixed = (key: string) => selected.some((el) => el.props[key] !== first.props[key])
  return <fieldset className="cv-batch-style" disabled={!editable.length}>
    <legend>Kiểu của {editable.length} phần tử</legend>
    {editable.length < selected.length && <p className="cv-tool-help">{selected.length - editable.length} lớp đang khóa được giữ nguyên.</p>}
    <div className="cv-tool-grid">{[['color', 'Màu chữ'], ['bg', 'Màu nền'], ['borderColor', 'Màu viền']].map(([key, label]) => <label className="cv-tool-field" key={key}>{label}{mixed(key) && <small>Nhiều giá trị</small>}<input aria-label={`Hàng loạt: ${label}`} type="color" value={/^#[0-9a-f]{6}$/i.test(first.props[key] ?? '') ? first.props[key] : '#ffffff'} onChange={(event) => put({ [key]: event.target.value })} /></label>)}</div>
    <label className="cv-tool-field">Font chữ<select aria-label="Hàng loạt: Font chữ" value={mixed('font') ? '__mixed' : first.props.font || ''} onChange={(event) => put({ font: event.target.value })}>{mixed('font') && <option value="__mixed" disabled>Nhiều giá trị</option>}<option value="">Theo website</option>{FREE_FONTS.map((font) => <option key={font.name} value={font.name}>{font.name}</option>)}</select></label>
    <div className="cv-tool-grid">{[['size', 'Cỡ chữ', 8, 200], ['borderW', 'Độ dày viền', 0, 50], ['radius', 'Bo góc', 0, 600], ['opacity', 'Độ rõ (%)', 0, 100]].map(([key, label, min, max]) => <label className="cv-tool-field" key={key}>{label}<input aria-label={`Hàng loạt: ${label}`} type="number" placeholder={mixed(String(key)) ? 'Nhiều giá trị' : ''} value={mixed(String(key)) ? '' : first.props[key] ?? ''} min={Number(min)} max={Number(max)} onChange={(event) => { if (event.target.value !== '') put({ [key]: Math.max(Number(min), Math.min(Number(max), Number(event.target.value))) }) }} /></label>)}</div>
    <div className="cv-tool-inline"><button type="button" onClick={() => clipboard?.setStyle(elementStyleProps(first.props))}>Sao chép kiểu lớp đầu</button><button type="button" disabled={!clipboard?.style} onClick={() => clipboard?.style && put(clipboard.style)}>Dán kiểu vào các lớp</button></div>
  </fieldset>
}
