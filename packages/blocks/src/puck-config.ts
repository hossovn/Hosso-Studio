import { createElement } from 'react'
import { t } from './strings.vi'
import type { BlockField, BlockSchema, HossoPlugin, Theme } from './types'

const toPuckField = (f: BlockField): any => {
  if (f.type !== 'array') return f
  const first = Object.keys(f.arrayFields)[0]
  return {
    ...f,
    arrayFields: Object.fromEntries(Object.entries(f.arrayFields).map(([k, v]) => [k, toPuckField(v)])),
    getItemSummary: (item: Record<string, unknown>, i: number) => String(item?.[first] || `Mục ${i + 1}`),
  }
}

const Missing = ({ type }: { type?: string }) =>
  createElement('div', { className: 'hs-missing', role: 'note' }, `${t('block.missing')}: ${type ?? ''}`)

/**
 * Dựng cấu hình Puck lúc chạy từ (schema block) + (renderer của theme đang chọn).
 * Block không có renderer: dùng renderer dự phòng của plugin, nếu không có thì khung "thiếu plugin" (editor)
 * hoặc bỏ qua (render công khai, mode = 'render').
 * `extraTypes`: type có trong dữ liệu trang nhưng không có schema (plugin đã gỡ) - chỉ editor cần.
 */
export function buildPuckConfig(opts: {
  schemas: BlockSchema<any>[]
  theme: Theme
  plugins?: HossoPlugin[]
  mode: 'editor' | 'render'
  extraTypes?: string[]
}) {
  const { schemas, theme, plugins = [], mode, extraTypes = [] } = opts
  const fallback = (type: string) => plugins.find((p) => p.fallbackRenderers?.[type])?.fallbackRenderers?.[type]
  const components: Record<string, any> = {}

  for (const s of schemas) {
    const render = theme.renderers[s.type] ?? fallback(s.type)
    if (!render) {
      if (mode === 'render') continue
      components[s.type] = { label: s.label, fields: {}, defaultProps: {}, render: () => createElement(Missing, { type: s.type }) }
      continue
    }
    components[s.type] = {
      label: s.label,
      fields: Object.fromEntries(Object.entries(s.fields).map(([k, v]) => [k, toPuckField(v as BlockField)])),
      defaultProps: s.defaultProps,
      render,
    }
  }
  if (mode === 'editor') {
    for (const type of extraTypes) {
      if (!components[type]) components[type] = { fields: {}, render: () => createElement(Missing, { type }) }
    }
  }
  return { components }
}

/** Bỏ block mà config không biết (plugin đã gỡ) trước khi render công khai. */
export function stripUnknown<T extends { content: { type: string }[] }>(data: T, config: { components: Record<string, unknown> }): T {
  return { ...data, content: data.content.filter((c) => c.type in config.components) }
}
