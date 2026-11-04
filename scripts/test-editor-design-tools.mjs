import assert from 'node:assert/strict'
import { createFrameLayout, resizeFrameColumns, splitFrame, mergeFrameCells, reorderFrameChild, insertIntoFrame } from '../packages/blocks/src/frame-layout.ts'
import { arrangeResolvedElements, constrainedElements } from '../packages/blocks/src/layout-constraints.ts'
import { pageForDevice, mergeDevicePage } from '../packages/blocks/src/responsive-layout.ts'
import { normalizeFormRules, calculateFormQuote, validateFormValues } from '../packages/blocks/src/form-rules.ts'
import { bindRepeatTemplate, DEFAULT_REPEAT_TEMPLATE } from '../packages/blocks/src/repeater-data.ts'
const layout = createFrameLayout('halves'), root = layout[0]
const sized = constrainedElements(resizeFrameColumns(layout, root.id, 0, 180), 'desktop')
assert.ok(sized[1].w > layout[1].w && sized[2].w < layout[2].w)
assert.equal(sized[1].w + sized[2].w, layout[1].w + layout[2].w)
const limit = constrainedElements(resizeFrameColumns(layout, root.id, 0, 100000), 'desktop')
assert.ok(limit[2].w >= 47.9)
assert.deepEqual(resizeFrameColumns(layout, root.id, -1, 100), layout)
const text = { id: 'child', type: 'text', x: 20, y: 20, w: 300, h: 40, props: { text: 'Chữ trong ô', size: 20 } }
const populated = insertIntoFrame(layout, layout[1].id, [text])
const divided = constrainedElements(splitFrame(populated, layout[1].id, 'row'), 'desktop')
const content = divided.find((el) => el.id === text.id), cell = divided.find((el) => el.id === content.parentId)
assert.equal(cell.parentId, layout[1].id)
assert.ok(content.x >= cell.x && content.x + content.w <= cell.x + cell.w + 1)
const merged = mergeFrameCells(divided, layout[1].id)
assert.equal(merged.find((el) => el.id === text.id).parentId, layout[1].id)
assert.equal(merged.find((el) => el.id === text.id).props.text, text.props.text)
const locked = layout.map((el) => el.id === root.id ? { ...el, props: { ...el.props, _locked: true } } : el)
assert.equal(splitFrame(locked, root.id, 'row'), locked)
assert.equal(resizeFrameColumns(locked, root.id, 0, 20), locked)
const reordered = constrainedElements(reorderFrameChild(layout, layout[1].id, 1), 'desktop')
assert.ok(reordered.find((el) => el.id === layout[1].id).x > reordered.find((el) => el.id === layout[2].id).x)
console.log('PASS dividers preserve width/minimums, nested split/merge retains content, reorder, immutable locks')

const flow = [{ id: 'flow', type: 'container', x: 0, y: 0, w: 500, h: 300, props: { _layout: { direction: 'column', padding: 20, gap: 12 }, _sizing: { height: 'hug' } } }, { ...text, parentId: 'flow', w: 40, props: { ...text.props, text: 'Một đoạn nội dung dài cần tự xuống dòng trong khung', _sizing: { width: 'fill', height: 'hug' } } }]
const hug = constrainedElements(flow, 'desktop')
assert.equal(hug[1].w, 460)
assert.ok(hug[1].h >= 40 && hug[0].h >= hug[1].h + 40)
const fills = constrainedElements([{ ...flow[0], props: { _layout: { direction: 'row', padding: 20, gap: 12 } } }, { ...text, id: 'a', parentId: 'flow', props: { _sizing: { width: 'fill' } } }, { ...text, id: 'b', parentId: 'flow', props: { _sizing: { width: 'fill' } } }], 'desktop')
assert.equal(fills[1].w, 224); assert.equal(fills[2].w, 224)
const image = { ...text, id: 'image', type: 'image', props: { src: '/photo.png', focalX: 50, focalY: 50, imageZoom: 1 } }
const page = { content: [{ type: 'FreeCanvas', props: { id: 'main', height: 400, _els: [image] } }] }
const mobile = pageForDevice(page, 'mobile'); mobile.content[0].props._els[0].props.focalX = 80
const saved = mergeDevicePage(page, mobile, 'mobile')
assert.equal(saved.content[0].props._els[0].props.focalX, 50)
assert.equal(pageForDevice(saved, 'mobile').content[0].props._els[0].props.focalX, 80)
console.log('PASS hug/fill geometry, wrapping and independent mobile image framing')
const mobileGrid = constrainedElements(layout, 'mobile')
const reorderedMobile = arrangeResolvedElements(reorderFrameChild(mobileGrid, layout[1].id, 1), 390)
const mobileFirst = reorderedMobile.find((el) => el.id === layout[2].id), mobileLast = reorderedMobile.find((el) => el.id === layout[1].id)
assert.ok(mobileLast.y > mobileFirst.y + mobileFirst.h)
assert.deepEqual(reorderedMobile[0].props._layout, layout[0].props._layout, 'temporary mobile arrangement does not rewrite shared grid settings')

const fields = [{ name: 'service', label: 'Dịch vụ', type: 'select', options: 'Cơ bản,Nâng cao', required: true }, { name: 'qty', label: 'Số lượng', type: 'number', required: true }, { name: 'extra', label: 'Bổ sung', type: 'checkbox' }]
const rules = normalizeFormRules({ fields: { qty: { min: 0, max: 100 }, extra: { when: { field: 'service', operator: 'equals', value: 'Nâng cao' } } }, quote: { label: 'Tổng', currency: 'VND', base: 100, lines: [{ field: 'service', price: 500, options: { 'Nâng cao': 1200 }, quantityField: 'qty' }, { field: 'extra', price: 300 }] } }, fields)
assert.equal(calculateFormQuote(fields, rules, { service: 'Nâng cao', qty: 2, extra: true, _quoteTotal: 1 }).total, 2800)
assert.equal(calculateFormQuote(fields, rules, { service: 'Cơ bản', qty: 2, extra: true }).total, 1100, 'forged hidden add-on is ignored')
assert.ok(validateFormValues(fields, rules, { service: 'Cơ bản', qty: -2 }).errors.qty)
assert.throws(() => normalizeFormRules({ quote: { ...rules.quote, lines: [{ field: 'missing', price: 2 }] } }, fields))
assert.throws(() => normalizeFormRules({ quote: { ...rules.quote, base: Infinity } }, fields))
assert.throws(() => normalizeFormRules({ quote: { ...rules.quote, lines: [{ field: 'service', price: -2 }] } }, fields))
const card = bindRepeatTemplate(DEFAULT_REPEAT_TEMPLATE, { title: '<script>unsafe</script>', href: 'javascript:alert(1)', cover: '/one.png', price: 2500 }, 'one')
assert.equal(card.find((el) => el.id === 'one-title').props.text, '<script>unsafe</script>')
assert.equal(card.find((el) => el.id === 'one-cover').props.src, '/one.png')
assert.ok(card.every((el) => !el.parentId || card.some((parent) => parent.id === el.parentId)))
assert.equal(DEFAULT_REPEAT_TEMPLATE[1].props.src, undefined)
console.log('PASS trustworthy quotes, hidden-value rejection and template data binding without source mutation')
