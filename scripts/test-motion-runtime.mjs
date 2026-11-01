import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import Module, { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Window } from 'happy-dom'

const require = createRequire(new URL('../apps/studio/package.json', import.meta.url))
const ts = require('typescript')
const React = require('react')
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const win = new Window({ url: 'https://example.test' })
Object.assign(globalThis, { window: win, document: win.document, HTMLElement: win.HTMLElement, Node: win.Node })
const { createRoot } = require('react-dom/client')
const { renderToStaticMarkup } = require('react-dom/server')

function compile(relative, stubs = {}) {
  const path = fileURLToPath(new URL(relative, import.meta.url))
  const { outputText } = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } })
  const mod = new Module(path)
  mod.filename = path
  mod.paths = Module._nodeModulePaths(dirname(path))
  mod.require = (id) => Object.hasOwn(stubs, id) ? stubs[id] : require(id)
  mod._compile(outputText, path)
  return mod.exports
}

const frames = { motionKeyframes: () => [{ opacity: 0 }, { opacity: 1 }], splitMotionText: (text, mode) => !text ? [] : mode === 'words' ? text.match(/\s+|[^\s]+/gu) ?? [] : text.split(/\r\n|\r|\n/u) }
const scope = compile('../packages/blocks/src/MotionScope.tsx')
const { MotionEffects } = compile('../packages/blocks/src/MotionEffects.tsx', { './motion-effects': frames, './MotionScope': scope })
const { MotionText } = compile('../packages/blocks/src/MotionText.tsx', { './motion-effects': frames })
const markup = renderToStaticMarkup(React.createElement('h2', null, React.createElement(MotionText, { text: 'Xin chào\n世界', mode: 'lines', marquee: true })))
assert.equal((markup.match(/data-motion-unit=/g) ?? []).length, 2)
assert.equal((markup.match(/data-motion-marquee=/g) ?? []).length, 1)
assert.equal((markup.match(/Xin chào/g) ?? []).length, 3)
assert.match(markup, /aria-hidden="true"/)
assert.equal((renderToStaticMarkup(React.createElement(MotionText, { text: 'a\n\n', mode: 'lines' })).match(/data-motion-unit=/g) ?? []).length, 3)
const longText = 'Nội dung dài vẫn phải đọc được đầy đủ khi không có chuyển động. '.repeat(8)
const staticHost = win.document.createElement('div')
staticHost.innerHTML = renderToStaticMarkup(React.createElement(MotionText, { text: longText, mode: 'marquee' }))
win.document.body.append(staticHost)
const assertStaticMarquee = (node) => {
  assert.equal(node.querySelector('[data-motion-marquee-active]'), null)
  const track = node.querySelector('[data-motion-marquee]')
  assert.notEqual(win.getComputedStyle(track).whiteSpace, 'pre')
  assert.notEqual(win.getComputedStyle(track.parentElement).overflow, 'hidden')
  assert.equal(win.getComputedStyle(node.querySelector('[data-motion-marquee-copy]')).display, 'none')
}
assertStaticMarquee(staticHost)
assert.equal(staticHost.querySelector('[data-motion-marquee]').firstElementChild.textContent, longText)

const media = new Map()
win.matchMedia = (query) => {
  if (!media.has(query)) media.set(query, { matches: false, listeners: new Set(), addEventListener(_, fn) { this.listeners.add(fn) }, removeEventListener(_, fn) { this.listeners.delete(fn) }, change(value) { this.matches = value; this.listeners.forEach((fn) => fn()) } })
  return media.get(query)
}
const observers = []
win.IntersectionObserver = class {
  constructor(callback) { this.callback = callback; observers.push(this) }
  observe(target) { this.target = target }
  disconnect() { this.disconnected = true }
  enter(value) { this.callback([{ isIntersecting: value, intersectionRatio: value ? 1 : 0 }]) }
}
const animations = []
win.HTMLElement.prototype.animate = function (keyframes, options) {
  const animation = { target: this, keyframes, options, playState: 'running', plays: 0, pauses: 0, cancel() { this.playState = 'idle' }, play() { this.plays++; this.playState = 'running' }, pause() { this.pauses++; this.playState = 'paused' }, finish() { this.playState = 'finished'; this.onfinish?.() } }
  animations.push(animation)
  return animation
}
const flush = async (run) => { await React.act(async () => { run(); await Promise.resolve() }) }
const host = win.document.createElement('div')
win.document.body.append(host)
const root = createRoot(host)
const value = { entrance: { preset: 'text-words', duration: 600, delay: 10 }, loop: { preset: 'marquee', duration: 2000, delay: 40, iterations: 3, amount: 0 } }
await flush(() => root.render(React.createElement(scope.MotionScope, { enabled: true }, React.createElement(MotionEffects, { value }, React.createElement('p', null, React.createElement(MotionText, { text: 'one two', mode: 'words', marquee: true }))))))
assert.equal(animations.length, 0)
await flush(() => observers[0].enter(true))
assert.equal(animations.length, 2)
assert.deepEqual(animations.map((animation) => animation.options.delay), [10, 70])
assert.equal(host.querySelectorAll('button').length, 1)
await flush(() => animations[1].finish())
assert.equal(animations.length, 3)
assert.equal(animations[2].options.delay, 40)
assert.equal(animations[2].options.iterations, 3)
assert.ok(animations[2].target.matches('[data-motion-marquee]'))
assert.ok(host.querySelector('[data-motion-marquee-active]'))
await flush(() => host.querySelector('button').click())
assert.equal(animations[2].playState, 'paused')
await flush(() => observers[0].enter(false))
await flush(() => observers[0].enter(true))
assert.equal(animations[2].playState, 'paused')
await flush(() => host.querySelector('button').click())
assert.equal(animations[2].playState, 'running')
await flush(() => animations[2].finish())
assertStaticMarquee(host)
const playsAfterFinish = animations[2].plays
await flush(() => observers[0].enter(false))
await flush(() => observers[0].enter(true))
await flush(() => host.querySelector('button').click())
await flush(() => host.querySelector('button').click())
assert.equal(animations[2].plays, playsAfterFinish)
assert.equal(animations.length, 3)
await flush(() => root.unmount())
assert.ok(observers[0].disconnected)
assert.equal(animations[2].playState, 'idle')

