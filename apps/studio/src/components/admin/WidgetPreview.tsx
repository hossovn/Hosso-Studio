'use client'
import hosso from '@hosso-config'
import { CORE_LOADER_TYPES, LocaleProvider, buildPuckConfig, coreBlocks, setLocale, stripUnknown, type PageData } from '@hosso/studio-blocks'
import { Render } from '@puckeditor/core'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { useAdminT } from '@/lib/use-admin-t'
import { withLiveData } from './live-data'

type Props = {
  content: { type: string; props: Record<string, unknown> }[]
  themeName: string
  css: string
  fontClass: string
  locale: string
  defaultLocale: string
  /** 'sidebar' = cột 300px cạnh bài viết; 'full' = vùng ngang toàn trang. */
  layout: 'sidebar' | 'full'
}

// Chép @font-face và class biến font (next/font) từ trang admin sang khung xem trước để chữ giống site thật.
const copyFonts = (to: Document) => {
  const rules: string[] = []
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      for (const r of Array.from(sheet.cssRules)) if (r.cssText.startsWith('@font-face') || /__variable/.test(r.cssText.slice(0, 120))) rules.push(r.cssText)
    } catch {
      /* stylesheet khác origin: bỏ qua */
    }
  }
  const el = to.createElement('style')
  el.textContent = rules.join('\n')
  to.head.appendChild(el)
}

/** Xem trước widget ngay trong màn Widget: dựng đúng renderer của theme, dữ liệu thật qua server action, trong khung iframe cô lập. */
export function WidgetPreview({ content, themeName, css, fontClass, locale, defaultLocale, layout }: Props) {
  const T = useAdminT()
  const frame = useRef<HTMLIFrameElement>(null)
  const [body, setBody] = useState<HTMLElement | null>(null)
  const [height, setHeight] = useState(120)

  const config = useMemo(() => {
    const theme = hosso.themes.find((t) => t.manifest.name === themeName) ?? hosso.themes[0]
    const schemas = [...coreBlocks, ...hosso.plugins.flatMap((p) => p.blocks ?? [])]
    const built = buildPuckConfig({ schemas, theme, plugins: hosso.plugins, mode: 'render' })
    const live = [...CORE_LOADER_TYPES, ...hosso.plugins.flatMap((p) => Object.keys(p.loaders ?? {}))]
    for (const type of live) {
      const c = built.components[type]
      if (c) c.render = withLiveData(type, c.render, locale)
    }
    return built
  }, [themeName, locale])

  useEffect(() => {
    const doc = frame.current?.contentDocument
    if (!doc) return
    doc.open()
    doc.write('<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0"><div id="root"></div></body></html>')
    doc.close()
    const style = doc.createElement('style')
    style.id = 'site-css'
    style.textContent = css
    doc.head.appendChild(style)
    copyFonts(doc)
    doc.documentElement.className = fontClass
    setBody(doc.getElementById('root'))
    const ro = new ResizeObserver(() => setHeight(Math.max(60, (doc.getElementById('root')?.offsetHeight ?? 0) + 2)))
    ro.observe(doc.getElementById('root')!)
    return () => ro.disconnect()
  }, [css, fontClass])

  setLocale(locale, defaultLocale)
  const data = stripUnknown({ root: { props: {} }, content } as unknown as PageData, config)
  const inner = content.length ? <Render config={config as any} data={data as any} /> : <p style={{ font: '14px Arial', color: '#6b7280', padding: 12 }}>{T('Chưa có widget nào để xem trước.')}</p>

  return (
    <iframe
      ref={frame}
      title={T('Xem trước')}
      style={{ width: layout === 'sidebar' ? 332 : '100%', maxWidth: '100%', height, border: '1px solid var(--theme-elevation-150)', borderRadius: 6, background: '#fff' }}
      sandbox="allow-same-origin allow-scripts allow-forms"
    >
      {body &&
        createPortal(
          <LocaleProvider locale={locale} defaultLocale={defaultLocale} preview>
            <div className="hs-theme">{layout === 'sidebar' ? <div className="ss-post-grid" style={{ padding: 16 }}><aside>{inner}</aside></div> : inner}</div>
          </LocaleProvider>,
          body,
        )}
    </iframe>
  )
}
