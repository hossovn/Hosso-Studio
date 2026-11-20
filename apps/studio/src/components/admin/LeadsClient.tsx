'use client'
import React, { useCallback, useEffect, useState } from 'react'

const STATUSES: Record<string, string> = { new: 'Mới', contacted: 'Đang liên hệ', qualified: 'Đủ điều kiện', won: 'Đã chốt', lost: 'Không phù hợp' }
const DELIVERY: Record<string, string> = { pending: 'Chờ gửi', sending: 'Đang gửi', retry: 'Sẽ thử lại', sent: 'Đã gửi', failed: 'Cần xử lý' }
const CSS = `.hs-leads{max-width:1320px;padding-bottom:32px}.hs-leads header{display:flex;gap:16px;align-items:center;flex-wrap:wrap;margin-bottom:20px}.hs-leads button,.hs-leads select,.hs-leads textarea{font:inherit;color:inherit;border:1px solid var(--theme-elevation-200);border-radius:6px;background:var(--theme-elevation-0);padding:10px;min-height:42px}.hs-leads button{cursor:pointer}.hs-leads button:disabled{opacity:.5;cursor:wait}.hs-leads-grid{display:grid;grid-template-columns:minmax(260px,1fr) minmax(380px,1.6fr);border:1px solid var(--theme-elevation-150);border-radius:8px;overflow:hidden}.hs-leads-list{border-right:1px solid var(--theme-elevation-150)}.hs-leads-list>button{display:block;width:100%;border:0;border-bottom:1px solid var(--theme-elevation-150);border-radius:0;text-align:left;padding:16px}.hs-leads-list>button[aria-pressed=true]{background:#2d7b5712;border-left:3px solid #2d7b57}.hs-leads-list small{display:block;margin-top:6px;opacity:.7}.hs-leads-detail{padding:24px;min-width:0}.hs-leads-detail dl{display:grid;grid-template-columns:140px 1fr;gap:10px;overflow-wrap:anywhere}.hs-leads-detail dd{margin:0}.hs-leads-detail label{display:grid;gap:8px;margin:16px 0}.hs-leads-detail textarea{min-height:90px}.hs-leads-note{padding:12px 0;border-top:1px solid var(--theme-elevation-150);white-space:pre-wrap}.hs-leads-primary{background:#2d7b57!important;color:#fff!important}.hs-leads footer{display:flex;gap:12px;align-items:center;margin-top:16px}@media(max-width:800px){.hs-leads-grid{grid-template-columns:1fr}.hs-leads-list{max-height:320px;overflow:auto;border-right:0}.hs-leads-detail{padding:16px}}`

