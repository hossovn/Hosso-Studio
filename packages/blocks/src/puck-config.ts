import { createElement } from 'react'
import type React from 'react'
import { MediaField } from './MediaField'
import { RefField } from './RefField'
import { BookingForm, LanguageSwitch, LuckyWheel, NoticeBar, PopupBlock } from './ExtraBlocks'
import { CategoryGrid, FormBlock, ImageSections, TwoColumns, ReusablePlaceholder, NavMenu, SearchBox, Slider, TermList, TrustBar } from './CoreExtras'
import { PostList } from './PostList'
import { FreeCanvasView, FreeOverlay } from './FreeCanvas'
import { t } from './i18n'
import { toStyleField } from './style-fields'
import type { BlockField, BlockRenderer, BlockSchema, HossoPlugin, Theme } from './types'
import { widgetPartResponsiveCss, widgetPartScope } from './widget-parts'
import { elementStateScope, elementStatesCss } from './element-states'

const toPuckField = (f: BlockField, L: (vi: string) => string = (v) => v): any => {
  if (f.type === 'media') return { type: 'custom', label: f.label && L(f.label), render: ({ value, onChange, readOnly }: any) => createElement(MediaField, { value, onChange, readOnly, kind: f.kind }) }
  if (f.type === 'ref') return { type: 'custom', label: f.label && L(f.label), render: ({ value, onChange, readOnly }: any) => createElement(RefField, { value, onChange, readOnly, collection: f.collection }) }
  if (f.type === 'select' || f.type === 'radio') return { ...f, label: f.label && L(f.label), options: f.options.map((o) => ({ ...o, label: L(o.label) })) }
  if (f.type !== 'array') return { ...f, label: f.label && L(f.label) }
  const first = Object.keys(f.arrayFields)[0]
  return {
    ...f,
    label: f.label && L(f.label),
    arrayFields: Object.fromEntries(Object.entries(f.arrayFields).map(([k, v]) => [k, toPuckField(v, L)])),
    getItemSummary: (item: Record<string, unknown>, i: number) => String(item?.[first] || `Mục ${i + 1}`),
  }
}

