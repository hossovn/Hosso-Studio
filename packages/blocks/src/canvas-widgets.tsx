import React from 'react'
import type { FreeElement } from './FreeCanvas'

/** Only registered renderers are allowed; embedded blocks cannot recursively embed more blocks. */
export function renderCanvasWidgets(elements: FreeElement[], components: Record<string, { render?: React.ComponentType<any> }>, editor = false) {
  return Object.fromEntries(elements.filter((el) => el.type === 'widget').map((el) => {
    const widget = el.props.widget, Render = widget && components[widget.type]?.render
    if (!Render || ['FreeCanvas', 'Reusable'].includes(widget.type)) return [el.id, <div key={el.id} role="note">Khối không còn khả dụng</div>]
    const { puck, _els, _noFree, elements: legacy, ...props } = widget.props ?? {}
    return [el.id, <div key={el.id} className="hs-canvas-widget" style={{ width: '100%', height: '100%', overflow: 'auto' }}><Render {...props} id={el.id} _noFree={editor || undefined} /></div>]
  }))
}

export const CANVAS_WIDGET_CSS = '.hs-canvas-widget>section,.hs-canvas-widget>.hs-styled>section{padding:0!important;margin:0!important;min-height:0!important}.hs-canvas-widget .hs-wrap,.hs-canvas-widget .ss-wrap{max-width:none!important;width:100%!important;padding-inline:0!important}.hs-canvas-widget{scrollbar-width:thin}'
