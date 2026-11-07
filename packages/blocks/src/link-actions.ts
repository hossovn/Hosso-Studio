export type LinkAction = 'none' | 'url' | 'popup' | 'section' | 'phone' | 'email' | 'state' | 'popover'
export type ParsedLinkAction = { type: LinkAction; value: string; frameId?: string; variantId?: string }

const SAFE_ID = /^[a-zA-Z0-9_-]{1,64}$/

export const sectionAnchor = (id: string) => 'hs-section-' + encodeURIComponent(id)

export function readLinkAction(href: unknown): ParsedLinkAction {
  const value = typeof href === 'string' ? href : ''
  if (!value || value === '#') return { type: 'none', value: '' }
  if (value.startsWith('#state:')) {
    const raw = value.slice(7)
    const parts = raw.split(':')
    if (parts.length === 2 && SAFE_ID.test(parts[0]) && SAFE_ID.test(parts[1])) {
      return { type: 'state', value: raw, frameId: parts[0], variantId: parts[1] }
    }
  }
  if (value.startsWith('#popover:')) {
    const frameId = value.slice(9)
    if (SAFE_ID.test(frameId)) return { type: 'popover', value: frameId, frameId }
  }
  if (value.startsWith('#popup:')) {
    const popupId = value.slice(7)
    if (SAFE_ID.test(popupId)) return { type: 'popup', value: popupId }
  }
  if (value.startsWith('#hs-section-')) {
    try { return { type: 'section', value: decodeURIComponent(value.slice(12)) } } catch {}
  }
  if (value.startsWith('tel:')) return { type: 'phone', value: value.slice(4) }
  if (value.startsWith('mailto:')) return { type: 'email', value: value.slice(7) }
  return { type: 'url', value }
}

export function actionHref(type: LinkAction, input: string): string {
  const value = input.trim()
  if (type === 'none' || !value) return ''
  if (type === 'state') {
    const parts = value.split(':')
    return parts.length === 2 && SAFE_ID.test(parts[0]) && SAFE_ID.test(parts[1]) ? `#state:${parts[0]}:${parts[1]}` : ''
  }
  if (type === 'popover') return SAFE_ID.test(value) ? '#popover:' + value : ''
  if (type === 'popup') return SAFE_ID.test(value) ? '#popup:' + value : ''
  if (type === 'section') return '#' + sectionAnchor(value)
  if (type === 'phone') {
    const number = value.replace(/[^+\d*#,;]/g, '')
    return /\d/.test(number) ? 'tel:' + number : ''
  }
  if (type === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? 'mailto:' + value : ''
  return /^(https?:\/\/|\/(?!\/)|#)/i.test(value) ? value : ''
}
