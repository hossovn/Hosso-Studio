export function kilnFramePolicy(origin: string | undefined): string {
  const self = "frame-ancestors 'self'"
  if (!origin) return self
  try {
    const url = new URL(origin)
    if (!['https:', 'http:'].includes(url.protocol) || url.origin !== origin || url.username || url.password) return self
    return `${self} ${origin}`
  } catch { return self }
}
