'use client'
import React, { useEffect, useRef, useState } from 'react'
import { useEditorPreview } from '@hosso/studio-blocks'
import { currentExperiments, privacySignal, readConsent } from '../../blocks/src/attribution'

import type { Props } from './experiment-schema'
const safeLink = (href: string) => /^\/(?!\/)/.test(href || '') || /^#[a-zA-Z0-9_-]+$/.test(href || '') ? href : '#'
export function experimentKey(id: string, revision: number) { return `${id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 70)}_${Math.max(1, Math.min(999999, Math.trunc(revision) || 1))}` }

export function Experiment(props: Props) {
  const preview = useEditorPreview(), key = experimentKey(props.experimentId || '', props.revision)
  const [assignment, setAssignment] = useState({ variant: 'a', eligible: false, key: '' })
  const section = useRef<HTMLElement>(null)
  const variant = assignment.variant
  useEffect(() => {
    if (preview) return
    const choose = () => {
      const allowed = readConsent()?.analytics && !privacySignal()
      let selected = 'a'
      const assignments = currentExperiments()
      if (props.mode === 'running' && props.experimentId && allowed) {
        try {
          const stored = JSON.parse(localStorage.getItem(`hosso-ab:${key}`) || 'null')
          selected = stored?.expires > Date.now() && ['a', 'b'].includes(stored.variant) ? stored.variant : (crypto.getRandomValues(new Uint32Array(1))[0] % 2 ? 'b' : 'a')
          localStorage.setItem(`hosso-ab:${key}`, JSON.stringify({ variant: selected, expires: Date.now() + 90 * 86400000 }))
          sessionStorage.setItem('hosso-experiments', JSON.stringify({ ...assignments, [key]: selected }))
        } catch { selected = 'a' }
      } else {
        delete assignments[key]
        try { sessionStorage.setItem('hosso-experiments', JSON.stringify(assignments)) } catch {}
      }
      setAssignment({ variant: selected, eligible: Boolean(allowed && props.mode === 'running' && currentExperiments()[key]), key })
    }
    choose(); window.addEventListener('hs:consent', choose); window.addEventListener('storage', choose)
    return () => { window.removeEventListener('hs:consent', choose); window.removeEventListener('storage', choose) }
  }, [key, props.mode, props.experimentId, preview])
  useEffect(() => {
    if (preview || !assignment.eligible || assignment.key !== key || !section.current) return
    let frame = 0
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      observer.disconnect()
      frame = requestAnimationFrame(() => {
        if (currentExperiments()[key]) window.dispatchEvent(new CustomEvent('hs:experiment_view', { detail: { experiment: key, variant } }))
      })
    }, { threshold: 0.1 })
    observer.observe(section.current)
    return () => { observer.disconnect(); cancelAnimationFrame(frame) }
  }, [key, assignment, variant, preview])
  const selected = props.mode === 'b' ? 'b' : props.mode === 'running' ? variant : 'a'
  return <section ref={section} className="hs-experiment" style={{ padding: 'clamp(24px, 5vw, 64px)', maxWidth: 1000, margin: '0 auto' }}>
    {preview && <small>Thử nghiệm {key} · {props.mode === 'running' ? 'Đang chạy 50/50; bản A trong editor' : `Bản ${selected.toUpperCase()}`}</small>}
    <h2>{selected === 'b' ? props.headingB : props.headingA}</h2>
    <p style={{ whiteSpace: 'pre-line' }}>{selected === 'b' ? props.textB : props.textA}</p>
    <a data-hs-cta="experiment" href={safeLink(selected === 'b' ? props.hrefB : props.hrefA)} style={{ display: 'inline-flex', padding: '12px 20px', background: 'var(--hs-primary, #2d7b57)', color: 'var(--hs-on-primary, #fff)', borderRadius: 6 }}>{selected === 'b' ? props.ctaB : props.ctaA}</a>
  </section>
}

