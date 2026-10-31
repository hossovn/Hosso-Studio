'use client'
import React, { useId } from 'react'
import { LOOP_AMOUNT, resolveMotionConfig, supportedMotionPresets, type MotionConfig, type EntrancePreset, type LoopPreset } from '@hosso/studio-blocks'
import { ScrollNumber } from './ScrollEffectControls'

export function MotionControls({ props, type, onChange }: { props: Record<string, unknown>; type: string; onChange: (value: MotionConfig) => void }) {
  const id = useId()
  const config = resolveMotionConfig(props) ?? {}
  const options = supportedMotionPresets(type)
  const entrance = config.entrance ?? { preset: 'none', duration: 600, delay: 0 }
  const loop = config.loop ?? { preset: 'none', duration: 2000, delay: 0, iterations: 3, amount: 12 }
  const change = (patch: Partial<MotionConfig>) => onChange({ ...config, ...patch })
  const amountLabel = loop.preset === 'orbit' ? 'Bán kính (px)' : loop.preset === 'sway' ? 'Góc lắc (độ)' : ['pulse', 'ripple', 'slow-zoom'].includes(loop.preset) ? 'Mức phóng (%)' : 'Độ dịch chuyển (px)'
  const amountSpec = LOOP_AMOUNT[loop.preset]
  return <div className="cv-motion-controls">
    <h4 className="cv-motion-title">Xuất hiện</h4>
    <div className="cv-field"><label htmlFor={id + '-entrance'}>Kiểu xuất hiện</label><select id={id + '-entrance'} value={entrance.preset} onChange={(e) => change({ entrance: { ...entrance, preset: e.target.value as EntrancePreset } })}>{options.entrance.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
    {entrance.preset !== 'none' && <>
      <ScrollNumber label="Thời lượng xuất hiện (ms)" value={entrance.duration} min={100} max={5000} step={100} onChange={(duration) => change({ entrance: { ...entrance, duration } })} />
      <ScrollNumber label="Độ trễ xuất hiện (ms)" value={entrance.delay} min={0} max={5000} step={100} onChange={(delay) => change({ entrance: { ...entrance, delay } })} />
      {entrance.preset === 'text-lines' && <p>Nhấn Enter trong nội dung để chia dòng chuyển động.</p>}
    </>}
    <h4 className="cv-motion-title">Chuyển động lặp</h4>
    <div className="cv-field"><label htmlFor={id + '-loop'}>Kiểu lặp</label><select id={id + '-loop'} value={loop.preset} onChange={(e) => {
      const preset = e.target.value as LoopPreset
      const amount = LOOP_AMOUNT[preset].default
      change({ loop: { ...loop, preset, amount } })
    }}>{options.loop.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
    {loop.preset !== 'none' && <>
      <ScrollNumber label="Thời gian mỗi vòng (ms)" value={loop.duration} min={500} max={30000} step={100} onChange={(duration) => change({ loop: { ...loop, duration } })} />
      <ScrollNumber label="Độ trễ lặp (ms)" value={loop.delay} min={0} max={5000} step={100} onChange={(delay) => change({ loop: { ...loop, delay } })} />
      <label className="cv-scroll-mobile"><input type="checkbox" checked={loop.iterations === 'infinite'} onChange={(e) => change({ loop: { ...loop, iterations: e.target.checked ? 'infinite' : 3 } })} />Lặp liên tục</label>
      {loop.iterations !== 'infinite' && <ScrollNumber label="Số vòng" value={loop.iterations} min={1} max={20} onChange={(iterations) => change({ loop: { ...loop, iterations: Math.round(iterations) } })} />}
      {!['spin', 'marquee'].includes(loop.preset) && <ScrollNumber label={amountLabel} value={loop.amount} min={amountSpec.min} max={amountSpec.max} onChange={(amount) => change({ loop: { ...loop, amount } })} />}
    </>}
    <label className="cv-scroll-mobile"><input type="checkbox" checked={config.disableOnMobile === true} onChange={(e) => change({ disableOnMobile: e.target.checked })} />Tắt chuyển động trên điện thoại</label>
    <p>Xuất hiện xong mới bắt đầu lặp. Bật lại Preview để xem từ đầu.</p>
  </div>
}
