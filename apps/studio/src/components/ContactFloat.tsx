'use client'
import { safeCssColor, useLocale, useT } from '@hosso/studio-blocks'
import React, { useCallback, useEffect, useRef, useState } from 'react'

type Contact = { phone?: string; zalo?: string; email?: string }

export type FloatingSupportProps = {
  dockEnabled?: boolean
  callLabel?: string
  zaloQrUrl?: string
  liveChatEnabled?: boolean
  liveChatTitle?: string
  liveChatSubtitle?: string
  liveChatGreeting?: string
  liveChatAccent?: string
}

type ChatMsg = {
  id: string
  sender: 'visitor' | 'staff' | 'system'
  author?: string
  text: string
  createdAt: string
}

const STORAGE_KEY = 'hosso-live-chat-v1'
const zaloHref = (z: string) => (/^https?:/.test(z) ? z : `https://zalo.me/${z.replace(/\D/g, '')}`)

const DOCK_CSS = `
.hs-contact-dock{position:fixed;right:16px;bottom:16px;z-index:50;display:flex;flex-direction:column;align-items:flex-end;gap:10px;font-family:var(--hs-font-body,system-ui,-apple-system,sans-serif)}
.hs-dock-stack{display:flex;flex-direction:column;align-items:flex-end;gap:10px}
.hs-dock-btn{position:relative;min-width:48px;height:48px;padding:0 13px;border:0;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;gap:8px;color:#ffffff!important;font:700 13px/1 var(--hs-font-body,system-ui,sans-serif);text-decoration:none;cursor:pointer;box-shadow:0 8px 22px rgba(15,23,42,.24),0 0 0 1px rgba(255,255,255,.18) inset;transition:transform 180ms cubic-bezier(.23,1,.32,1),opacity 180ms cubic-bezier(.23,1,.32,1)}
.hs-dock-btn.is-icon-only{width:48px;padding:0}
.hs-dock-btn:hover{transform:translateY(-2px)}
.hs-dock-btn:active{transform:scale(.96)}
.hs-dock-btn:focus-visible{outline:2px solid #0f172a;outline-offset:2px}
.hs-dock-call-label{white-space:nowrap;letter-spacing:.01em}
.hs-dock-badge{position:absolute;top:-4px;right:-4px;min-width:20px;height:20px;padding:0 5px;border-radius:999px;background:#ef4444;color:#ffffff;font-size:11px;font-weight:800;display:grid;place-items:center;border:2px solid #ffffff}
.hs-chat-drawer{width:min(368px,calc(100vw - 24px));max-height:min(540px,calc(100svh - 92px));background:#ffffff;color:#0f172a;border-radius:18px;border:1px solid rgba(15,23,42,.1);box-shadow:0 22px 50px rgba(15,23,42,.22);display:flex;flex-direction:column;overflow:hidden;transform-origin:bottom right;animation:hsChatPop 180ms cubic-bezier(.23,1,.32,1)}
@keyframes hsChatPop{from{opacity:0;transform:translateY(8px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}
.hs-chat-head{padding:14px 16px;color:#ffffff;display:flex;align-items:center;justify-content:space-between;gap:10px}
.hs-chat-head-info{min-width:0;display:grid;gap:3px}
.hs-chat-head-title{margin:0;font-size:15px;font-weight:700;display:flex;align-items:center;gap:7px}
.hs-chat-dot{width:8px;height:8px;border-radius:50%;background:#4ade80;box-shadow:0 0 0 3px rgba(74,222,128,.28);flex-shrink:0}
.hs-chat-head-sub{margin:0;font-size:12px;opacity:.88;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hs-chat-head-actions{display:flex;align-items:center;gap:4px}
.hs-chat-icon-btn{width:44px;height:44px;border:0;border-radius:10px;background:rgba(255,255,255,.16);color:#ffffff;display:grid;place-items:center;cursor:pointer;transition:transform 160ms cubic-bezier(.23,1,.32,1),opacity 160ms cubic-bezier(.23,1,.32,1)}
.hs-chat-icon-btn:hover{opacity:.92}.hs-chat-icon-btn:active{transform:scale(.95)}
.hs-chat-log{flex:1;min-height:200px;max-height:310px;overflow-y:auto;padding:14px;background:#f8fafc;display:flex;flex-direction:column;gap:10px}
.hs-chat-row{display:flex;flex-direction:column;max-width:85%;gap:3px}
.hs-chat-row.is-visitor{align-self:flex-end;align-items:flex-end}
.hs-chat-row.is-staff,.hs-chat-row.is-system{align-self:flex-start;align-items:flex-start}
.hs-chat-bubble{padding:9px 13px;border-radius:14px;font-size:13.5px;line-height:1.45;white-space:pre-wrap;overflow-wrap:anywhere}
.hs-chat-row.is-visitor .hs-chat-bubble{color:#ffffff;border-bottom-right-radius:4px}
.hs-chat-row.is-staff .hs-chat-bubble,.hs-chat-row.is-system .hs-chat-bubble{background:#ffffff;color:#0f172a;border:1px solid #e2e8f0;border-bottom-left-radius:4px}
.hs-chat-meta{font-size:11px;color:#64748b;padding:0 2px}
.hs-chat-note{margin:0;padding:6px 12px;background:#fefce8;color:#854d0e;font-size:12px;text-align:center;border-top:1px solid #fef08a}
.hs-chat-error{margin:0;padding:6px 12px;background:#fef2f2;color:#b91c1c;font-size:12px;border-top:1px solid #fecaca}
.hs-chat-form{padding:10px 12px 12px;background:#ffffff;border-top:1px solid #e2e8f0;display:grid;gap:8px}
.hs-chat-ident{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.hs-chat-ident input{min-width:0;padding:7px 9px;border:1px solid #cbd5e1;border-radius:9px;font:inherit;font-size:12.5px;color:#0f172a;background:#f8fafc}
.hs-chat-compose{display:flex;align-items:flex-end;gap:8px}
.hs-chat-compose textarea{flex:1;min-width:0;min-height:44px;max-height:96px;resize:none;padding:10px 11px;border:1px solid #cbd5e1;border-radius:12px;font:inherit;font-size:13.5px;line-height:1.4;color:#0f172a;background:#ffffff}
.hs-chat-compose textarea:focus,.hs-chat-ident input:focus{outline:2px solid #2563eb;outline-offset:-1px;border-color:transparent}
.hs-chat-send{min-width:48px;min-height:44px;padding:0 14px;border:0;border-radius:11px;color:#ffffff;font:700 13px/1 inherit;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;transition:transform 160ms cubic-bezier(.23,1,.32,1),opacity 160ms cubic-bezier(.23,1,.32,1)}
.hs-chat-send:disabled{opacity:.55;cursor:not-allowed}
.hs-chat-send:not(:disabled):active{transform:scale(.96)}
.hs-zalo-qr{width:min(260px,calc(100vw - 32px));padding:16px;background:#ffffff;color:#0f172a;border-radius:16px;border:1px solid rgba(15,23,42,.1);box-shadow:0 18px 42px rgba(15,23,42,.2);display:grid;gap:10px;text-align:center}
.hs-zalo-qr img{width:100%;max-width:200px;height:auto;margin:0 auto;border-radius:10px;display:block}
@media(max-width:639px){.hs-contact-dock{right:12px;bottom:12px}.hs-dock-call-label{display:none}.hs-dock-btn.has-call-label{width:48px;padding:0}}
@media(prefers-reduced-motion:reduce){.hs-dock-btn,.hs-chat-drawer,.hs-chat-icon-btn,.hs-chat-send{transition:none!important;animation:none!important}}
`

