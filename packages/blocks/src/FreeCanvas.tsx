import React from 'react'
import { CANVAS_WIDGET_CSS } from './canvas-widgets'
import { BLOB_RADIUS, BOX_SHADOWS, CLIPS, TEXT_SHADOWS, fillCss, fontImport, fontStack, shadowCss } from './free-style'
import { FreeBreadcrumb, FreeCountdown, FreeEmbed, FreeFoldMenu, FreeMap, FreeTable, FreeTabs } from './free-extra'
import { ICON_BODY } from './icons-data'
import type { BlockRenderer } from './types'
import { FreeSwiper } from './FreeSwiper'
import { inheritedElementFlag, inheritedHideClasses, newId } from './free-geometry'
import { elementStateScope, elementStatesCss } from './element-states'
import type { ElementState } from './element-states'
import { ScrollEffect } from './ScrollEffect'
import { normalizeScrollEffect } from './scroll-effects'
import { resolveMotionConfig } from './motion-effects'
import { MotionEffects } from './MotionEffects'
import { MotionScope } from './MotionScope'
import { MotionText } from './MotionText'
import { blockForDevice, elementForDevice, type DevicePatch } from './responsive-layout'
import { baseDevice, layoutWidth, layoutVariants, variantCss } from './responsive-breakpoints'
import { sanitizeRichText } from './rich-text'
export { newId } from './free-geometry'

/**
 * Vùng tự do (kiểu Webcake/Canva): một vùng cao cố định, bên trong là các phần tử đặt theo tọa độ trên khung thiết kế rộng FREE_W px.
 * Hiển thị bằng đơn vị cqw nên co giãn theo bề rộng khung; thứ tự mảng là thứ tự xếp lớp (phần tử sau nằm trên) và là thứ tự DOM.
 */
export const FREE_W = 1200
export const FREE_MAX_PX = 1440

export type FreeType = 'heading' | 'text' | 'button' | 'shape' | 'line' | 'icon' | 'image' | 'video' | 'menu' | 'countdown' | 'number' | 'table' | 'map' | 'embed' | 'tabs' | 'breadcrumb' | 'container' | 'swiper' | 'widget'
export type FreeElement = { id: string; parentId?: string; type: FreeType; x: number; y: number; w: number; h: number; props: Record<string, any>; responsive?: Partial<Record<'tablet' | 'mobile' | `bp-${number}`, DevicePatch>> }

const ICON_PATHS: Record<string, string> = {
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 3.6-6 8-6s8 2 8 6',
  home: 'M4 11l8-7 8 7v9h-5v-6H9v6H4z',
  list: 'M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01',
  back: 'M9 7L4 12l5 5M4 12h11a5 5 0 0 1 0 10h-3',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
  heart: 'M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z',
  pin: 'M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  bell: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z',
  mail: 'M4 6h16v12H4zM4 7l8 6 8-6',
  cart: 'M3 4h2l2.4 11h10.2L20 7H6.2M10 20h.01M17 20h.01',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-5-5',
  check: 'M5 12l5 5L20 7',
  arrow: 'M5 12h14M13 6l6 6-6 6',
}
export const FREE_ICONS = [...new Set([...Object.keys(ICON_BODY), ...Object.keys(ICON_PATHS)])]

const SAFE_HREF = /^(https?:\/\/|\/|#|mailto:|tel:)/i
const SAFE_COLOR = /^#[0-9a-f]{6}$/i
const safeHref = (h: unknown) => (typeof h === 'string' && SAFE_HREF.test(h.trim()) ? h.trim() : '#')
const videoEmbed = (url: string) => {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,})/) ?? []
  return m[1] ? `https://www.youtube-nocookie.com/embed/${m[1]}` : ''
}

/** Chiều cao thực của vùng (px thiết kế): vừa khít phần tử, không thấp hơn mức tối thiểu của khối. */
export const freeHeight = (min: number | undefined, elements: FreeElement[] = []) => Math.max(Number(min) || 0, ...elements.map((e) => e.y + e.h + 24), 0)



