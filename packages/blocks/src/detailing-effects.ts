const finite = (value: unknown, fallback: number, min: number, max: number) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback

export const comparisonPosition = (value: unknown) => finite(value, 50, 0, 100)

/** Existing number blocks retain their literal value unless count-up is enabled. */
export function countUpSettings(props: Record<string, any>) {
  const decimals = Math.round(finite(props.countDecimals, 0, 0, 6))
  const locale = props.countLocale === 'en-US' ? 'en-US' : 'vi-VN'
  const raw = String(props.value ?? '').trim()
  const parsed = Number(locale === 'vi-VN' ? raw.replaceAll('.', '').replace(',', '.') : raw.replaceAll(',', ''))
  return {
    from: finite(props.countFrom, 0, -1e12, 1e12),
    to: finite(props.countTo, Number.isFinite(parsed) ? Math.min(1e12, Math.max(-1e12, parsed)) : 0, -1e12, 1e12),
    duration: finite(props.countDuration, 1600, 100, 10000),
    decimals,
    locale,
    grouping: props.countGrouping !== false,
  }
}

export function formatCount(value: number, settings: ReturnType<typeof countUpSettings>) {
  return new Intl.NumberFormat(settings.locale, {
    minimumFractionDigits: settings.decimals,
    maximumFractionDigits: settings.decimals,
    useGrouping: settings.grouping,
  }).format(Object.is(value, -0) ? 0 : value)
}
