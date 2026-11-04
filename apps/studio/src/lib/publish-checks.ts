import { pageForDevice } from '../../../../packages/blocks/src/responsive-layout.ts'

export type PublishIssue = { severity: 'error' | 'warning'; code: string; message: string; block?: string; element?: string; device?: string; path?: string }
type Content = { root?: any; content?: { type: string; props: Record<string, any> }[] }
type CheckOptions = { paths: Set<string>; blockTypes: Set<string>; locale: string; locales: string[]; lang?: string; seo?: boolean }

const COPY = {
  structure: ['Cấu trúc trang không hợp lệ.', 'Invalid page structure.'],
  duplicate: ['ID phần tử bị trùng.', 'Duplicate element ID.'],
  missingBlock: ['Khối chưa có renderer hoặc plugin đã bị gỡ.', 'Block renderer is missing or its plugin was removed.'],
  geometry: ['Vị trí hoặc kích thước phần tử không hợp lệ.', 'Invalid element position or size.'],
  overflow: ['Phần tử nằm ngoài chiều rộng hoặc chiều cao của phần.', 'Element extends beyond its section bounds.'],
  imageAlt: ['Ảnh chưa có mô tả thay thế.', 'Image has no alternative text.'],
  imageSource: ['Ảnh chưa được chọn.', 'No image has been selected.'],
  placeholder: ['Còn nội dung mẫu cần thay.', 'Sample content still needs replacing.'],
  link: ['Đường dẫn nội bộ chưa tìm thấy trang tương ứng.', 'Internal link has no matching page.'],
  emptyLink: ['Liên kết chưa có đích đến.', 'Link has no destination.'],
  unsafeLink: ['Đường dẫn dùng giao thức không được hỗ trợ.', 'Link uses an unsupported protocol.'],
  heading: ['Trang chưa có tiêu đề H1 hoặc có nhiều H1.', 'Page has no H1 heading or has multiple H1 headings.'],
  seoDescription: ['Trang chưa có mô tả SEO.', 'Page has no SEO description.'],
  seoTitle: ['Tiêu đề SEO dài hơn 60 ký tự.', 'SEO title exceeds 60 characters.'],
  templateDraft: ['Ô mẫu đang sửa chưa được áp dụng cho danh sách dữ liệu.', 'A repeater template edit has not been applied.'],
} as const

