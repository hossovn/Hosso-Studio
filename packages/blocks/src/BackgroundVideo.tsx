'use client'
import React, { useEffect, useRef, useState } from 'react'
import { useMotionScope } from './MotionScope'

export function BackgroundVideo({ src, poster, fit = 'cover', position = '50% 50%', editing = false }: { src: string; poster?: string; fit?: 'cover' | 'contain'; position?: string; editing?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null)
  const syncRef = useRef<() => void>(() => {})
  const scope = useMotionScope()
  const [paused, setPaused] = useState(false)
  const pausedRef = useRef(false)
  pausedRef.current = paused || !!scope?.paused || editing
  useEffect(() => {
    const video = ref.current, doc = video?.ownerDocument, win = doc?.defaultView
    if (!video || !doc || !win) return
    const reduced = win.matchMedia('(prefers-reduced-motion: reduce)')
    let visible = false, disposed = false
    const unregister = scope?.register()
    const sync = () => {
      if (disposed) return
      const active = visible && !doc.hidden && !reduced.matches && !pausedRef.current
      if (!active) {
        video.pause()
        if ((reduced.matches || editing) && video.getAttribute('src')) { video.removeAttribute('src'); video.load() }
        return
      }
      if (!video.getAttribute('src')) video.src = src
      void video.play().catch(() => { /* Poster remains visible if autoplay is unavailable. */ })
    }
    syncRef.current = sync
    const observer = new win.IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting)
      sync()
    })
    observer.observe(video)
    reduced.addEventListener('change', sync)
    doc.addEventListener('visibilitychange', sync)
    return () => {
      disposed = true
      syncRef.current = () => {}
      observer.disconnect()
      reduced.removeEventListener('change', sync)
      doc.removeEventListener('visibilitychange', sync)
      video.pause()
      video.removeAttribute('src')
      video.load()
      unregister?.()
    }
  }, [src, scope?.register])
  useEffect(() => syncRef.current(), [paused, scope?.paused, editing])
  return <>
    <video ref={ref} poster={poster || undefined} muted loop playsInline preload="none" aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: fit, objectPosition: position, pointerEvents: 'none' }} />
    {!editing && !scope && <button type="button" onClick={() => setPaused(!paused)} aria-pressed={paused} aria-label={paused ? 'Tiếp tục video nền' : 'Tạm dừng video nền'} style={{ position: 'absolute', right: 12, bottom: 12, zIndex: 30, minWidth: 44, minHeight: 44, borderRadius: 8, background: '#fff', color: '#111827' }}>{paused ? '▶' : 'Ⅱ'}</button>}
  </>
}
