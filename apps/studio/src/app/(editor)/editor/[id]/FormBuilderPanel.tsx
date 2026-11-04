'use client'
import React, { useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, GripVertical, Plus, Save, Trash2 } from 'lucide-react'
import type { NavCtx } from './SitePanels'

type Field = { id?: string; label: string; name: string; type: string; required: boolean; placeholder?: string; options?: string }
type Definition = { id?: string | number; title: string; slug: string; fields: Field[]; submitLabel: string; successMessage: string; delivery?: { successHref?: string; email?: string; webhookUrl?: string } }
const slug = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
const fresh = (): Definition => ({ title: '', slug: '', fields: [{ label: 'Họ tên', name: 'name', type: 'text', required: true }, { label: 'Điện thoại', name: 'phone', type: 'tel', required: true }, { label: 'Email', name: 'email', type: 'email', required: false }], submitLabel: 'Gửi thông tin', successMessage: 'Đã nhận thông tin. Chúng tôi sẽ liên hệ với bạn sớm.', delivery: {} })
const TYPES = [{ value: 'text', label: 'Một dòng' }, { value: 'email', label: 'Email' }, { value: 'tel', label: 'Điện thoại' }, { value: 'number', label: 'Số' }, { value: 'textarea', label: 'Nhiều dòng' }, { value: 'select', label: 'Danh sách chọn' }, { value: 'checkbox', label: 'Ô đánh dấu' }]

