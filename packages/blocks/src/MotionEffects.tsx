'use client'
import React, { useEffect, useRef, useState } from 'react'
import { motionKeyframes, type MotionConfig } from './motion-effects'
import { useMotionScope } from './MotionScope'

export function MotionEffects({ value, children }: { value: MotionConfig; children: React.ReactNode }) {
  const anchorRef = useRef<HTMLDivElement>(null)
  const entranceRef = useRef<HTMLDivElement>(null)
  const loopRef = useRef<HTMLDivElement>(null)
  const syncRef = useRef<() => void>(() => {})
  const scope = useMotionScope()
  const [localPaused, setLocalPaused] = useState(false)
  const pausedRef = useRef(false)
  pausedRef.current = (scope?.paused ?? false) || localPaused

  useEffect(() => {
    const anchor = anchorRef.current, entranceNode = entranceRef.current, loopNode = loopRef.current
    const doc = anchor?.ownerDocument, win = doc?.defaultView
    if (!anchor || !entranceNode || !loopNode || !doc || !win || !value || !win.matchMedia || !win.IntersectionObserver || !entranceNode.animate) return
    const entrance = value.entrance?.preset !== 'none' ? value.entrance : undefined
    const loop = value.loop?.preset !== 'none' ? value.loop : undefined
    if (!entrance && !loop) return
    const reduced = win.matchMedia('(prefers-reduced-motion: reduce)')
    const mobile = win.matchMedia('(max-width: 768px)')
    const units = entrance?.preset === 'text-lines' || entrance?.preset === 'text-words' ? [...entranceNode.querySelectorAll<HTMLElement>('[data-motion-unit]')] : []
    const entranceTargets: HTMLElement[] = units.length ? units : [entranceNode]
    const marquee = loopNode.querySelector<HTMLElement>('[data-motion-marquee]')
    const loopTarget = loop?.preset === 'marquee' ? marquee : loopNode
    const unregister = loop && loopTarget ? scope?.register() : undefined
    let viewport: HTMLElement | null = anchor.parentElement
    while (viewport && (viewport === doc.body || viewport === doc.documentElement || viewport.scrollHeight <= viewport.clientHeight || !/(auto|scroll)/.test(win.getComputedStyle(viewport).overflowY))) viewport = viewport.parentElement
    let intersecting = false, entranceDone = !entrance, started = false, loopDone = false
    let entranceAnimations: Animation[] = [], loopAnimation: Animation | undefined
    let focusTimer = 0
    const disabled = () => reduced.matches || !!(value.disableOnMobile && mobile.matches)
    const focused = () => loopNode.contains(doc.activeElement)
    const eligible = () => intersecting && !doc.hidden && !pausedRef.current && !focused() && !disabled()
    const clearEntrance = () => entranceTargets.forEach((target) => { target.style.opacity = '' })
    const cancel = () => {
      entranceAnimations.forEach((animation) => { animation.onfinish = null; animation.cancel() })
      entranceAnimations = []
      if (loopAnimation) { loopAnimation.onfinish = null; loopAnimation.cancel() }
      loopAnimation = undefined
      marquee?.parentElement?.removeAttribute('data-motion-marquee-active')
      clearEntrance()
    }
    const startLoop = () => {
      if (!loop || !loopTarget || loopAnimation || loopDone || !eligible()) return
      loopAnimation = loopTarget.animate(motionKeyframes('loop', loop.preset, loop.amount), {
        duration: loop.duration, delay: loop.delay, iterations: loop.iterations === 'infinite' ? Infinity : loop.iterations,
        easing: loop.preset === 'spin' || loop.preset === 'marquee' || loop.preset === 'orbit' ? 'linear' : 'ease-in-out',
      })
      marquee?.parentElement?.setAttribute('data-motion-marquee-active', '')
      loopAnimation.onfinish = () => {
        loopDone = true
        marquee?.parentElement?.removeAttribute('data-motion-marquee-active')
      }
    }
    const finishEntrance = () => {
      if (entranceDone) return
      entranceDone = true
      entranceAnimations.forEach((animation) => { animation.onfinish = null; animation.cancel() })
      entranceAnimations = []
      clearEntrance()
      startLoop()
    }
    const startEntrance = () => {
      if (!entrance || started || !eligible()) return
      started = true
      const keyframes = units.length ? [{ opacity: 0, transform: 'translate3d(0,.6em,0)' }, { opacity: 1, transform: 'none' }] : motionKeyframes('entrance', entrance.preset)
      entranceAnimations = entranceTargets.map((target, index) => target.animate(keyframes, {
        duration: entrance.duration, delay: entrance.delay + Math.min(index * 60, 2000), easing: 'ease-out', fill: 'backwards',
      }))
      entranceAnimations.at(-1)!.onfinish = finishEntrance
      clearEntrance()
    }
    const sync = () => {
      if (disabled()) {
        cancel()
        entranceDone = true
        started = true
        return
      }
      if (focused()) finishEntrance()
      if (eligible()) {
        if (!entranceDone) startEntrance()
        else startLoop()
        entranceAnimations.forEach((animation) => animation.play())
        if (loopAnimation && !loopDone && loopAnimation.playState !== 'finished') loopAnimation.play()
      } else {
        entranceAnimations.forEach((animation) => animation.pause())
        if (loopAnimation && !loopDone) loopAnimation.pause()
      }
    }
    syncRef.current = sync
    const observer = new win.IntersectionObserver((entries) => {
      intersecting = entries.some((entry) => entry.isIntersecting && entry.intersectionRatio > 0)
      sync()
    }, { root: viewport })
    observer.observe(anchor)
    const onFocus = () => sync()
    const onBlur = () => { focusTimer = win.setTimeout(sync, 0) }
    doc.addEventListener('visibilitychange', sync)
    reduced.addEventListener('change', sync)
    mobile.addEventListener('change', sync)
    anchor.addEventListener('focusin', onFocus)
    anchor.addEventListener('focusout', onBlur)
    return () => {
      syncRef.current = () => {}
      win.clearTimeout(focusTimer)
      observer.disconnect()
      doc.removeEventListener('visibilitychange', sync)
      reduced.removeEventListener('change', sync)
      mobile.removeEventListener('change', sync)
      anchor.removeEventListener('focusin', onFocus)
      anchor.removeEventListener('focusout', onBlur)
      cancel()
      unregister?.()
    }
  }, [value, scope?.register])
  useEffect(() => syncRef.current(), [scope?.paused, localPaused])

  const hasLoop = value.loop && value.loop.preset !== 'none'
  return <div ref={anchorRef} data-motion-effect="" style={{ position: 'relative', width: '100%', height: '100%' }}>
    <div ref={entranceRef} data-motion-entrance="" style={{ width: '100%', height: '100%' }}>
      <div ref={loopRef} data-motion-loop="" style={{ width: '100%', height: '100%' }}>{children}</div>
    </div>
    {!scope && hasLoop && <button type="button" aria-label={localPaused ? 'Tiếp tục chuyển động' : 'Tạm dừng chuyển động'} aria-pressed={localPaused} onClick={() => setLocalPaused((paused) => !paused)} style={{ position: 'absolute', top: 8, right: 8, zIndex: 20, minWidth: 44, minHeight: 44, background: '#fff', color: '#111827' }}>{localPaused ? '▶' : 'Ⅱ'}</button>}
  </div>
}
