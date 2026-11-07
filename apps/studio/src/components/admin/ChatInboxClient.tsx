'use client'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

type ChatMessage = {
  id: string
  sender: 'visitor' | 'staff' | 'system'
  author?: string
  text: string
  createdAt: string
}

type ChatSession = {
  id: string
  visitorName: string
  visitorPhone?: string
  visitorEmail?: string
  locale: string
  pagePath?: string
  status: 'open' | 'replied' | 'closed'
  unreadByStaff: number
  unreadByVisitor: number
  lastMessageAt: string
  lastMessagePreview: string
  messages: ChatMessage[]
}

type StatusFilter = 'all' | 'open' | 'replied' | 'closed'

const INBOX_CSS = `
.ha-chat-wrap{max-width:1280px;padding-bottom:36px}
.ha-chat-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:16px}
.ha-chat-btn{min-height:44px;min-width:44px;padding:0 14px;border-radius:10px;border:1px solid var(--theme-elevation-200);background:var(--theme-elevation-50);color:inherit;font:600 13.5px/1 inherit;display:inline-flex;align-items:center;justify-content:center;gap:8px;text-decoration:none;cursor:pointer;transition:transform 160ms cubic-bezier(.23,1,.32,1),opacity 160ms cubic-bezier(.23,1,.32,1)}
.ha-chat-btn:hover{opacity:.92}
.ha-chat-btn:active{transform:scale(.97)}
.ha-chat-btn:disabled{opacity:.5;cursor:not-allowed;transform:none}
.ha-chat-btn.is-primary{background:var(--hosso-brand,#2563eb);border-color:transparent;color:#ffffff}
.ha-chat-grid{display:grid;grid-template-columns:340px minmax(0,1fr);gap:16px;min-height:560px;align-items:stretch}
.ha-chat-list-pane,.ha-chat-detail-pane{border:1px solid var(--theme-elevation-150);border-radius:14px;background:var(--theme-elevation-0);display:flex;flex-direction:column;overflow:hidden}
.ha-chat-filters{padding:12px;border-bottom:1px solid var(--theme-elevation-100);display:grid;gap:10px}
.ha-chat-tabs{display:grid;grid-template-columns:repeat(4,1fr);gap:4px}
.ha-chat-tab{min-height:44px;padding:0 6px;border-radius:8px;border:1px solid transparent;background:transparent;color:inherit;font:600 12.5px/1.2 inherit;cursor:pointer;transition:transform 160ms cubic-bezier(.23,1,.32,1),opacity 160ms cubic-bezier(.23,1,.32,1)}
.ha-chat-tab.is-active{background:var(--theme-elevation-100);border-color:var(--theme-elevation-200)}
.ha-chat-search{width:100%;min-height:44px;padding:0 12px;border-radius:9px;border:1px solid var(--theme-elevation-200);background:var(--theme-elevation-50);color:inherit;font:inherit;font-size:13.5px}
.ha-chat-threads{flex:1;overflow-y:auto;max-height:560px;display:flex;flex-direction:column}
.ha-chat-thread{width:100%;text-align:left;padding:13px 14px;border:0;border-bottom:1px solid var(--theme-elevation-100);background:transparent;color:inherit;font:inherit;cursor:pointer;display:grid;gap:5px;transition:opacity 160ms cubic-bezier(.23,1,.32,1)}
.ha-chat-thread:hover{background:var(--theme-elevation-50)}
.ha-chat-thread.is-selected{background:var(--theme-elevation-100)}
.ha-chat-thread-top{display:flex;align-items:center;justify-content:space-between;gap:8px}
.ha-chat-thread-name{font-weight:700;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ha-chat-pill{display:inline-flex;align-items:center;padding:2px 7px;border-radius:999px;font-size:11px;font-weight:700;background:var(--theme-elevation-150)}
.ha-chat-pill.is-open{background:rgba(37,99,235,.14);color:#2563eb}
.ha-chat-pill.is-replied{background:rgba(22,163,74,.14);color:#15803d}
.ha-chat-pill.is-closed{background:var(--theme-elevation-150);opacity:.78}
.ha-chat-unread{min-width:20px;height:20px;padding:0 6px;border-radius:999px;background:#ef4444;color:#ffffff;font-size:11px;font-weight:800;display:inline-grid;place-items:center}
.ha-chat-preview{margin:0;font-size:13px;opacity:.78;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ha-chat-meta-row{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:11.5px;opacity:.68}
.ha-chat-detail-head{padding:14px 18px;border-bottom:1px solid var(--theme-elevation-100);display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.ha-chat-log{flex:1;min-height:320px;max-height:460px;overflow-y:auto;padding:18px;background:var(--theme-elevation-50);display:flex;flex-direction:column;gap:12px}
.ha-chat-msg{display:flex;flex-direction:column;max-width:78%;gap:4px}
.ha-chat-msg.is-visitor{align-self:flex-start;align-items:flex-start}
.ha-chat-msg.is-staff{align-self:flex-end;align-items:flex-end}
.ha-chat-msg.is-system{align-self:center;align-items:center;max-width:90%}
.ha-chat-bubble{padding:10px 14px;border-radius:14px;font-size:14px;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere;border:1px solid var(--theme-elevation-150);background:var(--theme-elevation-0)}
.ha-chat-msg.is-staff .ha-chat-bubble{background:var(--hosso-brand,#2563eb);border-color:transparent;color:#ffffff}
.ha-chat-msg.is-system .ha-chat-bubble{font-size:12.5px;opacity:.85;background:var(--theme-elevation-100)}
.ha-chat-reply{padding:12px 16px;border-top:1px solid var(--theme-elevation-100);display:flex;align-items:flex-end;gap:10px;background:var(--theme-elevation-0)}
.ha-chat-reply textarea{flex:1;min-width:0;min-height:46px;max-height:140px;padding:11px 13px;border-radius:11px;border:1px solid var(--theme-elevation-200);background:var(--theme-elevation-50);color:inherit;font:inherit;font-size:14px;line-height:1.45;resize:vertical}
@media(max-width:900px){.ha-chat-grid{grid-template-columns:1fr}}
@media(prefers-reduced-motion:reduce){.ha-chat-btn,.ha-chat-tab,.ha-chat-thread{transition:none!important}}
`