export function inspectPage(doc: Record<string, any>, options: CheckOptions): PublishIssue[] {
  const issues: PublishIssue[] = []
  const add = (code: keyof typeof COPY, where: Partial<PublishIssue> = {}, severity: PublishIssue['severity'] = 'warning') => issues.push({ severity, code, message: COPY[code][options.lang?.startsWith('en') ? 1 : 0], ...where })
  if (doc.writingMode === 'article') {
    if (!Array.isArray(doc.articleBody?.root?.children) || !doc.articleBody.root.children.length) add('structure', {}, 'error')
    if (!String(doc.excerpt || '').trim()) add('seoDescription')
    if (String(doc.seo?.title || doc.title || '').length > 60) add('seoTitle')
    return issues
  }
  const data: Content = doc.content ?? { content: [] }
  if (!data || typeof data !== 'object' || !Array.isArray(data.content)) { add('structure', {}, 'error'); return issues }
  const ids = new Set<string>()
  const claim = (id: unknown, where: Partial<PublishIssue>) => {
    if (typeof id !== 'string' || !id) { add('structure', where, 'error'); return }
    if (ids.has(id)) add('duplicate', where, 'error')
    ids.add(id)
  }
  const checkLinks = (value: unknown, where: Partial<PublishIssue>, key = '') => {
    if (typeof value === 'string') {
      if (/^(text|html|body|title|email)$/i.test(key) && /hello@example\.com|lorem ipsum|tiêu đề của bạn|nhấp đúp để sửa|your (?:company|brand)|sample (?:text|brand)/i.test(value)) add('placeholder', where)
      if (key === 'html') for (const match of value.matchAll(/href\s*=\s*["']([^"']*)["']/gi)) checkLinks(match[1], where, 'href')
      if (!/^(href|link|buttonHref|ctaHref|ctaLink)$/i.test(key)) return
      if (!value.trim() || value === '#') { add('emptyLink', where); return }
      if (/^(?:https?:\/\/|mailto:|tel:|#)/i.test(value)) return
      if (!/^\/(?!\/)/.test(value)) { add('unsafeLink', where, 'error'); return }
      let path: string
      try { path = decodeURI(value.split(/[?#]/)[0]).replace(/\/$/, '') || '/' } catch { add('link', where); return }
      for (const locale of options.locales) if (path.startsWith('/' + locale + '/')) path = path.slice(locale.length + 1)
      if (options.locales.some((locale) => path === '/' + locale)) path = '/'
      if (!options.paths.has(path)) add('link', { ...where, path })
      return
    }
    if (Array.isArray(value)) value.forEach((item) => checkLinks(item, where, key))
    else if (value && typeof value === 'object') for (const [name, item] of Object.entries(value)) {
      if (!['_els', 'elements', '_responsive', 'responsive', 'data'].includes(name)) checkLinks(item, where, name)
    }
  }
  let h1 = 0
  for (const block of data.content) {
    if (!block || typeof block.type !== 'string' || !block.props || typeof block.props !== 'object') { add('structure', {}, 'error'); continue }
    const where = { block: block.props.id }
    if (block.props._repeatTarget) add('templateDraft', where, 'error')
    claim(block.props.id, where)
    if (!options.blockTypes.has(block.type)) add('missingBlock', where, 'error')
    checkLinks(block.props, where)
    if (block.type === 'Hero' && block.props.title) h1++
    const list = block.props._els ?? block.props.elements ?? []
    if (!Array.isArray(list)) { add('structure', where, 'error'); continue }
    for (const el of list) {
      if (!el?.props) { add('structure', where, 'error'); continue }
      const at = { ...where, element: el.id }
      if (el.props._repeatTarget) add('templateDraft', at, 'error')
      claim(el.id, at)
      if (el.type === 'heading' && Number(el.props.level) === 1) h1++
      if (el.type === 'image') { if (!el.props.src) add('imageSource', at); if (!String(el.props.alt ?? '').trim()) add('imageAlt', at) }
      checkLinks(el.props, at)
    }
  }
  const floating = data.root?.props?._float ?? []
  if (!Array.isArray(floating)) add('structure', { block: '@page' }, 'error')
  for (const el of Array.isArray(floating) ? floating : []) {
    if (!el?.props) { add('structure', { block: '@page' }, 'error'); continue }
    claim(el.id, { block: '@page', element: el.id })
    checkLinks(el.props, { block: '@page', element: el.id })
  }
  const validBlocks: { type: string; props: Record<string, any> }[] = data.content.filter((block) => block?.props && Array.isArray(block.props._els ?? block.props.elements ?? [])).map((block) => ({ ...block, props: { ...block.props, _els: (block.props._els ?? block.props.elements ?? []).filter((el: any) => el?.props) } }))
  if (Array.isArray(floating)) validBlocks.push({ type: 'Floating', props: { id: '@page', _els: floating.filter((el: any) => el?.props) } })
  for (const device of ['desktop', 'tablet', 'mobile'] as const) {
    const resolved = pageForDevice({ content: validBlocks }, device)
    for (const block of resolved.content) for (const el of block.props._els ?? block.props.elements ?? []) {
      if (!el?.props || el.props._hidden || el.props._hide === ({ desktop: 'd', tablet: 't', mobile: 'm' }[device])) continue
      const where = { block: block.props.id, element: el.id, device }
      if (![el.x, el.y, el.w, el.h].every(Number.isFinite) || el.w <= 0 || el.h <= 0) add('geometry', where, 'error')
      else if (el.x < 0 || el.x + el.w > 1201 || el.y < 0 || (block.type === 'FreeCanvas' && Number(block.props.height) > 0 && el.y + el.h > Number(block.props.height) + 1)) add('overflow', where)
    }
  }
  if (options.seo !== false) {
    if (h1 !== 1) add('heading')
    if (!String(doc.description ?? doc.excerpt ?? '').trim()) add('seoDescription')
    if (String(doc.seo?.title || doc.title || '').length > 60) add('seoTitle')
  }
  return issues
}
