export type Attribution = Partial<Record<'pagePath' | 'referrer' | 'utm_source' | 'utm_medium' | 'utm_campaign' | 'utm_content' | 'utm_term', string>>
export const CONSENT_KEY = 'hosso-consent-v1'
export type Consent = { analytics: boolean; marketing: boolean }
export function allowsServerAnalytics(headers: Headers): boolean {
  return headers.get('dnt') !== '1' && headers.get('sec-gpc') !== '1' && /(?:^|;\s*)hosso_consent=analytics(?:;|$)/.test(headers.get('cookie') || '')
}
export function privacySignal(): boolean {
  return typeof navigator !== 'undefined' && (navigator.doNotTrack === '1' || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true)
}
export function readConsent(): Consent | null {
  try {
    const value = JSON.parse(localStorage.getItem(CONSENT_KEY) || 'null')
    return value && typeof value.analytics === 'boolean' && typeof value.marketing === 'boolean' ? value : null
  } catch { return null }
}
export function cleanAttribution(value: unknown): Attribution {
  if (!value || typeof value !== 'object') return {}
  const input = value as Record<string, unknown>, result: Attribution = {}
  if (typeof input.pagePath === 'string' && /^\/(?!\/)/.test(input.pagePath)) result.pagePath = input.pagePath.split(/[?#]/)[0].slice(0, 300)
  if (typeof input.referrer === 'string') { try { const url = new URL(input.referrer); if (/^https?:$/.test(url.protocol)) result.referrer = url.origin } catch {} }
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const) if (typeof input[key] === 'string') result[key] = input[key].replace(/[\x00-\x1f\x7f]/g, '').slice(0, 120)
  return result
}
export function currentAttribution(): Attribution {
  if (typeof window === 'undefined') return {}
  const basic = { pagePath: location.pathname }
  if (!readConsent()?.analytics || privacySignal()) return basic
  const current = cleanAttribution({ ...basic, referrer: document.referrer, ...Object.fromEntries(new URLSearchParams(location.search)) })
  try {
    const previous = cleanAttribution(JSON.parse(sessionStorage.getItem('hosso-attribution') || '{}'))
    const merged = current.utm_source || current.utm_campaign ? current : { ...previous, ...basic }
    sessionStorage.setItem('hosso-attribution', JSON.stringify(merged))
    return merged
  } catch { return current }
}

export function cleanExperiments(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(Object.entries(value).filter(([key, variant]) => /^[a-zA-Z0-9_-]{1,100}$/.test(key) && (variant === 'a' || variant === 'b')).slice(0, 10))
}

export function currentExperiments(): Record<string, string> {
  if (typeof window === 'undefined' || !readConsent()?.analytics || privacySignal()) return {}
  try { return cleanExperiments(JSON.parse(sessionStorage.getItem('hosso-experiments') || '{}')) } catch { return {} }
}
