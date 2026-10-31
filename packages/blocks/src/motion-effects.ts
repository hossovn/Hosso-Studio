import { entranceKeyframes, normalizeScrollEffect } from './scroll-effects.ts'

export type EntrancePreset = 'none' | 'fade' | 'zoom' | 'bounce' | 'slide-up' | 'slide-down' | 'slide-left' | 'slide-right' | 'rotate-in' | 'pop' | 'reveal-left' | 'reveal-up' | 'text-lines' | 'text-words'
export type LoopPreset = 'none' | 'float' | 'pulse' | 'sway' | 'spin' | 'orbit' | 'ripple' | 'slow-zoom' | 'marquee'
export type MotionConfig = {
  entrance?: { preset: EntrancePreset; duration: number; delay: number }
  loop?: { preset: LoopPreset; duration: number; delay: number; iterations: number | 'infinite'; amount: number }
  disableOnMobile?: boolean
}

export const ENTRANCE_PRESETS = [
  { value: 'none', label: 'Không' }, { value: 'fade', label: 'Hiện dần' }, { value: 'zoom', label: 'Phóng nhẹ' },
  { value: 'bounce', label: 'Nảy' }, { value: 'slide-up', label: 'Trượt lên' }, { value: 'slide-down', label: 'Trượt xuống' },
  { value: 'slide-left', label: 'Trượt trái' }, { value: 'slide-right', label: 'Trượt phải' }, { value: 'rotate-in', label: 'Xoay vào' },
  { value: 'pop', label: 'Bật ra' }, { value: 'reveal-left', label: 'Mở từ trái' }, { value: 'reveal-up', label: 'Mở từ dưới' },
  { value: 'text-lines', label: 'Theo dòng' }, { value: 'text-words', label: 'Theo từ' },
] as const satisfies ReadonlyArray<{ value: EntrancePreset; label: string }>

export const LOOP_PRESETS = [
  { value: 'none', label: 'Không' }, { value: 'float', label: 'Trôi nhẹ' }, { value: 'pulse', label: 'Nhịp đập' },
  { value: 'sway', label: 'Đung đưa' }, { value: 'spin', label: 'Xoay' }, { value: 'orbit', label: 'Quỹ đạo' },
  { value: 'ripple', label: 'Gợn sóng' }, { value: 'slow-zoom', label: 'Phóng chậm' }, { value: 'marquee', label: 'Chữ chạy' },
] as const satisfies ReadonlyArray<{ value: LoopPreset; label: string }>

export const LOOP_AMOUNT: Record<LoopPreset, { default: number; min: number; max: number; unit: 'px' | '%' | 'deg' | '' }> = {
  none: { default: 0, min: 0, max: 0, unit: '' },
  float: { default: 12, min: 0, max: 100, unit: 'px' },
  pulse: { default: 5, min: 0, max: 100, unit: '%' },
  sway: { default: 6, min: 0, max: 45, unit: 'deg' },
  spin: { default: 0, min: 0, max: 0, unit: '' },
  orbit: { default: 48, min: 0, max: 300, unit: 'px' },
  ripple: { default: 8, min: 0, max: 100, unit: '%' },
  'slow-zoom': { default: 8, min: 0, max: 100, unit: '%' },
  marquee: { default: 0, min: 0, max: 0, unit: '' },
}

const textEntrances = ENTRANCE_PRESETS.filter(({ value }) => value !== 'text-lines' && value !== 'text-words')
const nonTextLoops = LOOP_PRESETS.filter(({ value }) => value !== 'marquee')

export function supportedMotionPresets(type: string): { entrance: readonly { value: EntrancePreset; label: string }[]; loop: readonly { value: LoopPreset; label: string }[] } {
  return type === 'heading' || type === 'text'
    ? { entrance: ENTRANCE_PRESETS, loop: LOOP_PRESETS }
    : { entrance: textEntrances, loop: nonTextLoops }
}

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const own = (value: Record<string, unknown>, key: string) => Object.prototype.hasOwnProperty.call(value, key)
const numeric = (value: unknown, fallback: number, min: number, max: number) =>
  Math.min(max, Math.max(min, typeof value === 'number' && Number.isFinite(value) ? value : fallback))
const entrancePreset = (value: unknown): value is EntrancePreset => ENTRANCE_PRESETS.some((entry) => entry.value === value)
const loopPreset = (value: unknown): value is LoopPreset => LOOP_PRESETS.some((entry) => entry.value === value)

