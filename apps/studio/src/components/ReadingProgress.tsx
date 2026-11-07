'use client'
import { safeCssColor } from '@hosso/studio-blocks'
import React, { useEffect, useRef } from 'react'

export function ReadingProgress({ color = '#facc15', height = 3 }: { color?: string; height?: number }) {
  const barRef = useRef<HTMLDivElement>(null)
  const safeColor = safeCssColor(color, '#facc15')
  const h = Math.min(8, Math.max(2, Number(height) || 3))

  useEffect(() => {
    let raf = 0
    const measure = () => {
      raf = 0
      const el = barRef.current
      if (!el) return
      const doc = el.ownerDocument.documentElement
      const max = doc.scrollHeight - doc.clientHeight
      const ratio = max > 0 ? Math.min(1, Math.max(0, (window.scrollY || doc.scrollTop || 0) / max)) : 0
      el.style.transform = `scaleX(${ratio})`
    }
    const schedule = () => {
      if (!raf) raf = window.requestAnimationFrame(measure)
    }
    measure()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule, { passive: true })
    return () => {
      if (raf) window.cancelAnimationFrame(raf)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [])

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: h,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 25,
      }}
    >
      <div
        ref={barRef}
        data-hs-reading-progress=""
        style={{
          width: '100%',
          height: '100%',
          background: safeColor,
          transformOrigin: '0 50%',
          transform: 'scaleX(0)',
          willChange: 'transform',
        }}
      />
    </div>
  )
}
