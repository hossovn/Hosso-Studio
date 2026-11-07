import assert from 'node:assert/strict'
import { readLinkAction, actionHref } from '../packages/blocks/src/link-actions.ts'
import {
  captureFrameVariant,
  ensureDefaultFrameVariant,
  switchFrameVariant,
  materializeFrameVariant,
} from '../packages/blocks/src/design-presets.ts'
import { contentOnlyPage, isContentOnlyChange } from '../packages/blocks/src/content-editing.ts'

// 1. Link actions: #state:<frameId>:<variantId> and #popover:<frameId>
assert.equal(actionHref('state', 'frame_tablet:tab_menu'), '#state:frame_tablet:tab_menu')
assert.deepEqual(readLinkAction('#state:frame_tablet:tab_menu'), {
  type: 'state',
  value: 'frame_tablet:tab_menu',
  frameId: 'frame_tablet',
  variantId: 'tab_menu',
})
assert.equal(actionHref('popover', 'qr_zalo'), '#popover:qr_zalo')
assert.deepEqual(readLinkAction('#popover:qr_zalo'), {
  type: 'popover',
  value: 'qr_zalo',
  frameId: 'qr_zalo',
})

// Reject malformed or injection strings
assert.equal(actionHref('state', 'missing_variant'), '')
assert.equal(actionHref('state', 'bad id:tab_1'), '')
assert.equal(actionHref('state', 'frame:tab:extra'), '')
assert.equal(actionHref('popover', 'bad space'), '')
assert.equal(actionHref('popover', '<script>'), '')
assert.notEqual(readLinkAction('#state:bad space:tab').type, 'state')
assert.notEqual(readLinkAction('#popover:bad<script>').type, 'popover')
console.log('PASS Task 1.1: #state and #popover link actions round-trip and reject invalid IDs')

// 2. Interactive frame variants: ensureDefaultFrameVariant, switchFrameVariant, materializeFrameVariant
const baseFrame = {
  id: 'f1',
  type: 'container',
  x: 100,
  y: 120,
  w: 500,
  h: 320,
  props: { _frame: true, bg: '#ffffff' },
  responsive: { mobile: { x: 20, y: 40, w: 350 } },
}
const baseChild = {
  id: 'c1',
  parentId: 'f1',
  type: 'text',
  x: 130,
  y: 150,
  w: 240,
  h: 60,
  props: { text: 'Tab 1 Original', color: '#111827', size: 20 },
  responsive: { mobile: { x: 36, y: 60 } },
}

let list = ensureDefaultFrameVariant([baseFrame, baseChild], 'f1')
assert.equal(list[0].props._variant, 'default')
assert.equal(list[0].props._variants.length, 1)
assert.equal(list[0].props._variants[0].id, 'default')

// Add second variant 'tab2' from current design
const tab2 = captureFrameVariant(list, list[0], 'tab2', 'Tab 2')
list = list.map((el) =>
  el.id === 'f1' ? { ...el, props: { ...el.props, _variants: [...el.props._variants, tab2] } } : el,
)

// Edit c1 while on 'default', then switch to 'tab2' -> edit must auto-save into 'default'!
list = list.map((el) => (el.id === 'c1' ? { ...el, props: { ...el.props, text: 'Tab 1 Edited' } } : el))
list = switchFrameVariant(list, 'f1', 'tab2')
assert.equal(list[0].props._variant, 'tab2')
assert.equal(list[1].id, 'c1', 'Child ID must stay stable when switching variants of the same frame')
assert.equal(list[1].props.text, 'Tab 1 Original')
assert.equal(
  list[0].props._variants.find((v) => v.id === 'default').elements.find((e) => e.id === 'c1').props.text,
  'Tab 1 Edited',
)