const secondHost = win.document.createElement('div')
win.document.body.append(secondHost)
const secondRoot = createRoot(secondHost)
const loopOnly = { loop: { preset: 'float', duration: 2000, delay: 0, iterations: 'infinite', amount: 16 }, disableOnMobile: true }
await flush(() => secondRoot.render(React.createElement(MotionEffects, { value: loopOnly }, React.createElement('a', { href: '#' }, 'Focus'))))
assert.equal(animations.length, 3)
await flush(() => observers[1].enter(true))
assert.equal(animations.length, 4)
await flush(() => secondHost.querySelector('a').focus())
assert.equal(animations[3].playState, 'paused')
await flush(() => secondHost.querySelector('a').blur())
await new Promise((resolve) => setTimeout(resolve, 0))
assert.equal(animations[3].playState, 'running')
await flush(() => secondHost.querySelector('button').focus())
await flush(() => secondHost.querySelector('button').click())
assert.equal(animations[3].playState, 'paused')
await flush(() => secondHost.querySelector('button').click())
assert.equal(animations[3].playState, 'running', 'standalone resume works while its button stays focused')
await flush(() => media.get('(prefers-reduced-motion: reduce)').change(true))
assert.equal(animations[3].playState, 'idle')
await flush(() => media.get('(prefers-reduced-motion: reduce)').change(false))
assert.equal(animations.length, 5)
await flush(() => media.get('(max-width: 768px)').change(true))
assert.equal(animations[4].playState, 'idle')
await flush(() => secondRoot.unmount())
media.get('(max-width: 768px)').change(false)
const thirdHost = win.document.createElement('div')
win.document.body.append(thirdHost)
const thirdRoot = createRoot(thirdHost)
const marqueeOnly = { loop: { preset: 'marquee', duration: 2000, delay: 0, iterations: 'infinite', amount: 0 }, disableOnMobile: true }
await flush(() => thirdRoot.render(React.createElement(MotionEffects, { value: marqueeOnly }, React.createElement(MotionText, { text: longText, mode: 'marquee' }))))
assertStaticMarquee(thirdHost)
await flush(() => observers.at(-1).enter(true))
assert.ok(thirdHost.querySelector('[data-motion-marquee-active]'))
await flush(() => media.get('(prefers-reduced-motion: reduce)').change(true))
assertStaticMarquee(thirdHost)
await flush(() => media.get('(prefers-reduced-motion: reduce)').change(false))
assert.ok(thirdHost.querySelector('[data-motion-marquee-active]'))
await flush(() => media.get('(max-width: 768px)').change(true))
assertStaticMarquee(thirdHost)
await flush(() => media.get('(max-width: 768px)').change(false))
const oldAnimate = win.HTMLElement.prototype.animate
const enhancedViewport = thirdHost.querySelector('[data-motion-marquee-active]')
assert.ok(enhancedViewport)
await flush(() => thirdRoot.unmount())
assert.equal(enhancedViewport.hasAttribute('data-motion-marquee-active'), false)
const fourthRoot = createRoot(thirdHost)
win.HTMLElement.prototype.animate = undefined
await flush(() => fourthRoot.render(React.createElement(MotionEffects, { value: marqueeOnly }, React.createElement(MotionText, { text: longText, mode: 'marquee' }))))
assertStaticMarquee(thirdHost)
await flush(() => fourthRoot.unmount())
win.HTMLElement.prototype.animate = oldAnimate
console.log('PASS: semantic text, combined reveal/marquee, sequential runtime, pause persistence and cleanup')
