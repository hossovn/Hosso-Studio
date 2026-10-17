'use client'
import React, { useState } from 'react'

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
      setMsg(`Lỗi: ${(e as Error).message}`)
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
        <h2 style={{ marginTop: 0 }}>Phiên bản</h2>
        <p>
          Hosso Studio <strong>{version}</strong>
          {latest ? (
            <>
              {' '}
              — có bản mới <strong>{latest.version}</strong>
              {latest.url && (
                <>
                  {' '}
                  (
                  <a href={latest.url} target="_blank" rel="noreferrer">
                    xem thay đổi
                  </a>
                  )
                </>
              )}
              . Cập nhật bằng một lệnh trên máy chủ:
            </>
          ) : updateConfigured ? (
            <> — đang là bản mới nhất.</>
          ) : (
            <>
              {' '}
              — chưa bật kiểm tra bản mới (đặt biến môi trường <code>HOSSO_UPDATE_URL</code>). Cập nhật bằng một lệnh trên máy chủ:
            </>
          )}
        </p>
        <pre style={{ background: 'var(--theme-elevation-50)', padding: 12, borderRadius: 4 }}>pnpm studio:update</pre>
        <p style={{ fontSize: 13, opacity: 0.8 }}>
          Lệnh tự sao lưu, lấy mã mới, cài phụ thuộc, chạy migration và build lại. Với Docker: <code>docker compose pull &amp;&amp; docker compose up -d</code>.
        </p>
      </section>

      <section style={card}>
        <h2 style={{ marginTop: 0 }}>Sao lưu</h2>
        <p>
          Gói zip gồm trang, bài viết, biểu mẫu, menu, cài đặt, chuyển hướng và media (không gồm tài khoản, bình luận, khóa bí mật). Tự động hằng ngày bằng <code>pnpm studio:backup</code> hoặc service <code>backup</code> trong
          docker-compose.
        </p>
        <p style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <a style={btn} href="/api/site/backup" download>
            Tải gói site về máy
          </a>
          <button
            type="button"
            style={ghost}
            disabled={busy}
            onClick={() =>
              run('Đang sao lưu', async () => {
                const j = await post('/api/site/backups', {})
                setBackups(j.backups)
                return `Đã sao lưu: ${j.name} (${kb(j.size)}).`
              })
            }
          >
            Sao lưu ngay trên máy chủ
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
        <h2 style={{ marginTop: 0 }}>Khôi phục từ gói</h2>
        <p>Chọn tệp gói zip đã xuất. Trang/bài trùng slug sẽ được cập nhật; không xóa dữ liệu hiện có.</p>
        <input
          type="file"
          accept=".zip"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (!f || !window.confirm(`Nhập gói "${f.name}"? Nội dung trùng slug sẽ bị ghi đè.`)) return
            run('Đang nhập gói', async () => {
              const j = await post('/api/site/package-import', { body: f, headers: { 'Content-Type': 'application/octet-stream' } })
              return `Xong. ${(j.log as string[]).join(' ')}`
            })
          }}
        />
      </section>

      <section style={card}>
        <h2 style={{ marginTop: 0 }}>Mẫu site</h2>
        {templates.length === 0 ? (
          <p>
            Chưa có mẫu. Đặt tệp <code>tên.hosso-site.zip</code> vào thư mục mẫu (<code>HOSSO_TEMPLATES_DIR</code>).
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
                    if (!window.confirm(`Cài mẫu "${t.id}"? Trang/bài trùng slug sẽ bị ghi đè.`)) return
                    run(`Đang cài mẫu ${t.id}`, async () => {
                      const j = await post('/api/site/template-install', { body: JSON.stringify({ id: t.id }), headers: { 'Content-Type': 'application/json' } })
                      return `Đã cài mẫu. ${(j.log as string[]).join(' ')}`
                    })
                  }}
                >
                  Cài mẫu này
                </button>
              </li>
            ))}
          </ul>
        )}
        <p style={{ fontSize: 13, opacity: 0.8 }}>
          Theme và plugin là mã nguồn nên không cài từ trình duyệt (tránh chạy mã lạ trên máy chủ): thêm package vào <code>hosso.config.ts</code> rồi build lại. Mẫu site chỉ mang nội dung và cấu hình, an toàn để cài từ admin.
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