/** Phần tử mới với kích thước và kiểu mặc định theo loại; `over` ghi đè (ví dụ cấp tiêu đề). */
export function makeElement(type: FreeType, over: Partial<FreeElement> & { props?: Record<string, any> } = {}): FreeElement {
  const base: Record<FreeType, Omit<FreeElement, 'id'>> = {
    container: { type: 'container', x: 80, y: 60, w: 640, h: 400, props: { bg: 'transparent' } },
    widget: { type: 'widget', x: 80, y: 60, w: 480, h: 480, props: {} },
    swiper: { type: 'swiper', x: 80, y: 60, w: 640, h: 360, props: { slides: [], seconds: 0 } },
    heading: { type: 'heading', x: 80, y: 60, w: 560, h: 72, props: { text: 'Tiêu đề của bạn', level: 2, size: 48, weight: 700, color: '#111827', align: 'left' } },
    text: { type: 'text', x: 80, y: 60, w: 480, h: 96, props: { text: 'Nhấp đúp để sửa đoạn văn này. Kéo để di chuyển, kéo tay nắm để đổi kích thước.', size: 18, weight: 400, color: '#374151', align: 'left' } },
    button: { type: 'button', x: 80, y: 60, w: 200, h: 56, props: { text: 'Nút bấm', href: '#', size: 18, weight: 700, color: '#ffffff', bg: '#15803d', radius: 10 } },
    shape: { type: 'shape', x: 80, y: 60, w: 240, h: 160, props: { bg: '#e5e7eb', radius: 0, borderW: 0, borderColor: '#111827' } },
    line: { type: 'line', x: 80, y: 60, w: 400, h: 12, props: { color: '#111827', thickness: 2, dashed: false, vertical: false } },
    icon: { type: 'icon', x: 80, y: 60, w: 64, h: 64, props: { name: 'star', color: '#111827' } },
    image: { type: 'image', x: 80, y: 60, w: 360, h: 240, props: { src: '', alt: '', radius: 0 } },
    video: { type: 'video', x: 80, y: 60, w: 480, h: 270, props: { url: '' } },
    menu: { type: 'menu', x: 80, y: 60, w: 640, h: 32, props: { items: [{ label: 'Trang chủ', href: '/' }, { label: 'Giới thiệu', href: '/gioi-thieu' }, { label: 'Liên hệ', href: '/lien-he' }], size: 16, weight: 500, color: '#111827', gap: 32, vertical: false, align: 'left' } },
    countdown: { type: 'countdown', x: 80, y: 60, w: 520, h: 120, props: { end: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 16), size: 44, bg: '#111827', color: '#ffffff', radius: 16, gap: 14 } },
    number: { type: 'number', x: 80, y: 60, w: 260, h: 150, props: { value: '1.500', suffix: '+', label: 'Khách hàng tin dùng', size: 72, color: '#15803d', labelColor: '#6b7280', align: 'center', weight: 800 } },
    table: { type: 'table', x: 80, y: 60, w: 560, h: 200, props: { rows: [['Gói', 'Giá', 'Hỗ trợ'], ['Cơ bản', '199.000₫', 'Email'], ['Phổ biến', '499.000₫', 'Ưu tiên'], ['Doanh nghiệp', '999.000₫', 'Riêng']], size: 16, headBg: '#15803d', headColor: '#ffffff', color: '#374151', radius: 12 } },
    map: { type: 'map', x: 80, y: 60, w: 560, h: 360, props: { query: 'Nhà thờ Đức Bà, Hồ Chí Minh', zoom: 15 } },
    embed: { type: 'embed', x: 80, y: 60, w: 560, h: 360, props: { url: '' } },
    tabs: { type: 'tabs', x: 80, y: 60, w: 520, h: 220, props: { tabs: [{ label: 'Tab 1', text: 'Nội dung của tab 1' }, { label: 'Tab 2', text: 'Nội dung của tab 2' }, { label: 'Tab 3', text: 'Nội dung của tab 3' }], accent: '#15803d', size: 18, bg: '#f9fafb', radius: 12 } },
    breadcrumb: { type: 'breadcrumb', x: 80, y: 60, w: 560, h: 36, props: { items: [{ label: 'Trang chủ', href: '/' }, { label: 'Trang 1', href: '#' }, { label: 'Trang 2', href: '#' }], size: 16, color: '#6b7280', accent: '#15803d' } },
  }
  const b = base[type]
  return { ...b, ...over, id: newId(), props: { ...b.props, ...(over.props ?? {}) } }
}

