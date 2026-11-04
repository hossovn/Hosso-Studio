'use client'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { findPageReplacements, applyPageReplacements, type ReplaceKind } from './page-replace'
import { type PageData, type Sel } from './canvas-model'
export type EditorCommand = { id: string; label: string; keywords?: string; run: () => void }
const searchText = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase()
export function CommandPalette({ open, onClose, commands }: { open: boolean; onClose: () => void; commands: EditorCommand[] }) {
  const ref = useRef<HTMLDialogElement>(null), [query, setQuery] = useState(''), [active, setActive] = useState(0)
  const results = useMemo(() => commands.filter((c) => searchText(c.label + ' ' + (c.keywords ?? '')).includes(searchText(query))).slice(0, 60), [commands, query])
  useEffect(() => { if (open) { setQuery(''); setActive(0); ref.current?.showModal() } else ref.current?.close() }, [open])
  useEffect(() => { ref.current?.querySelector(`#cv-command-${active}`)?.scrollIntoView({ block: 'nearest' }) }, [active])
  const execute = (index: number) => { const command = results[index]; if (command) { onClose(); command.run() } }
  return <dialog ref={ref} className="cv-quick-dialog" aria-label="Lệnh nhanh" onCancel={onClose} onClose={onClose} onKeyDown={(e) => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); setActive((value) => (value + (e.key === 'ArrowDown' ? 1 : -1) + Math.max(1, results.length)) % Math.max(1, results.length)) } else if (e.key === 'Enter') { e.preventDefault(); execute(active) } }}>
    <header><h2>Lệnh nhanh</h2><button type="button" aria-label="Đóng lệnh nhanh" onClick={onClose}>×</button></header>
    <input autoFocus aria-label="Tìm lệnh" placeholder="Thêm nút, đổi nền, đến phần liên hệ…" value={query} onChange={(e) => { setQuery(e.target.value); setActive(0) }} role="combobox" aria-expanded={true} aria-controls="cv-command-results" aria-activedescendant={results[active] ? `cv-command-${active}` : undefined} />
    <div id="cv-command-results" role="listbox" aria-label="Kết quả lệnh">{results.map((command, index) => <button key={command.id} id={`cv-command-${index}`} type="button" role="option" aria-selected={index === active} onPointerMove={() => setActive(index)} onClick={() => execute(index)}>{command.label}</button>)}{!results.length && <p role="status">Không có lệnh phù hợp.</p>}</div>
    <footer>↑ ↓ chọn · Enter thực hiện · Escape đóng</footer>
  </dialog>
}
export function ReplaceDialog({ open, onClose, data, commit, setSel }: { open: boolean; onClose: () => void; data: PageData; commit: (data: PageData) => void; setSel: (sel: Sel) => void }) {
  const ref = useRef<HTMLDialogElement>(null), [kind, setKind] = useState<ReplaceKind>('text'), [find, setFind] = useState(''), [replacement, setReplacement] = useState(''), [sensitive, setSensitive] = useState(false), [message, setMessage] = useState(''), [excluded, setExcluded] = useState<Set<number>>(new Set())
  const matches = useMemo(() => findPageReplacements(data, kind, find, replacement, sensitive), [data, kind, find, replacement, sensitive])
  useEffect(() => { setExcluded(new Set()); setMessage('') }, [kind, find, replacement, sensitive])
  useEffect(() => { if (open) ref.current?.showModal(); else ref.current?.close() }, [open])
  return <dialog ref={ref} className="cv-quick-dialog" aria-label="Tìm và thay thế" onCancel={onClose} onClose={onClose}>
    <header><h2>Tìm và thay thế</h2><button type="button" aria-label="Đóng tìm và thay thế" onClick={onClose}>×</button></header>
    <label className="cv-tool-field">Loại<select aria-label="Loại thay thế" value={kind} onChange={(e) => setKind(e.target.value as ReplaceKind)}><option value="text">Nội dung chữ</option><option value="link">Đường dẫn</option><option value="phone">Số điện thoại</option><option value="font">Font</option><option value="color">Màu</option></select></label>
    <label className="cv-tool-field">Tìm<input autoFocus aria-label="Giá trị cần tìm" value={find} maxLength={1000} onChange={(e) => setFind(e.target.value)} /></label><label className="cv-tool-field">Thay bằng<input aria-label="Giá trị thay thế" value={replacement} onChange={(e) => setReplacement(e.target.value)} /></label>
    <label className="cv-tool-check"><input type="checkbox" checked={sensitive} onChange={(e) => setSensitive(e.target.checked)} />Phân biệt chữ hoa/thường</label>
    <p className="cv-tool-help">{matches.length} thay đổi được xem trước. Bỏ chọn những chỗ cần giữ. Font và màu khớp toàn bộ giá trị; các lớp đã khóa được giữ nguyên.</p>
    <div className="cv-replace-results">{matches.map((match, index) => <article key={`${match.owner}:${match.element}:${match.path.join('.')}`}><label><input type="checkbox" aria-label={`Áp dụng thay đổi ${index + 1}`} checked={!excluded.has(index)} onChange={() => setExcluded((value) => { const next = new Set(value); if (next.has(index)) next.delete(index); else next.add(index); return next })} /><strong>{match.label}</strong></label><del>{match.before.slice(0, 180)}</del><ins>{match.after.slice(0, 180)}</ins><button type="button" onClick={() => { setSel({ block: match.owner, el: match.element }); onClose() }}>Đến vị trí</button></article>)}</div>
    <button type="button" className="cv-tool-button is-primary" disabled={!matches.length || excluded.size === matches.length} onClick={() => { const chosen = matches.filter((_, i) => !excluded.has(i)); commit(applyPageReplacements(data, chosen)); setMessage(`Đã thay ${chosen.length} giá trị. Ctrl+Z để hoàn tác.`) }}>Áp dụng {matches.length - excluded.size} thay đổi</button>{message && <p role="status">{message}</p>}
  </dialog>
}
