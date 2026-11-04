'use client'
import React, { useEffect, useRef, useState } from 'react'
import { motionKeyframes, resolveMotionConfig, supportedMotionPresets } from '../../../../../../../packages/blocks/src/motion-effects'
import { elsOf, floatOf, patchElProps, type PageData, type Sel } from './canvas-model'

export function AnimationTimeline({ data, sel, docs, commit, setSel, close }: { data: PageData; sel: Sel; docs: Document[]; commit: (data: PageData, key?: string) => void; setSel: (sel: Sel) => void; close: () => void }) {
  const [time, setTime] = useState(0), [playing, setPlaying] = useState(false)
  const block = data.content.find((b) => b.props.id === sel.block), owner = sel.block === '@page' ? '@page' : block?.props.id
  const rows = (owner === '@page' ? floatOf(data) : block ? elsOf(block) : []).filter((el) => !['container', 'widget'].includes(el.type) && !el.props._hidden)
  const animations = useRef<Animation[]>([]), drag = useRef<{ x: number; delay: number; duration: number; width: number; key: string; resize: boolean } | null>(null)
  const current = useRef(data); current.current = data
  const duration = Math.max(1000, ...rows.map((el) => { const e = resolveMotionConfig(el.props)?.entrance; return e ? e.delay + e.duration : 0 }))
  useEffect(() => {
    const created: Animation[] = []
    for (const el of rows) {
      const entrance = resolveMotionConfig(el.props)?.entrance
      if (!entrance || entrance.preset === 'none') continue
      for (const doc of docs) {
        const target = doc.querySelector<HTMLElement>(`[data-element="${CSS.escape(el.id)}"] > div`)
        if (!target?.animate) continue
        const animation = target.animate(motionKeyframes('entrance', entrance.preset), { duration: entrance.duration, delay: entrance.delay, fill: 'both', easing: 'cubic-bezier(.2,.8,.2,1)' })
        animation.pause(); animation.currentTime = time; created.push(animation)
      }
    }
    animations.current = created
    return () => { created.forEach((a) => a.cancel()); animations.current = [] }
  }, [data, docs, owner])
  useEffect(() => { animations.current.forEach((a) => { a.currentTime = time }) }, [time])
  useEffect(() => {
    if (!playing) return
    let frame = 0; const start = performance.now() - time
    const tick = (now: number) => { const next = Math.min(duration, now - start); setTime(next); if (next >= duration) setPlaying(false); else frame = requestAnimationFrame(tick) }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playing, duration])
  useEffect(() => { const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }; document.addEventListener('keydown', escape); docs.forEach((d) => d.addEventListener('keydown', escape)); return () => { document.removeEventListener('keydown', escape); docs.forEach((d) => d.removeEventListener('keydown', escape)) } }, [docs, close])
  const put = (id: string, patch: object, key?: string) => { const el = rows.find((r) => r.id === id)!; const motion = resolveMotionConfig(el.props); commit(patchElProps(current.current, id, { _motion: { ...motion, entrance: { preset: 'fade', delay: 0, duration: 600, ...motion?.entrance, ...patch } } }), key) }
  return <section className="cv-timeline" aria-label="Timeline hiệu ứng">
    <header><strong>Timeline hiệu ứng</strong><span>{block?.props._name || 'Khung đang chọn'}</span><button type="button" onClick={() => { if (time >= duration) setTime(0); setPlaying(!playing) }}>{playing ? 'Tạm dừng' : 'Phát'}</button><button type="button" onClick={() => { setPlaying(false); setTime(0) }}>Về đầu</button><button type="button" onClick={() => { let next = data; rows.forEach((el, index) => { const motion = resolveMotionConfig(el.props); next = patchElProps(next, el.id, { _motion: { ...motion, entrance: { preset: motion?.entrance?.preset && motion.entrance.preset !== 'none' ? motion.entrance.preset : 'fade', duration: motion?.entrance?.duration || 600, delay: Math.min(5000, index * 200) } } }) }); commit(next) }}>Xếp nối tiếp</button><button type="button" aria-label="Đóng timeline" onClick={close}>Đóng</button></header>
    <label className="cv-timeline-scrub">{(time / 1000).toFixed(2)} s<input type="range" aria-label="Tua timeline" min={0} max={10000} step={10} value={time} onChange={(e) => { setPlaying(false); setTime(Number(e.target.value)) }} /><span>10 s</span></label>
    <div className="cv-timeline-rows">{!rows.length && <p className="cv-tool-help">Chọn một phần có chữ, ảnh hoặc nút để sắp hiệu ứng.</p>}{rows.map((el) => {
      const entrance = resolveMotionConfig(el.props)?.entrance ?? { preset: 'none', delay: 0, duration: 600 }
      return <div className="cv-timeline-row" key={el.id}><button type="button" className="cv-timeline-name" onClick={() => setSel({ block: owner!, el: el.id })}>{String(el.props._name || el.props.text || el.type).slice(0, 32)}</button><select aria-label={`Hiệu ứng ${el.id}`} value={entrance.preset} onChange={(e) => put(el.id, { preset: e.target.value })}>{supportedMotionPresets(el.type).entrance.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}</select><div className="cv-timeline-track"><i className="cv-timeline-playhead" style={{ left: `${time / 100}%` }} />{entrance.preset !== 'none' && <div className="cv-timeline-bar" role="slider" tabIndex={0} aria-label={`Thời điểm ${el.id}`} aria-valuemin={0} aria-valuemax={5000} aria-valuenow={entrance.delay} style={{ left: `${entrance.delay / 100}%`, width: `${entrance.duration / 100}%` }} onKeyDown={(e) => { if (['ArrowLeft', 'ArrowRight'].includes(e.key)) { e.preventDefault(); e.stopPropagation(); put(el.id, { delay: Math.max(0, Math.min(5000, entrance.delay + (e.key === 'ArrowRight' ? 1 : -1) * (e.shiftKey ? 100 : 10))) }) } }} onPointerDown={(e) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); drag.current = { resize: (e.target as HTMLElement).hasAttribute('data-timeline-resize'), x: e.clientX, delay: entrance.delay, duration: entrance.duration, width: e.currentTarget.parentElement!.clientWidth, key: `gesture:timeline:${el.id}:${Date.now()}` }; setPlaying(false) }} onPointerMove={(e) => { const d = drag.current; if (!d) return; const delta = Math.round((e.clientX - d.x) / Math.max(1, d.width) * 10000 / 10) * 10; put(el.id, d.resize ? { duration: Math.max(100, Math.min(5000, d.duration + delta)) } : { delay: Math.max(0, Math.min(5000, d.delay + delta)) }, d.key) }} onPointerUp={() => { drag.current = null }} onPointerCancel={() => { drag.current = null }} onLostPointerCapture={() => { drag.current = null }}><span>{entrance.duration} ms</span><b data-timeline-resize aria-hidden="true" /></div>}</div><label>Trễ<input type="number" aria-label={`Độ trễ ${el.id}`} min={0} max={5000} step={10} value={entrance.delay} onChange={(e) => put(el.id, { delay: Math.max(0, Math.min(5000, Number(e.target.value))) })} /></label><label>Dài<input type="number" aria-label={`Thời lượng ${el.id}`} min={100} max={5000} step={10} value={entrance.duration} onChange={(e) => put(el.id, { duration: Math.max(100, Math.min(5000, Number(e.target.value))) })} /></label></div>
    })}</div>
  </section>
}
