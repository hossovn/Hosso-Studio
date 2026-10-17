import { createElement } from 'react'
import { MediaField } from './MediaField'
import { RefField } from './RefField'
import { CategoryGrid, FormBlock, ReusablePlaceholder, NavMenu, SearchBox, TermList, TrustBar } from './CoreExtras'
import { PostList } from './PostList'
import { t } from './i18n'
import type { BlockField, BlockRenderer, BlockSchema, HossoPlugin, Theme } from './types'

const toPuckField = (f: BlockField): any => {
  if (f.type === 'media') return { type: 'custom', label: f.label, render: ({ value, onChange, readOnly }: any) => createElement(MediaField, { value, onChange, readOnly, kind: f.kind }) }
  if (f.type === 'ref') return { type: 'custom', label: f.label, render: ({ value, onChange, readOnly }: any) => createElement(RefField, { value, onChange, readOnly, collection: f.collection }) }
  if (f.type !== 'array') return f
  const first = Object.keys(f.arrayFields)[0]
  return {
    ...f,
    arrayFields: Object.fromEntries(Object.entries(f.arrayFields).map(([k, v]) => [k, toPuckField(v)])),
    getItemSummary: (item: Record<string, unknown>, i: number) => String(item?.[first] || `Mục ${i + 1}`),
  }
}

// Renderer dự phòng của lõi khi theme không có renderer riêng.
const coreFallback: Record<string, BlockRenderer> = { PostList, TrustBar, CategoryGrid, SearchBox, TermList, NavMenu, Form: FormBlock, Reusable: ReusablePlaceholder }

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
    const render = theme.renderers[s.type] ?? coreFallback[s.type] ?? fallback(s.type)
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
  // Puck cần data.root; nội dung rỗng/cũ có thể thiếu nên bù lại để trang không lỗi 500.
  return { ...data, root: (data as { root?: unknown }).root ?? { props: {} }, content: (data.content ?? []).filter((c) => c.type in config.components) }
}
