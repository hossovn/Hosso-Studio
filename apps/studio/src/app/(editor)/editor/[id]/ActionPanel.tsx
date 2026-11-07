'use client'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { actionHref, readLinkAction, type LinkAction } from '../../../../../../../packages/blocks/src/link-actions'
import { blockId, elsOf, floatOf, type PageData } from './canvas-model'

export function ActionPanel({ href, data, onChange }: { href?: string; data: PageData; onChange: (href: string, anchor?: string) => void }) {
  const initial = readLinkAction(href), [type, setType] = useState<LinkAction>(initial.type), [value, setValue] = useState(initial.value), [picking, setPicking] = useState(false)
  const emitted = useRef(href)
  useEffect(() => { if (href === emitted.current) return; const next = readLinkAction(href); setType(next.type); setValue(next.value); emitted.current = href }, [href])
  const emit = (next: string, anchor?: string) => { emitted.current = next; onChange(next, anchor) }
  const change = (kind: LinkAction, text: string) => { setPicking(false); setType(kind); setValue(text); emit(actionHref(kind, text)) }
  const targets = data.content.filter((block) => type === 'popup' ? block.type === 'Popup' : block.type !== 'Popup')
  const frames = useMemo(() => {
    const all = [...floatOf(data), ...data.content.flatMap((block) => elsOf(block))]
    return all.filter((el) => el.type === 'container')
  }, [data])
  const popoverFrames = useMemo(() => [...frames].sort((a, b) => Number(Boolean(b.props._isPopover)) - Number(Boolean(a.props._isPopover))), [frames])
  const [stateFrameId = '', stateVariantId = ''] = type === 'state' ? value.split(':') : []
  const selectedStateFrame = frames.find((frame) => frame.id === stateFrameId)
  const stateVariants: { id: string; name: string }[] = Array.isArray(selectedStateFrame?.props._variants) ? selectedStateFrame.props._variants : []
  const selectedPopoverFrame = frames.find((frame) => frame.id === value)

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
    <option value="none">Không có hành động</option>
    <option value="url">Mở liên kết</option>
    <option value="state">Đổi trạng thái khung (Tab)</option>
    <option value="popover">Mở hộp nổi neo nút (Popover)</option>
    <option value="popup">Mở popup</option>
    <option value="section">Cuộn đến phần</option>
    <option value="phone">Gọi điện</option>
    <option value="email">Gửi email</option>
  </select></label>
    {type === 'state' ? <>
      <label className="cv-tool-field">Khung đích<select aria-label="Khung đổi trạng thái" value={stateFrameId} onChange={(event) => {
        const nextFrameId = event.target.value
        const nextFrame = frames.find((item) => item.id === nextFrameId)
        const firstVar = Array.isArray(nextFrame?.props._variants) ? nextFrame.props._variants[0]?.id ?? '' : ''
        if (!nextFrameId) { change('state', ''); return }
        if (firstVar) change('state', `${nextFrameId}:${firstVar}`)
        else { setPicking(false); setType('state'); setValue(`${nextFrameId}:`); emit('') }
      }}><option value="">Chọn khung trên trang</option>{frames.map((frame) => <option key={frame.id} value={frame.id}>{frame.props._name || frame.props.name || frame.id}</option>)}</select></label>
      <label className="cv-tool-field">Trạng thái hiển thị<select aria-label="Biến thể trạng thái" value={stateVariantId} disabled={!selectedStateFrame || !stateVariants.length} onChange={(event) => change('state', stateFrameId && event.target.value ? `${stateFrameId}:${event.target.value}` : '')}><option value="">Chọn biến thể</option>{stateVariants.map((variant) => <option key={variant.id} value={variant.id}>{variant.name}</option>)}</select></label>
      {selectedStateFrame && !stateVariants.length && <p className="cv-tool-help">Khung này chưa có biến thể. Chọn khung trên canvas rồi tạo các trạng thái Tab trong bảng Thuộc tính hoặc Công cụ thiết kế → Biến thể.</p>}
    </> : type === 'popover' ? <>
      <label className="cv-tool-field">Khung hộp nổi<select aria-label="Khung hộp nổi" value={value} onChange={(event) => change('popover', event.target.value)}><option value="">Chọn khung hộp nổi</option>{popoverFrames.map((frame) => <option key={frame.id} value={frame.id}>{(frame.props._name || frame.props.name || frame.id) + (frame.props._isPopover ? ' · [Hộp nổi]' : '')}</option>)}</select></label>
      {selectedPopoverFrame && !selectedPopoverFrame.props._isPopover && <p className="cv-tool-help">Mẹo: chọn khung đích và bật “Ẩn trên trang, chỉ mở dạng hộp nổi (#popover)” để hộp chỉ xuất hiện khi bấm nút này.</p>}
    </> : ['section', 'popup'].includes(type) ? <><label className="cv-tool-field">Đích đến<select aria-label="Đích hành động" value={type === 'popup' ? targets.find((item) => String(item.props.triggerKey || blockId(item)) === value)?.props.id ?? '' : value} onChange={(event) => selectTarget(event.target.value)}><option value="">Chọn {type === 'popup' ? 'popup' : 'phần'}</option>{targets.map((item, index) => <option key={blockId(item)} value={blockId(item)}>{item.props.title || item.props._name || `${index + 1}. ${item.type}`}</option>)}</select></label><button type="button" className="cv-tool-button" aria-pressed={picking} onClick={() => setPicking(!picking)}>{picking ? 'Hủy chọn trên canvas' : 'Chọn đích trên canvas'}</button></> : type !== 'none' && <label className="cv-tool-field">{type === 'phone' ? 'Số điện thoại' : type === 'email' ? 'Địa chỉ email' : 'Địa chỉ liên kết'}<input aria-label="Giá trị hành động" value={value} onChange={(event) => change(type, event.target.value)} placeholder={type === 'phone' ? '+84…' : type === 'email' ? 'hello@example.com' : 'https://… hoặc /trang'} /></label>}
    {picking && <p role="status" className="cv-tool-help">Bấm vào phần đích trên canvas. Escape để hủy.</p>}
    {value && !value.endsWith(':') && !actionHref(type, value) && <p role="alert" className="cv-tool-error">Địa chỉ chưa hợp lệ.</p>}
  </div>
}
