import assert from 'node:assert/strict'
import { LOOP_AMOUNT, normalizeMotionConfig, resolveMotionConfig, motionKeyframes, splitMotionText, supportedMotionPresets } from '../packages/blocks/src/motion-effects.ts'

assert.equal(normalizeMotionConfig(null), null)
assert.equal(normalizeMotionConfig({ entrance: { preset: 'invalid' } }), null)
assert.equal(normalizeMotionConfig({ loop: { preset: 'invalid' } }), null)
assert.deepEqual(normalizeMotionConfig({ entrance: { preset: 'fade' }, loop: { preset: 'float' } }), {
  entrance: { preset: 'fade', duration: 600, delay: 0 },
  loop: { preset: 'float', duration: 2000, delay: 0, iterations: 3, amount: 12 },
  disableOnMobile: false,
})
assert.deepEqual(normalizeMotionConfig({ entrance: { preset: 'zoom', duration: 4, delay: 9000 }, loop: { preset: 'sway', duration: 99999, delay: -3, iterations: 99, amount: 1000 } }), {
  entrance: { preset: 'zoom', duration: 100, delay: 5000 },
  loop: { preset: 'sway', duration: 30000, delay: 0, iterations: 20, amount: 45 },
  disableOnMobile: false,
})
assert.equal(normalizeMotionConfig({ entrance: { preset: 'fade' }, loop: { preset: 'pulse', iterations: 2.5 } }).loop.iterations, 3)
assert.equal(normalizeMotionConfig({ loop: { preset: 'spin', iterations: 'infinite', amount: 40 } }).loop.amount, 0)
assert.equal(normalizeMotionConfig({ entrance: { preset: 'none' } }).entrance.preset, 'none')
assert.equal(normalizeMotionConfig(Object.create({ entrance: { preset: 'fade' } })), null)
assert.equal(LOOP_AMOUNT.orbit.unit, 'px')
assert.equal(LOOP_AMOUNT.orbit.default, 48)
assert.equal(LOOP_AMOUNT.float.default, 12)
assert.equal(supportedMotionPresets('heading').entrance.at(-1).value, 'text-words')
assert.equal(supportedMotionPresets('image').entrance.some(({ value }) => value === 'text-words'), false)
assert.equal(supportedMotionPresets('image').loop.some(({ value }) => value === 'marquee'), false)

const legacy = { _scroll: { mode: 'entrance', entrance: 'bounce', duration: 850, delay: 30 } }
assert.deepEqual(resolveMotionConfig(legacy).entrance, { preset: 'bounce', duration: 850, delay: 30 })
assert.deepEqual(resolveMotionConfig({ ...legacy, _motion: { entrance: { preset: 'none' } } }).entrance, { preset: 'none', duration: 600, delay: 0 })
assert.deepEqual(resolveMotionConfig({ ...legacy, _motion: { loop: { preset: 'float' } } }).entrance, { preset: 'bounce', duration: 850, delay: 30 })
assert.equal(resolveMotionConfig({ _scroll: { ...legacy._scroll, disableOnMobile: true } }).disableOnMobile, true)
assert.equal(resolveMotionConfig({ ...legacy, _motion: { entrance: { preset: 'bad' } } }), null)
assert.equal(resolveMotionConfig({ _scroll: { mode: 'parallax' } }), null)
assert.equal(resolveMotionConfig(Object.create({ _motion: { entrance: { preset: 'fade' } } })), null)

assert.deepEqual(motionKeyframes('entrance', 'fade'), [{ opacity: 0 }, { opacity: 1 }])
assert.deepEqual(motionKeyframes('entrance', 'bounce').map((frame) => frame.offset), [0, 0.6, 0.8, 1])
assert.deepEqual(motionKeyframes('entrance', 'bad'), [])
assert.deepEqual(motionKeyframes('loop', 'bad'), [])
for (const preset of ['float', 'pulse', 'sway', 'spin', 'orbit', 'ripple', 'slow-zoom', 'marquee']) {
  const frames = motionKeyframes('loop', preset)
  assert.ok(frames.length > 1, preset)
  if (preset !== 'marquee' && preset !== 'spin' && preset !== 'orbit') assert.deepEqual(frames[0], frames.at(-1), preset)
}
assert.equal(motionKeyframes('loop', 'spin').at(-1).transform, 'rotate(360deg)')
assert.deepEqual(motionKeyframes('loop', 'orbit', 48).map(({ transform }) => transform), [
  'rotate(0deg) translateX(48px) rotate(-0deg)',
  'rotate(90deg) translateX(48px) rotate(-90deg)',
  'rotate(180deg) translateX(48px) rotate(-180deg)',
  'rotate(270deg) translateX(48px) rotate(-270deg)',
  'rotate(360deg) translateX(48px) rotate(-360deg)',
])
assert.deepEqual(motionKeyframes('loop', 'none'), [])

const text = '  Café 👩🏽‍💻\t海\r\n\nlast  '
assert.deepEqual(splitMotionText(text, 'words').join(''), text)
assert.deepEqual(splitMotionText(text, 'lines'), ['  Café 👩🏽‍💻\t海', '', 'last  '])
assert.deepEqual(splitMotionText('first\n\nlast\n', 'lines'), ['first', '', 'last', ''])
assert.deepEqual(splitMotionText('', 'lines'), [])
assert.deepEqual(splitMotionText('', 'words'), [])

console.log('motion config checks passed')
