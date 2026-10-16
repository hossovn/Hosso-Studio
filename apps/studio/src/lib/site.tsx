import hosso from '@hosso-config'
import type { PageData, Theme } from '@hosso/studio-blocks'
import React from 'react'

export const activeTheme = (): Theme => hosso.themes[0]

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)

/** Token của theme -> biến CSS --hs-*. */
export function tokenCss(theme: Theme) {
  const { colors, fonts, radius, spacing } = theme.manifest.tokens
  const vars = [
    ...Object.entries(colors).map(([k, v]) => `--hs-${kebab(k)}:${v}`),
    `--hs-font-body:${fonts.body}`,
    `--hs-font-heading:${fonts.heading}`,
    `--hs-radius:${radius}`,
    `--hs-space:${spacing}`,
  ]
  return `:root{${vars.join(';')}}`
}

/** Dựng trang từ JSON. Block không có renderer (plugin đã gỡ, theme không hỗ trợ) bị bỏ qua, không làm sập trang. */
export function RenderPage({ data, theme }: { data: PageData; theme: Theme }) {
  return (
    <>
      {(data?.content ?? []).map((item) => {
        const Renderer =
          theme.renderers[item.type] ??
          hosso.plugins.find((p) => p.fallbackRenderers?.[item.type])?.fallbackRenderers?.[item.type]
        if (!Renderer) {
          console.warn(`[hosso] Bỏ qua block "${item.type}": không có renderer (thiếu plugin?)`)
          return null
        }
        return <Renderer key={item.props.id} {...item.props} />
      })}
    </>
  )
}
