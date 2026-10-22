'use client'
import React from 'react'

// Điều khiển kiểu Canva cho ô style của khối (ô màu, nhóm nút, thanh trượt). Giữ nguyên key dữ liệu `_*` nên trang cũ không đổi.

export const PALETTE = ['#ffffff', '#f3f4f6', '#111827', '#15803d', '#f59e0b', '#dc2626', '#2563eb', '#7c3aed']
const BRAND = 'var(--hosso-brand, #15803d)'
const OUT = '#c9ccd1'
const HEX = /^#[0-9a-fA-F]{6}$/

type CP = { value?: string | number; onChange: (v: any) => void; readOnly?: boolean }

export const ColorControl = ({ value, onChange, readOnly }: CP) => {
  const v = String(value ?? '')
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button type="button" disabled={readOnly} aria-label="Mặc định" title="Mặc định" onClick={() => onChange('')} style={{ width: 24, height: 24, borderRadius: '50%', border: `1px solid ${OUT}`, background: '#fff', cursor: 'pointer', outline: v === '' ? `2px solid ${BRAND}` : 'none', outlineOffset: 1, color: '#9ca3af', lineHeight: 1 }}>×</button>
        {PALETTE.map((c) => (
          <button key={c} type="button" disabled={readOnly} aria-label={c} title={c} onClick={() => onChange(c)} style={{ width: 24, height: 24, borderRadius: '50%', border: `1px solid ${OUT}`, background: c, cursor: 'pointer', outline: v.toLowerCase() === c ? `2px solid ${BRAND}` : 'none', outlineOffset: 1 }} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input type="color" disabled={readOnly} value={HEX.test(v) ? v : '#ffffff'} onChange={(e) => onChange(e.target.value)} style={{ width: 32, height: 28, padding: 0, border: `1px solid ${OUT}`, borderRadius: 6, background: 'none' }} />
        <input type="text" disabled={readOnly} value={v} placeholder="#rrggbb" onChange={(e) => onChange(e.target.value)} style={{ flex: 1, minWidth: 0, padding: '5px 8px', border: `1px solid ${OUT}`, borderRadius: 6, font: 'inherit' }} />
      </div>
    </div>
  )
}

export const SegControl = ({ value, onChange, readOnly, options }: CP & { options: { label: string; value: string }[] }) => (
  <div role="group" style={{ display: 'flex', gap: 2, padding: 3, background: '#f3f4f6', borderRadius: 8 }}>
    {options.map((o) => {
      const on = String(value ?? '') === o.value
      return (
        <button key={o.value} type="button" disabled={readOnly} aria-pressed={on} onClick={() => onChange(o.value)} style={{ flex: 1, padding: '6px 4px', border: 0, borderRadius: 6, cursor: 'pointer', font: 'inherit', fontSize: 12, fontWeight: 600, background: on ? '#fff' : 'transparent', color: on ? BRAND : '#374151', boxShadow: on ? '0 1px 2px rgba(0,0,0,.15)' : 'none' }}>
          {o.label}
        </button>
      )
    })}
  </div>
)

export const RangeControl = ({ value, onChange, readOnly, min = 0, max = 200, step = 1 }: CP & { min?: number; max?: number; step?: number }) => {
  const set = value === '' || value == null
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <input type="range" disabled={readOnly} min={min} max={max} step={step} value={set ? 0 : Number(value)} onChange={(e) => onChange(Number(e.target.value))} style={{ flex: 1, accentColor: 'var(--hosso-brand, #15803d)' }} />
      <input type="number" step={step} disabled={readOnly} value={set ? '' : Number(value)} placeholder="–" onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))} style={{ width: 64, padding: '5px 6px', border: `1px solid ${OUT}`, borderRadius: 6, font: 'inherit' }} />
    </div>
  )
}
