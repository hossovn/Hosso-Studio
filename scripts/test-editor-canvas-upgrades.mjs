import assert from 'node:assert/strict'
import { selectionFamily, selectionBox, rectangleSelection, transformSelection, duplicateSelection, deleteSelection } from '../apps/studio/src/app/(editor)/editor/[id]/canvas-selection.ts'
import { mergeDevicePage, pageForDevice, resetDeviceLayout, responsiveBlockCss } from '../packages/blocks/src/responsive-layout.ts'
import { layoutAtWidth, layoutMedia, normalizeBreakpoints, syncBreakpoints, variantCss } from '../packages/blocks/src/responsive-breakpoints.ts'
import { actionHref, readLinkAction, sectionAnchor } from '../packages/blocks/src/link-actions.ts'
import { expandReusableInstance } from '../packages/blocks/src/reusable-overrides.ts'

const el = (id, x, y, w = 100, h = 40, props = {}) => ({ id, type: 'text', x, y, w, h, props: { text: id, size: 20, ...props } })
const a = el('a', 50, 50), b = el('b', 250, 100), group = { ...el('g', 0, 0, 500, 200), type: 'container' }, child = { ...a, parentId: 'g' }
const grouped = [group, child, b], original = structuredClone(grouped)
assert.deepEqual(selectionFamily(grouped, ['g', 'a']).map((e) => e.id), ['g', 'a'])
const transformed = transformSelection(grouped, ['g', 'a', 'b'], { x: 20, y: 40, w: 1000, h: 400 })
assert.deepEqual(selectionBox(transformed), { x: 20, y: 40, w: 1000, h: 400 })
assert.equal(transformed[1].x, 120, 'selected child scales once even if parent is also selected')
assert.equal(transformed[1].props.size, 40)
assert.deepEqual(grouped, original)
const locked = [group, { ...child, props: { ...child.props, _locked: true } }, b]
assert.deepEqual(selectionFamily(locked, ['g', 'b']).map((e) => e.id), ['b'], 'a family containing a locked child cannot be moved or deleted')
assert.deepEqual(rectangleSelection([{ ...group, props: { _hidden: true } }, child, b], { x: 0, y: 0, w: 600, h: 300 }), ['b'])
const data = { content: [{ type: 'FreeCanvas', props: { id: 'section', height: 500, _els: grouped } }] }
const sel = { block: 'section', el: 'b', multi: ['g', 'a', 'b'] }
const copied = duplicateSelection(data, sel)
assert.equal(copied.data.content[0].props._els.length, 6)
assert.equal(copied.sel.multi.length, 3)
assert.equal(copied.data.content[0].props._els[4].parentId, copied.data.content[0].props._els[3].id)
assert.equal(deleteSelection(data, sel).content[0].props._els.length, 0)
console.log('PASS selection unions, marquee visibility, inherited locks, proportional resize and independent family duplication')

const points = normalizeBreakpoints([{ width: 900 }, { width: 480 }, { width: 900 }, { width: 600 }, { width: -1 }])
assert.deepEqual(points.map((p) => p.width), [480, 900])
assert.deepEqual([480, 481, 600, 601, 900, 901, 1024, 1025].map((w) => layoutAtWidth(w, points)), ['bp-480', 'mobile', 'mobile', 'bp-900', 'bp-900', 'tablet', 'tablet', 'desktop'])
assert.equal(layoutMedia('bp-900', points), '(min-width:601px) and (max-width:900px)')
assert.match(variantCss('section', points), /data-hs-variant="bp-900"/)
const base = syncBreakpoints({ ...data, root: { props: { _breakpoints: points } } })
const shown = pageForDevice(base, 'bp-900'), edited = structuredClone(shown)
edited.content[0].props._els[1].x = 180
edited.content[0].props._els[1].props.text = 'Shared text'
edited.content[0].props.height = 650
edited.content[0].props._padT = 35
const saved = mergeDevicePage(base, edited, 'bp-900')
assert.equal(saved.content[0].props._els[1].x, 50)
assert.equal(saved.content[0].props._els[1].responsive['bp-900'].x, 180)
assert.equal(pageForDevice(saved, 'bp-900').content[0].props._els[1].x, 180)
assert.equal(pageForDevice(saved, 'desktop').content[0].props._els[1].props.text, 'Shared text')
assert.equal(saved.content[0].props.height, 500)
assert.match(responsiveBlockCss('section', saved.content[0].props), /max-width:900px.*padding-top:35px/)
assert.equal(pageForDevice(resetDeviceLayout(saved, 'section', 'bp-900'), 'bp-900').content[0].props.height, 500)
assert.equal(base.content[0].props._breakpoints.length, 2)
console.log('PASS custom breakpoint boundaries, persistence, base isolation, shared copy, runtime media rules and reset')

for (const [type, value] of [['section', 'part with spaces'], ['popup', 'offer'], ['url', '/sale'], ['email', 'hello@example.com'], ['phone', '+84123456']]) assert.deepEqual(readLinkAction(actionHref(type, value)), { type, value })
for (const value of ['javascript:alert(1)', '//evil.test', 'data:text/html,test']) assert.equal(actionHref('url', value), '')
assert.equal(actionHref('phone', 'abc'), '')
assert.equal(actionHref('popup', '!'), '')
console.log('PASS visual action round trips and invalid destination rejection')

const source = [{ type: 'FreeCanvas', props: { id: 'source', height: 500, _anchor: true, _els: [a, { ...b, props: { ...b.props, href: '#' + sectionAnchor('source') } }] } }]
const instance = { type: 'Reusable', props: { id: 'instance-a', overrides: { 'source::a': { text: 'Variant', richText: '', color: '#2d7b57', x: '999', href: 'javascript:alert(1)' } } } }
const expanded = expandReusableInstance(source, instance)
assert.equal(expanded[0].props._els[0].props.text, 'Variant')
assert.equal(expanded[0].props._els[0].x, 50)
assert.equal(expanded[0].props._els[0].props.href, undefined)
assert.equal(expanded[0].props._els[1].props.href, '#' + sectionAnchor(expanded[0].props.id))
const updated = expandReusableInstance([{ ...source[0], props: { ...source[0].props, height: 700, _els: [{ ...a, x: 90 }, b] } }], instance)
assert.equal(updated[0].props.height, 700)
assert.equal(updated[0].props._els[0].x, 90)
assert.equal(updated[0].props._els[0].props.text, 'Variant')
assert.notEqual(expandReusableInstance(source, { ...instance, props: { ...instance.props, id: 'instance-b' } })[0].props._els[0].id, expanded[0].props._els[0].id)
assert.equal(source[0].props._els[0].props.text, 'a')
const reordered = expandReusableInstance([{ type: 'Text', props: { id: 'other' } }, ...source], instance)
assert.equal(reordered[1].props.id, expanded[0].props.id)
console.log('PASS stable reusable overrides, source layout updates, scoped IDs, internal link remapping and source immutability')
