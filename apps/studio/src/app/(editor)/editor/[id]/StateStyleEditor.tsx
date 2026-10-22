'use client'
import React from 'react'
import { RotateCcw, Circle, MousePointer2, Focus, MousePointerClick, Monitor, Tablet, Smartphone } from 'lucide-react'
import { readElementState, writeElementState, type ElementState, type ElementDevice, type ElementStateStyle } from '@hosso/studio-blocks'

const STATES = { normal: 'Bình thường', hover: 'Di chuột', focus: 'Focus', active: 'Nhấn' }
const DEVICES = { desktop: 'Máy tính', tablet: 'Máy tính bảng', mobile: 'Điện thoại' }
const STATE_ICONS = { normal: Circle, hover: MousePointer2, focus: Focus, active: MousePointerClick }
const DEVICE_ICONS = { desktop: Monitor, tablet: Tablet, mobile: Smartphone }
const NUMBERS = [
  ['opacity', 'Độ trong suốt', 0, 1, 0.05], ['translateX', 'Dịch ngang', -1000, 1000, 1],
  ['translateY', 'Dịch dọc', -1000, 1000, 1], ['scale', 'Tỉ lệ', 0.1, 4, 0.05], ['transitionMs', 'Chuyển tiếp (ms)', 0, 5000, 50],
] as const
const COLORS = [['backgroundColor', 'Nền'], ['color', 'Màu chữ'], ['borderColor', 'Màu viền']] as const
const KEYS = [...COLORS.map(([key]) => key), ...NUMBERS.map(([key]) => key), 'boxShadow'] as const

export function StatePicker({ value, onChange, supported }: { value: ElementState; onChange: (state: ElementState) => void; supported: ElementState[] }) {
  return <div className="cv-state-picker" role="group" aria-label="Trạng thái">{supported.map((state) => {
    const Icon = STATE_ICONS[state]
    return <button type="button" key={state} aria-pressed={value === state} onClick={() => onChange(state)}><Icon size={14} aria-hidden="true" />{STATES[state]}</button>
  })}</div>
}

export function DevicePicker({ value, onChange }: { value: ElementDevice; onChange: (device: ElementDevice) => void }) {
  return <div className="cv-state-device"><span>Thiết bị</span><div role="group" aria-label="Thiết bị chỉnh sửa">{(['desktop', 'tablet', 'mobile'] as const).map((device) => {
    const Icon = DEVICE_ICONS[device]
    return <button type="button" key={device} title={DEVICES[device]} aria-label={DEVICES[device]} aria-pressed={value === device} onClick={() => onChange(device)}><Icon size={16} aria-hidden="true" /></button>
  })}</div></div>
}

export function StateStyleEditor({ style, onChange, readOnly = false }: { style: ElementStateStyle; onChange: (patch: Partial<ElementStateStyle>) => void; readOnly?: boolean }) {
  const reset = (key: keyof ElementStateStyle) => <button type="button" disabled={readOnly} title="Xóa ghi đè" aria-label={'Xóa ghi đè ' + key} onClick={() => onChange({ [key]: undefined })}><RotateCcw size={13} /></button>
  return <fieldset disabled={readOnly} className="cv-state-fields">
    {COLORS.map(([key, label]) => <div className="cv-state-field" key={key}><label htmlFor={'state-' + key}>{label}</label><input id={'state-' + key} aria-label={label + ' trạng thái'} type="color" value={style[key]?.slice(0, 7) || '#000000'} onChange={(e) => onChange({ [key]: e.target.value })} />{reset(key)}</div>)}
    {NUMBERS.map(([key, label, min, max, step]) => <div className="cv-state-field" key={key}><label htmlFor={'state-' + key}>{label}</label><input id={'state-' + key} type="number" min={min} max={max} step={step} value={style[key] ?? ''} onChange={(e) => onChange({ [key]: e.target.value === '' ? undefined : Number(e.target.value) })} />{reset(key)}</div>)}
    <div className="cv-state-field"><label htmlFor="state-shadow">Đổ bóng</label><select id="state-shadow" value={style.boxShadow ?? ''} onChange={(e) => onChange({ boxShadow: e.target.value || undefined })}><option value="">Kế thừa</option><option value="none">Không</option><option value="0px 4px 12px 0px rgba(0,0,0,0.2)">Nhẹ</option><option value="0px 12px 24px 0px rgba(0,0,0,0.3)">Đậm</option></select>{reset('boxShadow')}</div>
  </fieldset>
}

export function ElementStateControls({ props, onChange, state, onStateChange, device, onDeviceChange, supported }: {
  props: Record<string, unknown>; onChange: (props: Record<string, unknown>, key: string) => void
  state: ElementState; onStateChange: (state: ElementState) => void
  device: ElementDevice; onDeviceChange: (device: ElementDevice) => void; supported: ElementState[]
}) {
  const selected = supported.includes(state) ? state : 'normal'
  return <div className="cv-state-controls">
    <StatePicker value={selected} onChange={onStateChange} supported={supported} />
    <DevicePicker value={device} onChange={onDeviceChange} />
    <details open={selected !== 'normal'}><summary>Thiết kế trạng thái</summary><StateStyleEditor style={readElementState(props, selected, device)} onChange={(patch) => onChange(writeElementState(props, selected, device, patch), Object.keys(patch).join(','))} /></details>
    <button type="button" className="cv-state-clear" onClick={() => onChange(writeElementState(props, selected, device, Object.fromEntries(KEYS.map((key) => [key, undefined]))), 'reset')}><RotateCcw size={14} />Xóa ghi đè {DEVICES[device]}</button>
  </div>
}