// Kiểu riêng của từng khối (nền, khoảng cách, căn chữ): chỉ bọc thêm một lớp khi người dùng đã chọn, nên trang cũ giữ nguyên DOM.
const STYLE_OPTS = [{ label: 'Mặc định', value: '' }, { label: 'Không', value: 'none' }, { label: 'Nhỏ', value: 'sm' }, { label: 'Vừa', value: 'md' }, { label: 'Lớn', value: 'lg' }]
const STYLE_FIELDS: Record<string, BlockField> = {
  _bg: { type: 'select', label: 'Màu nền khối', options: [{ label: 'Mặc định', value: '' }, { label: 'Trắng', value: 'white' }, { label: 'Xám nhạt', value: 'surface' }, { label: 'Đen', value: 'dark' }, { label: 'Màu nhấn', value: 'accent' }, { label: 'Màu chính', value: 'primary' }] },
  _pt: { type: 'select', label: 'Khoảng cách phía trên', options: STYLE_OPTS },
  _pb: { type: 'select', label: 'Khoảng cách phía dưới', options: STYLE_OPTS },
  _fs: { type: 'select', label: 'Cỡ chữ cả khối', options: [{ label: 'Mặc định', value: '' }, { label: 'Nhỏ', value: 'sm' }, { label: 'Lớn', value: 'lg' }, { label: 'Rất lớn', value: 'xl' }] },
  _bd: { type: 'select', label: 'Viền', options: [{ label: 'Không', value: '' }, { label: 'Mảnh', value: 'thin' }, { label: 'Màu nhấn', value: 'accent' }, { label: 'Dày', value: 'thick' }] },
  _rd: { type: 'select', label: 'Bo góc', options: [{ label: 'Mặc định', value: '' }, { label: 'Vuông', value: 'none' }, { label: 'Vừa', value: 'md' }, { label: 'Tròn nhiều', value: 'lg' }] },
  _sh: { type: 'select', label: 'Đổ bóng', options: [{ label: 'Không', value: '' }, { label: 'Nhẹ', value: 'sm' }, { label: 'Vừa', value: 'md' }] },
  _an: { type: 'select', label: 'Hiệu ứng khi cuộn tới', options: [{ label: 'Không', value: '' }, { label: 'Hiện dần', value: 'fade' }, { label: 'Trượt lên', value: 'up' }, { label: 'Phóng nhẹ', value: 'zoom' }] },
  _hv: { type: 'select', label: 'Khi rê chuột', options: [{ label: 'Không', value: '' }, { label: 'Nổi lên', value: 'lift' }, { label: 'Phóng nhẹ', value: 'grow' }] },
  _align: { type: 'select', label: 'Căn chữ', options: [{ label: 'Mặc định', value: '' }, { label: 'Trái', value: 'left' }, { label: 'Giữa', value: 'center' }, { label: 'Phải', value: 'right' }] },
  // Chỉnh theo pixel (như Elementor): để trống là không áp dụng. Margin và dịch chuyển nhận số âm để chồng khối lên nhau.
  _padT: { type: 'number', label: 'Padding trên (px)' },
  _padB: { type: 'number', label: 'Padding dưới (px)' },
  _padL: { type: 'number', label: 'Padding trái (px)' },
  _padR: { type: 'number', label: 'Padding phải (px)' },
  _marT: { type: 'number', label: 'Margin trên (px, âm để chồng lên khối trước)' },
  _marB: { type: 'number', label: 'Margin dưới (px)' },
  _offX: { type: 'number', label: 'Dịch ngang (px)' },
  _offY: { type: 'number', label: 'Dịch dọc (px)' },
  _maxW: { type: 'number', label: 'Rộng tối đa (px, canh giữa)' },
  _minH: { type: 'number', label: 'Cao tối thiểu (px)' },
  _bgHex: { type: 'text', label: 'Màu nền tự chọn (#rrggbb)' },
  _txtHex: { type: 'text', label: 'Màu chữ tự chọn (#rrggbb)' },
  _bdHex: { type: 'text', label: 'Màu viền tự chọn (#rrggbb)' },
  _bdPx: { type: 'number', label: 'Độ dày viền (px)' },
  _radPx: { type: 'number', label: 'Bo góc (px)' },
  _hide: { type: 'select', label: 'Ẩn trên thiết bị', options: [{ label: 'Hiện mọi nơi', value: '' }, { label: 'Ẩn trên điện thoại', value: 'm' }, { label: 'Ẩn trên máy tính bảng', value: 't' }, { label: 'Ẩn trên máy tính', value: 'd' }] },
  _z: { type: 'number', label: 'Lớp xếp chồng (z-index)' },
}
const NUM_STYLES: [string, string][] = [['_padT', 'paddingTop'], ['_padB', 'paddingBottom'], ['_padL', 'paddingLeft'], ['_padR', 'paddingRight'], ['_marT', 'marginTop'], ['_marB', 'marginBottom'], ['_minH', 'minHeight'], ['_bdPx', 'borderWidth'], ['_radPx', 'borderRadius']]
const HEX = /^#[0-9a-fA-F]{6}$/
const px = (v: unknown) => (v === '' || v == null || Number.isNaN(Number(v)) ? undefined : `${Number(v)}px`)
/** Gom các ô px/hex thành style nội tuyến; màu sai dạng bị bỏ qua. */
const inlineStyle = (p: Record<string, any>): React.CSSProperties | undefined => {
  const st: Record<string, any> = {}
  for (const [k, css] of NUM_STYLES) if (px(p[k])) st[css] = px(p[k])
  if (px(p._offX) || px(p._offY)) st.transform = `translate(${px(p._offX) ?? '0px'},${px(p._offY) ?? '0px'})`
  if (px(p._maxW)) Object.assign(st, { maxWidth: px(p._maxW), marginLeft: 'auto', marginRight: 'auto' })
  if (HEX.test(p._bgHex ?? '')) st.background = p._bgHex
  if (HEX.test(p._txtHex ?? '')) st.color = p._txtHex
  if (HEX.test(p._bdHex ?? '')) st.borderColor = p._bdHex
  if (px(p._bdPx)) st.borderStyle = 'solid'
  if (p._z !== '' && p._z != null && !Number.isNaN(Number(p._z))) Object.assign(st, { position: 'relative', zIndex: Number(p._z) })
  return Object.keys(st).length ? st : undefined
}
export const withStyle = (Inner: BlockRenderer): BlockRenderer => {
  const Styled: BlockRenderer = (props: any) => {
    const { _bg, _pt, _pb, _align, _fs, _bd, _rd, _sh, _an, _hv, _hide } = props
    const style = inlineStyle(props)
    const stateCss = typeof props.id === 'string' ? elementStatesCss(props.id, props) : ''
    let content = createElement(Inner, stateCss ? { ...props, _states: undefined } : props)
    if (typeof props.id === 'string' && (props._editParts || props._parts || props._partsTablet || props._partsMobile)) {
      const css = widgetPartResponsiveCss(props.id, props)
      content = createElement('div', { 'data-hs-parts': widgetPartScope(props.id), style: { display: 'contents' } }, content, css ? createElement('style', null, css) : null)
    }
    // Lớp phần tử tự do (prop _els) phủ lên mọi block; editor tự vẽ lớp chỉnh sửa nên đặt _noFree để bỏ lớp này.
    const layer = !props._noFree && Array.isArray(props._els) && props._els.length ? createElement(FreeOverlay, { elements: props._els }) : null
    if (!_bg && !_pt && !_pb && !_align && !_fs && !_bd && !_rd && !_sh && !_an && !_hv && !_hide && !style && !layer && !stateCss) return content
    const cls = ['hs-styled', _hide && `hs-hide-${_hide}`, _bg && `hs-bg-${_bg}`, _pt && `hs-pt-${_pt}`, _pb && `hs-pb-${_pb}`, _align && `hs-ta-${_align}`, _fs && `hs-fs-${_fs}`, _bd && `hs-bd-${_bd}`, _rd && `hs-rd-${_rd}`, _sh && `hs-sh-${_sh}`, _an && `hs-an-${_an}`, _hv && `hs-hv-${_hv}`].filter(Boolean).join(' ')
    return createElement('div', { className: cls + (stateCss ? ' ' + elementStateScope(props.id) : ''), style: layer ? { position: 'relative', ...style } : style }, stateCss ? createElement('style', null, stateCss) : null, content, layer)
  }
  return Styled
}