const formatTime = (iso: string): string => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/** Cụm nút liên hệ nổi góc phải (Live Chat, Zalo/QR, Gọi điện, Email). */
export function ContactFloat({
  contact,
  support,
}: {
  contact: Contact
  support?: FloatingSupportProps
}) {
  const t = useT()
  const { locale } = useLocale()
  const dockEnabled = support?.dockEnabled !== false
  const liveChatEnabled = Boolean(support?.liveChatEnabled)
  const accent = safeCssColor(support?.liveChatAccent, '#2563eb')
  const { phone, zalo, email } = contact
  const zaloQrUrl = support?.zaloQrUrl

  const [chatOpen, setChatOpen] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  const [sessionId, setSessionId] = useState('')
  const [token, setToken] = useState('')
  const [status, setStatus] = useState<'open' | 'replied' | 'closed'>('open')
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [unread, setUnread] = useState(0)
  const [name, setName] = useState('')
  const [visitorPhone, setVisitorPhone] = useState('')
  const [website, setWebsite] = useState('')
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const logRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Khôi phục phiên chat đã lưu trên trình duyệt của khách
  useEffect(() => {
    if (!liveChatEnabled) return
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
      if (saved && typeof saved.sessionId === 'string' && typeof saved.token === 'string') {
        setSessionId(saved.sessionId)
        setToken(saved.token)
      }
    } catch {
      /* localStorage bị chặn hoặc hỏng: bỏ qua */
    }
  }, [liveChatEnabled])

  const clearSession = useCallback(() => {
    setSessionId('')
    setToken('')
    setMessages([])
    setStatus('open')
    setUnread(0)
    setError('')
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
  }, [])

  const pollMessages = useCallback(
    async (ackUnread: boolean) => {
      if (!sessionId || !token) return
      try {
        const q = new URLSearchParams({ sessionId, ...(ackUnread ? { ack: '1' } : {}) })
        const res = await fetch(`/api/site/chat/poll?${q}`, {
          headers: { 'x-hosso-chat-token': token },
          cache: 'no-store',
        })
        if (res.status === 403) {
          clearSession()
          return
        }
        if (!res.ok) return
        const body = await res.json()
        if (Array.isArray(body.messages)) setMessages(body.messages)
        if (body.status) setStatus(body.status)
        setUnread(ackUnread ? 0 : Number(body.unreadByVisitor ?? 0))
      } catch {
        /* mạng chập chờn: tự thử lại ở chu kỳ sau */
      }
    },
    [sessionId, token, clearSession],
  )

  useEffect(() => {
    if (!liveChatEnabled || !sessionId || !token) return
    void pollMessages(chatOpen)
    const intervalMs = chatOpen ? 3000 : 10000
    const id = window.setInterval(() => {
      if (document.visibilityState !== 'hidden') void pollMessages(chatOpen)
    }, intervalMs)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void pollMessages(chatOpen)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [liveChatEnabled, sessionId, token, chatOpen, pollMessages])

  useEffect(() => {
    if (chatOpen && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [chatOpen, messages.length])

  useEffect(() => {
    if (chatOpen) {
      setQrOpen(false)
      setUnread(0)
      window.setTimeout(() => inputRef.current?.focus(), 40)
    }
  }, [chatOpen])

  useEffect(() => {
    if (!chatOpen && !qrOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setChatOpen(false)
        setQrOpen(false)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [chatOpen, qrOpen])

  if (!dockEnabled) return null
  if (!liveChatEnabled && !phone && !zalo && !email && !zaloQrUrl) return null

  const greetingText = support?.liveChatGreeting || t('chat.greeting')
  const titleText = support?.liveChatTitle || t('chat.title')
  const subtitleText = support?.liveChatSubtitle || t('chat.subtitle')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text || sending) return
    setSending(true)
    setError('')
    try {
      if (!sessionId || !token) {
        const res = await fetch('/api/site/chat/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim() || undefined,
            phone: visitorPhone.trim() || undefined,
            website,
            text,
            locale,
            pagePath: typeof window !== 'undefined' ? window.location.pathname : '/',
          }),
        })
        const body = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(body.error || 'start_failed')
        setSessionId(body.sessionId)
        setToken(body.token)
        setStatus(body.status || 'open')
        setMessages(Array.isArray(body.messages) ? body.messages : [])
        setDraft('')
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ sessionId: body.sessionId, token: body.token }))
        } catch {
          /* ignore */
        }
      } else {
        const res = await fetch('/api/site/chat/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-hosso-chat-token': token,
          },
          body: JSON.stringify({ sessionId, text, website }),
        })
        const body = await res.json().catch(() => ({}))
        if (res.status === 403) {
          clearSession()
          throw new Error('session_expired')
        }
        if (!res.ok) throw new Error(body.error || 'send_failed')
        setStatus(body.status || 'open')
        if (Array.isArray(body.messages)) setMessages(body.messages)
        setDraft('')
      }
    } catch {
      setError(t('chat.error'))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="hs-contact-dock" data-hs-contact-dock="true">
      <style>{DOCK_CSS}</style>

      {qrOpen && zaloQrUrl && (
        <div className="hs-zalo-qr" role="dialog" aria-label={t('chat.zaloScan')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <strong style={{ fontSize: 13.5 }}>{t('chat.zaloScan')}</strong>
            <button
              type="button"
              onClick={() => setQrOpen(false)}
              aria-label={t('chat.close')}
              style={{ border: 0, background: '#f1f5f9', borderRadius: 10, width: 44, height: 44, cursor: 'pointer', fontWeight: 700, fontSize: 18 }}
            >
              ×
            </button>
          </div>
          <img src={zaloQrUrl} alt="Zalo QR" />
          {zalo && (
            <a href={zaloHref(zalo)} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, fontWeight: 600, color: '#0068ff' }}>
              {t('contact.zalo')} ↗
            </a>
          )}
        </div>
      )}

      {chatOpen && liveChatEnabled && (
        <section
          id="hs-live-chat-drawer"
          className="hs-chat-drawer"
          role="dialog"
          aria-label={titleText}
          data-hs-live-chat="open"
        >
          <header className="hs-chat-head" style={{ background: accent }}>
            <div className="hs-chat-head-info">
              <h2 className="hs-chat-head-title">
                <span className="hs-chat-dot" aria-hidden="true" />
                <span>{titleText}</span>
              </h2>
              <p className="hs-chat-head-sub">{subtitleText}</p>
            </div>
            <div className="hs-chat-head-actions">
              {sessionId && (
                <button
                  type="button"
                  className="hs-chat-icon-btn"
                  title={t('chat.startNew')}
                  aria-label={t('chat.startNew')}
                  onClick={clearSession}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                    <path d="M3 3v5h5" />
                  </svg>
                </button>
              )}
              <button
                type="button"
                className="hs-chat-icon-btn"
                aria-label={t('chat.close')}
                onClick={() => setChatOpen(false)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </header>

          <div className="hs-chat-log" ref={logRef} role="log" aria-live="polite">
            {messages.length === 0 ? (
              <div className="hs-chat-row is-system">
                <div className="hs-chat-bubble">{greetingText}</div>
              </div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={`hs-chat-row is-${m.sender}`}>
                  <div className="hs-chat-bubble" style={m.sender === 'visitor' ? { background: accent } : undefined}>
                    {m.text}
                  </div>
                  <span className="hs-chat-meta">
                    {m.sender === 'staff' && m.author ? `${m.author} · ` : ''}
                    {formatTime(m.createdAt)}
                  </span>
                </div>
              ))
            )}
          </div>

          {status === 'closed' && <p className="hs-chat-note">{t('chat.closedNote')}</p>}
          {error && <p className="hs-chat-error" role="alert">{error}</p>}

          <form className="hs-chat-form" onSubmit={handleSubmit}>
            <input
              type="text"
              name="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              style={{ position: 'absolute', left: -9999, width: 1, height: 1, opacity: 0 }}
            />
            {!sessionId && (
              <div className="hs-chat-ident">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('chat.namePlaceholder')}
                  aria-label={t('chat.namePlaceholder')}
                  maxLength={80}
                />
                <input
                  type="tel"
                  value={visitorPhone}
                  onChange={(e) => setVisitorPhone(e.target.value)}
                  placeholder={t('chat.phonePlaceholder')}
                  aria-label={t('chat.phonePlaceholder')}
                  maxLength={30}
                />
              </div>
            )}
            <div className="hs-chat-compose">
              <textarea
                ref={inputRef}
                rows={1}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    void handleSubmit(e)
                  }
                }}
                placeholder={t('chat.inputPlaceholder')}
                aria-label={t('chat.inputPlaceholder')}
                maxLength={1000}
              />
              <button
                type="submit"
                className="hs-chat-send"
                style={{ background: accent }}
                disabled={sending || !draft.trim()}
                aria-label={sending ? t('chat.sending') : t('chat.send')}
              >
                {sending ? '…' : t('chat.send')}
              </button>
            </div>
          </form>
        </section>
      )}

      <div className="hs-dock-stack">
        {phone && (
          <a
            href={`tel:${phone.replace(/\s/g, '')}`}
            aria-label={t('contact.call')}
            className={`hs-dock-btn${support?.callLabel ? ' has-call-label' : ' is-icon-only'}`}
            style={{ background: '#16a34a' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            {support?.callLabel && <span className="hs-dock-call-label">{support.callLabel}</span>}
          </a>
        )}

        {(zalo || zaloQrUrl) &&
          (zaloQrUrl ? (
            <button
              type="button"
              aria-label={t('contact.zalo')}
              aria-expanded={qrOpen}
              className="hs-dock-btn is-icon-only"
              style={{ background: '#0068ff' }}
              onClick={() => {
                setChatOpen(false)
                setQrOpen((v) => !v)
              }}
            >
              <span>Zalo</span>
            </button>
          ) : (
            <a
              href={zaloHref(zalo!)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('contact.zalo')}
              className="hs-dock-btn is-icon-only"
              style={{ background: '#0068ff' }}
            >
              <span>Zalo</span>
            </a>
          ))}

        {email && (
          <a
            href={`mailto:${email}`}
            aria-label="Email"
            className="hs-dock-btn is-icon-only"
            style={{ background: '#0ea5e9' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </a>
        )}

        {liveChatEnabled && (
          <button
            type="button"
            data-hs-chat-toggle="true"
            aria-label={chatOpen ? t('chat.close') : t('chat.open')}
            aria-expanded={chatOpen}
            aria-controls="hs-live-chat-drawer"
            className="hs-dock-btn is-icon-only"
            style={{ background: accent }}
            onClick={() => setChatOpen((v) => !v)}
          >
            {chatOpen ? (
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            )}
            {!chatOpen && unread > 0 && <span className="hs-dock-badge">{unread > 9 ? '9+' : unread}</span>}
          </button>
        )}
      </div>
    </div>
  )
}
