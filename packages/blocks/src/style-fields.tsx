import React from 'react'

import { ColorControl, RangeControl, SegControl } from './style-controls'

// Không đặt 'use client' ở đây: buildPuckConfig (kể cả khi render trang công khai trên server) gọi toStyleField.
type CP = { value?: string | number; onChange: (v: any) => void; readOnly?: boolean }

const COLORS = new Set(['_bgHex', '_txtHex', '_bdHex'])
const SEGS = new Set(['_align', '_fs', '_pt', '_pb', '_rd'])
const RANGES: Record<string, [number, number]> = { _padT: [0, 200], _padB: [0, 200], _padL: [0, 200], _padR: [0, 200], _marT: [-120, 200], _marB: [0, 200], _offX: [-300, 300], _offY: [-300, 300], _radPx: [0, 80], _bdPx: [0, 20] }

/** Trả về field `custom` của Puck cho key style có điều khiển trực quan; key khác trả undefined (giữ ô mặc định). */
export function toStyleField(key: string, f: any, L: (vi: string) => string): any | undefined {
  const label = f.label && L(f.label)
  if (COLORS.has(key)) return { type: 'custom', label, render: (p: CP) => <ColorControl {...p} /> }
  if (SEGS.has(key)) {
    const options = (f.options as { label: string; value: string }[]).map((o) => ({ ...o, label: L(o.label) }))
    return { type: 'custom', label, render: (p: CP) => <SegControl {...p} options={options} /> }
  }
  if (RANGES[key]) return { type: 'custom', label, render: (p: CP) => <RangeControl {...p} min={RANGES[key][0]} max={RANGES[key][1]} /> }
  return undefined
}
