import React from 'react'
import type { FreeElement } from './FreeCanvas'

/** Only registered renderers are allowed; embedded blocks cannot recursively embed more blocks. */
export function renderCanvasWidgets(elements: FreeElement[], components: Record<string, { render?: React.ComponentType<any> }>, editor = false) {
  const entries: [string, React.ReactNode][] = []
  const renderOne = (el: FreeElement, key: string) => {
    const widget = el.props.widget, Render = widget && components[widget.type]?.render
    if (!Render || ['FreeCanvas', 'Reusable'].includes(widget.type)) {
      entries.push([key, <div key={key} role="note">Khối không còn khả dụng</div>])
      return
    }
    const { puck, _els, _noFree, elements: legacy, ...props } = widget.props ?? {}
    entries.push([
      key,
      <div key={key} className="hs-canvas-widget" style={{ width: '100%', height: '100%', overflow: 'auto' }}>
        <Render {...props} id={el.id} _noFree={editor || undefined} />
      </div>,
    ])
  }
  for (const el of elements) {
    if (el.type === 'widget') renderOne(el, el.id)
    if (el.type === 'container' && Array.isArray(el.props._variants)) {
      for (const variant of el.props._variants) {
        for (const ve of variant?.elements ?? []) {
          if (ve?.type === 'widget') {
            renderOne(ve, `${variant.id}::${ve.id}`)
            if (!elements.some((top) => top.id === ve.id)) renderOne(ve, ve.id)
          }
        }
      }
    }
  }
  return Object.fromEntries(entries)
}

export const CANVAS_WIDGET_CSS = '.hs-canvas-widget>section,.hs-canvas-widget>.hs-styled>section{padding:0!important;margin:0!important;min-height:0!important}.hs-canvas-widget .hs-wrap,.hs-canvas-widget .ss-wrap{max-width:none!important;width:100%!important;padding-inline:0!important}.hs-canvas-widget{scrollbar-width:thin}'
