'use client'
import React, { useState } from 'react'

import { useAdminT } from '@/lib/use-admin-t'

type Props = {
  version: string
  latest: { version: string; url?: string } | null
  updateConfigured: boolean
  backups: { name: string; size: number }[]
  templates: { id: string; size: number }[]
}

const card: React.CSSProperties = { border: '1px solid var(--theme-elevation-150)', borderRadius: 8, padding: 20, marginBottom: 20 }
const btn: React.CSSProperties = { background: 'var(--hosso-brand)', color: '#fff', border: 0, borderRadius: 4, padding: '9px 16px', fontWeight: 600, cursor: 'pointer', font: 'inherit', textDecoration: 'none', display: 'inline-block' }
const ghost: React.CSSProperties = { ...btn, background: 'transparent', color: 'inherit', border: '1px solid var(--theme-elevation-300)' }
const kb = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`)

export function ToolsClient({ version, latest, updateConfigured, backups: initial, templates }: Props) {
  const T = useAdminT()
  const [backups, setBackups] = useState(initial)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const run = async (label: string, fn: () => Promise<string>) => {
    if (busy) return
    setBusy(true)
    setMsg(`${label}…`)
    try {
      setMsg(await fn())
    } catch (e) {
      setMsg(`${T('Lỗi')}: ${(e as Error).message}`)
    }
    setBusy(false)
  }
  const post = async (url: string, init: RequestInit) => {
    const r = await fetch(url, { method: 'POST', credentials: 'include', ...init })
    const j = await r.json().catch(() => ({}))
    if (!r.ok || j.ok === false) throw new Error(j.error || `HTTP ${r.status}`)
    return j
  }

  return (
    <>
      <section style={card}>
        <h2 style={{ marginTop: 0 }}>{T('Phiên bản')}</h2>
        <p>
          Hosso Studio <strong>{version}</strong>
          {latest ? (
            <>
              {' '}
              — {T('có bản mới')} <strong>{latest.version}</strong>
              {latest.url && (
                <>
                  {' '}
                  (
                  <a href={latest.url} target="_blank" rel="noreferrer">
                    {T('xem thay đổi')}
                  </a>
                  )
                </>
              )}
              . {T('Cập nhật bằng một lệnh trên máy chủ:')}
            </>
          ) : updateConfigured ? (
            <> — {T('đang là bản mới nhất.')}</>
          ) : (
            <>
              {' '}
              — {T('chưa bật kiểm tra bản mới (đặt biến môi trường')} <code>HOSSO_UPDATE_URL</code>). {T('Cập nhật bằng một lệnh trên máy chủ:')}
            </>
          )}
        </p>
        <pre style={{ background: 'var(--theme-elevation-50)', padding: 12, borderRadius: 4 }}>pnpm studio:update</pre>
        <p style={{ fontSize: 13, opacity: 0.8 }}>
          {T('Lệnh tự sao lưu, lấy mã mới, cài phụ thuộc, chạy migration và build lại. Với Docker:')} <code>docker compose pull &amp;&amp; docker compose up -d</code>.
        </p>
      </section>

      <section style={card}>
        <h2 style={{ marginTop: 0 }}>{T('Sao lưu')}</h2>
        <p>
          {T('Gói zip gồm trang, bài viết, biểu mẫu, menu, cài đặt, chuyển hướng và media (không gồm tài khoản, bình luận, khóa bí mật). Tự động hằng ngày bằng')} <code>pnpm studio:backup</code> {T('hoặc service')} <code>backup</code>{' '}
          {T('trong docker-compose.')}
        </p>
        <p style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <a style={btn} href="/api/site/backup" download>
            {T('Tải gói site về máy')}
          </a>
          <button
            type="button"
            style={ghost}
            disabled={busy}
            onClick={() =>
              run(T('Đang sao lưu'), async () => {
                const j = await post('/api/site/backups', {})
                setBackups(j.backups)
                return T('Đã sao lưu: {name} ({size}).', { name: j.name, size: kb(j.size) })
              })
            }
          >
            {T('Sao lưu ngay trên máy chủ')}
          </button>
        </p>
        {backups.length > 0 && (
          <ul>
            {backups.map((b) => (
              <li key={b.name}>
                <a href={`/api/site/backup?name=${encodeURIComponent(b.name)}`} download>
                  {b.name}
                </a>{' '}
                ({kb(b.size)})
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={card}>
        <h2 style={{ marginTop: 0 }}>{T('Khôi phục từ gói')}</h2>
        <p>{T('Chọn tệp gói zip đã xuất. Trang/bài trùng slug sẽ được cập nhật; không xóa dữ liệu hiện có.')}</p>
        <input
          type="file"
          accept=".zip"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (!f || !window.confirm(T('Nhập gói "{name}"? Nội dung trùng slug sẽ bị ghi đè.', { name: f.name }))) return
            run(T('Đang nhập gói'), async () => {
              const j = await post('/api/site/package-import', { body: f, headers: { 'Content-Type': 'application/octet-stream' } })
              return `${T('Xong.')} ${(j.log as string[]).join(' ')}`
            })
          }}
        />
      </section>

      <section style={card}>
        <h2 style={{ marginTop: 0 }}>{T('Mẫu site')}</h2>
        {templates.length === 0 ? (
          <p>
            {T('Chưa có mẫu. Đặt tệp')} <code>{T('tên')}.hosso-site.zip</code> {T('vào thư mục mẫu')} (<code>HOSSO_TEMPLATES_DIR</code>).
          </p>
        ) : (
          <ul>
            {templates.map((t) => (
              <li key={t.id} style={{ marginBottom: 8 }}>
                <strong>{t.id}</strong> ({kb(t.size)}){' '}
                <button
                  type="button"
                  style={ghost}
                  disabled={busy}
                  onClick={() => {
                    if (!window.confirm(T('Cài mẫu "{name}"? Trang/bài trùng slug sẽ bị ghi đè.', { name: t.id }))) return
                    run(T('Đang cài mẫu {name}', { name: t.id }), async () => {
                      const j = await post('/api/site/template-install', { body: JSON.stringify({ id: t.id }), headers: { 'Content-Type': 'application/json' } })
                      return `${T('Đã cài mẫu.')} ${(j.log as string[]).join(' ')}`
                    })
                  }}
                >
                  {T('Cài mẫu này')}
                </button>
              </li>
            ))}
          </ul>
        )}
        <p style={{ fontSize: 13, opacity: 0.8 }}>
          {T('Theme và plugin là mã nguồn nên không cài từ trình duyệt (tránh chạy mã lạ trên máy chủ): thêm package vào')} <code>hosso.config.ts</code>{' '}
          {T('rồi build lại. Mẫu site chỉ mang nội dung và cấu hình, an toàn để cài từ admin.')}
        </p>
      </section>

      {msg && (
        <p role="status" style={{ position: 'sticky', bottom: 16, background: 'var(--theme-elevation-100)', padding: 12, borderRadius: 6 }}>
          {msg}
        </p>
      )}
    </>
  )
}
