import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { Window } from 'happy-dom'
import { FreeNumber } from '../packages/blocks/src/FreeNumber.tsx'
import { FreeComparison } from '../packages/blocks/src/FreeComparison.tsx'
import { makeElement } from '../packages/blocks/src/FreeCanvas.tsx'
import { countUpSettings, formatCount } from '../packages/blocks/src/detailing-effects.ts'
import { contentOnlyPage, isContentOnlyChange } from '../packages/blocks/src/content-editing.ts'
import { mergeDevicePage, pageForDevice } from '../packages/blocks/src/responsive-layout.ts'
import { EFFECT_TEMPLATES } from '../apps/studio/src/app/(editor)/editor/[id]/EffectTemplates.ts'

const require = createRequire(new URL('../apps/studio/package.json', import.meta.url))
const React = require('react'), { act } = React
const { renderToStaticMarkup } = require('react-dom/server')
const { createRoot } = require('react-dom/client')
const render = (component, props) => renderToStaticMarkup(React.createElement(component, props))
assert.equal(countUpSettings({ value: '1.500' }).to, 1500)
assert.equal(countUpSettings({ value: '98,5' }).to, 98.5)
assert.equal(countUpSettings({ value: '1,234.5', countLocale: 'en-US' }).to, 1234.5)
assert.equal(countUpSettings({ value: '24/7' }).to, 0)
assert.equal(countUpSettings({ countDuration: Infinity }).duration, 1600)
assert.equal(countUpSettings({ countDecimals: 100 }).decimals, 6)
assert.equal(formatCount(98.5, countUpSettings({ countDecimals: 1 })), '98,5')
assert.match(render(FreeNumber, { p: { value: '24/7' }, unit: 1200 }), /24\/7/)
assert.match(render(FreeNumber, { p: { value: '1.500', countUp: true, suffix: '+' }, unit: 1200 }), /aria-label="1.500\+"/)
assert.match(render(FreeComparison, { p: { position: 200 }, unit: 1200 }), /value="100"/)
assert.match(render(FreeComparison, { p: {}, unit: 1200, editing: true }), /disabled=""/)
console.log('PASS: formats, literal compatibility, SSR final values, comparison bounds and editing lock')

const base = { root: { props: {} }, content: [{ type: 'FreeCanvas', props: { id: 'effects', height: 600, _els: [makeElement('comparison', { id: 'comparison' }), makeElement('number', { id: 'number', props: { countUp: true, countTo: 1500 } })] } }] }
const edited = structuredClone(base)
edited.content[0].props._els[0].props.beforeSrc = '/api/media/file/before.jpg'
edited.content[0].props._els[1].props.countTo = 5000
assert.equal(isContentOnlyChange(base, edited), true)
edited.content[0].props._els[0].props.position = 80
edited.content[0].props._els[1].props.countDuration = 300
assert.equal(isContentOnlyChange(base, edited), false)
assert.equal(contentOnlyPage(base, edited).content[0].props._els[0].props.position, 50)
const before = pageForDevice(base, 'mobile'), after = structuredClone(before)
after.content[0].props._els[0].props.afterSrc = '/after.webp'
after.content[0].props._els[1].props.countTo = 9000
after.content[0].props._els[0].w = 1000
const merged = mergeDevicePage(base, after, 'mobile')
assert.equal(merged.content[0].props._els[0].props.afterSrc, '/after.webp')
assert.equal(merged.content[0].props._els[1].props.countTo, 9000)
assert.equal(merged.content[0].props._els[0].w, 640)
assert.equal(merged.content[0].props._els[0].responsive.mobile.w, 1000)
for (const template of EFFECT_TEMPLATES) {
  const first = template.build(), second = template.build()
  assert.equal(new Set([...first, ...second].map((el) => el.id)).size, first.length + second.length)
  const mobile = pageForDevice({ content: [{ type: 'FreeCanvas', props: { id: template.id, height: template.height, ...template.extraProps, _els: first } }] }, 'mobile').content[0]
  assert.ok(mobile.props._els.every((el) => el.x >= 0 && el.x + el.w <= 1201 && el.y + el.h <= mobile.props.height), template.id)
}
console.log('PASS: content lock, shared content, device geometry and responsive templates')

