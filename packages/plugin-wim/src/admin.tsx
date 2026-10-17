'use client'
import { useTranslation } from '@payloadcms/ui'
import React, { useState } from 'react'

// Nút "Kiểm tra kết nối" trong trang cài đặt WIM (admin Payload).
export const TestConnection = () => {
  const en = /^en/i.test(useTranslation().i18n.language)
  const T = (vi: string, e: string) => (en ? e : vi)
  const [state, setState] = useState<{ busy?: boolean; ok?: boolean; message?: string }>({})

  const run = async () => {
    setState({ busy: true })
    try {
      const res = await fetch('/api/plugins/wim/test', { method: 'POST' })
      const j = await res.json()
      setState({ ok: j.ok, message: j.message })
    } catch {
      setState({ ok: false, message: T('Không gọi được site để kiểm tra.', 'Could not call the site to run the test.') })
    }
  }

  const [tpl, setTpl] = useState<{ busy?: boolean; ok?: boolean; message?: string }>({})
  const install = async () => {
    if (!confirm(T('Cài site cửa hàng mẫu? Trang trùng đường dẫn sẽ được cập nhật.', 'Install the sample shop site? Pages with the same path will be updated.'))) return
    setTpl({ busy: true })
    try {
      const res = await fetch('/api/site/template-install', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: 'phu-tung-o-to' }) })
      const j = await res.json()
      setTpl({ ok: j.ok, message: j.ok ? T('Đã cài site cửa hàng mẫu: các trang, menu và block WIM đã sẵn sàng.', 'Sample shop site installed: pages, menu and WIM blocks are ready.') : j.error })
    } catch {
      setTpl({ ok: false, message: T('Không cài được site mẫu.', 'Could not install the sample site.') })
    }
  }

  return (
    <div style={{ marginBottom: 24 }}>
      <button
        type="button"
        onClick={run}
        disabled={state.busy}
        style={{ background: 'var(--hosso-brand, #d71920)', color: '#fff', border: 0, borderRadius: 4, padding: '10px 18px', fontWeight: 600, cursor: 'pointer' }}
      >
        {state.busy ? T('Đang kiểm tra…', 'Testing…') : T('Kiểm tra kết nối', 'Test connection')}
      </button>
      <p style={{ marginTop: 8, color: state.ok === false ? 'var(--theme-error-500)' : undefined }} role="status">
        {state.message ?? T('Lưu cài đặt trước, sau đó bấm để thử gọi WIM.', 'Save the settings first, then click to try calling WIM.')}
      </p>
      <button type="button" onClick={install} disabled={tpl.busy} style={{ marginTop: 12, background: 'transparent', color: 'inherit', border: '1px solid currentColor', borderRadius: 4, padding: '10px 18px', fontWeight: 600, cursor: 'pointer' }}>
        {tpl.busy ? T('Đang cài…', 'Installing…') : T('Cài site cửa hàng mẫu', 'Install sample shop site')}
      </button>
      {tpl.message && <p style={{ marginTop: 8, color: tpl.ok === false ? 'var(--theme-error-500)' : undefined }} role="status">{tpl.message}</p>}
    </div>
  )
}
