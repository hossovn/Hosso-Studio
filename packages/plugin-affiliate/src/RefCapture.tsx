'use client'
import { useEffect } from 'react'
/** Server validates the referral before replacing the previous attribution. */
export function RefCapture() {
  useEffect(() => {
    const capture = () => {
      const ref = new URLSearchParams(location.search).get('ref')?.trim()
      if (ref && /^[\w-]{1,40}$/.test(ref)) void fetch('/api/plugins/affiliate/click', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: ref, path: location.pathname }),
      }).catch(() => undefined)
    }
    capture()
    addEventListener('popstate', capture)
    return () => removeEventListener('popstate', capture)
  }, [])
  return null
}