export function FormBuilderPanel({ nav, onInsert }: { nav?: NavCtx; onInsert: (slug: string, title: string) => void }) {
  const [docs, setDocs] = useState<Definition[]>([])
  const [draft, setDraft] = useState<Definition>(fresh)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [editing, setEditing] = useState(false)
  useEffect(() => {
    if (!nav) return
    let active = true
    fetch(`/api/forms?limit=100&depth=0&locale=${nav.locale}`).then(async (res) => { if (!res.ok) throw new Error(); return res.json() }).then((body) => { if (active) setDocs(body.docs ?? []) }).catch(() => { if (active) setError('Không tải được danh sách biểu mẫu.') })
    return () => { active = false }
  }, [nav?.locale])
  const move = (from: number, to: number) => {
    if (from < 0 || to < 0 || from === to || to >= draft.fields.length) return
    const fields = [...draft.fields], [field] = fields.splice(from, 1); fields.splice(to, 0, field)
    setDraft({ ...draft, fields })
  }
  const updateField = (index: number, patch: Partial<Field>) => setDraft({ ...draft, fields: draft.fields.map((field, at) => at === index ? { ...field, ...patch } : field) })
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setMessage('')
    const fieldNames = draft.fields.map((field) => slug(field.name || field.label))
    if (!draft.title.trim() || !draft.fields.length || fieldNames.some((name) => !/^[a-z][a-z0-9_]*$/.test(name)) || new Set(fieldNames).size !== fieldNames.length) return setError('Tên trường phải bắt đầu bằng chữ, chỉ gồm chữ thường, số, gạch dưới và không trùng nhau.')
    setBusy(true)
    try {
      const payload = { ...draft, slug: draft.slug || slug(draft.title), fields: draft.fields.map((field, index) => ({ ...field, name: fieldNames[index] })) }
      const res = await fetch(`/api/forms${draft.id ? '/' + draft.id : ''}?locale=${nav?.locale ?? 'vi'}`, { method: draft.id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.errors?.[0]?.message || 'Không lưu được biểu mẫu. Cần quyền xuất bản để sửa định nghĩa form.')
      setDraft(body.doc); setDocs((current) => [body.doc, ...current.filter((doc) => doc.id !== body.doc.id)]); setMessage('Đã lưu định nghĩa biểu mẫu.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không lưu được biểu mẫu.') }
    finally { setBusy(false) }
  }
  return <div className="cv-workbench-panel cv-form-builder">
    <h3 className="cv-catalog-heading">Biểu mẫu đã lưu <span>{docs.length}</span></h3>
    {docs.map((doc) => <div className="cv-saved-row" key={doc.id}><div><strong>{doc.title}</strong><small>{doc.fields?.length || 0} trường · {doc.slug}</small></div><button type="button" onClick={() => { setDraft(structuredClone(doc)); setEditing(true); setError(''); setMessage('') }}>Sửa</button><button type="button" title="Chèn biểu mẫu" onClick={() => onInsert(doc.slug, doc.title)}><Plus size={16} /></button></div>)}
    <button type="button" className="cv-tool-button" disabled={!nav} onClick={() => { setDraft(fresh()); setEditing(true); setError(''); setMessage('') }}><Plus size={15} />Tạo biểu mẫu</button>
    {!nav && <p className="cv-tool-help">Mở trang đã đăng nhập để tạo và lưu biểu mẫu.</p>}
    {editing && <form onSubmit={save}>
      <label className="cv-tool-field">Tên biểu mẫu<input required value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
      <label className="cv-tool-field">Mã biểu mẫu<input value={draft.slug} onChange={(event) => setDraft({ ...draft, slug: slug(event.target.value) })} placeholder={slug(draft.title)} /></label>
      <div className="cv-form-fields">{draft.fields.map((field, index) => <fieldset key={index} draggable onDragStart={(event) => { event.dataTransfer.setData('text/plain', 'hosso-form-field'); setDragIndex(index) }} onDragEnd={() => setDragIndex(null)} onDragOver={(event) => { if (dragIndex !== null) event.preventDefault() }} onDrop={(event) => { if (dragIndex === null) return; event.preventDefault(); move(dragIndex, index); setDragIndex(null) }}><legend><GripVertical size={13} />Trường {index + 1}</legend>
        <div className="cv-form-field-actions"><button type="button" title="Lên" disabled={index === 0} onClick={() => move(index, index - 1)}><ArrowUp size={13} /></button><button type="button" title="Xuống" disabled={index === draft.fields.length - 1} onClick={() => move(index, index + 1)}><ArrowDown size={13} /></button><button type="button" title="Xóa trường" disabled={draft.fields.length === 1} onClick={() => setDraft({ ...draft, fields: draft.fields.filter((_, at) => at !== index) })}><Trash2 size={13} /></button></div>
        <label className="cv-tool-field">Nhãn<input required value={field.label} onChange={(event) => updateField(index, { label: event.target.value })} /></label>
        <div className="cv-tool-grid"><label className="cv-tool-field">Tên dữ liệu<input required value={field.name} onChange={(event) => updateField(index, { name: slug(event.target.value) })} /></label><label className="cv-tool-field">Loại<select value={field.type} onChange={(event) => updateField(index, { type: event.target.value })}>{TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label></div>
        <label className="cv-tool-field">Gợi ý<input value={field.placeholder ?? ''} onChange={(event) => updateField(index, { placeholder: event.target.value })} /></label>
        {field.type === 'select' && <label className="cv-tool-field">Lựa chọn, cách nhau bằng dấu phẩy<input value={field.options ?? ''} onChange={(event) => updateField(index, { options: event.target.value })} /></label>}
        <label className="cv-tool-check"><input type="checkbox" checked={Boolean(field.required)} onChange={(event) => updateField(index, { required: event.target.checked })} />Bắt buộc</label>
      </fieldset>)}</div>
      <button className="cv-tool-button" type="button" onClick={() => setDraft({ ...draft, fields: [...draft.fields, { label: 'Trường mới', name: `field_${draft.fields.length + 1}`, type: 'text', required: false }] })}><Plus size={14} />Thêm trường</button>
      <label className="cv-tool-field">Nút gửi<input value={draft.submitLabel ?? ''} onChange={(event) => setDraft({ ...draft, submitLabel: event.target.value })} /></label>
      <label className="cv-tool-field">Thông báo thành công<textarea rows={2} value={draft.successMessage ?? ''} onChange={(event) => setDraft({ ...draft, successMessage: event.target.value })} /></label>
      <details className="cv-tool-details"><summary>Sau khi gửi và kết nối CRM</summary><p className="cv-tool-help">Lead luôn được lưu trong Studio. Có thể gửi thêm email hoặc webhook JSON tới CRM.</p>
        <label className="cv-tool-field">Trang cảm ơn<input placeholder="/cam-on" value={draft.delivery?.successHref ?? ''} onChange={(event) => setDraft({ ...draft, delivery: { ...draft.delivery, successHref: event.target.value } })} /></label>
        <label className="cv-tool-field">Email nhận thông báo<input type="email" value={draft.delivery?.email ?? ''} onChange={(event) => setDraft({ ...draft, delivery: { ...draft.delivery, email: event.target.value } })} /></label>
        <label className="cv-tool-field">Webhook CRM (HTTPS)<input type="url" placeholder="https://crm.example.com/webhook" value={draft.delivery?.webhookUrl ?? ''} onChange={(event) => setDraft({ ...draft, delivery: { ...draft.delivery, webhookUrl: event.target.value } })} /></label>
      </details>
      <button type="submit" className="cv-tool-button is-primary" disabled={busy}><Save size={14} />{busy ? 'Đang lưu…' : 'Lưu biểu mẫu'}</button>
      {draft.id && <button type="button" className="cv-tool-button" onClick={() => onInsert(draft.slug, draft.title)}>Chèn vào trang</button>}
    </form>}
    {error && <p className="cv-tool-error" role="alert">{error}</p>}{message && <p className="cv-tool-success" role="status">{message}</p>}
  </div>
}
