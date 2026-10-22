export function guardCanvasEvent(event: Event, preview: boolean) {
  const target = event.target as Element | null
  if (!target?.closest || target.closest('[data-editor-control], [data-editor-interactive="true"], [contenteditable]')) return
  const link = target.closest('a[href]') as HTMLAnchorElement | null
  const control = target.closest('button, input, select, textarea, [role="button"]')
  if (event.type !== 'submit' && !link && (preview || !control)) return
  if (preview && link?.getAttribute('href')?.startsWith('#')) return
  event.preventDefault()
  event.stopImmediatePropagation()
  if (preview && link && event.type === 'click') {
    const view = link.ownerDocument.defaultView
    try {
      const url = new URL(link.getAttribute('href') || '', view?.parent.location.href)
      if (['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol)) view?.parent.open(url.href, '_blank', 'noopener,noreferrer')
    } catch { /* Ignore malformed URLs from page content. */ }
  }
}
