import assert from 'node:assert/strict'
import { elementFamily, transformFamily, cloneElements, convertSectionBox } from '../packages/blocks/src/free-geometry.ts'
import { guardCanvasEvent } from '../apps/studio/src/app/(editor)/editor/[id]/canvas-events.ts'
import { visibleCanvasRange, visibleCanvasBlock } from '../apps/studio/src/app/(editor)/editor/[id]/canvas-viewport.ts'
import { patchWidgetPart, validPartPath, widgetPartCss, widgetPartPath, widgetPartSelector, widgetPartKey, widgetPartsForDevice, widgetPartResponsiveCss } from '../packages/blocks/src/widget-parts.ts'
import { copyPageMeta } from '../apps/studio/src/app/(editor)/editor/[id]/page-copy.ts'
import { elementStateCss, elementStatesCss, elementStateScope, readElementState, writeElementState } from '../packages/blocks/src/element-states.ts'
import { normalizeScrollEffect, scrollEffectFrame } from '../packages/blocks/src/scroll-effects.ts'
import { placeElement, placementOwner, snapPosition, coalesceHistoryKey, initHist, commitHist, undoHist, redoHist, updateEl, runSelectionAction, elsOf, PAGE } from '../apps/studio/src/app/(editor)/editor/[id]/canvas-model.ts'

