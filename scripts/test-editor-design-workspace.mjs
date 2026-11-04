import assert from 'node:assert/strict'
import { captureFrameVariant, applyFrameVariant, updateLinkedStyle, deleteLinkedStyle, linkStyle } from '../packages/blocks/src/design-presets.ts'
import { contentOnlyPage, isContentOnlyChange } from '../packages/blocks/src/content-editing.ts'
import { queryRepeatItems, repeatQuery, repeatPrefix } from '../packages/blocks/src/repeater-query.ts'
import { pageChanges, restorePagePart } from '../apps/studio/src/app/(editor)/editor/[id]/design-review.ts'
import { expandReusableInstance } from '../packages/blocks/src/reusable-overrides.ts'

const frame = { id: 'frame', type: 'container', x: 40, y: 60, w: 500, h: 300, props: { _frame: true, bg: '#fff' }, responsive: { mobile: { x: 20, y: 30, w: 800 } } }
const child = { id: 'text', type: 'text', parentId: 'frame', x: 60, y: 80, w: 300, h: 60, props: { text: 'Nội dung gốc', color: '#222', size: 24 }, responsive: { mobile: { x: 40, y: 50 } } }
const page = { root: { props: {} }, content: [{ type: 'FreeCanvas', props: { id: 'main', height: 500, _els: [frame, child] } }] }
const original = structuredClone(page)
const style = { id: 'shared', name: 'Tiêu đề', props: { color: '#126c40', weight: 650, text: 'Never copy content', x: 40 } }
const linked = linkStyle(child, style)
assert.equal(linked.props.text, child.props.text)
assert.equal(linked.props.x, undefined)
let shared = updateLinkedStyle({ ...page, root: { props: { _float: [{ ...linked, id: 'floating', parentId: undefined }] } }, content: [{ ...page.content[0], props: { ...page.content[0].props, _els: [frame, linked] } }] }, style)
shared = updateLinkedStyle(shared, { ...style, props: { color: '#8a312e' } })
assert.equal(shared.root.props._float[0].props.color, '#8a312e')
assert.equal(shared.content[0].props._els[1].props.color, '#8a312e')
assert.equal(shared.content[0].props._els[1].props.weight, undefined)
assert.equal(shared.content[0].props._els[1].props.text, child.props.text)

const nested = updateLinkedStyle({ ...page, content: [{ type: 'FreeCanvas', props: { id: 'main', _els: [{ ...frame, props: { ...frame.props, _variants: [{ id: 'v', elements: [linked] }] } }, { id: 'widget', props: { widget: { props: { _template: [linked] } } } }] } }] }, { ...style, props: { color: '#2d7b57' } })
assert.equal(nested.content[0].props._els[0].props._variants[0].elements[0].props.color, '#2d7b57')
assert.equal(nested.content[0].props._els[1].props.widget.props._template[0].props.color, '#2d7b57')
const detached = deleteLinkedStyle(nested, style.id)
assert.equal(detached.content[0].props._els[0].props._variants[0].elements[0].props._styleLink, '')
assert.equal(detached.content[0].props._els[1].props.widget.props._template[0].props._styleLink, '')
assert.equal(detached.content[0].props._els[1].props.widget.props._template[0].props.color, '#2d7b57')

const variant = captureFrameVariant([frame, child], frame, 'light', 'Sáng')
const shifted = [{ ...frame, x: 140, y: 160, responsive: { mobile: { x: 120, y: 130, w: 800 } }, props: { ...frame.props, _variants: [variant] } }, { ...child, x: 160, y: 180 }]
const applied = applyFrameVariant(shifted, 'frame', variant, () => 'new-text')
assert.equal(applied[0].x, 140)
assert.equal(applied[1].x, 160)
assert.equal(applied[1].parentId, 'frame')
assert.equal(applied[1].responsive.mobile.x, 140)
assert.equal(new Set(applied.map((el) => el.id)).size, applied.length)
const locked = shifted.map((el) => el.id === 'text' ? { ...el, props: { ...el.props, _locked: true } } : el)
assert.equal(applyFrameVariant(locked, 'frame', variant, () => 'x'), locked)
const expanded = expandReusableInstance([{ type: 'FreeCanvas', props: { id: 'source', _els: shifted } }], { type: 'Reusable', props: { id: 'instance', variants: { 'source::frame': 'light' } } })
assert.ok(expanded[0].props._els[1].parentId === expanded[0].props._els[0].id)
assert.equal(expanded[0].props._els[0].props._variant, 'light')
console.log('PASS linked styles update instances, preserve content, variants scope IDs and mobile coordinates, reusable selection and locks')

