'use client'
import React, { useEffect, useMemo, useRef } from 'react'
import { normalizeScrollEffect, scrollEffectFrame } from './scroll-effects'

export function ScrollEffect({ value, children }: { value: unknown; children: React.ReactNode }) {
  const anchorRef = useRef<HTMLDivElement>(null)
  const movingRef = useRef<HTMLDivElement>(null)
  const effect = useMemo(() => normalizeScrollEffect(value), [value])
  useEffect(() => {
    const anchor = anchorRef.current, moving = movingRef.current
    const win = anchor?.ownerDocument.defaultView
    if (!anchor || !moving || !win || !effect) return
    const reduced = win.matchMedia('(prefers-reduced-motion: reduce)')
    const mobile = win.matchMedia('(max-width: 640px)')
    const boundary = anchor.closest<HTMLElement>('[data-scroll-boundary]')
    let viewport: HTMLElement | null = anchor.parentElement
    while (viewport && (viewport === anchor.ownerDocument.body || viewport === anchor.ownerDocument.documentElement || viewport.scrollHeight <= viewport.clientHeight || !/(auto|scroll)/.test(win.getComputedStyle(viewport).overflowY))) viewport = viewport.parentElement
    let frame = 0
    const reset = () => { moving.style.transform = ''; moving.style.opacity = '' }
    const update = () => {
      frame = 0
      if (reduced.matches || (effect.disableOnMobile && mobile.matches) || anchor.contains(anchor.ownerDocument.activeElement)) { reset(); return }
      const box = anchor.getBoundingClientRect()
      const view = viewport?.getBoundingClientRect()
      const value = scrollEffectFrame(effect, { top: box.top, height: box.height, boundaryBottom: boundary?.getBoundingClientRect().bottom ?? box.bottom, viewportTop: view ? view.top + viewport!.clientTop : 0, viewportHeight: viewport?.clientHeight ?? win.innerHeight })
      // Pin offsets are measured in viewport pixels, including an owner section's scale.
      const localHeight = parseFloat(win.getComputedStyle(anchor).height) || box.height
      const y = effect.mode === 'pin' && box.height ? value.y * localHeight / box.height : value.y
      moving.style.transform = `translate3d(${value.x}px,${y}px,0) scale(${value.scale})`
      moving.style.opacity = String(value.opacity)
    }
    const schedule = () => { if (!frame) frame = win.requestAnimationFrame(update) }
    const resize = new win.ResizeObserver(schedule)
    resize.observe(anchor)
    if (boundary) resize.observe(boundary)
    if (viewport) resize.observe(viewport)
    win.addEventListener('scroll', schedule, { capture: true, passive: true })
    win.addEventListener('resize', schedule)
    reduced.addEventListener('change', schedule)
    mobile.addEventListener('change', schedule)
    anchor.addEventListener('focusin', schedule)
    anchor.addEventListener('focusout', schedule)
    update()
    return () => {
      win.cancelAnimationFrame(frame)
      resize.disconnect()
      win.removeEventListener('scroll', schedule, true)
      win.removeEventListener('resize', schedule)
      reduced.removeEventListener('change', schedule)
      mobile.removeEventListener('change', schedule)
      anchor.removeEventListener('focusin', schedule)
      anchor.removeEventListener('focusout', schedule)
      reset()
    }
  }, [effect])
  return <div ref={anchorRef} data-scroll-effect={effect?.mode} style={{ width: '100%', height: '100%' }}><div ref={movingRef} style={{ width: '100%', height: '100%' }}>{children}</div></div>
}