/** Nội dung của một phần tử, lấp đầy khung chứa. `unit` là bề rộng thiết kế ứng với bề rộng khung (mặc định FREE_W; thẻ xem trước dùng bề rộng phần tử). */
/** Menu thả xuống: mục có `children` mở danh sách con khi rê chuột hoặc focus bàn phím. */
const FM_CSS = '.fm-has{position:relative}.fm-sub{display:none;position:absolute;left:0;top:100%;z-index:60;margin:0;list-style:none;background:#fff;border:1px solid #e5e7eb;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.15)}.fm-has:hover>.fm-sub,.fm-has:focus-within>.fm-sub{display:block}.fm-sub a:hover{background:#f3f4f6}'
export function FreeElementView({ el, unit = FREE_W, scale, editing = false, state, scrollEffects = true, children }: { el: FreeElement; unit?: number; scale?: number; editing?: boolean; state?: ElementState; scrollEffects?: boolean; children?: React.ReactNode }) {
  if (el.type === 'widget') return <>{children ?? <div>Chọn khối để thêm nội dung</div>}</>
  const p = el.props
  const imp = ['heading', 'text', 'button', 'menu', 'countdown', 'number', 'table', 'tabs', 'breadcrumb'].includes(el.type) ? fontImport(p.font) : ''
  const op = p.opacity != null && p.opacity !== '' ? Math.min(100, Math.max(0, Number(p.opacity))) : 100
  const rot = Number(p.rotate) || 0
  const bodyOpacity = ['text', 'heading', 'button', 'image'].includes(el.type)
  const stateCss = elementStatesCss(el.id, p)
  const motion = scrollEffects && !editing && el.type !== 'container' ? resolveMotionConfig(p) : null
  const inner = <FreeElementBody el={el} unit={unit} scale={scale} editing={editing || !scrollEffects} state={state} />
  const scrolling = scrollEffects && !editing && el.type !== 'container' && p._scroll?.mode !== 'entrance' && normalizeScrollEffect(p._scroll)
  const effects = (content: React.ReactNode) => {
    const animated = motion ? <MotionEffects value={motion}>{content}</MotionEffects> : content
    return scrolling ? <ScrollEffect value={p._scroll}>{animated}</ScrollEffect> : animated
  }
  if (!stateCss && !imp && op === 100 && !rot) return effects(inner)
  const body = !imp && op === 100 && !rot ? inner : <div style={{ width: '100%', height: '100%', opacity: bodyOpacity ? undefined : op / 100, transform: rot ? `rotate(${rot}deg)` : undefined }}>{inner}</div>
  const styled = (
    <div style={{ width: '100%', height: '100%' }}>
      {imp && <style>{imp}</style>}
      {stateCss && <style>{stateCss}</style>}
      {body}
    </div>
  )
  return effects(styled)
}