const edited = structuredClone(page)
edited.content[0].props._els[1].props.text = 'Nội dung mới'
assert.ok(isContentOnlyChange(page, edited))
for (const mutate of [p => p.content[0].props._els[1].x++, p => p.content[0].props._els[1].props.color = '#fff', p => p.content.pop(), p => p.root.props._contentOnly = false, p => p.content[0].props._els[1].responsive.mobile.x++]) {
  const forged = structuredClone(edited); mutate(forged)
  assert.equal(isContentOnlyChange(page, forged), false)
  assert.deepEqual(contentOnlyPage(page, forged).content[0].props._els[1].props.text, forged.content.length ? 'Nội dung mới' : child.props.text)
}
const changed = structuredClone(edited); changed.content[0].props._els[1].x = 150
const changes = pageChanges(page, changed)
assert.ok(changes.some((change) => change.el === 'text'))
assert.deepEqual(restorePagePart(changed, page, { block: 'main', el: 'frame' }).content, page.content)
const deleted = { ...page, content: [] }
assert.deepEqual(restorePagePart(deleted, page, { block: 'main', el: '' }).content, page.content)
const moved = { ...page, content: [{ ...page.content[0], props: { ...page.content[0].props, _els: [] } }, { type: 'FreeCanvas', props: { id: 'other', _els: [frame, child, { ...child, id: 'new-descendant' }] } }] }
const restoredSection = restorePagePart(moved, page, { block: 'main', el: '' })
assert.deepEqual(restoredSection.content[0], page.content[0])
assert.deepEqual(restoredSection.content[1].props._els, [])
const reordered = { ...page, content: [{ ...page.content[0], props: { ...page.content[0].props, _els: [child, frame] } }] }
assert.ok(pageChanges(page, reordered).some((change) => change.el === 'text'))
const sections = { ...page, content: [...page.content, { type: 'Text', props: { id: 'second', text: 'Other' } }] }
const swapped = { ...sections, content: [...sections.content].reverse() }
assert.equal(pageChanges(sections, swapped).filter((change) => !change.el).length, 2)
assert.deepEqual(restorePagePart(swapped, sections, { block: 'main', el: '' }).content, sections.content)

assert.deepEqual(page, original)
console.log('PASS content-only policy rejects geometry/style/structure/device changes, visual diff and scoped restoration preserve source')

const items = [{ title: 'Ống đồng', category: 'Ống', price: 30 }, { title: 'Van nước', category: 'Van', price: 20 }, { title: 'Ống nhựa', category: 'Ống', price: 10 }, { title: 'Ống kín giá', category: 'Ống', price: 'Liên hệ' }]
let query = repeatQuery({ id: 'one', count: 1, search: 'yes', filter: 'yes', sorting: 'yes', paginate: 'yes' }, { r_one_q: 'ong', r_one_category: 'Ống', r_one_sort: 'price', r_one_page: '2', r_other_q: 'Van' })
let result = queryRepeatItems(items, query)
assert.equal(result.items[0].title, 'Ống đồng')
assert.equal(result.total, 3); assert.equal(result.pages, 3)
assert.equal(repeatPrefix('other'), 'r_other_')
assert.equal(queryRepeatItems(items, { ...query, page: 1000 }).items[0].price, 'Liên hệ')
assert.equal(repeatQuery({ id: 'one' }, { r_one_q: 'ignored', r_one_page: '99' }).q, '')
assert.equal(repeatQuery({ id: 'one' }, { r_one_q: 'ignored', r_one_page: '99' }).page, 1)
assert.deepEqual(items.map((item) => item.price), [30,20,10,'Liên hệ'])
console.log('PASS independent repeater filters, accent search, sorting, pagination and hidden-price order')

assert.deepEqual(queryRepeatItems([{ title: 'A', price: '20' }, { title: 'B', price: '3' }, { title: 'C', price: 'Liên hệ' }], { ...query, q: '', category: '', size: 10, page: 1 }).items.map((item) => item.price), ['3', '20', 'Liên hệ'])
