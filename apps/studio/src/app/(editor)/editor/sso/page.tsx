'use client'

import { useEffect, useRef, useState } from 'react'

export default function KilnSSOPage() {
  const started = useRef(false)
  const [error, setError] = useState('')
  useEffect(() => {
    if (started.current) return
    started.current = true
    const code = new URLSearchParams(window.location.hash.slice(1)).get('code') ?? ''
    window.history.replaceState(null, '', window.location.pathname)
    void fetch('/api/site/sso-code', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body: JSON.stringify({ code }),
    }).then(async (res) => {
      const body = await res.json()
      if (!res.ok || typeof body.redirect !== 'string' || !/^\/editor\/[a-zA-Z0-9-]+$/.test(body.redirect)) throw new Error()
      window.location.replace(body.redirect)
    }).catch(() => setError('Không mở được Studio. Vui lòng trở về Kiln và thử lại.'))
  }, [])
  return <main style={{ padding: 32 }} aria-live="polite">{error || 'Đang mở Studio…'}</main>
}