function FreeElementBody({ el, unit, scale, editing, state }: { el: FreeElement; unit: number; scale?: number; editing: boolean; state?: ElementState }) {
  const p = el.props
  const opacity = p.opacity != null && p.opacity !== '' && Number.isFinite(Number(p.opacity)) ? Math.min(100, Math.max(0, Number(p.opacity))) / 100 : undefined
  const stateAttrs = { className: p._states ? elementStateScope(el.id) : undefined, 'data-hs-state': state }
  const u = (n: number) => scale !== undefined ? (Number(n) * scale) + 'px' : `${(Number(n) / unit) * 100}cqw`
  const text: React.CSSProperties = { opacity, margin: 0, fontSize: u(p.size ?? 18), fontWeight: p.weight ?? 400, color: p.color, textAlign: p.align ?? 'left', lineHeight: p.lh ? Number(p.lh) : 1.25, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontFamily: fontStack(p.font) ?? 'inherit', fontStyle: p.italic ? 'italic' : 'normal', letterSpacing: p.spacing ? u(p.spacing) : 'normal', textTransform: p.upper ? 'uppercase' : 'none', textDecoration: p.underline ? 'underline' : undefined, textShadow: shadowCss(TEXT_SHADOWS[p.tshadow], u), ...(p.strokeW ? { WebkitTextStroke: `${u(p.strokeW)} ${p.strokeColor ?? '#111827'}`, paintOrder: 'stroke fill' } : {}), ...(p.grad2 ? { background: `linear-gradient(${Number(p.angle ?? 90)}deg, ${p.color ?? '#111827'}, ${p.grad2})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' } : {}) }
  const motion = !editing ? resolveMotionConfig(p) : null
  const entrance = motion?.entrance?.preset
  const textMode = entrance === 'text-lines' ? 'lines' : entrance === 'text-words' ? 'words' : motion?.loop?.preset === 'marquee' ? 'marquee' : null
  const textContent = textMode ? <MotionText text={String(p.text ?? '')} mode={textMode} marquee={motion?.loop?.preset === 'marquee'} /> : p.text
  const richText = textMode ? '' : sanitizeRichText(p.richText)
  const inkStyle: React.CSSProperties | undefined = p.grad2 ? { background: `linear-gradient(${Number(p.angle ?? 90)}deg, ${p.color ?? '#111827'}, ${p.grad2})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' } : undefined
  const ink = richText ? <span style={inkStyle} dangerouslySetInnerHTML={{ __html: richText }} /> : <span style={inkStyle}>{textContent}</span>
  const textBox: React.CSSProperties = {
    ...text,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: p.vAlign === 'bottom' ? 'flex-end' : p.vAlign === 'center' ? 'center' : 'flex-start',
    width: '100%',
    height: '100%',
    boxSizing: 'border-box',
    padding: `${u(p.padY ?? 0)} ${u(p.padX ?? 0)}`,
    background: p.bg ? fillCss(p) : undefined,
    WebkitBackgroundClip: undefined,
    backgroundClip: undefined,
    WebkitTextFillColor: undefined,
    borderRadius: u(p.radius ?? 0),
    border: p.borderW ? `${u(p.borderW)} solid ${p.borderColor ?? '#111827'}` : undefined,
    boxShadow: shadowCss(BOX_SHADOWS[p.bshadow], u),
    overflow: p.overflow === 'hidden' ? 'hidden' : 'visible',
  }
  if (el.type === 'heading') return React.createElement(`h${Math.min(6, Math.max(1, Number(p.level) || 2))}`, { ...stateAttrs, style: textBox }, p.href && !editing ? <a href={safeHref(p.href)} style={{ color: 'inherit', textDecoration: 'inherit' }}>{ink}</a> : ink)
  if (el.type === 'text') return p.href && !editing ? <a {...stateAttrs} href={safeHref(p.href)} style={{ ...textBox, textDecoration: p.underline ? 'underline' : 'none' }}>{ink}</a> : <p {...stateAttrs} style={textBox}>{ink}</p>
  if (el.type === 'button') {
    const st: React.CSSProperties = { ...text, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: u(8), width: '100%', height: '100%', boxSizing: 'border-box', background: fillCss(p), borderRadius: u(p.radius ?? 0), border: p.borderW ? `${u(p.borderW)} solid ${p.borderColor}` : 0, textAlign: 'center', textDecoration: p.underline ? 'underline' : 'none', boxShadow: shadowCss(BOX_SHADOWS[p.bshadow], u), WebkitTextFillColor: undefined, WebkitBackgroundClip: undefined, backgroundClip: undefined }
    const content = <>{typeof p.icon === 'string' && Object.hasOwn(ICON_BODY, p.icon) && <svg viewBox="0 0 24 24" width={u(p.size ?? 18)} height={u(p.size ?? 18)} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" style={{ flexShrink: 0 }} dangerouslySetInnerHTML={{ __html: ICON_BODY[p.icon] }} />}{richText ? <span dangerouslySetInnerHTML={{ __html: richText }} /> : p.text}</>
    return editing ? <span {...stateAttrs} style={st}>{content}</span> : <a {...stateAttrs} href={safeHref(p.href)} style={st}>{content}</a>
  }
  if (el.type === 'shape') return <div style={{ width: '100%', height: '100%', boxSizing: 'border-box', background: fillCss(p), borderRadius: p.clip === 'blob' ? BLOB_RADIUS : p.radius >= 999 ? '50%' : u(p.radius ?? 0), border: p.borderW ? `${u(p.borderW)} solid ${p.borderColor}` : 0, clipPath: CLIPS[p.clip], boxShadow: CLIPS[p.clip] ? undefined : shadowCss(BOX_SHADOWS[p.bshadow], u) }} />
  if (el.type === 'line') {
    const t = u(p.thickness ?? 2)
    const st: React.CSSProperties = p.vertical ? { height: '100%', borderLeft: `${t} ${p.dashed ? 'dashed' : 'solid'} ${p.color}` } : { width: '100%', borderTop: `${t} ${p.dashed ? 'dashed' : 'solid'} ${p.color}` }
    return <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={st} /></div>
  }
  if (el.type === 'icon')
    return (
      <svg viewBox="0 0 24 24" width="100%" height="100%" fill={p.fill ? p.color : 'none'} stroke={p.color} strokeWidth={p.stroke ?? 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
        {...(ICON_BODY[p.name] ? { dangerouslySetInnerHTML: { __html: ICON_BODY[p.name] } } : {})}>
        {ICON_BODY[p.name] ? undefined : <path d={ICON_PATHS[p.name] ?? ICON_PATHS.star} />}
      </svg>
    )
  if (el.type === 'image') {
    const imageStyle: React.CSSProperties = { width: '100%', height: '100%', objectFit: p.fit === 'contain' ? 'contain' : 'cover', borderRadius: u(p.radius ?? 0), display: 'block', boxSizing: 'border-box', border: p.borderW ? u(p.borderW) + ' solid ' + p.borderColor : undefined, boxShadow: shadowCss(BOX_SHADOWS[p.bshadow], u) }
    if (!p.src) return <div {...stateAttrs} style={{ ...imageStyle, opacity, background: '#f3f4f6', display: 'grid', placeItems: 'center', color: '#9ca3af', fontSize: u(16) }}>Ảnh</div>
    const focal = (value: unknown) => Math.max(0, Math.min(100, Number.isFinite(Number(value)) ? Number(value) : 50))
    const zoom = Math.max(1, Math.min(5, Number(p.imageZoom) || 1)), fx = focal(p.focalX), fy = focal(p.focalY)
    const picture = <img src={p.src} alt={p.alt ?? ''} style={{ width: '100%', height: '100%', display: 'block', objectFit: imageStyle.objectFit, objectPosition: `${fx}% ${fy}%`, transform: `scale(${zoom})`, transformOrigin: `${fx}% ${fy}%` }} />
    const frameStyle = { ...imageStyle, overflow: 'hidden', opacity }
    return p.href && !editing ? <a {...stateAttrs} href={safeHref(p.href)} style={frameStyle}>{picture}</a> : <div {...stateAttrs} style={frameStyle}>{picture}</div>
  }
  if (el.type === 'container') return <div style={{ width: '100%', height: '100%', boxSizing: 'border-box', background: fillCss(p) || 'transparent', backgroundImage: typeof p.bgImage === 'string' && p.bgImage ? 'url(' + JSON.stringify(p.bgImage) + ')' : undefined, backgroundSize: p.bgFit === 'contain' ? 'contain' : 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', borderRadius: u(p.radius || 0), border: p.borderW ? `${u(p.borderW)} solid ${p.borderColor ?? '#111827'}` : undefined, boxShadow: shadowCss(BOX_SHADOWS[p.bshadow], u) }} />
  if (el.type === 'swiper') return <FreeSwiper slides={Array.isArray(p.slides) ? p.slides : []} seconds={Number(p.seconds) || 0} editing={editing} effect={p.effect === 'fade' ? 'fade' : 'slide'} thumbnails={p.thumbnails === true} />
  if (el.type === 'video') {
    const embed = videoEmbed(String(p.url ?? ''))
    if (embed && !editing) return <iframe src={embed} title={p.title || 'Video'} style={{ width: '100%', height: '100%', border: 0 }} allowFullScreen loading="lazy" />
    if (p.url && !embed && !editing) return <video src={p.url} poster={p.poster || undefined} controls style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    return <div style={{ position: 'relative', width: '100%', height: '100%', background: '#111827', color: '#fff', display: 'grid', placeItems: 'center', fontSize: u(18) }}>{p.poster && <img src={p.poster} alt={p.title || 'Video'} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}<span style={{ position: 'relative', padding: '6px 10px', borderRadius: 4, background: '#111827bb' }}>▶ Video</span></div>
  }
  if (el.type === 'countdown') return <FreeCountdown p={p} unit={unit} />
  if (el.type === 'tabs') return <FreeTabs p={p} unit={unit} editing={editing} />
  if (el.type === 'table') return <FreeTable p={p} unit={unit} />
  if (el.type === 'map') return <FreeMap p={p} />
  if (el.type === 'embed') return <FreeEmbed p={p} />
  if (el.type === 'breadcrumb') return <FreeBreadcrumb p={p} unit={unit} editing={editing} />
  if (el.type === 'number')
    return (
      <div style={{ width: '100%', height: '100%', display: 'grid', alignContent: 'center', justifyItems: p.align === 'left' ? 'start' : p.align === 'right' ? 'end' : 'center', fontFamily: fontStack(p.font) ?? 'inherit', textAlign: p.align ?? 'center', lineHeight: 1.1 }}>
        <span style={{ fontSize: u(p.size ?? 72), fontWeight: p.weight ?? 800, color: p.color, whiteSpace: 'nowrap' }}>{p.value}{p.suffix}</span>
        {p.label ? <span style={{ fontSize: u(Math.max(12, (p.size ?? 72) * 0.26)), color: p.labelColor ?? '#6b7280', marginTop: u(6) }}>{p.label}</span> : null}
      </div>
    )
  if (el.type === 'menu' && (p.variant === 'collapse' || p.variant === 'hamburger')) return <FreeFoldMenu p={p} unit={unit} hamburger={p.variant === 'hamburger'} editing={editing} />
  if (el.type === 'menu') {
    const items: { label: string; href: string; children?: { label: string; href: string }[] }[] = Array.isArray(p.items) ? p.items : []
    const st: React.CSSProperties = { display: 'flex', flexDirection: p.vertical ? 'column' : 'row', flexWrap: 'wrap', alignItems: p.vertical ? 'flex-start' : 'center', justifyContent: p.align === 'center' ? 'center' : p.align === 'right' ? 'flex-end' : 'flex-start', gap: u(p.gap ?? 24), width: '100%', height: '100%', margin: 0, padding: 0, listStyle: 'none' }
    const link: React.CSSProperties = { fontFamily: fontStack(p.font), fontSize: u(p.size ?? 16), fontWeight: p.weight ?? 500, color: p.color, textDecoration: 'none', lineHeight: 1.25, whiteSpace: 'nowrap' }
    // Kiểu menu: underline (gạch chân mục chọn), pill (viên thuốc), box (thanh nền đặc), grid (lưới ô). Mục chọn = p.active (mặc định mục đầu, -1 là không chọn).
    const v = p.variant as string | undefined
    const accent = p.accent ?? '#15803d'
    const act = p.active == null ? 0 : Number(p.active)
    const liStyle = (i: number): React.CSSProperties => {
      const on = i === act
      if (v === 'underline') return { listStyle: 'none', padding: `${u(10)} ${u(4)}`, borderBottom: `${u(3)} solid ${on ? accent : 'transparent'}`, ...(on ? { color: accent } : {}) }
      if (v === 'pill') return { listStyle: 'none', padding: `${u(8)} ${u(18)}`, borderRadius: 999, background: on ? accent : 'transparent' }
      if (v === 'box') return { listStyle: 'none', flex: 1, textAlign: 'center', padding: `${u(12)} ${u(10)}`, background: on ? accent : 'transparent' }
      if (v === 'grid') return { listStyle: 'none', display: 'grid', placeItems: 'center', border: `${u(1)} solid #e5e7eb`, background: on ? accent : '#ffffff' }
      return { listStyle: 'none' }
    }
    const linkOf = (i: number): React.CSSProperties => ({ ...link, ...(i === act && (v === 'pill' || v === 'box' || v === 'grid') ? { color: '#ffffff' } : {}), ...(i === act && v === 'underline' ? { color: accent, fontWeight: 700 } : {}) })
    const ulSt: React.CSSProperties = v === 'box' ? { ...st, gap: 0, flexWrap: 'nowrap', borderRadius: u(10), overflow: 'hidden', background: '#f3f4f6' } : v === 'grid' ? { ...st, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(0, 1fr))', gap: 0 } : v === 'pill' ? { ...st, gap: u(8) } : v === 'underline' ? { ...st, borderBottom: `${u(1)} solid #e5e7eb`, alignItems: 'flex-end' } : st
    return (
      <nav aria-label="Menu" style={{ width: '100%', height: '100%' }}>
        {items.some((it) => it.children?.length) && <style>{FM_CSS}</style>}
        <ul style={ulSt}>
          {items.map((it, i) => {
            const kids = Array.isArray(it.children) ? it.children : []
            return (
              <li key={i} style={liStyle(i)} className={kids.length ? 'fm-has' : undefined}>
                {editing ? <span style={linkOf(i)}>{it.label}</span> : <a href={safeHref(it.href)} style={linkOf(i)}>{it.label}</a>}
                {!!kids.length && <span aria-hidden="true" style={{ ...linkOf(i), marginLeft: u(6), fontSize: u((p.size ?? 16) * 0.7) }}>▾</span>}
                {!!kids.length && (
                  <ul className="fm-sub" style={{ minWidth: u(240), padding: `${u(6)} 0` }}>
                    {kids.map((k, j) => {
                      const st: React.CSSProperties = { display: 'block', padding: `${u(9)} ${u(18)}`, fontFamily: fontStack(p.font), fontSize: u((p.size ?? 16) * 0.95), fontWeight: 500, color: '#111827', textDecoration: 'none', whiteSpace: 'nowrap' }
                      return <li key={j}>{editing ? <span style={st}>{k.label}</span> : <a href={safeHref(k.href)} style={st}>{k.label}</a>}</li>
                    })}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      </nav>
    )
  }
  return null
}

/** Lớp phần tử phủ lên một block (prop `_els`): rộng tối đa FREE_MAX_PX, canh giữa, tọa độ tính từ góc trên trái của block. */
export const FreeOverlay = ({ elements, height, responsive, breakpoints, scope = 'page', widgets = {} }: { elements: FreeElement[]; height?: number; responsive?: Record<string, any>; breakpoints?: unknown; scope?: string; widgets?: Record<string, React.ReactNode> }) => {
  const devices = elements.some((el) => Object.keys(el.responsive ?? {}).length || el.props._constraints || el.props._layout) ? layoutVariants(breakpoints) : ['desktop'] as const
  return (
  <div className="hs-free-layer" data-scroll-boundary style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, width: `min(100%, ${FREE_MAX_PX}px)`, margin: '0 auto', containerType: 'inline-size', pointerEvents: 'none' }}>
    {elements.some((el) => el.type === 'widget') && <style>{CANVAS_WIDGET_CSS}</style>}
    <MotionScope enabled={elements.some((el) => !el.props._hidden && resolveMotionConfig(el.props)?.loop?.preset && resolveMotionConfig(el.props)?.loop?.preset !== 'none')}>
    {devices.length > 1 && <style>{variantCss(scope + '-overlay', breakpoints)}</style>}
    <div data-hs-variants={encodeURIComponent(scope + '-overlay')} style={{ position: 'absolute', inset: 0 }}>
    {devices.map((device) => <div key={device} data-hs-variant={devices.length > 1 ? device : undefined} style={{ position: 'absolute', inset: 0, display: device === 'desktop' ? 'block' : 'none' }}>
    {blockForDevice({ type: 'FreeCanvas', props: { _els: elements, height, _responsive: responsive } }, device).props._els.map((el: FreeElement) => { return (
      <div key={el.id} className={inheritedHideClasses(elements, el.id)} style={{ display: inheritedElementFlag(elements, el.id, '_hidden', baseDevice(layoutWidth(device))) ? 'none' : undefined, position: 'absolute', left: `${(el.x / FREE_W) * 100}%`, top: `${(el.y / FREE_W) * 100}cqw`, width: `${(el.w / FREE_W) * 100}%`, height: `${(el.h / FREE_W) * 100}cqw`, pointerEvents: el.type === 'container' ? 'none' : 'auto', zIndex: el.type === 'container' ? 0 : 1 }}>
        <FreeElementView el={el}>{widgets[el.id]}</FreeElementView>
      </div>
    )})}
    </div>)}
    </div>
    </MotionScope>
  </div>
  )
}

/**
 * Block "Vùng tự do": chỉ là khoảng trống có chiều cao; các phần tử nằm ở lớp phủ chung (`_els`, cũng dùng cho mọi block khác).
 * `elements` là tên prop cũ, vẫn đọc được. `_noFree` được editor đặt khi nó tự vẽ lớp chỉnh sửa.
 */
export const FreeCanvasView: BlockRenderer = (props: { id?: string; height?: number; bgImage?: string; bgVideo?: string; bgOverlay?: number; bgOverlayColor?: string; bgSize?: string; bgRepeat?: string; bgPositionX?: number; bgPositionY?: number; bgAttachment?: string; bgImageOpacity?: number; bgBlur?: number; bgVideoFit?: string; _els?: FreeElement[]; elements?: FreeElement[]; _noFree?: boolean; _states?: unknown; _editorState?: ElementState; _responsive?: Record<string, any>; _breakpoints?: unknown }) => {
  const { height = 0, bgImage, bgVideo, bgOverlay = 0, bgOverlayColor = '#000000', bgSize = 'cover', bgRepeat = 'no-repeat', bgPositionX = 50, bgPositionY = 50, bgAttachment = 'scroll', bgImageOpacity = 100, bgBlur = 0, bgVideoFit = 'cover', _els, elements, _noFree } = props
  const stateCss = props.id ? elementStatesCss(props.id, props) : ''
  const els = _els ?? elements ?? []
  // Chiều cao chính xác theo trường "height"; khối cũ chưa có height thì tự vừa phần tử.
  const h = Number(height) > 0 ? Number(height) : Math.max(freeHeight(0, els), _noFree ? 140 : 0)
  return (
    <section className={"hs-free " + (stateCss && props.id ? elementStateScope(props.id) : "")} data-hs-state={props._editorState} style={{ overflow: 'hidden' }}>
      {stateCss && <style>{stateCss}</style>}
      <div style={{ position: 'relative' }}>
      {bgImage && <div aria-hidden="true" style={{ position: 'absolute', inset: 0, backgroundImage: `url("${String(bgImage).replace(/"/g, '%22')}")`, backgroundSize: ['cover', 'contain', 'auto'].includes(bgSize) ? bgSize : 'cover', backgroundRepeat: ['no-repeat', 'repeat', 'repeat-x', 'repeat-y'].includes(bgRepeat) ? bgRepeat : 'no-repeat', backgroundPosition: `${Math.min(100, Math.max(0, Number(bgPositionX) || 0))}% ${Math.min(100, Math.max(0, Number(bgPositionY) || 0))}%`, backgroundAttachment: bgAttachment === 'fixed' ? 'fixed' : 'scroll', opacity: Math.min(100, Math.max(0, Number(bgImageOpacity) || 0)) / 100, filter: Number(bgBlur) > 0 ? `blur(${Math.min(40, Math.max(0, Number(bgBlur)))}px)` : undefined, transform: Number(bgBlur) > 0 ? 'scale(1.05)' : undefined, pointerEvents: 'none' }} />}
      {bgVideo && <video src={bgVideo} autoPlay muted loop playsInline aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: bgVideoFit === 'contain' ? 'contain' : 'cover', objectPosition: `${Math.min(100, Math.max(0, Number(bgPositionX) || 0))}% ${Math.min(100, Math.max(0, Number(bgPositionY) || 0))}%` }} />}
      {bgOverlay > 0 && <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: SAFE_COLOR.test(bgOverlayColor) ? bgOverlayColor : '#000000', opacity: Math.min(100, Math.max(0, bgOverlay)) / 100, pointerEvents: 'none' }} />}
      <div data-hs-variants={encodeURIComponent((props.id || 'free') + '-height')} style={{ position: 'relative', maxWidth: FREE_MAX_PX, margin: '0 auto', containerType: 'inline-size' }}>
        <style>{variantCss((props.id || 'free') + '-height', props._breakpoints)}</style>
        {(_noFree ? ['desktop'] as const : layoutVariants(props._breakpoints)).map((device) => {
          const resolved = blockForDevice({ type: 'FreeCanvas', props }, device).props
          const deviceHeight = Number(resolved.height) > 0 ? Number(resolved.height) : device === 'desktop' ? h : freeHeight(0, resolved._els)
          return <div key={device} data-hs-variant={_noFree ? undefined : device} style={{ width: '100%', display: device === 'desktop' ? 'block' : 'none', height: `${(deviceHeight / FREE_W) * 100}cqw` }} />
        })}
      </div>
      </div>
    </section>
  )
}
