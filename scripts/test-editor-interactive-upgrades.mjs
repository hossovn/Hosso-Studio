import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const studioRequire = createRequire(new URL('../apps/studio/package.json', import.meta.url))
const React = studioRequire('react')
const { renderToStaticMarkup } = studioRequire('react-dom/server')
import { readLinkAction, actionHref } from '../packages/blocks/src/link-actions.ts'
import {
  captureFrameVariant,
  ensureDefaultFrameVariant,
  switchFrameVariant,
  materializeFrameVariant,
} from '../packages/blocks/src/design-presets.ts'
import { contentOnlyPage, isContentOnlyChange } from '../packages/blocks/src/content-editing.ts'
import { FREE_FONTS, fillCss, safeCssColor } from '../packages/blocks/src/free-style.ts'
import { ICON_BODY } from '../packages/blocks/src/icons-data.ts'
import { FONTS } from '../packages/blocks/src/types.ts'
import { normalizeFormRules } from '../packages/blocks/src/form-rules.ts'
import { FormView } from '../packages/blocks/src/FormView.tsx'
import { LocaleProvider } from '../packages/blocks/src/locale-client.tsx'
import { baseCss } from '../packages/blocks/src/base-css.ts'
import { FreeCanvasView, FreeElementView, FreeOverlay, makeElement } from '../packages/blocks/src/FreeCanvas.tsx'
import {
  defaultActiveVariants,
  extractPopoverFamily,
  isTriggerActive,
  projectInteractiveList,
} from '../packages/blocks/src/FreeInteractiveScope.tsx'
import { SECTION_TEMPLATES } from '../apps/studio/src/app/(editor)/editor/[id]/SectionTemplates.ts'

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

// 4. Task 2: Fonts, Icons, Radial/Blur fillCss + safeCssColor, and 2-Column Stylable Forms
for (const fontName of ['Manrope', 'Inter', 'Plus Jakarta Sans', 'Noto Sans KR']) {
  assert.ok(FREE_FONTS.some((f) => f.name === fontName), `FREE_FONTS must include ${fontName}`)
  assert.ok(Object.values(FONTS).includes(fontName), `FONTS must include ${fontName}`)
}
for (const icon of [
  'arrow-up-right',
  'arrow-down',
  'tablet',
  'monitor',
  'smartphone',
  'wifi',
  'signal',
  'battery-full',
  'phone-call',
  'message-circle',
  'plus',
  'play',
  'pause',
  'qr-code',
]) {
  assert.ok(Boolean(ICON_BODY[icon]), `ICON_BODY must include ${icon}`)
}

assert.equal(safeCssColor('#facc15'), '#facc15')
assert.equal(safeCssColor('#fff'), '#fff')
assert.equal(safeCssColor('#facc1580'), '#facc1580')
assert.equal(safeCssColor('transparent'), 'transparent')
assert.equal(safeCssColor('rgba(255, 255, 255, 0.85)'), 'rgba(255, 255, 255, 0.85)')
assert.equal(safeCssColor('red;background:url(evil)', ''), '')
assert.equal(safeCssColor('javascript:alert(1)', '#000000'), '#000000')
assert.equal(
  fillCss({ bg: '#facc15', bg2: 'transparent', fillType: 'radial' }),
  'radial-gradient(circle at 50% 50%, #facc15, transparent)',
)
assert.equal(
  fillCss({ bg: '#facc15', bg2: '#f59e0b', angle: 90 }),
  'linear-gradient(90deg, #facc15, #f59e0b)',
)
assert.equal(fillCss({ bg: 'red;background:url(evil)', bg2: 'transparent', fillType: 'radial' }), undefined)
console.log('PASS Task 2.1: Fonts, Lucide icons, radial fillCss, and safeCssColor injection defense')

const formFields = [
  { name: 'name', label: 'Họ tên', type: 'text', required: true },
  { name: 'phone', label: 'Số điện thoại', type: 'tel', required: true },
  { name: 'note', label: 'Ghi chú', type: 'textarea' },
  { name: 'consent', label: 'Đồng ý chính sách bảo mật', type: 'checkbox', required: true },
]
const normalizedRules = normalizeFormRules(
  { fields: { name: { width: 'half' }, phone: { width: 'half' }, note: { width: 'full' } } },
  formFields,
)
assert.equal(normalizedRules.fields?.name?.width, 'half')
assert.equal(normalizedRules.fields?.phone?.width, 'half')
assert.equal(normalizedRules.fields?.note?.width, 'full')
assert.throws(() => normalizeFormRules({ fields: { name: { width: 'third' } } }, formFields))