// Edit c1 while on 'tab2', then switch back to 'default' -> both variants preserve their own edits!
list = list.map((el) => (el.id === 'c1' ? { ...el, props: { ...el.props, text: 'Tab 2 Edited' } } : el))
list = switchFrameVariant(list, 'f1', 'default')
assert.equal(list[0].props._variant, 'default')
assert.equal(list[1].id, 'c1')
assert.equal(list[1].props.text, 'Tab 1 Edited')
assert.equal(
  list[0].props._variants.find((v) => v.id === 'tab2').elements.find((e) => e.id === 'c1').props.text,
  'Tab 2 Edited',
)

// Move frame f1 to (200, 220) and mobile (50, 70), then materialize 'tab2' read-only
const movedList = list.map((el) => {
  if (el.id === 'f1') return { ...el, x: 200, y: 220, responsive: { mobile: { x: 50, y: 70, w: 350 } } }
  if (el.id === 'c1') return { ...el, x: 230, y: 250, responsive: { mobile: { x: 66, y: 90 } } }
  return el
})
const projected = materializeFrameVariant(movedList, 'f1', 'tab2')
assert.equal(projected[0].x, 200)
assert.equal(projected[1].id, 'c1')
assert.equal(projected[1].x, 230)
assert.equal(projected[1].y, 250)
assert.equal(projected[1].responsive.mobile.x, 66)
assert.equal(projected[1].responsive.mobile.y, 90)
assert.equal(projected[1].props.text, 'Tab 2 Edited')
// Input not mutated
assert.equal(movedList[1].props.text, 'Tab 1 Edited')

// Locked frame refuses switchFrameVariant
const lockedList = movedList.map((el) => (el.id === 'f1' ? { ...el, props: { ...el.props, _locked: true } } : el))
assert.equal(switchFrameVariant(lockedList, 'f1', 'tab2'), lockedList)
console.log('PASS Task 1.2: ensureDefaultFrameVariant, switchFrameVariant, and materializeFrameVariant')

// 3. Content-only editing safety across _variants and accordion items
const faqEl = {
  id: 'faq1',
  type: 'accordion',
  x: 80,
  y: 480,
  w: 600,
  h: 260,
  props: {
    iconStyle: 'plus',
    items: [
      { question: 'Câu hỏi 1?', answer: 'Trả lời 1', defaultOpen: true },
      { question: 'Câu hỏi 2?', answer: 'Trả lời 2', defaultOpen: false },
    ],
  },
}
const pageBase = {
  root: { props: { _contentOnly: true } },
  content: [{ type: 'FreeCanvas', props: { id: 'sec1', height: 800, _els: [...movedList, faqEl] } }],
}

// Authorized content edit inside inactive variant ('tab2') and accordion question/answer
const validContentEdit = structuredClone(pageBase)
validContentEdit.content[0].props._els[0].props._variants[1].elements[1].props.text = 'Tab 2 Translated'
validContentEdit.content[0].props._els[2].props.items[0].question = 'Câu hỏi 1 (mới)?'
validContentEdit.content[0].props._els[2].props.items[1].answer = 'Trả lời 2 (mới)'
assert.equal(isContentOnlyChange(pageBase, validContentEdit), true)
assert.equal(
  contentOnlyPage(pageBase, validContentEdit).content[0].props._els[0].props._variants[1].elements[1].props.text,
  'Tab 2 Translated',
)

// Unauthorized mutations inside _variants or accordion structure must be rejected
for (const tamper of [
  (p) => { p.content[0].props._els[0].props._variants[1].elements[1].x += 20 },
  (p) => { p.content[0].props._els[0].props._variants.pop() },
  (p) => { p.content[0].props._els[2].props.items.push({ question: 'Extra', answer: 'No' }) },
  (p) => { p.content[0].props._els[2].props.items[0].defaultOpen = false },
  (p) => { p.content[0].props._els[2].props.iconStyle = 'chevron' },
]) {
  const bad = structuredClone(validContentEdit)
  tamper(bad)
  assert.equal(isContentOnlyChange(pageBase, bad), false)
}
console.log('PASS Task 1.3: content-only lock permits copy edits in _variants & accordion items while blocking tampering')
