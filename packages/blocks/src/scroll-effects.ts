export type ScrollEffectConfig = {
  mode: 'parallax' | 'pin' | 'progress'
  distance: number
  pinTop: number
  start: number
  end: number
  fromX: number
  toX: number
  fromY: number
  toY: number
  fromScale: number
  toScale: number
  fromOpacity: number
  toOpacity: number
  disableOnMobile: boolean
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const number = (value: unknown, fallback: number, min: number, max: number) => clamp(typeof value === 'number' && Number.isFinite(value) ? value : fallback, min, max)

export function normalizeScrollEffect(value: unknown): ScrollEffectConfig | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const p = value as Record<string, unknown>
  if (p.mode !== 'parallax' && p.mode !== 'pin' && p.mode !== 'progress') return null
  const start = number(p.start, 0, 0, 99)
  return {
    mode: p.mode, distance: number(p.distance, 160, -600, 600), pinTop: number(p.pinTop, 24, 0, 400),
    start, end: number(p.end, p.mode === 'progress' ? 60 : 100, start + 1, 100),
    fromX: number(p.fromX, 0, -1000, 1000), toX: number(p.toX, 0, -1000, 1000),
    fromY: number(p.fromY, 80, -1000, 1000), toY: number(p.toY, 0, -1000, 1000),
    fromScale: number(p.fromScale, 1, 0.25, 3), toScale: number(p.toScale, 1, 0.25, 3),
    fromOpacity: number(p.fromOpacity, 1, 0, 1), toOpacity: number(p.toOpacity, 1, 0, 1),
    disableOnMobile: p.disableOnMobile === true,
  }
}

export type ScrollGeometry = { top: number; height: number; boundaryBottom: number; viewportTop: number; viewportHeight: number }

export function scrollEffectFrame(effect: ScrollEffectConfig, box: ScrollGeometry) {
  const identity = { x: 0, y: 0, scale: 1, opacity: 1 }
  if (!Object.values(box).every(Number.isFinite) || box.viewportHeight <= 0 || box.height <= 0) return identity
  if (effect.mode === 'pin') {
    if (box.height > box.viewportHeight - effect.pinTop) return identity
    const available = Math.max(0, box.boundaryBottom - box.top - box.height)
    return { ...identity, y: clamp(box.viewportTop + effect.pinTop - box.top, 0, available) }
  }
  const travel = (box.viewportTop + box.viewportHeight - box.top) / (box.viewportHeight + box.height) * 100
  const progress = clamp((travel - effect.start) / (effect.end - effect.start), 0, 1)
  if (effect.mode === 'parallax') return { ...identity, y: (progress - 0.5) * effect.distance }
  const mix = (from: number, to: number) => from + (to - from) * progress
  return { x: mix(effect.fromX, effect.toX), y: mix(effect.fromY, effect.toY), scale: mix(effect.fromScale, effect.toScale), opacity: mix(effect.fromOpacity, effect.toOpacity) }
}