const win = new Window({ url: 'http://localhost/' })
const globals = Object.fromEntries(['window', 'document', 'navigator', 'IS_REACT_ACT_ENVIRONMENT'].map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]))
for (const [key, value] of Object.entries({ window: win, document: win.document, navigator: win.navigator, IS_REACT_ACT_ENVIRONMENT: true })) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
const frames = new Map(), observers = [], listeners = new Set()
let sequence = 0, hidden = false, reduced = false
win.requestAnimationFrame = (fn) => { const id = ++sequence; frames.set(id, fn); return id }
win.cancelAnimationFrame = (id) => frames.delete(id)
win.matchMedia = () => ({ get matches() { return reduced }, addEventListener: (_, fn) => listeners.add(fn), removeEventListener: (_, fn) => listeners.delete(fn) })
win.IntersectionObserver = class {
  constructor(callback) { this.callback = callback; observers.push(this) }
  observe() { this.connected = true }
  disconnect() { this.connected = false }
}
Object.defineProperty(win.document, 'hidden', { configurable: true, get: () => hidden })
const host = win.document.createElement('div'); win.document.body.append(host)
const root = createRoot(host)
const mount = (component, props) => act(() => root.render(React.createElement(component, props)))
const intersect = (visible) => act(() => observers.at(-1).callback([{ isIntersecting: visible }]))
const step = (time) => act(() => { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach((fn) => fn(time)) })
const number = () => host.querySelector('[data-count-up] span').textContent
try {
  mount(FreeNumber, { p: { countUp: true, value: '100', countDuration: 1000 }, unit: 1200 })
  assert.equal(number(), '100'); assert.equal(frames.size, 0)
  intersect(true); assert.equal(number(), '0')
  step(0); step(500); assert.equal(number(), '88')
  intersect(false); assert.equal(frames.size, 0)
  intersect(true); step(10000); assert.equal(number(), '88')
  step(10500); assert.equal(number(), '100'); assert.equal(frames.size, 0)
  intersect(false); intersect(true); assert.equal(frames.size, 0)
  mount(FreeNumber, { p: { countUp: true, value: '200', countDuration: 1000, countReplay: true }, unit: 1200 })
  intersect(true); step(0); step(1000); assert.equal(number(), '200')
  intersect(false); intersect(true); assert.equal(number(), '0')
  step(0); step(500); const paused = number()
  hidden = true; act(() => win.document.dispatchEvent(new win.Event('visibilitychange'))); assert.equal(frames.size, 0)
  hidden = false; act(() => win.document.dispatchEvent(new win.Event('visibilitychange')))
  step(5000); assert.equal(number(), paused)
  reduced = true; act(() => listeners.forEach((fn) => fn())); assert.equal(number(), '200'); assert.equal(frames.size, 0)
  reduced = false
  mount(FreeNumber, { p: { countUp: true, countTo: -10, countFrom: 10, countDuration: 1000 }, unit: 1200 })
  intersect(true); step(0); step(1000); assert.equal(number(), '-10')
  mount(FreeNumber, { p: { countUp: true, countTo: 99 }, unit: 1200, editing: true }); assert.equal(number(), '99'); assert.equal(frames.size, 0)
  mount(FreeComparison, { p: { position: 35 }, unit: 1200 })
  assert.equal(host.querySelector('input').value, '35'); assert.match(host.querySelector('[data-comparison-before]').style.clipPath, /65%/)
  mount(FreeComparison, { p: { position: 70, direction: 'vertical' }, unit: 1200 })
  assert.equal(host.querySelector('input').value, '70'); assert.match(host.querySelector('[data-comparison-before]').style.clipPath, /30%/)
  assert.equal(host.querySelector('input').getAttribute('aria-orientation'), 'vertical')
} finally {
  act(() => root.unmount())
  assert.equal(frames.size, 0); assert.equal(listeners.size, 0); assert.ok(observers.every((observer) => !observer.connected))
  await win.happyDOM.close()
  for (const [key, descriptor] of Object.entries(globals)) descriptor ? Object.defineProperty(globalThis, key, descriptor) : delete globalThis[key]
}
console.log('PASS: mounted counters pause/resume/replay, count down, honor reduced motion and clean up; comparison synchronizes props')
