'use client'
import { useLocale, useT } from '@hosso/studio-blocks'
import React, { useState } from 'react'

/** Form bình luận: gửi tới /api/site/comments (chống spam phía server); bình luận chờ duyệt trừ khi admin bật tự duyệt. */
export function CommentForm({ postId }: { postId: string }) {
  const t = useT()
  const { locale } = useLocale()
  const [state, setState] = useState<'idle' | 'busy' | 'pending' | 'approved' | 'error'>('idle')

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setState('busy')
    try {
      const res = await fetch('/api/site/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, name: f.get('name'), email: f.get('email'), content: f.get('content'), website: f.get('website'), locale }),
      })
      const body = await res.json().catch(() => ({}))
      if (res.ok && body.ok) {
        ;(e.target as HTMLFormElement).reset()
        return setState(body.status === 'approved' ? 'approved' : 'pending')
      }
      setState('error')
    } catch {
      setState('error')
    }
  }

  if (state === 'pending' || state === 'approved') {
    return (
      <p className="ss-form-sent" role="status">
        {state === 'approved' ? t('comments.sentLive') : t('comments.sent')}
      </p>
    )
  }
  return (
    <form className="ss-form" onSubmit={submit}>
      <label>
        {t('comments.name')}
        <input name="name" required maxLength={80} autoComplete="name" />
      </label>
      <label>
        {t('comments.email')}
        <input name="email" type="email" maxLength={200} autoComplete="email" />
      </label>
      <label>
        {t('comments.text')}
        <textarea name="content" required minLength={3} maxLength={2000} rows={4} />
      </label>
      <input className="ss-hp" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      {state === 'error' && (
        <p className="ss-field-error" role="alert">
          {t('comments.error')}
        </p>
      )}
      <button className="ss-btn" type="submit" disabled={state === 'busy'}>
        {t('comments.submit')}
      </button>
    </form>
  )
}
