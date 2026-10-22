'use client'

import React, { useEffect, useState } from 'react'

import { useAdminT } from '@/lib/use-admin-t'

/** Bật/tắt xác thực hai lớp cho tài khoản đang đăng nhập (trong trang Tài khoản). */
export const TwoFactorField = () => {
  const T = useAdminT()
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [setup, setSetup] = useState<{ secret: string; uri: string } | null>(null)
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState('')
  const call = async (path: string, body?: unknown) => {
    const r = await fetch(`/api/users/2fa/${path}`, { method: body === undefined ? 'GET' : 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
    return r.json().catch(() => ({ ok: false }))
  }
  useEffect(() => {
    void call('status').then((j) => setEnabled(Boolean(j.enabled)))
  }, [])

  const box: React.CSSProperties = { border: '1px solid var(--theme-elevation-150)', borderRadius: 10, padding: 16, margin: '16px 0', display: 'grid', gap: 10 }
  const input: React.CSSProperties = { width: 160, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--theme-elevation-200)', background: 'var(--theme-input-bg)', color: 'inherit', font: 'inherit', letterSpacing: '.25em' }
  if (enabled === null) return null
  return (
    <section style={box} aria-label={T('Xác thực hai lớp')}>
      <strong>{T('Xác thực hai lớp')}</strong>
      {!enabled && !setup && (
        <>
          <span style={{ opacity: 0.8 }}>{T('Thêm một lớp bảo vệ: khi đăng nhập cần thêm mã 6 số từ ứng dụng Google Authenticator, Microsoft Authenticator hoặc Authy.')}</span>
          <button type="button" className="btn btn--style-primary btn--size-medium" style={{ justifySelf: 'start' }} onClick={async () => { const j = await call('setup', {}); if (j.ok) setSetup(j); else setMsg(T('Không bắt đầu được.')) }}>
            {T('Bật xác thực hai lớp')}
          </button>
        </>
      )}
      {setup && (
        <>
          <span>{T('1. Mở ứng dụng xác thực, chọn thêm tài khoản bằng khóa nhập tay và nhập khóa sau:')}</span>
          <code style={{ padding: 10, borderRadius: 8, background: 'var(--theme-elevation-100)', userSelect: 'all', wordBreak: 'break-all' }}>{setup.secret}</code>
          <a href={setup.uri} style={{ justifySelf: 'start' }}>{T('Hoặc mở bằng ứng dụng trên máy này')}</a>
          <span>{T('2. Nhập mã 6 số hiện trong ứng dụng để xác nhận:')}</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} style={input} aria-label={T('Mã 6 số')} />
            <button type="button" className="btn btn--style-primary btn--size-medium" onClick={async () => { const j = await call('enable', { code }); if (j.ok) { setEnabled(true); setSetup(null); setCode(''); setMsg(T('Đã bật xác thực hai lớp.')) } else setMsg(T('Mã không đúng. Thử lại.')) }}>
              {T('Xác nhận')}
            </button>
          </div>
        </>
      )}
      {enabled && (
        <>
          <span>{T('Đã bật. Đăng nhập cần mã 6 số.')}</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} style={input} aria-label={T('Mã 6 số')} placeholder="000000" />
            <button type="button" className="btn btn--style-secondary btn--size-medium" onClick={async () => { const j = await call('disable', { code }); if (j.ok) { setEnabled(false); setCode(''); setMsg(T('Đã tắt xác thực hai lớp.')) } else setMsg(T('Mã không đúng.')) }}>
              {T('Tắt xác thực hai lớp')}
            </button>
          </div>
        </>
      )}
      {msg && <span role="status">{msg}</span>}
    </section>
  )
}