const placedEl = { id: 'new', type: 'button', x: 0, y: 0, w: 120, h: 40, props: { text: 'New' } }
for (const value of [undefined, null, [], 'pin', {}, { mode: 'fixed' }, { mode: '</style>' }]) assert.equal(normalizeScrollEffect(value), null)
const parallax = normalizeScrollEffect({ mode: 'parallax', distance: 200 })
const scrollBox = { top: 800, height: 200, boundaryBottom: 2000, viewportTop: 0, viewportHeight: 800 }
assert.equal(scrollEffectFrame(parallax, scrollBox).y, -100)
assert.equal(scrollEffectFrame(parallax, { ...scrollBox, top: 300 }).y, 0)
assert.equal(scrollEffectFrame(parallax, { ...scrollBox, top: -200 }).y, 100)
assert.equal(scrollEffectFrame({ ...parallax, distance: -200 }, scrollBox).y, 100)
const progressEffect = normalizeScrollEffect({ mode: 'progress', end: 100, fromX: -100, toX: 100, fromY: 80, toY: 0, fromScale: 0.5, toScale: 1.5, fromOpacity: 0, toOpacity: 1 })
assert.deepEqual(scrollEffectFrame(progressEffect, { ...scrollBox, top: 300 }), { x: 0, y: 40, scale: 1, opacity: 0.5 })
assert.deepEqual(scrollEffectFrame(progressEffect, { ...scrollBox, top: -2000 }), { x: 100, y: 0, scale: 1.5, opacity: 1 })
assert.deepEqual(scrollEffectFrame(progressEffect, { ...scrollBox, top: 300, viewportTop: 100, viewportHeight: 600 }), scrollEffectFrame(progressEffect, { ...scrollBox, top: 200, viewportHeight: 600 }))
const pinEffect = normalizeScrollEffect({ mode: 'pin', pinTop: 24 })
assert.equal(scrollEffectFrame(pinEffect, scrollBox).y, 0)
assert.equal(scrollEffectFrame(pinEffect, { ...scrollBox, top: -100 }).y, 124)
assert.equal(scrollEffectFrame(pinEffect, { ...scrollBox, top: -500, boundaryBottom: 0 }).y, 300)
assert.equal(scrollEffectFrame(pinEffect, { ...scrollBox, top: -500, boundaryBottom: -400 }).y, 0)
assert.equal(scrollEffectFrame(pinEffect, { ...scrollBox, top: -100, height: 900 }).y, 0)
assert.deepEqual(scrollEffectFrame(parallax, { ...scrollBox, top: NaN }), { x: 0, y: 0, scale: 1, opacity: 1 })
const cleanScroll = normalizeScrollEffect({ mode: 'progress', start: 99, end: -1, fromX: 'url(evil)', toY: Infinity, fromScale: -10, toOpacity: 200, disableOnMobile: 'true', extra: 'ignored' })
assert.equal(cleanScroll.end, 100)
assert.equal(cleanScroll.fromX, 0)
assert.equal(cleanScroll.toY, 0)
assert.equal(cleanScroll.fromScale, 0.25)
assert.equal(cleanScroll.toOpacity, 1)
assert.equal(cleanScroll.disableOnMobile, false)
assert.equal(cleanScroll.extra, undefined)
assert.equal(normalizeScrollEffect({ mode: 'progress', start: 90 }).end, 91)
console.log('PASS: scroll effect validation, reversible progress, parallax direction, section pin limits and nested viewport geometry')
const placementData = { content: [
  { type: 'FreeCanvas', props: { id: 'one', height: 400, elements: [{ ...placedEl, id: 'existing', x: 80, y: 24 }] } },
  { type: 'FreeCanvas', props: { id: 'two', height: 400, _els: [] } },
] }
assert.equal(placementOwner(placementData, { block: 'one', el: '' }, 'two'), 'one')
assert.equal(placementOwner(placementData, { block: 'stale', el: 'existing' }, 'two'), 'one')
assert.equal(placementOwner(placementData, { block: '', el: '' }, 'two'), 'two')
assert.equal(placementOwner(placementData, { block: 'missing', el: '' }), PAGE)
const placedData = placeElement(placementData, 'one', placedEl)
assert.equal(placedData.content[1], placementData.content[1])
assert.equal(placementData.content[0].props.elements.length, 1)
const placed = elsOf(placedData.content[0])[1]
assert.ok(placed.x >= 200 || placed.y >= 64)
assert.equal(placeElement(placementData, 'missing', placedEl), placementData)
assert.equal(placeElement(placementData, 'one', { ...placedEl, x: NaN }), placementData)
assert.equal(placeElement({ content: [] }, PAGE, placedEl).root.props._float[0].id, 'new')
const snapped = snapPosition(placementData, 'two', placedEl, { x: 542, y: 30 })
assert.equal(snapped.x, 540)
assert.ok(snapped.guides.some((g) => g.axis === 'x' && g.value === 600))
assert.equal(snapPosition(placementData, 'one', placedEl, { x: 82, y: 100 }).x, 80)
const equalData = { content: [{ type: 'FreeCanvas', props: { id: 'one', height: 400, _els: [{ ...placedEl, id: 'a', x: 100 }, { ...placedEl, id: 'b', x: 260 }] } }] }
assert.equal(snapPosition(equalData, 'one', placedEl, { x: 423, y: 0 }).x, 420)
let history = initHist(placementData)
const gesture = coalesceHistoryKey('drag', 'existing')
history = commitHist(history, placedData, gesture, 0)
history = commitHist(history, { ...placedData }, gesture, 2000)
assert.equal(history.past.length, 1)
history = commitHist(history, { ...placedData }, coalesceHistoryKey('drag', 'existing'), 2100)
assert.equal(history.past.length, 2)
assert.equal(redoHist(undoHist(history)).present, history.present)
assert.notEqual(coalesceHistoryKey('structure'), coalesceHistoryKey('structure'))
const selection = { block: 'one', el: 'existing' }
assert.equal(runSelectionAction('align', selection, placementData).content[0].props._els[0].x, 540)
const lockedData = runSelectionAction('lock', selection, placementData)
assert.equal(elsOf(lockedData.content[0])[0].props._locked, true)
assert.equal(runSelectionAction('delete', selection, lockedData), lockedData)
assert.equal(updateEl(lockedData, 'existing', (el) => ({ ...el, w: el.w + 20 })), lockedData)
assert.equal(updateEl(lockedData, 'existing', (el) => ({ ...el, x: el.x + 20 })), lockedData)
assert.equal(elsOf(runSelectionAction('hide', selection, placementData).content[0])[0].props._hidden, true)
assert.equal(elsOf(runSelectionAction('duplicate', selection, placementData).content[0]).length, 2)
const styledData = runSelectionAction('paste-style', selection, placementData, { text: 'Must not paste', href: '/wrong', color: '#ffffff', _states: { hover: { desktop: { opacity: 0.5 } } } })
assert.equal(elsOf(styledData.content[0])[0].props.text, 'New')
assert.equal(elsOf(styledData.content[0])[0].props.href, undefined)
assert.equal(elsOf(styledData.content[0])[0].props.color, '#ffffff')
const scrollingData = runSelectionAction('paste-style', selection, placementData, { _scroll: progressEffect })
assert.deepEqual(elsOf(scrollingData.content[0])[0].props._scroll, progressEffect)
const scrollingCopy = runSelectionAction('duplicate', selection, scrollingData)
assert.deepEqual(elsOf(scrollingCopy.content[0])[1].props._scroll, progressEffect)
const scrollHistory = commitHist(initHist(placementData), scrollingData)
assert.deepEqual(undoHist(scrollHistory).present, placementData)
assert.deepEqual(redoHist(undoHist(scrollHistory)).present, scrollingData)
assert.equal(runSelectionAction('states', selection, placementData).mode, 'states')