export function normalizeMotionConfig(value: unknown): MotionConfig | null {
  if (!record(value)) return null
  const hasEntrance = own(value, 'entrance')
  const hasLoop = own(value, 'loop')
  if (!hasEntrance && !hasLoop) return null
  const result: MotionConfig = { disableOnMobile: own(value, 'disableOnMobile') && value.disableOnMobile === true }
  if (hasEntrance) {
    const entrance = value.entrance
    if (!record(entrance) || !own(entrance, 'preset') || !entrancePreset(entrance.preset)) return null
    result.entrance = {
      preset: entrance.preset,
      duration: numeric(own(entrance, 'duration') ? entrance.duration : undefined, 600, 100, 5000),
      delay: numeric(own(entrance, 'delay') ? entrance.delay : undefined, 0, 0, 5000),
    }
  }
  if (hasLoop) {
    const loop = value.loop
    if (!record(loop) || !own(loop, 'preset') || !loopPreset(loop.preset)) return null
    const amount = LOOP_AMOUNT[loop.preset]
    const iterations = own(loop, 'iterations') ? loop.iterations : undefined
    result.loop = {
      preset: loop.preset,
      duration: numeric(own(loop, 'duration') ? loop.duration : undefined, 2000, 500, 30000),
      delay: numeric(own(loop, 'delay') ? loop.delay : undefined, 0, 0, 5000),
      iterations: iterations === 'infinite' ? 'infinite' : Number.isInteger(iterations) ? numeric(iterations, 3, 1, 20) : 3,
      amount: numeric(own(loop, 'amount') ? loop.amount : undefined, amount.default, amount.min, amount.max),
    }
  }
  return result
}

export function resolveMotionConfig(props: Record<string, unknown>): MotionConfig | null {
  if (!record(props)) return null
  const motion = own(props, '_motion') ? props._motion : undefined
  if (motion !== undefined && !record(motion)) return null
  const config = motion === undefined ? null : normalizeMotionConfig(motion)
  if (motion !== undefined && record(motion) && (own(motion, 'entrance') || own(motion, 'loop')) && !config) return null
  if (record(motion) && own(motion, 'entrance')) return config
  const scroll = own(props, '_scroll') ? props._scroll : undefined
  if (!record(scroll) || !own(scroll, 'mode') || scroll.mode !== 'entrance') return config
  const legacy = normalizeScrollEffect({
    mode: scroll.mode,
    entrance: own(scroll, 'entrance') ? scroll.entrance : undefined,
    duration: own(scroll, 'duration') ? scroll.duration : undefined,
    delay: own(scroll, 'delay') ? scroll.delay : undefined,
    disableOnMobile: own(scroll, 'disableOnMobile') ? scroll.disableOnMobile : undefined,
  })
  return legacy ? {
    ...config,
    entrance: { preset: legacy.entrance, duration: legacy.duration, delay: legacy.delay },
    disableOnMobile: config?.disableOnMobile ?? legacy.disableOnMobile,
  } : config
}

export function motionKeyframes(kind: 'entrance' | 'loop', preset: EntrancePreset | LoopPreset, amount?: number): Keyframe[] {
  if (kind === 'entrance') {
    if (!entrancePreset(preset) || preset === 'none') return []
    if (preset === 'fade' || preset === 'zoom' || preset === 'bounce') return entranceKeyframes(preset)
    if (preset.startsWith('slide-')) {
      const from = preset === 'slide-up' ? 'translateY(40px)' : preset === 'slide-down' ? 'translateY(-40px)' : preset === 'slide-left' ? 'translateX(40px)' : 'translateX(-40px)'
      return [{ opacity: 0, transform: from }, { opacity: 1, transform: 'translate(0,0)' }]
    }
    if (preset === 'rotate-in') return [{ opacity: 0, transform: 'rotate(-12deg) scale(0.9)' }, { opacity: 1, transform: 'rotate(0deg) scale(1)' }]
    if (preset === 'pop') return [{ opacity: 0, transform: 'scale(0.7)' }, { opacity: 1, transform: 'scale(1.05)', offset: 0.7 }, { opacity: 1, transform: 'scale(1)' }]
    if (preset === 'reveal-left') return [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }]
    if (preset === 'reveal-up') return [{ clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0 0 0 0)' }]
    return [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'translateY(0)' }]
  }
  if (!loopPreset(preset) || preset === 'none') return []
  const spec = LOOP_AMOUNT[preset]
  const a = numeric(amount, spec.default, spec.min, spec.max)
  if (preset === 'float') return [{ transform: 'translateY(0)' }, { transform: `translateY(-${a}px)` }, { transform: 'translateY(0)' }]
  if (preset === 'pulse') return [{ transform: 'scale(1)' }, { transform: `scale(${1 + a / 100})` }, { transform: 'scale(1)' }]
  if (preset === 'sway') return [{ transform: 'rotate(0deg)' }, { transform: `rotate(${a}deg)` }, { transform: `rotate(-${a}deg)` }, { transform: 'rotate(0deg)' }]
  if (preset === 'spin') return [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }]
  if (preset === 'orbit') return [0, 90, 180, 270, 360].map((angle) => ({ transform: `rotate(${angle}deg) translateX(${a}px) rotate(-${angle}deg)` }))
  if (preset === 'ripple') return [{ transform: 'scale(1)', opacity: 1 }, { transform: `scale(${1 + a / 100})`, opacity: 0.45 }, { transform: 'scale(1)', opacity: 1 }]
  if (preset === 'slow-zoom') return [{ transform: 'scale(1)' }, { transform: `scale(${1 + a / 100})` }, { transform: 'scale(1)' }]
  return [{ transform: 'translateX(0)' }, { transform: 'translateX(-50%)' }]
}

export function splitMotionText(text: string, mode: 'lines' | 'words'): string[] {
  if (!text) return []
  return mode === 'words' ? text.match(/\s+|[^\s]+/gu) ?? [] : text.split(/\r\n|\r|\n/)
}
