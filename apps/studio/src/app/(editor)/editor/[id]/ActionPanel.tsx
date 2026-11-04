'use client'
import React, { useEffect, useRef, useState } from 'react'
import { actionHref, readLinkAction, type LinkAction } from '../../../../../../../packages/blocks/src/link-actions'
import { blockId, type PageData } from './canvas-model'

export function ActionPanel({ href, data, onChange }: { href?: string; data: PageData; onChange: (href: string, anchor?: string) => void }) {
  const initial = readLinkAction(href), [type, setType] = useState<LinkAction>(initial.type), [value, setValue] = useState(initial.value), [picking, setPicking] = useState(false)
  const emitted = useRef(href)
  useEffect(() => { if (href === emitted.current) return; const next = readLinkAction(href); setType(next.type); setValue(next.value); emitted.current = href }, [href])
  const emit = (next: string, anchor?: string) => { emitted.current = next; onChange(next, anchor) }
  const change = (kind: LinkAction, text: string) => { setPicking(false); setType(kind); setValue(text); emit(actionHref(kind, text)) }
  const targets = data.content.filter((block) => type === 'popup' ? block.type === 'Popup' : block.type !== 'Popup')
  const selectTarget = (id: string) => {
    const block = data.content.find((item) => blockId(item) === id)
    if (!block || (type === 'popup' ? block.type !== 'Popup' : block.type === 'Popup')) return
    const next = type === 'popup' ? String(block.props.triggerKey || id) : id
    setValue(next); emit(actionHref(type, next), type === 'section' ? id : undefined)
    setPicking(false)
  }
  useEffect(() => {
    if (!picking) return
    const doc = document.querySelector<HTMLIFrameElement>('iframe[title="Trang"]')?.contentDocument
    if (!doc) { setPicking(false); return }
    doc.body.dataset.actionPicking = 'true'
    const cursor = doc.body.style.cursor, style = doc.createElement('style')
    doc.body.style.cursor = 'crosshair'; style.textContent = 'body[data-action-picking=true] [data-block]:hover{outline:2px dashed #2d7b57;outline-offset:-2px}'; doc.head.appendChild(style)
    const pick = (event: PointerEvent) => { const id = (event.target as Element).closest('[data-block]')?.getAttribute('data-block'); if (!id) return; event.preventDefault(); event.stopImmediatePropagation(); selectTarget(id) }
    const cancel = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); setPicking(false) } }
    doc.addEventListener('pointerdown', pick, true); doc.addEventListener('keydown', cancel, true); document.addEventListener('keydown', cancel, true)
    return () => { delete doc.body.dataset.actionPicking; doc.body.style.cursor = cursor; style.remove(); doc.removeEventListener('pointerdown', pick, true); doc.removeEventListener('keydown', cancel, true); document.removeEventListener('keydown', cancel, true) }
  }, [picking, type, data])
  return <div className="cv-action-panel"><label className="cv-tool-field">Khi bấm<select aria-label="Hành động khi bấm" value={type} onChange={(event) => change(event.target.value as LinkAction, '')}>
    <option value="none">Không có hành động</option><option value="url">Mở liên kết</option><option value="popup">Mở popup</option><option value="section">Cuộn đến phần</option><option value="phone">Gọi điện</option><option value="email">Gửi email</option>
  </select></label>
    {['section', 'popup'].includes(type) ? <><label className="cv-tool-field">Đích đến<select aria-label="Đích hành động" value={type === 'popup' ? targets.find((item) => String(item.props.triggerKey || blockId(item)) === value)?.props.id ?? '' : value} onChange={(event) => selectTarget(event.target.value)}><option value="">Chọn {type === 'popup' ? 'popup' : 'phần'}</option>{targets.map((item, index) => <option key={blockId(item)} value={blockId(item)}>{item.props.title || item.props._name || `${index + 1}. ${item.type}`}</option>)}</select></label><button type="button" className="cv-tool-button" aria-pressed={picking} onClick={() => setPicking(!picking)}>{picking ? 'Hủy chọn trên canvas' : 'Chọn đích trên canvas'}</button></> : type !== 'none' && <label className="cv-tool-field">{type === 'phone' ? 'Số điện thoại' : type === 'email' ? 'Địa chỉ email' : 'Địa chỉ liên kết'}<input aria-label="Giá trị hành động" value={value} onChange={(event) => change(type, event.target.value)} placeholder={type === 'phone' ? '+84…' : type === 'email' ? 'hello@example.com' : 'https://… hoặc /trang'} /></label>}
    {picking && <p role="status" className="cv-tool-help">Bấm vào phần đích trên canvas. Escape để hủy.</p>}
    {value && !actionHref(type, value) && <p role="alert" className="cv-tool-error">Địa chỉ chưa hợp lệ.</p>}
  </div>
}