export function ChatInboxClient({
  lang,
  initialSessionId,
}: {
  lang: 'vi' | 'en'
  initialSessionId?: string
}) {
  const text = useCallback((vi: string, en: string) => (lang === 'en' ? en : vi), [lang])
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [selectedId, setSelectedId] = useState(initialSessionId || '')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [query, setQuery] = useState('')
  const [replyText, setReplyText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const logRef = useRef<HTMLDivElement>(null)

  const fetchInbox = useCallback(async () => {
    const params = new URLSearchParams()
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (query.trim()) params.set('q', query.trim())
    const res = await fetch(`/api/site/chat/inbox?${params}`, { cache: 'no-store' })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
    const nextSessions: ChatSession[] = Array.isArray(body.sessions) ? body.sessions : []
    setSessions(nextSessions)
    setUnreadCount(Number(body.unreadCount ?? 0))
    setSelectedId((prev) => {
      if (prev && nextSessions.some((s) => s.id === prev)) return prev
      return nextSessions[0]?.id ?? ''
    })
  }, [statusFilter, query])

  useEffect(() => {
    let active = true
    setLoading(true)
    fetchInbox()
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'hidden') {
        void fetchInbox().catch(() => {})
      }
    }, 3500)
    const onVis = () => {
      if (document.visibilityState === 'visible') void fetchInbox().catch(() => {})
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      active = false
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [fetchInbox])

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === selectedId) ?? null,
    [sessions, selectedId],
  )

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [activeSession?.id, activeSession?.messages.length])

  const markRead = useCallback(async (session: ChatSession) => {
    setSelectedId(session.id)
    if (session.unreadByStaff <= 0) return
    try {
      const res = await fetch('/api/site/chat/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id }),
      })
      const body = await res.json().catch(() => ({}))
      if (res.ok && body.session) {
        setSessions((prev) => prev.map((s) => (s.id === session.id ? body.session : s)))
        setUnreadCount((c) => Math.max(0, c - 1))
      }
    } catch {
      /* ignore */
    }
  }, [])

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = replyText.trim()
    if (!activeSession || !trimmed || sending) return
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/site/chat/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: activeSession.id, text: trimmed }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      if (body.session) {
        setSessions((prev) => prev.map((s) => (s.id === activeSession.id ? body.session : s)))
      }
      setReplyText('')
      await fetchInbox()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSending(false)
    }
  }

  const toggleStatus = async () => {
    if (!activeSession || sending) return
    const nextStatus = activeSession.status === 'closed' ? 'open' : 'closed'
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/site/chat/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: activeSession.id, status: nextStatus }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      if (body.session) {
        setSessions((prev) => prev.map((s) => (s.id === activeSession.id ? body.session : s)))
      }
      await fetchInbox()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSending(false)
    }
  }

  const statusLabel = (st: ChatSession['status']) => {
    if (st === 'open') return text('Đang chờ', 'Open')
    if (st === 'replied') return text('Đã trả lời', 'Replied')
    return text('Đã đóng', 'Closed')
  }

  const fmtTime = (iso: string) => {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
    })
  }

  return (
    <div className="ha-chat-wrap" data-ha-chat-inbox="true">
      <style>{INBOX_CSS}</style>
      <header className="ha-page-head">
        <div>
          <h1>
            {text('Trò chuyện trực tuyến', 'Live Chat')}{' '}
            {unreadCount > 0 && (
              <span className="ha-chat-unread" title={text('chưa đọc', 'unread')}>
                {unreadCount}
              </span>
            )}
          </h1>
          <p>
            {text(
              'Tiếp nhận và phản hồi tin nhắn trực tiếp từ khách truy cập trên mọi ngôn ngữ của website.',
              'Receive and reply to live visitor messages across every site language.',
            )}
          </p>
        </div>
      </header>

      <div className="ha-chat-toolbar">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="ha-chat-btn"
            onClick={() => void fetchInbox()}
            disabled={sending}
          >
            {text('Làm mới', 'Refresh')}
          </button>
          <a className="ha-chat-btn" href="/admin/globals/site-settings">
            {text('Cấu hình nút nổi & Live Chat', 'Configure Floating Dock & Live Chat')}
          </a>
        </div>
      </div>

      {error && (
        <p role="alert" style={{ color: 'var(--theme-error-500, #b91c1c)', marginBottom: 12 }}>
          {error}
        </p>
      )}

      <div className="ha-chat-grid">
        <aside className="ha-chat-list-pane" aria-label={text('Danh sách hội thoại', 'Conversations')}>
          <div className="ha-chat-filters">
            <div className="ha-chat-tabs" role="group" aria-label={text('Lọc trạng thái', 'Filter by status')}>
              {(['all', 'open', 'replied', 'closed'] as StatusFilter[]).map((st) => (
                <button
                  key={st}
                  type="button"
                  aria-pressed={statusFilter === st}
                  className={`ha-chat-tab${statusFilter === st ? ' is-active' : ''}`}
                  onClick={() => setStatusFilter(st)}
                >
                  {st === 'all'
                    ? text('Tất cả', 'All')
                    : st === 'open'
                      ? text('Chờ', 'Open')
                      : st === 'replied'
                        ? text('Đã trả lời', 'Replied')
                        : text('Đóng', 'Closed')}
                </button>
              ))}
            </div>
            <input
              type="search"
              className="ha-chat-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={text('Tìm theo tên, SĐT hoặc tin nhắn…', 'Search name, phone or message…')}
              aria-label={text('Tìm hội thoại', 'Search conversations')}
            />
          </div>

          <div className="ha-chat-threads">
            {loading && sessions.length === 0 ? (
              <p style={{ padding: 18, margin: 0, opacity: 0.7 }}>
                {text('Đang tải hội thoại…', 'Loading conversations…')}
              </p>
            ) : sessions.length === 0 ? (
              <p style={{ padding: 18, margin: 0, opacity: 0.7 }}>
                {text('Chưa có cuộc trò chuyện nào.', 'No conversations yet.')}
              </p>
            ) : (
              sessions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  data-chat-session-id={s.id}
                  className={`ha-chat-thread${s.id === activeSession?.id ? ' is-selected' : ''}`}
                  onClick={() => void markRead(s)}
                >
                  <div className="ha-chat-thread-top">
                    <span className="ha-chat-thread-name">{s.visitorName || text('Khách', 'Visitor')}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {s.unreadByStaff > 0 && <span className="ha-chat-unread">{s.unreadByStaff}</span>}
                      <span className="ha-chat-pill">{s.locale.toUpperCase()}</span>
                    </div>
                  </div>
                  <p className="ha-chat-preview">{s.lastMessagePreview || '—'}</p>
                  <div className="ha-chat-meta-row">
                    <span className={`ha-chat-pill is-${s.status}`}>{statusLabel(s.status)}</span>
                    {s.visitorPhone && <span>· {s.visitorPhone}</span>}
                    <span style={{ marginLeft: 'auto' }}>{fmtTime(s.lastMessageAt)}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="ha-chat-detail-pane" aria-label={text('Nội dung hội thoại', 'Conversation detail')}>
          {!activeSession ? (
            <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: 32, opacity: 0.7, textAlign: 'center' }}>
              <p>{text('Chọn một hội thoại ở cột bên trái để xem và phản hồi.', 'Select a conversation on the left to view and reply.')}</p>
            </div>
          ) : (
            <>
              <header className="ha-chat-detail-head">
                <div style={{ display: 'grid', gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: 16 }}>{activeSession.visitorName}</strong>
                    <span className="ha-chat-pill">{activeSession.locale.toUpperCase()}</span>
                    <span className={`ha-chat-pill is-${activeSession.status}`}>{statusLabel(activeSession.status)}</span>
                  </div>
                  <div className="ha-chat-meta-row">
                    {activeSession.visitorPhone && (
                      <a href={`tel:${activeSession.visitorPhone}`} style={{ color: 'inherit' }}>
                        {activeSession.visitorPhone}
                      </a>
                    )}
                    {activeSession.visitorEmail && (
                      <a href={`mailto:${activeSession.visitorEmail}`} style={{ color: 'inherit' }}>
                        {activeSession.visitorEmail}
                      </a>
                    )}
                    {activeSession.pagePath && (
                      <a href={activeSession.pagePath} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>
                        {activeSession.pagePath} ↗
                      </a>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  className="ha-chat-btn"
                  disabled={sending}
                  onClick={() => void toggleStatus()}
                >
                  {activeSession.status === 'closed'
                    ? text('Mở lại hội thoại', 'Reopen conversation')
                    : text('Đóng hội thoại', 'Close conversation')}
                </button>
              </header>

              <div className="ha-chat-log" ref={logRef} role="log" aria-live="polite">
                {activeSession.messages.map((m) => (
                  <div key={m.id} className={`ha-chat-msg is-${m.sender}`}>
                    <div className="ha-chat-bubble">{m.text}</div>
                    <span className="ha-chat-meta-row">
                      {m.author ? `${m.author} · ` : ''}
                      {fmtTime(m.createdAt)}
                    </span>
                  </div>
                ))}
              </div>

              <form className="ha-chat-reply" onSubmit={handleReply}>
                <textarea
                  rows={2}
                  data-chat-reply-input="true"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      void handleReply(e)
                    }
                  }}
                  placeholder={text('Nhập nội dung phản hồi (Enter để gửi)…', 'Write a reply (Enter to send)…')}
                  aria-label={text('Nội dung phản hồi', 'Reply message')}
                  maxLength={1000}
                />
                <button
                  type="submit"
                  data-chat-reply-submit="true"
                  className="ha-chat-btn is-primary"
                  disabled={sending || !replyText.trim()}
                >
                  {sending ? '…' : text('Gửi phản hồi', 'Send reply')}
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