// Renderer dự phòng của lõi khi theme không có renderer riêng.
const coreFallback: Record<string, BlockRenderer> = { FreeCanvas: FreeCanvasView, Popup: PopupBlock, Booking: BookingForm, NoticeBar, LanguageSwitch, LuckyWheel, ImageSections, TwoColumns, PostList, Slider, TrustBar, CategoryGrid, SearchBox, TermList, NavMenu, Form: FormBlock, Reusable: ReusablePlaceholder }

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
  /** Dịch nhãn tiếng Việt của block/trường (trình dựng bản tiếng Anh). */
  label?: (vi: string) => string
}) {
  const { schemas, theme, plugins = [], mode, extraTypes = [], label: L = (v: string) => v } = opts
  const fallback = (type: string) => plugins.find((p) => p.fallbackRenderers?.[type])?.fallbackRenderers?.[type]
  const components: Record<string, any> = {}

  for (const s of schemas) {
    const render = theme.renderers[s.type] ?? coreFallback[s.type] ?? fallback(s.type)
    if (!render) {
      if (mode === 'render') continue
      components[s.type] = { label: L(s.label), fields: {}, defaultProps: {}, render: () => createElement(Missing, { type: s.type }) }
      continue
    }
    components[s.type] = {
      label: L(s.label),
      fields: Object.fromEntries([...Object.entries(s.fields).map(([k, v]) => [k, toPuckField(v as BlockField, L)]), ...Object.entries(STYLE_FIELDS).map(([k, v]) => [k, toStyleField(k, v, L) ?? toPuckField(v as BlockField, L)])]),
      defaultProps: s.defaultProps,
      render: withStyle(render),
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
