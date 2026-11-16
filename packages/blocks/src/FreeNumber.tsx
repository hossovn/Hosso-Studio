'use client'
import React, { useEffect, useRef, useState } from 'react'
import { countUpSettings, formatCount } from './detailing-effects'
import { fontStack } from './free-style'

export function FreeNumber({ p, unit, scale, editing = false }: { p: Record<string, any>; unit: number; scale?: number; editing?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null)
  const settings = countUpSettings(p)
  const { from, to, duration, decimals, locale, grouping } = settings
  const [value, setValue] = useState(to)
  const enabled = p.countUp === true && !editing
  const replay = p.countReplay === true
  useEffect(() => {
    setValue(to)
    const node = ref.current, doc = node?.ownerDocument, win = doc?.defaultView
    if (!enabled || !node || !doc || !win?.IntersectionObserver || !win.requestAnimationFrame || !win.matchMedia) return
    const reduced = win.matchMedia('(prefers-reduced-motion: reduce)')
    let frame = 0, elapsed = 0, previous: number | null = null, visible = false, done = false
    const stop = () => { win.cancelAnimationFrame(frame); frame = 0; previous = null }
    const tick = (time: number) => {
      frame = 0
      if (previous !== null) elapsed += time - previous
      previous = time
      const progress = Math.min(1, elapsed / duration)
      setValue(progress === 1 ? to : from + (to - from) * (1 - (1 - progress) ** 3))
      if (progress < 1) frame = win.requestAnimationFrame(tick)
      else { done = true; previous = null }
    }
    const sync = () => {
      if (reduced.matches) { stop(); done = true; setValue(to); return }
      if (!visible || doc.hidden || done) { stop(); return }
      if (!frame) frame = win.requestAnimationFrame(tick)
    }
    const observer = new win.IntersectionObserver((entries) => {
      const next = entries.some((entry) => entry.isIntersecting)
      if (!next && visible && replay && !reduced.matches) { elapsed = 0; done = false; setValue(from) }
      if (next && !visible && elapsed === 0 && !done && !reduced.matches) setValue(from)
      visible = next
      sync()
    })
    observer.observe(node)
    doc.addEventListener('visibilitychange', sync)
    reduced.addEventListener('change', sync)
    return () => { stop(); observer.disconnect(); doc.removeEventListener('visibilitychange', sync); reduced.removeEventListener('change', sync) }
  }, [enabled, from, to, duration, decimals, locale, grouping, replay])
  const u = (n: number) => scale !== undefined ? `${Number(n) * scale}px` : `${Number(n) / unit * 100}cqw`
  const literal = p.countUp === true ? formatCount(to, settings) : p.value
  const shown = enabled ? formatCount(value, settings) : literal
  return <div style={{ width: '100%', height: '100%', display: 'grid', alignContent: 'center', justifyItems: p.align === 'left' ? 'start' : p.align === 'right' ? 'end' : 'center', fontFamily: fontStack(p.font) ?? 'inherit', textAlign: p.align ?? 'center', lineHeight: 1.1 }}>
    <span ref={ref} data-count-up={p.countUp === true ? '' : undefined} aria-label={p.countUp === true ? `${p.prefix ?? ''}${literal}${p.suffix ?? ''}` : undefined} style={{ fontSize: u(p.size ?? 72), fontWeight: p.weight ?? 800, color: p.color, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}><span aria-hidden={p.countUp === true ? true : undefined}>{p.prefix}{shown}{p.suffix}</span></span>
    {p.label ? <span style={{ fontSize: p.countUp === true ? `max(12px, ${u(Math.max(12, (p.size ?? 72) * 0.26))})` : u(Math.max(12, (p.size ?? 72) * 0.26)), color: p.labelColor ?? '#6b7280', marginTop: u(6) }}>{p.label}</span> : null}
  </div>
}
