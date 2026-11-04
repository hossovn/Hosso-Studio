'use client'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, MessageSquare, Plus, X, Link2 } from 'lucide-react'
import type { NavCtx } from './SitePanels'

type Review = { id: string | number; scope: string; owner: string; element?: string; x: number; y: number; parentId?: string; body: string; authorName: string; resolved?: boolean; createdAt: string }
type Anchor = Pick<Review, 'owner' | 'element' | 'x' | 'y'>
export function ReviewPanel({ nav, docs, onClose }: { nav: NavCtx; docs: Document[]; onClose: () => void }) {
  const [reviews, setReviews] = useState<Review[]>([]), [selected, setSelected] = useState<string | number>(), [placing, setPlacing] = useState(false), [anchor, setAnchor] = useState<Anchor>(), [body, setBody] = useState(''), [reply, setReply] = useState(''), [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [showResolved, setShowResolved] = useState(false), [points, setPoints] = useState<Record<string, { left: number; top: number }>>({})
  const scope = `${nav.collection}:${nav.id}:${nav.locale}`, alive = useRef(true)
  const load = useCallback(async () => {
    const query = new URLSearchParams({ 'where[scope][equals]': scope, limit: '1000', sort: 'createdAt', depth: '0' })
    const res = await fetch('/api/editor-reviews?' + query), result = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error('Không tải được góp ý. Cần đăng nhập bằng tài khoản biên tập.')
    if (alive.current) setReviews(result.docs ?? [])
  }, [scope])
  useEffect(() => { alive.current = true; const reload = () => { void load().catch((error) => { if (alive.current) setMessage(error.message) }) }; reload(); const timer = setInterval(reload, 30000); window.addEventListener('focus', reload); return () => { alive.current = false; clearInterval(timer); window.removeEventListener('focus', reload) } }, [load])
  const threads = reviews.filter((item) => !item.parentId && (showResolved || !item.resolved)), current = reviews.find((item) => String(item.id) === String(selected))
  useEffect(() => {
    const doc = docs[0]; if (!doc) return
    const measure = () => {
      const next: Record<string, { left: number; top: number }> = {}
      for (const review of reviews.filter((item) => !item.parentId)) {
        const target = review.element ? doc.querySelector(`[data-element="${CSS.escape(review.element)}"]`) : doc.querySelector(`[data-block="${CSS.escape(review.owner)}"]`)
        const rect = target?.getBoundingClientRect()
        if (rect?.width && rect.height) next[review.id] = { left: rect.left + rect.width * review.x, top: rect.top + rect.height * review.y }
      }
      setPoints(next)
    }
    const observer = new ResizeObserver(measure); observer.observe(doc.body); doc.defaultView?.addEventListener('scroll', measure); doc.defaultView?.addEventListener('resize', measure); measure()
    return () => { observer.disconnect(); doc.defaultView?.removeEventListener('scroll', measure); doc.defaultView?.removeEventListener('resize', measure) }
  }, [docs, reviews])
  useEffect(() => {
    const click = (event: MouseEvent) => {
      if (!placing) return
      const target = event.target as Element
      if (target.closest('[data-review-pin]')) return
      const owner = target.closest<HTMLElement>('[data-block]'), element = target.closest<HTMLElement>('[data-element]'), node = element ?? owner
      if (!owner || !node) return
      event.preventDefault(); event.stopImmediatePropagation()
      const rect = node.getBoundingClientRect()
      setAnchor({ owner: owner.dataset.block!, element: element?.dataset.element, x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)) }); setBody(''); setSelected(undefined); setPlacing(false)
    }
    docs.forEach((doc) => { doc.addEventListener('click', click, true); doc.body.style.cursor = placing ? 'crosshair' : '' })
    return () => docs.forEach((doc) => { doc.removeEventListener('click', click, true); doc.body.style.cursor = '' })
  }, [docs, placing])
  const send = async (event: React.FormEvent, parent?: Review) => {
    event.preventDefault(); const text = parent ? reply : body; if (!text.trim() || (!parent && !anchor)) return
    setBusy(true); setMessage('')
    try {
      const at = parent ?? anchor!
      const res = await fetch('/api/editor-reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetCollection: nav.collection, targetId: nav.id, language: nav.locale, owner: at.owner, element: at.element, x: at.x, y: at.y, body: text, parentId: parent ? String(parent.id) : undefined }) }), result = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(result.errors?.[0]?.message || 'Không lưu được góp ý.')
      setSelected(parent?.id ?? result.doc.id); setAnchor(undefined); setBody(''); setReply(''); await load()
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Không lưu được góp ý.') }
    finally { setBusy(false) }
  }
  const resolve = async (review: Review) => {
    setBusy(true); setMessage('')
    try { const res = await fetch('/api/editor-reviews/' + review.id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resolved: !review.resolved }) }); if (!res.ok) throw new Error('Không cập nhật được góp ý.'); await load() } catch (error) { setMessage((error as Error).message) } finally { setBusy(false) }
  }
  return <>
    {docs[0] && createPortal(<div data-free-ui="true" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 90 }}>{threads.map((review, index) => points[review.id] && <button key={review.id} data-review-pin={review.id} type="button" aria-label={`Góp ý ${index + 1}: ${review.body.slice(0, 60)}`} onClick={(event) => { event.preventDefault(); event.stopPropagation(); setSelected(review.id); setAnchor(undefined) }} style={{ ...points[review.id], position: 'absolute', transform: 'translate(-50%,-50%)', border: '2px solid white', borderRadius: '50% 50% 50% 0', width: 30, height: 30, background: '#2d7b57', color: '#fff', pointerEvents: 'auto', cursor: 'pointer', boxShadow: '0 2px 8px #12332244', font: '600 12px system-ui' }}>{index + 1}</button>)}</div>, docs[0].body)}
    <aside className="cv-review-panel" aria-label="Góp ý thiết kế">
      <header><span><MessageSquare size={16} />Góp ý thiết kế</span><button className="cv-ib" type="button" aria-label="Đóng góp ý" onClick={onClose}><X size={16} /></button></header>
      <p className="cv-tool-help">Góp ý được chia sẻ với thành viên có quyền biên tập trang.</p>
      <div className="cv-tool-grid"><button className="cv-tool-button is-primary" type="button" aria-pressed={placing} onClick={() => { setPlacing(!placing); setAnchor(undefined) }}><Plus size={14} />{placing ? 'Hủy đặt ghim' : 'Ghim góp ý'}</button><button className="cv-tool-button" type="button" onClick={async () => { const url = new URL(location.href); url.searchParams.set('review', '1'); try { await navigator.clipboard.writeText(url.toString()); setMessage('Đã sao chép liên kết góp ý.') } catch { setMessage(url.toString()) } }}><Link2 size={14} />Liên kết</button></div>
      {placing && <p role="status" className="cv-tool-success">Bấm vào vị trí trên trang để đặt ghim.</p>}
      {anchor && <form onSubmit={(event) => send(event)}><label className="cv-tool-field">Góp ý mới<textarea autoFocus rows={4} maxLength={4000} required value={body} onChange={(event) => setBody(event.target.value)} /></label><button className="cv-tool-button is-primary" disabled={busy} type="submit">Lưu góp ý</button></form>}
      <label className="cv-tool-check"><input type="checkbox" checked={showResolved} onChange={(event) => setShowResolved(event.target.checked)} />Hiện cả góp ý đã xử lý</label>
      <div className="cv-review-list">{threads.map((review, index) => <button className="cv-review-thread" data-selected={String(selected) === String(review.id)} type="button" key={review.id} onClick={() => { setSelected(review.id); setAnchor(undefined); const doc = docs[0]; doc?.querySelector(`[data-block="${CSS.escape(review.owner)}"]`)?.scrollIntoView({ block: 'center' }) }}><span>{index + 1}{review.resolved && <Check size={12} />}</span><div><strong>{review.authorName}</strong><p>{review.body}</p>{!points[review.id] && <small>Vị trí đã bị xóa hoặc ẩn</small>}</div></button>)}{!threads.length && <p className="cv-tool-help">Chưa có góp ý đang mở. Đặt ghim vào chỗ cần chỉnh để bắt đầu.</p>}</div>
      {current && <section className="cv-review-conversation"><strong>{current.authorName}</strong><p>{current.body}</p>{reviews.filter((item) => String(item.parentId) === String(current.id)).map((item) => <article key={item.id}><strong>{item.authorName}</strong><p>{item.body}</p></article>)}<button type="button" className="cv-tool-button" disabled={busy} onClick={() => resolve(current)}><Check size={14} />{current.resolved ? 'Mở lại góp ý' : 'Đánh dấu đã xử lý'}</button><form onSubmit={(event) => send(event, current)}><label className="cv-tool-field">Trả lời<textarea rows={3} required maxLength={4000} value={reply} onChange={(event) => setReply(event.target.value)} /></label><button type="submit" className="cv-tool-button is-primary" disabled={busy}>Gửi trả lời</button></form></section>}
      {message && <p role="status" className="cv-tool-help">{message}</p>}
    </aside>
  </>
}
