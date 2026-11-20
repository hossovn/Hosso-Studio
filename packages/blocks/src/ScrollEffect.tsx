'use client'
import React, { useEffect, useMemo, useRef } from 'react'
import { entranceKeyframes, normalizeScrollEffect, scrollEffectFrame } from './scroll-effects'
import { MOBILE_MEDIA } from './responsive-breakpoints'
import { registerScrollTask } from './scroll-scheduler'

export function ScrollEffect({ value, children }: { value: unknown; children: React.ReactNode }) {
  const anchorRef = useRef<HTMLDivElement>(null)
  const movingRef = useRef<HTMLDivElement>(null)
  const effect = useMemo(() => normalizeScrollEffect(value), [value])
  useEffect(() => {
    const anchor = anchorRef.current, moving = movingRef.current
    const win = anchor?.ownerDocument.defaultView
    if (!anchor || !moving || !win || !effect) return
    const reduced = win.matchMedia('(prefers-reduced-motion: reduce)')
    const mobile = win.matchMedia(MOBILE_MEDIA)
    const boundary = anchor.closest<HTMLElement>('[data-scroll-boundary]')
    let viewport: HTMLElement | null = anchor.parentElement
    while (viewport && (viewport === anchor.ownerDocument.body || viewport === anchor.ownerDocument.documentElement || viewport.scrollHeight <= viewport.clientHeight || !/(auto|scroll)/.test(win.getComputedStyle(viewport).overflowY))) viewport = viewport.parentElement
    const reset = () => { moving.style.transform = ''; moving.style.opacity = '' }
    if (effect.mode === 'entrance') {
      if (!win.IntersectionObserver || !moving.animate) return
      let played = false
      let animation: Animation | undefined
      const reveal = () => { played = true; observer.disconnect(); animation?.cancel(); reset() }
      const check = () => {
        if (reduced.matches || (effect.disableOnMobile && mobile.matches) || anchor.contains(anchor.ownerDocument.activeElement)) reveal()
      }
      const observer = new win.IntersectionObserver((entries) => {
        check()
        if (played || !entries.some((entry) => entry.isIntersecting && entry.intersectionRatio > 0)) return
        played = true
        observer.disconnect()
        reset()
        animation = moving.animate(entranceKeyframes(effect.entrance), { duration: effect.duration, delay: effect.delay, easing: 'ease-out', fill: 'backwards' })
      }, { root: viewport })
      moving.style.opacity = '0'
      check()
      if (!played) observer.observe(anchor)
      reduced.addEventListener('change', check)
      mobile.addEventListener('change', check)
      anchor.addEventListener('focusin', reveal)
      return () => {
        reveal()
        reduced.removeEventListener('change', check)
        mobile.removeEventListener('change', check)
        anchor.removeEventListener('focusin', reveal)
      }
    }
    let nearViewport = !win.IntersectionObserver
    const task = registerScrollTask(win, { read: () => {
      if (reduced.matches || (effect.disableOnMobile && mobile.matches) || anchor.contains(anchor.ownerDocument.activeElement)) return reset
      if (!nearViewport) return
      const box = anchor.getBoundingClientRect()
      const view = viewport?.getBoundingClientRect()
      const value = scrollEffectFrame(effect, { top: box.top, height: box.height, boundaryBottom: boundary?.getBoundingClientRect().bottom ?? box.bottom, viewportTop: view ? view.top + viewport!.clientTop : 0, viewportHeight: viewport?.clientHeight ?? win.innerHeight })
      // Pin offsets are measured in viewport pixels, including an owner section's scale.
      const localHeight = parseFloat(win.getComputedStyle(anchor).height) || box.height
      const y = effect.mode === 'pin' && box.height ? value.y * localHeight / box.height : value.y
      return () => {
        moving.style.transform = `translate3d(${value.x}px,${y}px,0) scale(${value.scale})`
        moving.style.opacity = String(value.opacity)
      }
    } })
    const schedule = task.schedule
    const visibility = win.IntersectionObserver ? new win.IntersectionObserver((entries) => {
      nearViewport = entries.some((entry) => entry.isIntersecting)
      schedule()
    }, { root: viewport, rootMargin: '600px' }) : undefined
    // A pinned anchor can leave the viewport while its moving content is still visible.
    visibility?.observe(effect.mode === 'pin' ? boundary ?? anchor : anchor)
    const resize = new win.ResizeObserver(schedule)
    resize.observe(anchor)
    if (boundary) resize.observe(boundary)
    if (viewport) resize.observe(viewport)
    reduced.addEventListener('change', schedule)
    mobile.addEventListener('change', schedule)
    anchor.addEventListener('focusin', schedule)
    anchor.addEventListener('focusout', schedule)
    schedule()
    return () => {
      task.dispose()
      visibility?.disconnect()
      resize.disconnect()
      reduced.removeEventListener('change', schedule)
      mobile.removeEventListener('change', schedule)
      anchor.removeEventListener('focusin', schedule)
      anchor.removeEventListener('focusout', schedule)
      reset()
    }
  }, [effect])
  return <div ref={anchorRef} data-scroll-effect={effect?.mode} style={{ width: '100%', height: '100%' }}><div ref={movingRef} style={{ width: '100%', height: '100%' }}>{children}</div></div>
}
