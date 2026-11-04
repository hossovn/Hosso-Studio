export type LinkAction = 'none' | 'url' | 'popup' | 'section' | 'phone' | 'email'
export const sectionAnchor = (id: string) => 'hs-section-' + encodeURIComponent(id)
export function readLinkAction(href: unknown): { type: LinkAction; value: string } {
  const value = typeof href === 'string' ? href : ''
  if (!value || value === '#') return { type: 'none', value: '' }
  if (value.startsWith('#popup:')) return { type: 'popup', value: value.slice(7) }
  if (value.startsWith('#hs-section-')) { try { return { type: 'section', value: decodeURIComponent(value.slice(12)) } } catch {} }
  if (value.startsWith('tel:')) return { type: 'phone', value: value.slice(4) }
  if (value.startsWith('mailto:')) return { type: 'email', value: value.slice(7) }
  return { type: 'url', value }
}
export function actionHref(type: LinkAction, input: string): string {
  const value = input.trim()
  if (type === 'none' || !value) return ''
  if (type === 'popup') return /^[a-zA-Z0-9_-]+$/.test(value) ? '#popup:' + value : ''
  if (type === 'section') return '#' + sectionAnchor(value)
  if (type === 'phone') { const number = value.replace(/[^+\d*#,;]/g, ''); return /\d/.test(number) ? 'tel:' + number : '' }
  if (type === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? 'mailto:' + value : ''
  return /^(https?:\/\/|\/(?!\/)|#)/i.test(value) ? value : ''
}
