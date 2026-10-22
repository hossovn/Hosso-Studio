'use client'
import { ColorControl, patchWidgetPart, widgetPartKey, widgetPartsForDevice, widgetPartPath, widgetPartScope, type WidgetPartDevice, type WidgetPartStyle } from '@hosso/studio-blocks'
import { ArrowUp, RotateCcw } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { blockId, patchBlock, type Block, type PageData, type Sel } from './canvas-model'

const input: React.CSSProperties = { width: '100%', minWidth: 0, padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: 4, font: 'inherit', background: '#fff', color: '#111827' }
const row = (label: string, control: React.ReactNode) => <label style={{ display: 'grid', gap: 5, marginBottom: 10, fontSize: 12 }}>{label}{control}</label>

export function WidgetPartPicker({ block, sel, setSel, docs }: { block: Block; sel: Sel; setSel: (sel: Sel) => void; docs: Document[] }) {
  const [items, setItems] = useState<{ path: string; label: string }[]>([])
  const id = blockId(block)
  useEffect(() => {
    const root = docs.map((doc) => doc.querySelector('[data-hs-parts="' + widgetPartScope(id) + '"]')).find(Boolean)
    if (!root) { setItems([]); return }
    const collect = () => setItems(Array.from(root.querySelectorAll('*')).flatMap((el) => {
      if (!el.getClientRects().length || ['style', 'script', 'option'].includes(el.localName) || el.closest('[aria-hidden="true"], [hidden]') || (el.closest('svg') && el.localName !== 'svg')) return []
      const path = widgetPartPath(root, el)
      return path ? [{ path, label: '  '.repeat(Math.min(8, path.split(' > ').length - 1)) + el.localName + ' · ' + (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 45) }] : []
    }))
    collect()
    const observer = new MutationObserver(collect)
    observer.observe(root, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [id, docs])
  return <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>
    {row('Thành phần bên trong', <select aria-label="Thành phần bên trong" style={input} value={sel.part ?? ''} onChange={(e) => setSel({ block: id, el: '', part: e.target.value || undefined })}>
      <option value="">Toàn bộ khối</option>
      {items.map((item) => <option key={item.path} value={item.path}>{item.label}</option>)}
    </select>)}
  </div>
}

export function WidgetPartsInspector({ block, path, data, commit, setSel, device }: { block: Block; path: string; data: PageData; commit: (d: PageData, key?: string) => void; setSel: (s: Sel) => void; device: WidgetPartDevice }) {
  const id = blockId(block)
  const key = widgetPartKey(device)
  const style: WidgetPartStyle = widgetPartsForDevice(block.props, device)[path] ?? {}
  const put = (patch: WidgetPartStyle) => commit(patchBlock(data, id, { [key]: patchWidgetPart(block.props[key], path, patch) }), 'part:' + device + ':' + id + ':' + path + ':' + Object.keys(patch).join(','))
  const number = (key: string, label: string, min = 0, max = 10000) => row(label, <input aria-label={label} style={input} type="number" min={min} max={max} value={style[key] ?? ''} onChange={(e) => put({ [key]: e.target.value === '' ? '' : Math.min(max, Math.max(min, Number(e.target.value))) })} />)
  const select = (key: string, label: string, options: [string, string][]) => row(label, <select aria-label={label} style={input} value={style[key] ?? ''} onChange={(e) => put({ [key]: e.target.value })}><option value="">Mặc định</option>{options.map(([value, name]) => <option key={value} value={value}>{name}</option>)}</select>)
  const group = (title: string, children: React.ReactNode) => <details open style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}><summary style={{ fontWeight: 600, marginBottom: 12, cursor: 'pointer' }}>{title}</summary>{children}</details>
  const reset = () => {
    const parts = { ...block.props[key] }
    delete parts[path]
    commit(patchBlock(data, id, { [key]: parts }))
  }
  return <>
    <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
      <strong style={{ flex: 1, overflowWrap: 'anywhere' }}>{path.split(' > ').at(-1)?.split(':')[0]}</strong>
      <button type="button" title="Chọn phần chứa" aria-label="Chọn phần chứa" onClick={() => setSel({ block: id, el: '', part: path.includes(' > ') ? path.slice(0, path.lastIndexOf(' > ')) : undefined })} style={{ ...input, width: 32, height: 32, cursor: 'pointer' }}><ArrowUp size={16} /></button>
      <button type="button" title="Đặt lại kiểu thành phần" aria-label="Đặt lại kiểu thành phần" onClick={reset} style={{ ...input, width: 32, height: 32, cursor: 'pointer' }}><RotateCcw size={16} /></button>
    </div>
    {group('Vị trí và kích thước', <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 8px' }}>
      {number('x', 'Dịch ngang (px)', -10000)}{number('y', 'Dịch dọc (px)', -10000)}
      {number('width', 'Rộng (px)')}{number('height', 'Cao (px)')}
      {number('maxWidth', 'Rộng tối đa (px)')}{number('minHeight', 'Cao tối thiểu (px)')}
      {number('order', 'Thứ tự', -100)}{number('padding', 'Khoảng đệm (px)')}
    </div>)}
    {group('Bố cục', <>
      {select('display', 'Kiểu bố cục', [['block', 'Khối'], ['inline-block', 'Trong dòng'], ['flex', 'Flex'], ['grid', 'Lưới']])}
      {select('flexDirection', 'Hướng', [['row', 'Hàng ngang'], ['column', 'Cột dọc']])}
      {select('flexWrap', 'Xuống dòng', [['wrap', 'Có'], ['nowrap', 'Không']])}
      {number('columns', 'Số cột', 1, 12)}{number('gap', 'Khoảng cách (px)')}
      {select('alignItems', 'Căn thành phần', [['start', 'Đầu'], ['center', 'Giữa'], ['end', 'Cuối'], ['stretch', 'Kéo giãn']])}
      {select('justifyContent', 'Phân bố', [['start', 'Đầu'], ['center', 'Giữa'], ['end', 'Cuối'], ['space-between', 'Cách đều']])}
    </>)}
    {group('Kiểu dáng', <>
      {row('Màu chữ', <ColorControl value={style.color} onChange={(color) => put({ color })} />)}
      {row('Màu nền', <ColorControl value={style.backgroundColor} onChange={(backgroundColor) => put({ backgroundColor })} />)}
      {number('fontSize', 'Cỡ chữ (px)')}{number('fontWeight', 'Độ đậm', 100, 900)}
      {select('textAlign', 'Căn chữ', [['left', 'Trái'], ['center', 'Giữa'], ['right', 'Phải']])}
      {number('borderRadius', 'Bo góc (px)')}{number('borderWidth', 'Độ dày viền (px)')}
      {select('borderStyle', 'Kiểu viền', [['solid', 'Liền'], ['dashed', 'Đứt'], ['none', 'Không']])}
      {row('Màu viền', <ColorControl value={style.borderColor} onChange={(borderColor) => put({ borderColor })} />)}
    </>)}
  </>
}
