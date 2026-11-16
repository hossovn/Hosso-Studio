'use client'
import React from 'react'
import { FreeCanvasView } from '@hosso/studio-blocks'
import { CanvasApp } from '../[id]/CanvasApp'
import { EFFECT_TEMPLATES } from '../[id]/EffectTemplates'
import type { PageData } from '../[id]/canvas-model'

const sample: PageData = { root: { props: {} }, content: EFFECT_TEMPLATES.map((template) => ({ type: 'FreeCanvas', props: { id: template.id, height: template.height, _bgHex: template.bg, ...template.extraProps, _els: template.build().map((el, index) => ({ ...el, id: `${template.id}-${index}` })) } })) }
const config = { components: { FreeCanvas: { label: 'Phần', render: (props: Record<string, any>) => <div style={{ background: props._bgHex }}><FreeCanvasView {...props} /></div> } } }

/** Like /editor/demo: changes are in memory and never write to the current website. */
export default function EffectsEditor() {
  return <CanvasApp config={config} data={sample} onChange={() => {}} title="Thử hiệu ứng tương tác" backHref="/editor/demo" lang="vi" labelOf={() => 'Phần'} initialSelection={{ block: 'effect-comparison', el: sample.content[0].props._els[2].id }} css="html,body{margin:0;font-family:Arial,sans-serif;color:#111827}*{box-sizing:border-box}a{color:inherit}" htmlClass="" menu={null} actions={<span style={{ fontSize: 12, color: '#64748b' }}>Bản thử · không lưu dữ liệu</span>} />
}
