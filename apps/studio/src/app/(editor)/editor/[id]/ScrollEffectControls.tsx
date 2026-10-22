'use client'
import React, { useId } from 'react'
import { normalizeScrollEffect, type ScrollEffectConfig } from '@hosso/studio-blocks'

function ScrollNumber({ label, value, onChange, min, max, step = 1 }: { label: string; value: number; onChange: (value: number) => void; min: number; max: number; step?: number }) {
  const id = useId()
  const change = (value: string) => { const n = Number(value); if (Number.isFinite(n)) onChange(Math.max(min, Math.min(max, n))) }
  return <div className="cv-field cv-scroll-number">
    <label htmlFor={id}>{label}</label>
    <div><input type="range" aria-label={label + ' thanh trượt'} min={min} max={max} step={step} value={value} onChange={(e) => change(e.target.value)} /><input id={id} type="number" min={min} max={max} step={step} value={value} onChange={(e) => change(e.target.value)} /></div>
  </div>
}

export function ScrollEffectControls({ value, onChange }: { value: unknown; onChange: (value: ScrollEffectConfig | null) => void }) {
  const id = useId()
  const effect = normalizeScrollEffect(value)
  const change = (patch: Partial<ScrollEffectConfig>) => onChange(normalizeScrollEffect({ ...effect, ...patch }))
  return <div className="cv-scroll-controls">
    <div className="cv-field"><label htmlFor={id}>Khi cuộn</label><select id={id} value={effect?.mode ?? ''} onChange={(e) => e.target.value ? change({ mode: e.target.value as ScrollEffectConfig['mode'] }) : onChange(null)}>
      <option value="">Không</option><option value="parallax">Parallax</option><option value="pin">Ghim trong section</option><option value="progress">Theo tiến độ cuộn</option>
    </select></div>
    {effect && <>
      {effect.mode === 'parallax' && <ScrollNumber label="Độ dịch chuyển (px)" value={effect.distance} min={-600} max={600} onChange={(distance) => change({ distance })} />}
      {effect.mode === 'pin' && <ScrollNumber label="Cách mép trên (px)" value={effect.pinTop} min={0} max={400} onChange={(pinTop) => change({ pinTop })} />}
      {effect.mode === 'progress' && <div className="cv-scroll-grid">
        <ScrollNumber label="X đầu (px)" value={effect.fromX} min={-1000} max={1000} onChange={(fromX) => change({ fromX })} />
        <ScrollNumber label="X cuối (px)" value={effect.toX} min={-1000} max={1000} onChange={(toX) => change({ toX })} />
        <ScrollNumber label="Y đầu (px)" value={effect.fromY} min={-1000} max={1000} onChange={(fromY) => change({ fromY })} />
        <ScrollNumber label="Y cuối (px)" value={effect.toY} min={-1000} max={1000} onChange={(toY) => change({ toY })} />
        <ScrollNumber label="Tỉ lệ đầu" value={effect.fromScale} min={0.25} max={3} step={0.05} onChange={(fromScale) => change({ fromScale })} />
        <ScrollNumber label="Tỉ lệ cuối" value={effect.toScale} min={0.25} max={3} step={0.05} onChange={(toScale) => change({ toScale })} />
        <ScrollNumber label="Độ hiện đầu (%)" value={Math.round(effect.fromOpacity * 100)} min={0} max={100} onChange={(v) => change({ fromOpacity: v / 100 })} />
        <ScrollNumber label="Độ hiện cuối (%)" value={Math.round(effect.toOpacity * 100)} min={0} max={100} onChange={(v) => change({ toOpacity: v / 100 })} />
      </div>}
      {effect.mode !== 'pin' && <div className="cv-scroll-grid">
        <ScrollNumber label="Bắt đầu (%)" value={effect.start} min={0} max={99} onChange={(start) => change({ start })} />
        <ScrollNumber label="Kết thúc (%)" value={effect.end} min={effect.start + 1} max={100} onChange={(end) => change({ end })} />
      </div>}
      <label className="cv-scroll-mobile"><input type="checkbox" checked={effect.disableOnMobile} onChange={(e) => change({ disableOnMobile: e.target.checked })} />Tắt trên điện thoại</label>
    </>}
  </div>
}
