import { widgetPartScope } from './widget-parts.ts'

export type ElementState = 'normal' | 'hover' | 'focus' | 'active'
export type ElementDevice = 'desktop' | 'tablet' | 'mobile'

export type ElementStateStyle = {
  color?: string
  backgroundColor?: string
  borderColor?: string
  boxShadow?: string
  opacity?: number
  translateX?: number
  translateY?: number
  scale?: number
  transitionMs?: number
}

type StateStore = Partial<Record<ElementState, Partial<Record<ElementDevice, ElementStateStyle>>>>
const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i
const SHADOW = /^(-?\d{1,3})px (-?\d{1,3})px (\d{1,3})px (-?\d{1,3})px rgba\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3}),\s*(0(?:\.\d+)?|1(?:\.0+)?)\)$/
const DEVICE_ORDER: ElementDevice[] = ['desktop', 'tablet', 'mobile']
const DEVICE_QUERY: Record<Exclude<ElementDevice, 'desktop'>, string> = { tablet: '@media(max-width:1024px)', mobile: '@media(max-width:600px)' }
const STATE_SELECTOR: Record<Exclude<ElementState, 'normal'>, string> = { hover: ':hover', focus: ':focus-visible', active: ':active' }

const validNumber = (value: unknown, min: number, max: number) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max ? value : undefined
const sanitize = (style: unknown): ElementStateStyle => {
  if (!style || typeof style !== 'object' || Array.isArray(style)) return {}
  const input = style as Record<string, unknown>
  const result: ElementStateStyle = {}
  for (const key of ['color', 'backgroundColor', 'borderColor'] as const) if (typeof input[key] === 'string' && HEX.test(input[key])) result[key] = input[key]
  if (typeof input.boxShadow === 'string') {
    const match = SHADOW.exec(input.boxShadow)
    if (input.boxShadow === 'none' || (match && match.slice(5, 8).every((v) => Number(v) <= 255))) result.boxShadow = input.boxShadow
  }
  for (const key of ['translateX', 'translateY'] as const) {
    const value = validNumber(input[key], -1000, 1000)
    if (value !== undefined) result[key] = value
  }
  const opacity = validNumber(input.opacity, 0, 1)
  if (opacity !== undefined) result.opacity = opacity
  const scale = validNumber(input.scale, 0.1, 4)
  if (scale !== undefined) result.scale = scale
  const transitionMs = validNumber(input.transitionMs, 0, 5000)
  if (transitionMs !== undefined) result.transitionMs = transitionMs
  return result
}

const statesOf = (props: Record<string, unknown>): StateStore => {
  const states = props._states
  return states && typeof states === 'object' && !Array.isArray(states) ? states as StateStore : {}
}

export function readElementState(props: Record<string, unknown>, state: ElementState, device: ElementDevice): ElementStateStyle {
  const store = statesOf(props)[state]
  if (!store) return {}
  const end = DEVICE_ORDER.indexOf(device)
  return DEVICE_ORDER.slice(0, end + 1).reduce((result, current) => ({ ...result, ...sanitize(store[current]) }), {})
}

export function writeElementState(props: Record<string, unknown>, state: ElementState, device: ElementDevice, patch: Partial<ElementStateStyle>): Record<string, unknown> {
  const next: Record<string, unknown> = { ...props, _states: { ...statesOf(props) } }
  const states = next._states as StateStore
  const current = sanitize(states[state]?.[device])
  const merged = { ...current, ...patch }
  const clean = sanitize(merged)
  for (const key of Object.keys(patch) as (keyof ElementStateStyle)[]) if (patch[key] === undefined) delete clean[key]
  const stateNext = { ...(states[state] ?? {}) }
  if (Object.keys(clean).length) stateNext[device] = clean
  else delete stateNext[device]
  if (Object.keys(stateNext).length) states[state] = stateNext
  else delete states[state]
  if (!Object.keys(states).length) delete next._states
  return next
}

export function elementStateCss(scope: string, state: ElementState, device: ElementDevice, style: unknown): string {
  if (!/^[.#][a-z][a-z0-9_-]*$/i.test(scope)) return ''
  const clean = sanitize(style)
  const rules: string[] = []
  if (clean.backgroundColor) rules.push('background-image:none!important')
  for (const key of ['color', 'backgroundColor', 'borderColor'] as const) if (clean[key]) rules.push(`${key.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())}:${clean[key]}!important`)
  if (clean.boxShadow) rules.push(`box-shadow:${clean.boxShadow}!important`)
  if (clean.opacity !== undefined) rules.push(`opacity:${clean.opacity}!important`)
  if (clean.translateX !== undefined || clean.translateY !== undefined || clean.scale !== undefined) {
    const x = clean.translateX ?? 0, y = clean.translateY ?? 0, scale = clean.scale ?? 1
    rules.push(`transform:translate(${x}px,${y}px) scale(${scale})!important`)
  }
  if (clean.transitionMs !== undefined) rules.push(`transition:color ${clean.transitionMs}ms,background-color ${clean.transitionMs}ms,border-color ${clean.transitionMs}ms,box-shadow ${clean.transitionMs}ms,opacity ${clean.transitionMs}ms,transform ${clean.transitionMs}ms`)
  if (!rules.length) return ''
  const selector = state === 'normal' ? scope : `${scope}${STATE_SELECTOR[state]},${scope}[data-hs-state=${state}]`
  const css = `${selector}{${rules.join(';')}}`
  return device === 'desktop' ? css : `${DEVICE_QUERY[device as Exclude<ElementDevice, 'desktop'>]}{${css}}`
}

export const elementStateScope = (id: string) => 'hs-state-' + widgetPartScope(id)

export function elementStatesCss(id: string, props: Record<string, unknown>): string {
  if (!props._states) return ''
  const scope = '.' + elementStateScope(id)
  const css = DEVICE_ORDER.flatMap((device) => {
    const normal = readElementState(props, 'normal', device)
    const duration = normal.transitionMs ?? readElementState(props, 'hover', device).transitionMs
    return (['normal', 'hover', 'focus', 'active'] as const).map((state) => {
      const style = state === 'normal' ? { ...normal, transitionMs: duration } : readElementState(props, state, device)
      if (state !== 'normal' && (style.translateX !== undefined || style.translateY !== undefined || style.scale !== undefined)) {
        return elementStateCss(scope, state, device, { translateX: normal.translateX, translateY: normal.translateY, scale: normal.scale, ...style })
      }
      return elementStateCss(scope, state, device, style)
    })
  }).filter(Boolean).join('\n')
  return css ? css + `\n@media(prefers-reduced-motion:reduce){${scope},${scope}:hover,${scope}:focus-visible,${scope}:active,${scope}[data-hs-state]{transition:none!important;animation:none!important;transform:none!important}}` : ''
}
