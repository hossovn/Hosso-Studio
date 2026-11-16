'use client'
import React from 'react'
import { ColorControl, MediaField, RangeControl, SegControl } from '@hosso/studio-blocks'

type Props = { p: Record<string, any>; put: (patch: Record<string, any>) => void }
const input: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '6px 9px', border: '1px solid #e5e7eb', borderRadius: 8, font: 'inherit', fontSize: 13 }
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => <div className="cv-field"><span style={{ fontSize: 12, color: '#6b7280' }}>{label}</span>{children}</div>

export function ComparisonContentControls({ p, put }: Props) {
  return <>
    {(['before', 'after'] as const).map((side) => <React.Fragment key={side}>
      <Field label={side === 'before' ? 'Ảnh trước' : 'Ảnh sau'}><MediaField kind="image" value={p[side + 'Src'] ?? ''} onChange={(src) => put({ [side + 'Src']: src })} /></Field>
      <Field label={side === 'before' ? 'Mô tả ảnh trước' : 'Mô tả ảnh sau'}><input aria-label={side === 'before' ? 'Mô tả ảnh trước' : 'Mô tả ảnh sau'} style={input} value={p[side + 'Alt'] ?? ''} onChange={(e) => put({ [side + 'Alt']: e.target.value })} /></Field>
      <Field label={side === 'before' ? 'Nhãn trước' : 'Nhãn sau'}><input aria-label={side === 'before' ? 'Nhãn trước' : 'Nhãn sau'} style={input} value={p[side + 'Label'] ?? (side === 'before' ? 'Trước' : 'Sau')} onChange={(e) => put({ [side + 'Label']: e.target.value })} /></Field>
    </React.Fragment>)}
    <Field label="Mô tả thanh kéo"><input aria-label="Mô tả thanh kéo" style={input} value={p.sliderLabel ?? ''} onChange={(e) => put({ sliderLabel: e.target.value })} /></Field>
    <Field label="Hướng so sánh"><SegControl value={p.direction === 'vertical' ? 'vertical' : 'horizontal'} onChange={(direction) => put({ direction })} options={[{ label: 'Trái / phải', value: 'horizontal' }, { label: 'Trên / dưới', value: 'vertical' }]} /></Field>
    <Field label="Vị trí ban đầu (%)"><RangeControl value={p.position ?? 50} min={0} max={100} onChange={(v) => put({ position: Number(v) })} /></Field>
    <label className="cv-check"><input type="checkbox" checked={p.showLabels !== false} onChange={(e) => put({ showLabels: e.target.checked })} />Hiện nhãn trước / sau</label>
    <p className="cv-tool-help">Bật Preview để kéo thử. Khách có thể kéo bằng chuột, cảm ứng hoặc dùng phím mũi tên, Home và End.</p>
  </>
}

export function ComparisonStyleControls({ p, put }: Props) {
  return <>
    <Field label="Màu thanh kéo"><ColorControl value={p.accent ?? '#ffffff'} onChange={(accent) => put({ accent })} /></Field>
    <Field label="Bo góc ảnh"><RangeControl value={p.radius ?? 16} min={0} max={80} onChange={(v) => put({ radius: Number(v) })} /></Field>
    <Field label="Cách vừa ảnh"><SegControl value={p.fit === 'contain' ? 'contain' : 'cover'} onChange={(fit) => put({ fit })} options={[{ label: 'Phủ kín', value: 'cover' }, { label: 'Vừa ảnh', value: 'contain' }]} /></Field>
  </>
}

export function CountUpControls({ p, put }: Props) {
  return <>
    <label className="cv-check"><input type="checkbox" checked={p.countUp === true} onChange={(e) => put({ countUp: e.target.checked })} />Số đếm tăng dần khi cuộn tới</label>
    {p.countUp === true && <>
      <p className="cv-tool-help">Nếu để trống “Số đích”, hiệu ứng lấy giá trị từ “Con số” ở trên. Ví dụ 1.500 hoặc 98,5 theo định dạng Việt Nam.</p>
      <Field label="Số bắt đầu"><input aria-label="Số bắt đầu" style={input} type="number" min={-1e12} max={1e12} step="any" value={p.countFrom ?? 0} onChange={(e) => put({ countFrom: Number(e.target.value) })} /></Field>
      <Field label="Số đích (tùy chọn)"><input aria-label="Số đích" style={input} type="number" min={-1e12} max={1e12} step="any" value={p.countTo ?? ''} placeholder="Lấy từ Con số" onChange={(e) => put({ countTo: e.target.value === '' ? undefined : Number(e.target.value) })} /></Field>
      <Field label="Thời gian đếm (ms)"><input aria-label="Thời gian đếm (ms)" style={input} type="number" min={100} max={10000} step={100} value={p.countDuration ?? 1600} onChange={(e) => put({ countDuration: Math.max(100, Math.min(10000, Number(e.target.value) || 1600)) })} /></Field>
      <Field label="Chữ số thập phân"><input aria-label="Chữ số thập phân" style={input} type="number" min={0} max={6} value={p.countDecimals ?? 0} onChange={(e) => put({ countDecimals: Math.max(0, Math.min(6, Math.round(Number(e.target.value) || 0))) })} /></Field>
      <Field label="Định dạng số"><select aria-label="Định dạng số" style={input} value={p.countLocale ?? 'vi-VN'} onChange={(e) => put({ countLocale: e.target.value })}><option value="vi-VN">Việt Nam: 1.234,5</option><option value="en-US">Quốc tế: 1,234.5</option></select></Field>
      <label className="cv-check"><input type="checkbox" checked={p.countGrouping !== false} onChange={(e) => put({ countGrouping: e.target.checked })} />Phân cách hàng nghìn</label>
      <label className="cv-check"><input type="checkbox" checked={p.countReplay === true} onChange={(e) => put({ countReplay: e.target.checked })} />Đếm lại khi cuộn trở lại</label>
      <p className="cv-tool-help">Trong lúc thiết kế, số luôn hiện giá trị cuối. Bật Preview để xem hiệu ứng.</p>
    </>}
  </>
}
