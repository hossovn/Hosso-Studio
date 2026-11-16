'use client'
import React, { useEffect, useState } from 'react'
import { comparisonPosition } from './detailing-effects'
import { safeCssColor } from './free-style'

const CSS = `
.hs-comparison{isolation:isolate}
.hs-comparison:focus-within{outline:3px solid var(--comparison-accent);outline-offset:3px}
.hs-comparison-range{position:absolute;inset:0;width:100%;height:100%;margin:0;opacity:0;cursor:ew-resize;z-index:3}
.hs-comparison[data-direction=vertical] .hs-comparison-range{writing-mode:vertical-lr;direction:ltr;cursor:ns-resize}
`

export function FreeComparison({ p, unit, scale, editing = false }: { p: Record<string, any>; unit: number; scale?: number; editing?: boolean }) {
  const initial = comparisonPosition(p.position)
  const [position, setPosition] = useState(initial)
  useEffect(() => setPosition(initial), [initial, p.beforeSrc, p.afterSrc])
  const pos = editing ? initial : position
  const vertical = p.direction === 'vertical'
  const u = (n: number) => scale !== undefined ? `${n * scale}px` : `${n / unit * 100}cqw`
  const accent = safeCssColor(p.accent) || '#ffffff'
  const before = typeof p.beforeLabel === 'string' ? p.beforeLabel : 'Trước'
  const after = typeof p.afterLabel === 'string' ? p.afterLabel : 'Sau'
  const picture = (src: unknown, alt: unknown, label: string) => typeof src === 'string' && src
    ? <img src={src} alt={typeof alt === 'string' ? alt : label} draggable={false} loading="lazy" style={{ width: '100%', height: '100%', display: 'block', objectFit: p.fit === 'contain' ? 'contain' : 'cover' }} />
    : <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: '#64748b', background: label === before ? '#e2e8f0' : '#cbd5e1', fontSize: `max(12px, ${u(18)})` }}>Chọn ảnh {label.toLowerCase()}</div>
  const badge: React.CSSProperties = { position: 'absolute', padding: '6px 12px', background: '#111827b3', color: '#ffffff', borderRadius: 5, font: `700 clamp(11px, ${u(13)}, 14px) / 1.3 system-ui, sans-serif`, pointerEvents: 'none', zIndex: 2 }
  return <div className="hs-comparison" data-direction={vertical ? 'vertical' : 'horizontal'} style={{ '--comparison-accent': accent, position: 'relative', width: '100%', height: '100%', overflow: 'hidden', borderRadius: u(Math.max(0, Number(p.radius) || 0)), background: '#e2e8f0' } as React.CSSProperties}>
    <style>{CSS}</style>
    {picture(p.afterSrc, p.afterAlt, after)}
    <div data-comparison-before="" style={{ position: 'absolute', inset: 0, clipPath: vertical ? `inset(0 0 ${100 - pos}% 0)` : `inset(0 ${100 - pos}% 0 0)` }}>{picture(p.beforeSrc, p.beforeAlt, before)}</div>
    {p.showLabels !== false && <><span style={{ ...badge, top: 12, left: 12 }}>{before}</span><span style={{ ...badge, ...(vertical ? { bottom: 12, right: 12 } : { top: 12, right: 12 }) }}>{after}</span></>}
    <div aria-hidden="true" style={{ position: 'absolute', pointerEvents: 'none', zIndex: 2, background: accent, boxShadow: '0 0 6px #0004', ...(vertical ? { left: 0, right: 0, height: 2, top: `${pos}%`, transform: 'translateY(-50%)' } : { top: 0, bottom: 0, width: 2, left: `${pos}%`, transform: 'translateX(-50%)' }) }}>
      <span style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 44, height: 44, borderRadius: '50%', background: accent, color: '#111827', boxShadow: '0 2px 12px #0003', display: 'grid', placeItems: 'center' }}>
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: vertical ? 'rotate(90deg)' : undefined }}><path d="m9 7-5 5 5 5m6-10 5 5-5 5" /></svg>
      </span>
    </div>
    <input className="hs-comparison-range" type="range" min={0} max={100} step={1} value={pos} disabled={editing} aria-label={p.sliderLabel || 'Kéo để so sánh ảnh trước và sau'} aria-orientation={vertical ? 'vertical' : 'horizontal'} aria-valuetext={`${before} ${Math.round(pos)}%, ${after} ${Math.round(100 - pos)}%`} onChange={(event) => setPosition(Number(event.target.value))} />
  </div>
}