assert.match(baseCss, /\.ss-form>label\.is-half\{grid-column:span 1\}/)
const formHtml = renderToStaticMarkup(
  React.createElement(
    LocaleProvider,
    { locale: 'vi', preview: false },
    React.createElement(FormView, {
      form: {
        slug: 'tu-van',
        title: 'Đăng ký tư vấn',
        submitLabel: 'Gửi yêu cầu',
        fields: formFields,
        rules: normalizedRules,
      },
      submitIcon: 'arrow-up-right',
      submitFull: true,
    }),
  ),
)
assert.match(formHtml, /class="[^"]*is-half[^"]*"/)
assert.match(formHtml, /data-hs-part="form"/)
assert.match(formHtml, /data-hs-part="field"/)
assert.match(formHtml, /data-hs-part="input"/)
assert.match(formHtml, /data-hs-part="checkbox"/)
assert.match(formHtml, /data-hs-part="submit"/)
assert.match(formHtml, /M7 7h10v10/)
console.log('PASS Task 2.2: Two-column FieldRule.width, FormView submitIcon & data-hs-part hooks')

// 5. Task 3: Canvas Primitives (accordion, video overlay, swiper multi-card/playToggle, shape blur, svh Hero & gradient overlay)
const accEl = makeElement('accordion', {
  props: {
    exclusive: true,
    iconStyle: 'plus',
    items: [
      { question: 'MenuMate có cần mạng Internet không?', answer: 'Hỗ trợ đồng bộ nội bộ mượt mà.', defaultOpen: true },
      { question: 'Thời gian triển khai bao lâu?', answer: 'Chỉ 24 giờ để lên thực đơn.', defaultOpen: false },
    ],
  },
})
assert.equal(accEl.type, 'accordion')
const accHtml = renderToStaticMarkup(React.createElement(FreeElementView, { el: accEl }))
assert.match(accHtml, /<details[^>]*open/)
assert.match(accHtml, /<details[^>]*name="hs-acc-/)
assert.match(accHtml, /<summary/)
assert.match(accHtml, /MenuMate có cần mạng Internet không\?/)
assert.match(accHtml, /Thời gian triển khai bao lâu\?/)
assert.doesNotMatch(accHtml, /transition:\s*all/i)

const vidEl = makeElement('video', {
  props: {
    url: '/demo/tablet-order.mp4',
    poster: '/editor-templates/restaurant.jpg',
    controlsMode: 'overlay',
    playLabel: 'Xem video giới thiệu',
    pauseLabel: 'Tạm dừng video',
    radius: 16,
  },
})
const vidHtml = renderToStaticMarkup(React.createElement(FreeElementView, { el: vidEl }))
assert.match(vidHtml, /<video[^>]*playsInline/i)
assert.match(vidHtml, /aria-label="Xem video giới thiệu"/)

const auraShape = makeElement('shape', {
  props: { bg: '#facc15', bg2: 'transparent', fillType: 'radial', blur: 24, radius: 999 },
})
const shapeHtml = renderToStaticMarkup(React.createElement(FreeElementView, { el: auraShape }))
assert.match(shapeHtml, /radial-gradient\(circle at 50% 50%, #facc15, transparent\)/)
assert.match(shapeHtml, /filter:blur\(/)

const svhPublicHtml = renderToStaticMarkup(
  React.createElement(FreeCanvasView, {
    id: 'hero1',
    height: 760,
    heightMode: 'svh',
    svh: 100,
    svhOffset: 82,
    minHeightPx: 610,
    bgImage: '/editor-templates/restaurant.jpg',
    bgOverlay: 85,
    bgOverlayColor: '#111827',
    bgOverlayColor2: 'transparent',
    bgOverlayAngle: 90,
  }),
)
assert.match(svhPublicHtml, /min-height:max\(610px, calc\(100svh - 82px\)\)/)
assert.match(svhPublicHtml, /linear-gradient\(90deg, #111827, transparent\)/)

const svhEditorHtml = renderToStaticMarkup(
  React.createElement(FreeCanvasView, {
    id: 'hero1',
    height: 760,
    heightMode: 'svh',
    svh: 100,
    svhOffset: 82,
    minHeightPx: 610,
    _noFree: true,
  }),
)
assert.doesNotMatch(svhEditorHtml, /100svh/)
console.log('PASS Task 3: accordion, video overlay, radial-blur shape, svh Hero & directional bgOverlay')

// 6. Task 4: FreeInteractiveScope (#state tab switching + #popover portal projection & active states)
const qrFrame = {
  id: 'qr_pop',
  type: 'container',
  x: 880,
  y: 90,
  w: 240,
  h: 280,
  props: { _frame: true, _isPopover: true, bg: '#ffffff', radius: 16 },
}
const qrChild = {
  id: 'qr_text',
  parentId: 'qr_pop',
  type: 'text',
  x: 900,
  y: 120,
  w: 200,
  h: 40,
  props: { text: 'Quét mã Zalo OA', size: 16, color: '#111827' },
}
const btnTab1 = makeElement('button', { id: 'b_t1', props: { text: 'Tab 1', href: '#state:f1:default' } })
const btnTab2 = makeElement('button', { id: 'b_t2', props: { text: 'Tab 2', href: '#state:f1:tab2' } })
const btnQr = makeElement('button', { id: 'b_qr', props: { text: 'Tư vấn Zalo', href: '#popover:qr_pop' } })
const interactiveList = [...movedList, qrFrame, qrChild, btnTab1, btnTab2, btnQr]

const defaults = defaultActiveVariants(interactiveList)
assert.deepEqual(defaults, { f1: 'default' })

const flowDefault = projectInteractiveList(interactiveList, {}, true)
assert.equal(flowDefault.some((e) => e.id === 'qr_pop' || e.id === 'qr_text'), false, 'Popover frame must hide in normal flow')
assert.equal(flowDefault.find((e) => e.id === 'c1')?.props.text, 'Tab 1 Edited')

const flowTab2 = projectInteractiveList(interactiveList, { f1: 'tab2' }, true)
assert.equal(flowTab2.find((e) => e.id === 'c1')?.props.text, 'Tab 2 Edited')

const popEls = extractPopoverFamily(interactiveList, 'qr_pop', {})
assert.ok(popEls && popEls.length === 2)
assert.equal(popEls[0].x, 0)
assert.equal(popEls[0].y, 0)
assert.equal(popEls[1].x, 20)
assert.equal(popEls[1].y, 30)

assert.equal(isTriggerActive('#state:f1:default', {}, defaults, null), true)
assert.equal(isTriggerActive('#state:f1:tab2', {}, defaults, null), false)
assert.equal(isTriggerActive('#state:f1:tab2', { f1: 'tab2' }, defaults, null), true)
assert.equal(isTriggerActive('#popover:qr_pop', {}, defaults, null), false)
assert.equal(isTriggerActive('#popover:qr_pop', {}, defaults, 'qr_pop'), true)

const overlayHtml = renderToStaticMarkup(React.createElement(FreeOverlay, { elements: interactiveList, height: 600, scope: 'sec_demo' }))
assert.doesNotMatch(overlayHtml, /Quét mã Zalo OA/, 'Popover child text must not render inline before trigger')
assert.match(overlayHtml, /role="tab"/)
assert.match(overlayHtml, /aria-selected="true"/)
assert.match(overlayHtml, /aria-haspopup="dialog"/)
console.log('PASS Task 4: FreeInteractiveScope projection, popover extraction, and ARIA tab/popover SSR')

// 7. Task 5: Starter Interactive & SVH Section Templates + Unique Instance IDs
for (const id of ['hero-svh', 'interactive-tabs', 'interactive-steps', 'faq-accordion']) {
  const tpl = SECTION_TEMPLATES.find((item) => item.id === id)
  assert.ok(tpl, `Missing starter SECTION_TEMPLATE "${id}"`)
  const first = tpl.build()
  const second = tpl.build()
  assert.ok(first.length >= 2, `Template "${id}" must produce elements`)
  const ids1 = new Set(first.map((el) => el.id))
  assert.equal(ids1.size, first.length, `Template "${id}" elements must have unique IDs`)
  for (const el of second) {
    assert.equal(ids1.has(el.id), false, `Template "${id}" build() must mint fresh IDs per insertion`)
  }
}

const heroSvh = SECTION_TEMPLATES.find((item) => item.id === 'hero-svh')
assert.equal(heroSvh.extraProps?.heightMode, 'svh')
assert.equal(heroSvh.extraProps?.svh, 100)
assert.equal(heroSvh.extraProps?.bgOverlayColor2, 'transparent')

for (const id of ['interactive-tabs', 'interactive-steps']) {
  const tpl = SECTION_TEMPLATES.find((item) => item.id === id)
  const els = tpl.build()
  const triggers = els.filter((el) => typeof el.props.href === 'string' && el.props.href.startsWith('#state:'))
  assert.ok(triggers.length >= 3, `Template "${id}" must include >= 3 #state triggers`)
  for (const trig of triggers) {
    const parsed = readLinkAction(trig.props.href)
    assert.equal(parsed.type, 'state')
    const [targetFrameId, variantId] = parsed.value.split(':')
    const frame = els.find((el) => el.id === targetFrameId && el.type === 'container')
    assert.ok(frame, `Trigger ${trig.props.href} in "${id}" must target a container frame in the same template`)
    assert.ok(
      Array.isArray(frame.props._variants) && frame.props._variants.some((v) => v.id === variantId),
      `Trigger ${trig.props.href} in "${id}" must match a variant in target frame _variants`,
    )
    assert.ok(trig.props._states?.desktop?.active, `Trigger in "${id}" should define _states.desktop.active styling`)
  }
}

const faqTpl = SECTION_TEMPLATES.find((item) => item.id === 'faq-accordion')
const faqEls = faqTpl.build()
const faqAcc = faqEls.find((el) => el.type === 'accordion')
assert.ok(faqAcc && Array.isArray(faqAcc.props.items) && faqAcc.props.items.length >= 3)
console.log('PASS Task 5: Starter templates (hero-svh, interactive-tabs, interactive-steps, faq-accordion) verified')
