const SAFE_TAGS = new Set(['strong', 'b', 'em', 'i', 'u', 's', 'strike', 'sub', 'sup', 'span', 'font', 'br'])
const COLOR = /^(?:#[0-9a-f]{3,8}|rgba?\([\d\s.,%+-]+\)|hsla?\([\d\s.,%+-]+\)|[a-z]{1,20})$/i
const FONT = /^[-\w\s,"']{1,120}$/

const attr = (source: string, name: string) => {
  const match = source.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'))
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? ''
}

const safeStyle = (source: string) => {
  const out: string[] = []
  for (const declaration of source.split(';')) {
    const at = declaration.indexOf(':')
    if (at < 1) continue
    const key = declaration.slice(0, at).trim().toLowerCase()
    const value = declaration.slice(at + 1).trim()
    if (!value || /[<>{}@\\]|url\s*\(|expression\s*\(/i.test(value)) continue
    if ((key === 'color' || key === 'background-color') && COLOR.test(value)) out.push(`${key}:${value}`)
    else if (key === 'font-size' && /^\d+(?:\.\d+)?px$/.test(value) && Number.parseFloat(value) >= 8 && Number.parseFloat(value) <= 200) out.push(`${key}:${value}`)
    else if (key === 'font-family' && FONT.test(value)) out.push(`${key}:${value}`)
    else if (key === 'font-weight' && /^(?:normal|bold|[1-9]00)$/.test(value)) out.push(`${key}:${value}`)
    else if (key === 'font-style' && /^(?:normal|italic)$/.test(value)) out.push(`${key}:${value}`)
    else if (key === 'text-decoration' && /^(?:none|underline|line-through|underline line-through)$/.test(value)) out.push(`${key}:${value}`)
  }
  return out.join(';')
}

/**
 * Rich text của canvas chỉ cho phép định dạng nội tuyến. Link, ảnh, script và mọi
 * event attribute đều bị loại để nội dung lưu từ editor an toàn khi render SSR.
 */
export function sanitizeRichText(input: unknown): string {
  if (typeof input !== 'string' || !input) return ''
  const withoutActiveContent = input
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|iframe|object|embed|svg|math)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
  return withoutActiveContent.replace(/<\/?([a-z0-9-]+)([^>]*)>/gi, (tag, rawName: string, rawAttrs: string) => {
    const closing = /^<\//.test(tag)
    const name = rawName.toLowerCase()
    if (!SAFE_TAGS.has(name)) return ''
    if (name === 'br') return closing ? '' : '<br>'
    const normalized = name === 'b' ? 'strong' : name === 'i' ? 'em' : name === 'strike' ? 's' : name === 'font' ? 'span' : name
    if (closing) return `</${normalized}>`
    if (name !== 'span' && name !== 'font') return `<${normalized}>`
    const styles = [safeStyle(attr(rawAttrs, 'style'))]
    const color = attr(rawAttrs, 'color')
    const face = attr(rawAttrs, 'face')
    if (COLOR.test(color)) styles.push(`color:${color}`)
    if (FONT.test(face)) styles.push(`font-family:${face}`)
    const clean = styles.filter(Boolean).join(';')
    return clean ? `<span style="${clean}">` : '<span>'
  })
}