export function LeadsClient() {
  const [data, setData] = useState<any>({ docs: [], users: [], deliveries: [], totalDocs: 0, totalPages: 1 })
  const [filter, setFilter] = useState(''), [page, setPage] = useState(1), [selected, setSelected] = useState('')
  const [status, setStatus] = useState('new'), [owner, setOwner] = useState(''), [note, setNote] = useState('')
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('')
  const load = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch(`/api/site/leads?status=${filter}&page=${page}`, { signal })
    if (!response.ok) throw new Error('Không tải được lead.')
    const body = await response.json()
    setData(body)
    setSelected((id) => body.docs.some((doc: any) => String(doc.id) === id) ? id : String(body.docs[0]?.id || ''))
  }, [filter, page])
  useEffect(() => { const controller = new AbortController(); setBusy(true); setError(''); void load(controller.signal).catch((err) => { if (err.name !== 'AbortError') setError(err.message) }).finally(() => { if (!controller.signal.aborted) setBusy(false) }); return () => controller.abort() }, [load])
  const lead = data.docs.find((doc: any) => String(doc.id) === selected)
  useEffect(() => { setStatus(lead?.leadStatus || 'new'); setOwner(String(typeof lead?.assignedTo === 'object' ? lead.assignedTo?.id || '' : lead?.assignedTo || '')); setNote('') }, [lead])
  const post = async (url: string, body: object) => {
    setBusy(true); setError(''); setMessage('')
    try {
      const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Không lưu được thay đổi.')
      await load(); setMessage('Đã cập nhật.')
    } catch (err) { setError(err instanceof Error ? err.message : 'Không lưu được thay đổi.') } finally { setBusy(false) }
  }
  return <section className="hs-leads"><style>{CSS}</style><header><div><h1>Lead & biểu mẫu</h1><p>{data.totalDocs} lượt gửi · Theo dõi liên hệ và kết quả chuyển lead.</p></div><label>Lọc trạng thái <select value={filter} onChange={(event) => { setFilter(event.target.value); setPage(1) }}><option value="">Tất cả</option>{Object.entries(STATUSES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><button type="button" disabled={busy} onClick={() => { setError(''); void load().catch((err) => setError(err.message)) }}>Tải lại</button></header>
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    <div className="hs-leads-grid" aria-busy={busy}><div className="hs-leads-list" aria-label="Danh sách lead">{!data.docs.length && <p style={{ padding: 20 }}>{busy ? 'Đang tải…' : 'Chưa có lead trong bộ lọc này.'}</p>}{data.docs.map((doc: any) => <button type="button" key={doc.id} aria-pressed={String(doc.id) === selected} onClick={() => setSelected(String(doc.id))}><strong>{doc.formTitle}</strong><small>{STATUSES[doc.leadStatus] || 'Mới'} · {new Date(doc.createdAt).toLocaleString('vi-VN')}</small><small>{doc.attribution?.utm_campaign || doc.attribution?.pagePath || 'Gửi trực tiếp'}</small></button>)}</div>
    <div className="hs-leads-detail">{lead ? <><h2>{lead.formTitle}</h2><dl>{Object.entries(lead.data || {}).map(([key, value]) => <React.Fragment key={key}><dt>{key}</dt><dd>{String(value ?? '')}</dd></React.Fragment>)}</dl><details><summary>Nguồn & chiến dịch</summary><dl>{Object.entries(lead.attribution || {}).map(([key, value]) => <React.Fragment key={key}><dt>{key}</dt><dd>{String(value)}</dd></React.Fragment>)}</dl></details><label>Trạng thái<select value={status} onChange={(event) => setStatus(event.target.value)}>{Object.entries(STATUSES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Người phụ trách<select value={owner} onChange={(event) => setOwner(event.target.value)}><option value="">Chưa phân công</option>{data.users.map((user: any) => <option key={user.id} value={user.id}>{user.label}</option>)}</select></label><label>Thêm ghi chú<textarea maxLength={4000} value={note} onChange={(event) => setNote(event.target.value)} /></label><button type="button" className="hs-leads-primary" disabled={busy} onClick={() => post(`/api/site/leads/${lead.id}`, { revision: lead.revision || 0, status, assignedTo: owner || null, note })}>Lưu xử lý</button>
      {(lead.notes || []).map((item: any, index: number) => <div className="hs-leads-note" key={index}><small>{item.author} · {new Date(item.at).toLocaleString('vi-VN')}</small><p>{item.text}</p></div>)}
      <h3>Lịch sử chuyển lead</h3>{data.deliveries.filter((item: any) => String(item.submission) === selected).map((item: any) => <div className="hs-leads-note" key={item.id}><strong>{item.channel === 'email' ? 'Email' : 'Webhook'} · {DELIVERY[item.status]}</strong><p>{item.attempts || 0} lần thử{item.lastError ? ` · ${item.lastError}` : ''}</p>{['retry', 'failed'].includes(item.status) && <button type="button" disabled={busy} onClick={() => post(`/api/site/lead-delivery/${item.id}/retry`, {})}>Gửi lại</button>}</div>)}
      <a href={`/api/site/forms-export/${typeof lead.form === 'object' ? lead.form.id : lead.form}`}>Xuất CSV biểu mẫu</a>
    </> : <p>Chọn một lead để xem và xử lý.</p>}</div></div><footer><button type="button" disabled={busy || page <= 1} onClick={() => setPage(page - 1)}>Trước</button><span>Trang {page}/{Math.max(1, data.totalPages)}</span><button type="button" disabled={busy || page >= data.totalPages} onClick={() => setPage(page + 1)}>Sau</button></footer>
  </section>
}
