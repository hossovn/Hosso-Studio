import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import Module, { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { activeStoryStep, storyCanPin, storyProgress, storyViewportMidpoint } from '../packages/blocks/src/scroll-story.ts'
import { coreBlocks, scrollStory } from '../packages/blocks/src/core-blocks.ts'

const require = createRequire(new URL('../apps/studio/package.json', import.meta.url))
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const path = fileURLToPath(new URL('../packages/blocks/src/ScrollStory.tsx', import.meta.url))
const { outputText } = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } })
const mod = new Module(path)
mod.filename = path
mod.paths = Module._nodeModulePaths(dirname(path))
mod.require = (id) => id === './scroll-story' ? { activeStoryStep, storyCanPin } : require(id)
mod._compile(outputText, path)
const { ScrollStory } = mod.exports

const steps = [{ top: -200, bottom: 100 }, { top: 100, bottom: 500 }, { top: 500, bottom: 900 }]
assert.equal(activeStoryStep(steps, 300), 1)
assert.equal(activeStoryStep(steps, 500), 2)
assert.equal(activeStoryStep(steps, 90), 0)
assert.equal(activeStoryStep(steps, 700), 2)
assert.equal(activeStoryStep(steps, 0), 0)
assert.equal(activeStoryStep([], 300), 0)
assert.equal(storyViewportMidpoint(null, 600), 300)
assert.equal(storyViewportMidpoint({ top: 100, bottom: 500 }, 600), 300)
assert.equal(storyViewportMidpoint({ top: 200, bottom: 600 }, 800), 400)
assert.equal(activeStoryStep([{ top: 100, bottom: 300 }, { top: 300, bottom: 500 }], storyViewportMidpoint({ top: 100, bottom: 500 }, 600)), 1)
assert.equal(storyProgress({ top: 100, bottom: 500 }, 100), 0)
assert.equal(storyProgress({ top: 100, bottom: 500 }, 300), 0.5)
assert.equal(storyProgress({ top: 100, bottom: 500 }, 900), 1)
assert.equal(storyCanPin(1200, 800, false, false, 3), true)
for (const args of [
  [768, 800, false, false, 3],
  [1200, 560, false, false, 3],
  [1200, 800, true, false, 3],
  [1200, 800, false, true, 3],
  [1200, 800, false, false, 1],
]) assert.equal(storyCanPin(...args), false)
assert.equal(coreBlocks.includes(scrollStory), true)
assert.equal(scrollStory.type, 'ScrollStory')
assert.equal(scrollStory.defaultProps.steps.length, 3)
assert.deepEqual(Object.keys(scrollStory.fields.steps.arrayFields), ['image', 'alt', 'title', 'body'])
for (const step of scrollStory.defaultProps.steps) assert.ok(existsSync(new URL(`../apps/studio/public${step.image}`, import.meta.url)))
const markup = renderToStaticMarkup(React.createElement(ScrollStory, scrollStory.defaultProps))
assert.equal((markup.match(/<article/g) || []).length, 3)
assert.equal((markup.match(/<img/g) || []).length, 3)
assert.match(markup, /<section class="hs-scroll-story">/)
assert.equal(renderToStaticMarkup(React.createElement(ScrollStory, { steps: [] })), '')
assert.match(renderToStaticMarkup(React.createElement(ScrollStory, { steps: [], _motionEditing: true })), /Thêm bước/)
assert.equal((renderToStaticMarkup(React.createElement(ScrollStory, { steps: [scrollStory.defaultProps.steps[0]] })).match(/<article/g) || []).length, 1)

const listeners = {}, styles = {}, states = {}
let scheduled, activeIndex, pinnedState
let rects = [{ top: -200, bottom: 200 }, { top: 200, bottom: 600 }, { top: 600, bottom: 1000 }]
const scroller = { clientWidth: 900, clientHeight: 700, scrollHeight: 1400, parentElement: null, getBoundingClientRect: () => ({ top: 50, bottom: 750 }), addEventListener: (name, fn) => { listeners[name] = fn }, removeEventListener: (name) => { delete listeners[name] } }
const win = { innerWidth: 1200, innerHeight: 900, matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), getComputedStyle: () => ({ overflowY: 'auto' }), requestAnimationFrame: (fn) => { scheduled = fn; return 1 }, cancelAnimationFrame() {}, addEventListener: (name, fn) => { listeners[`window:${name}`] = fn }, removeEventListener: (name) => { delete listeners[`window:${name}`] } }
const doc = { defaultView: win, body: {}, documentElement: {} }
const anchor = { ownerDocument: doc, parentElement: scroller, style: { setProperty: (key, value) => { styles[key] = value }, removeProperty: (key) => { delete styles[key] } } }
const nodes = rects.map((_, index) => ({ getBoundingClientRect: () => rects[index] }))
let setup, ref = 0, state = 0
const runtime = new Module(path)
runtime.filename = path
runtime.paths = Module._nodeModulePaths(dirname(path))
runtime.require = (id) => id === './scroll-story' ? { activeStoryStep, storyCanPin, storyProgress, storyViewportMidpoint } : id === 'react' ? { useRef: () => ({ current: ref++ ? nodes : anchor }), useState: (initial) => [initial, state++ ? (value) => { activeIndex = value } : (value) => { pinnedState = value }], useEffect: (fn) => { setup = fn } } : require(id)
runtime._compile(outputText, path)
runtime.exports.ScrollStory({ steps: scrollStory.defaultProps.steps })
const cleanup = setup()
assert.equal(pinnedState, true)
assert.equal(typeof listeners.scroll, 'function', 'listen to nearest scrolling ancestor')
assert.equal(listeners['window:scroll'], undefined)
scheduled()
assert.equal(activeIndex, 1)
assert.equal(styles['--hs-story-height'], '700px')
const scaleBefore = styles['--hs-story-scale']
rects = [{ top: 100, bottom: 500 }, { top: 500, bottom: 900 }, { top: 900, bottom: 1300 }]
listeners.scroll()
scheduled()
assert.equal(activeIndex, 0, 'reverse scroll chooses the current step')
assert.notEqual(styles['--hs-story-scale'], scaleBefore, 'image scale tracks step progress')
cleanup()
assert.equal(listeners.scroll, undefined)
console.log('ScrollStory geometry and schema OK')