assert.deepEqual(copyPageMeta('Giới thiệu', 'gioi-thieu', ['gioi-thieu', 'gioi-thieu-copy']), { title: 'Giới thiệu (bản sao)', slug: 'gioi-thieu-copy-2' })
assert.deepEqual(readElementState({ color: '#111827' }, 'hover', 'desktop'), {})
const stateProps = writeElementState({}, 'hover', 'desktop', { backgroundColor: '#15803d', translateY: -2, opacity: 0.9 })
assert.deepEqual(readElementState(stateProps, 'hover', 'desktop'), { backgroundColor: '#15803d', translateY: -2, opacity: 0.9 })
const tabletProps = writeElementState(stateProps, 'hover', 'tablet', { backgroundColor: '#166534' })
assert.equal(readElementState(tabletProps, 'hover', 'mobile').backgroundColor, '#166534')
assert.match(elementStateCss('.hs-test', 'hover', 'desktop', readElementState(tabletProps, 'hover', 'desktop')), /\.hs-test:hover[^{}]*\{.*background-color:#15803d/s)
assert.equal(elementStateCss('.hs-test', 'hover', 'desktop', { backgroundColor: 'red;}' }), '')
const clearedState = writeElementState(tabletProps, 'hover', 'tablet', { backgroundColor: undefined })
assert.equal(readElementState(clearedState, 'hover', 'mobile').backgroundColor, '#15803d')
assert.equal(readElementState(tabletProps, 'hover', 'tablet').backgroundColor, '#166534')
assert.equal(elementStateCss('.hs-test', 'hover', 'desktop', { boxShadow: '1px 2px 3px 0px rgba(999,0,0,0.5)' }), '')
assert.match(elementStateCss('.hs-test', 'hover', 'desktop', { boxShadow: '-1px 2px 3px 0px rgba(0,0,0,1)' }), /box-shadow:/)
for (const value of [NaN, Infinity, -1, 1.1, '0.5']) assert.equal(elementStateCss('.hs-test', 'normal', 'desktop', { opacity: value }), '')
for (const scope of ['body', '.a .b', '.a,body', '</style>']) assert.equal(elementStateCss(scope, 'hover', 'desktop', { color: '#ffffff' }), '')
assert.equal(elementStatesCss('legacy', {}), '')
assert.notEqual(elementStateScope('a:b'), elementStateScope('a-b'))
const renderedStates = elementStatesCss('button:1', tabletProps)
assert.match(renderedStates, /:hover/)
assert.match(renderedStates, /@media\(max-width:1024px\)/)
assert.match(renderedStates, /prefers-reduced-motion:reduce/)
assert.equal(elementStatesCss('button:1', JSON.parse(JSON.stringify(tabletProps))), renderedStates)
assert.ok(renderedStates.includes('.' + elementStateScope('button:1')))
assert.equal(elementStateCss('.test', 'hover', 'desktop', { scale: 10, translateX: Infinity, transitionMs: 6000 }), '')

const partPath = 'section:nth-of-type(1) > button:nth-of-type(2)'
assert.equal(validPartPath(partPath), true)
for (const path of ['', '*', 'div:nth-of-type(0)', 'div:nth-of-type(1),body', '</style><script>alert(1)</script>', 'div:nth-of-type(1){color:red}']) assert.equal(validPartPath(path), false)
const parts = patchWidgetPart({}, partPath, { x: 40, y: -10, backgroundColor: '#dc2626', display: 'grid', columns: 3, gap: 12, width: 220 })
const partCss = widgetPartCss('booking', parts)
assert.equal(widgetPartCss('booking', JSON.parse(JSON.stringify(parts))), partCss)
assert.match(partCss, /translate:40px -10px!important/)
assert.match(partCss, /background-color:#dc2626!important/)
assert.match(partCss, /grid-template-columns:repeat\(3,minmax\(0,1fr\)\)!important/)
assert.match(partCss, /width:220px!important/)
assert.ok(partCss.startsWith(widgetPartSelector('booking', partPath)))
assert.notEqual(widgetPartSelector('booking', partPath), widgetPartSelector('copy', partPath))
assert.doesNotMatch(widgetPartSelector('"><script>', partPath), /<script>/)
assert.deepEqual(patchWidgetPart(parts, partPath, { x: '' })[partPath].x, undefined)
assert.equal(parts[partPath].x, 40)
assert.deepEqual(patchWidgetPart({ [partPath]: { x: 1 } }, partPath, { x: '' }), {})
assert.equal(widgetPartCss('id', { [partPath]: { color: '</style><script>', width: -1, x: Infinity, y: NaN, display: 'none', position: 'fixed', columns: 1.2 } }), '')
for (const invalid of [null, [], 'bad', { '*': { color: '#ffffff' } }, { [partPath]: null }]) assert.equal(widgetPartCss('id', invalid), '')
const partRoot = { children: [] }
const partSection = { localName: 'section', parentElement: partRoot, children: [] }
const partButton1 = { localName: 'button', parentElement: partSection }
const partButton2 = { localName: 'button', parentElement: partSection }
partRoot.children = [partSection]
partSection.children = [partButton1, partButton2]
assert.equal(widgetPartPath(partRoot, partButton2), partPath)
assert.equal(widgetPartPath(partButton1, partButton2), '')
const responsiveParts = { _parts: parts, _partsTablet: { [partPath]: { width: 180 } }, _partsMobile: { [partPath]: { x: 0, y: 0, width: 120 } } }
assert.equal(widgetPartKey('mobile'), '_partsMobile')
assert.equal(widgetPartsForDevice(responsiveParts, 'desktop')[partPath].width, 220)
assert.equal(widgetPartsForDevice(responsiveParts, 'tablet')[partPath].width, 180)
assert.deepEqual(widgetPartsForDevice(responsiveParts, 'mobile')[partPath], { ...parts[partPath], x: 0, y: 0, width: 120 })
assert.match(widgetPartResponsiveCss('id', responsiveParts), /@media\(max-width:600px\).*translate:0px 0px!important/)
assert.match(widgetPartResponsiveCss('id', responsiveParts), /@media\(max-width:1024px\).*width:180px/)
assert.deepEqual(widgetPartsForDevice({ _parts: null, _partsTablet: [], _partsMobile: { invalid: null } }, 'mobile'), {})

const viewport = { getBoundingClientRect: () => ({ top: 100, bottom: 700 }), ownerDocument: { defaultView: { innerHeight: 800 } } }
const frame = { clientHeight: 1000, getBoundingClientRect: () => ({ top: -100, bottom: 650, height: 750 }), closest: () => viewport }
const canvasDoc = { defaultView: { innerHeight: 1000, frameElement: frame } }
assert.deepEqual(visibleCanvasRange(canvasDoc), { top: 200 / .75, bottom: 1000 })
viewport.ownerDocument.defaultView.innerHeight = 500
assert.deepEqual(visibleCanvasRange(canvasDoc), { top: 200 / .75, bottom: 800 })
viewport.getBoundingClientRect = () => ({ top: 700, bottom: 900 })
assert.equal(visibleCanvasRange(canvasDoc), null)
assert.deepEqual(visibleCanvasRange({ defaultView: { innerHeight: 720 } }), { top: 0, bottom: 720 })
assert.equal(visibleCanvasRange({ defaultView: null }), null)

const blockNode = (id, top, bottom, width = 1200) => ({
  clientWidth: width,
  getAttribute: () => id,
  getBoundingClientRect: () => ({ top, bottom, height: bottom - top }),
})
const oldSection = blockNode('old', -580, 20)
const currentSection = blockNode('current', 20, 720)
const widget = blockNode('widget', 20, 720)
const targetDoc = { defaultView: { innerHeight: 720 }, querySelectorAll: () => [oldSection, currentSection] }
assert.equal(visibleCanvasBlock(targetDoc, ['old', 'current']).id, 'current')
// A widget at the viewport center must win over a section sliver.
targetDoc.querySelectorAll = () => [oldSection, widget]
assert.equal(visibleCanvasBlock(targetDoc, ['old', 'widget']).id, 'widget')
targetDoc.querySelectorAll = () => [blockNode('offscreen', -600, 0), blockNode('hidden', 0, 720, 0)]
assert.equal(visibleCanvasBlock(targetDoc, ['offscreen', 'hidden']), null)
targetDoc.querySelectorAll = () => [blockNode('nested', 0, 720), currentSection]
assert.equal(visibleCanvasBlock(targetDoc, ['current']).id, 'current')
targetDoc.querySelectorAll = () => [blockNode('first', 0, 360), blockNode('second', 360, 720)]
assert.equal(visibleCanvasBlock(targetDoc, ['first', 'second']).id, 'second')
targetDoc.querySelectorAll = () => [blockNode('first', 0, 100), blockNode('second', 600, 720)]
assert.equal(visibleCanvasBlock(targetDoc, ['first', 'second']).id, 'second')
viewport.getBoundingClientRect = () => ({ top: 100, bottom: 700 })
viewport.ownerDocument.defaultView.innerHeight = 800
targetDoc.defaultView = canvasDoc.defaultView
targetDoc.querySelectorAll = () => [oldSection, currentSection]
assert.equal(visibleCanvasBlock(targetDoc, ['old', 'current']).id, 'current')
assert.equal(visibleCanvasBlock(targetDoc, ['old', 'current']).top, 200 / .75)
targetDoc.defaultView = null
assert.equal(visibleCanvasBlock(targetDoc, ['first', 'second']), null)

const group = { id: 'g', type: 'container', x: 20, y: 30, w: 400, h: 200, props: {} }
const child = { id: 'c', parentId: 'g', type: 'text', x: 60, y: 50, w: 100, h: 40, props: { text: 'Keep me', size: 40 } }
const nested = { ...child, id: 'n', parentId: 'c' }
const other = { ...child, id: 'other', parentId: undefined }
const els = [group, child, nested, other]
assert.deepEqual(elementFamily(els, 'g').map((el) => el.id), ['g', 'c', 'n'])
const moved = transformFamily(els, 'g', { x: 100, y: 80, w: 800, h: 100 })
assert.deepEqual([moved[1].x, moved[1].y, moved[1].w, moved[1].h], [180, 90, 200, 20])
assert.equal(moved[3], other)
assert.equal(child.x, 60)
assert.equal(moved[1].props.size, 20)
assert.equal(child.props.size, 40)
assert.equal(elementFamily([{ ...group, parentId: 'c' }, child], 'g').length, 2)
const copies = cloneElements(elementFamily(els, 'g'), 24)
assert.notEqual(copies[0].id, group.id)
assert.equal(copies[1].parentId, copies[0].id)
assert.equal(copies[2].parentId, copies[1].id)
copies[1].props.text = 'Copy'
assert.equal(child.props.text, 'Keep me')
assert.equal(cloneElements([child])[0].parentId, undefined)
const from = { left: 100, top: -100, width: 600, height: 400 }
const to = { left: 20, top: 400, width: 1200, height: 600 }
const box = convertSectionBox(child, from, to)
assert.equal(to.left + box.x * to.width / 1200, from.left + child.x * from.width / 1200)
assert.equal(to.top + box.y * to.width / 1200, from.top + child.y * from.width / 1200)
assert.equal(box.w * to.width / 1200, child.w * from.width / 1200)
assert.deepEqual(convertSectionBox({ ...child, ...box }, to, from), { x: child.x, y: child.y, w: child.w, h: child.h })

const opened = []
const event = (type, { href, control = false, editor = false } = {}) => {
  const link = href === undefined ? null : { getAttribute: () => href, ownerDocument: { defaultView: { parent: { location: { href: 'http://localhost/editor/demo' }, open: (...args) => opened.push(args) } } } }
  return { type, prevented: false, stopped: false, target: { closest: (selector) => selector.startsWith('[data-editor-control]') ? editor : selector === 'a[href]' ? link : control }, preventDefault() { this.prevented = true }, stopImmediatePropagation() { this.stopped = true } }
}
for (const e of [event('click', { href: '/cart' }), event('click', { control: true }), event('submit'), event('auxclick', { href: '/cart' })]) {
  guardCanvasEvent(e, false)
  assert.equal(e.prevented, true)
  assert.equal(e.stopped, true)
}
const toolbar = event('click', { control: true, editor: true })
guardCanvasEvent(toolbar, false)
assert.equal(toolbar.prevented, false)
const previewLink = event('click', { href: '/cart' })
guardCanvasEvent(previewLink, true)
assert.equal(previewLink.prevented, true)
assert.deepEqual(opened[0], ['http://localhost/cart', '_blank', 'noopener,noreferrer'])
for (const href of ['javascript:alert(1)', 'http://[']) guardCanvasEvent(event('click', { href }), true)
assert.equal(opened.length, 1)
const anchor = event('click', { href: '#collections' })
guardCanvasEvent(anchor, true)
assert.equal(anchor.prevented, false)
const slider = event('click', { control: true })
guardCanvasEvent(slider, true)
assert.equal(slider.prevented, false)
console.log('PASS: state validation/cascade, placement/snapping, history, selection/locks, viewport, group ownership and navigation guards')
