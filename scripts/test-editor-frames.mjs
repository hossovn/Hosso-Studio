import assert from 'node:assert/strict'
import { createFrameLayout, frameAtPoint, insertIntoFrame, moveIntoFrame } from '../packages/blocks/src/frame-layout.ts'
import { elementFamily } from '../packages/blocks/src/free-geometry.ts'
import { pageForDevice } from '../packages/blocks/src/responsive-layout.ts'
import { normalizeFormRules, validateFormValues, visibleFormFields } from '../packages/blocks/src/form-rules.ts'
import { arrangePageSelection, deleteSelection, duplicateSelection, measureOwnerOrigins, selectedElements, selectionOnPage, transferPageSelection, translatePageSelection } from '../apps/studio/src/app/(editor)/editor/[id]/canvas-selection.ts'
import { applyPageReplacements, findPageReplacements } from '../apps/studio/src/app/(editor)/editor/[id]/page-replace.ts'

const layout = createFrameLayout('halves'), root = layout[0], [left, right] = layout.slice(1)
assert.equal(left.parentId, root.id)
assert.equal(frameAtPoint(layout, left.x + 10, left.y + 10).id, left.id)
assert.equal(frameAtPoint(layout, left.x + 10, left.y + 10, [root.id]), undefined)
const text = { id: 'text', type: 'text', x: 0, y: 0, w: 800, h: 80, props: { text: 'Nội dung mẫu', size: 40 } }
const before = structuredClone(layout), inserted = insertIntoFrame(layout, left.id, [text])
assert.deepEqual(layout, before, 'insertion never mutates source templates')
const child = inserted.at(-1)
assert.equal(child.parentId, left.id)
assert.ok(child.x >= left.x && child.x + child.w <= left.x + left.w)
assert.equal(child.w / child.h, text.w / text.h)
const moved = moveIntoFrame(inserted, child.id, right.id)
assert.equal(moved.at(-1).parentId, right.id)
assert.equal(moveIntoFrame(moved, root.id, right.id), moved, 'a frame cannot enter its descendant')
assert.equal(insertIntoFrame([{ ...left, props: { _locked: true } }], left.id, [text]).length, 1)
const data = { root: { props: {} }, content: [{ type: 'FreeCanvas', props: { id: 'main', height: 440, _els: moved } }] }
const mobile = pageForDevice(data, 'mobile').content[0].props
const mobileCells = mobile._els.filter((el) => el.parentId === root.id)
assert.ok(mobileCells[1].y >= mobileCells[0].y + mobileCells[0].h, 'frames stack without overlap on mobile')
assert.ok(mobile.height >= mobileCells.at(-1).y + mobileCells.at(-1).h, 'public section grows with mobile grid')
assert.equal(elementFamily(moved, root.id).length, 4)
console.log('PASS real frame hierarchy, nested insertion, aspect ratio, cycle/lock protection and mobile stacking')

const page = { content: [{ type: 'FreeCanvas', props: { id: 'a', height: 500, _els: [{ ...text, id: 'one', x: 80, y: 100 }] } }, { type: 'FreeCanvas', props: { id: 'b', height: 500, _els: [{ ...text, id: 'two', x: 300, y: 40 }] } }] }
const sel = { block: 'b', el: 'two', multi: ['one', 'two'] }, origins = measureOwnerOrigins(page)
assert.equal(selectedElements(page, sel).length, 2)
assert.deepEqual(selectionOnPage(page, sel, origins).map((el) => el.y), [100, 540])
const translated = translatePageSelection(page, sel, 20, 30)
assert.equal(translated.content[0].props._els[0].x, 100)
assert.equal(translated.content[1].props._els[0].y, 70)
assert.equal(duplicateSelection(page, sel).data.content[0].props._els.length, 2)
assert.ok(deleteSelection(page, sel).content.every((block) => !block.props._els.length))
const aligned = arrangePageSelection(page, sel, 'top', origins)
assert.deepEqual(selectionOnPage(aligned, sel, origins).map((el) => el.y), [100, 100])
const transfer = transferPageSelection(page, sel, 'b', origins)
assert.equal(transfer.content[0].props._els.length, 0)
assert.equal(transfer.content[1].props._els.length, 2)
assert.equal(transfer.content[1].props._els[1].y - transfer.content[1].props._els[0].y, 440)
const matches = findPageReplacements(page, 'text', 'mẫu', 'mới')
assert.equal(matches.length, 2)
assert.equal(applyPageReplacements(page, matches).content[1].props._els[0].props.text, 'Nội dung mới')
assert.equal(findPageReplacements({ content: [{ type: 'FreeCanvas', props: { id: 'locked', _els: [{ ...text, props: { ...text.props, _locked: true } }] } }] }, 'text', 'mẫu', 'mới').length, 0)
console.log('PASS cross-section copy/duplicate/delete/move/align/transfer and page replacement with locks')

const fields = [{ name: 'kind', label: 'Loại', type: 'select', required: true, options: 'Cá nhân,Doanh nghiệp' }, { name: 'company', label: 'Công ty', type: 'text', required: true }, { name: 'quantity', label: 'Số lượng', type: 'number', required: true }, { name: 'agree', label: 'Đồng ý', type: 'checkbox', required: true }]
const rules = normalizeFormRules({ steps: ['Nhu cầu', 'Chi tiết'], fields: { company: { step: 1, when: { field: 'kind', operator: 'equals', value: 'Doanh nghiệp' }, minLength: 3 }, quantity: { step: 1, min: 2, max: 10 }, agree: { step: 1 } } }, fields)
assert.equal(visibleFormFields(fields, rules, { kind: 'Cá nhân' }).some((field) => field.name === 'company'), false)
const good = validateFormValues(fields, rules, { kind: 'Cá nhân', company: 'Forged hidden value', quantity: '3', agree: true })
assert.deepEqual(good, { data: { kind: 'Cá nhân', quantity: 3, agree: true }, errors: {} })
assert.deepEqual(validateFormValues(fields, rules, { kind: 'Doanh nghiệp' }, 0).errors, {})
assert.deepEqual(Object.keys(validateFormValues(fields, rules, { kind: 'Doanh nghiệp', company: 'ab', quantity: 11, agree: false }).errors), ['company', 'quantity', 'agree'])
assert.throws(() => normalizeFormRules({ fields: { kind: { when: { field: 'company', operator: 'filled' } } } }, fields), /đứng trước/)
assert.throws(() => normalizeFormRules({ fields: [] }, fields), /không hợp lệ/)
assert.throws(() => normalizeFormRules({ steps: ['Một'], fields: { company: { step: 4 } } }, fields))
console.log('PASS multistep validation, conditional required fields, hidden-value rejection, limits and dependency guards')
