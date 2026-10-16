'use client'
import React, { useState } from 'react'

// Nút "Kiểm tra kết nối" trong trang cài đặt WIM (admin Payload).
export const TestConnection = () => {
  const [state, setState] = useState<{ busy?: boolean; ok?: boolean; message?: string }>({})

  const run = async () => {
    setState({ busy: true })
    try {
      const res = await fetch('/api/plugins/wim/test', { method: 'POST' })
      const j = await res.json()
      setState({ ok: j.ok, message: j.message })
    } catch {
      setState({ ok: false, message: 'Không gọi được site để kiểm tra.' })
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
        {state.busy ? 'Đang kiểm tra…' : 'Kiểm tra kết nối'}
      </button>
      <p style={{ marginTop: 8, color: state.ok === false ? 'var(--theme-error-500)' : undefined }} role="status">
        {state.message ?? 'Lưu cài đặt trước, sau đó bấm để thử gọi WIM.'}
      </p>
    </div>
  )
}
