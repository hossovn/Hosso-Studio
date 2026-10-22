import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import Module, { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { editorPreviewParams, normalizeEditorPreview } from '../packages/blocks/src/editor-preview-state.ts'
import * as widgetParts from '../packages/blocks/src/widget-parts.ts'
import * as elementStates from '../packages/blocks/src/element-states.ts'
import * as scrollEffects from '../packages/blocks/src/scroll-effects.ts'
import { newId } from '../packages/blocks/src/free-geometry.ts'

const require = createRequire(new URL('../apps/studio/package.json', import.meta.url))
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const preview = { products: { shop: 'oil-filter', wim: 'wim-42' }, account: 'member' }
assert.deepEqual(editorPreviewParams('ShopProductDetail', preview), { p: 'oil-filter' })
assert.deepEqual(editorPreviewParams('WimProductDetail', preview), { p: 'wim-42' })
assert.deepEqual(editorPreviewParams('PostList', preview), {})
assert.deepEqual(editorPreviewParams('ShopProductDetail'), {})
assert.deepEqual(editorPreviewParams('ShopProductDetail', { ...preview, products: { shop: '', wim: '' } }), {})
assert.deepEqual(normalizeEditorPreview({ ...preview, cookies: { token: 'forged' }, searchParams: { id: 'private-order' } }), preview)
for (const value of [null, [], {}, { ...preview, account: 'admin' }, { ...preview, products: [] }, { ...preview, products: { shop: 'x'.repeat(201), wim: '' } }, { ...preview, products: { shop: '\n', wim: '' } }]) {
  assert.throws(() => normalizeEditorPreview(value), /invalid_preview/)
}

// Compile the actual boundary/component with isolated services, without booting Payload or CSS.
function compile(relative, stubs) {
  const path = fileURLToPath(new URL(relative, import.meta.url))
  const { outputText } = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } })
  const mod = new Module(path)
  mod.filename = path
  mod.paths = Module._nodeModulePaths(dirname(path))
  mod.require = (id) => Object.hasOwn(stubs, id) ? stubs[id] : require(id)
  mod._compile(outputText, path)
  return mod.exports
}
const { PAGE_TEMPLATES, TEMPLATE_CATEGORIES, pageTemplatePattern } = compile('../apps/studio/src/app/(editor)/editor/[id]/PageTemplates.ts', {
  '@hosso/studio-blocks': { makeElement: (type, over) => ({ id: newId(), type, ...over }) },
})
const freeStyle = compile('../packages/blocks/src/free-style.ts', {})
const scrollRuntime = compile('../packages/blocks/src/ScrollEffect.tsx', { './scroll-effects': scrollEffects })
const { FreeElementView, FreeOverlay, FreeCanvasView, makeElement } = compile('../packages/blocks/src/FreeCanvas.tsx', {
  './ScrollEffect': scrollRuntime, './scroll-effects': scrollEffects,
  './free-style': freeStyle, './free-extra': {}, './icons-data': { ICON_BODY: { test: '<path d="M4 4h16v16H4z" />' } }, './FreeSwiper': {}, './free-geometry': { newId }, './element-states': elementStates,
})
const legacyButton = makeElement('button', { id: 'legacy-button', props: { text: 'Legacy', href: '/legacy' } })
const { SECTION_TEMPLATES, SECTION_TEMPLATES_MORE, HEADER_TEMPLATES } = compile('../apps/studio/src/app/(editor)/editor/[id]/SectionTemplates.ts', { '@hosso/studio-blocks': { makeElement } })
for (const template of [...SECTION_TEMPLATES, ...SECTION_TEMPLATES_MORE]) {
  for (const el of template.build().filter((el) => el.type === 'image')) {
    assert.ok(el.props.src && el.props.alt, `${template.id}: sample image needs a source and alt text`)
    assert.ok(existsSync(new URL(`../apps/studio/public${el.props.src}`, import.meta.url)), `${template.id}: missing bundled image`)
  }
}
assert.ok(HEADER_TEMPLATES[0].build({ siteName: 'Demo' }).some((el) => el.type === 'heading' && el.props.text === 'Demo'))
assert.ok(HEADER_TEMPLATES[0].build({ logo: '/logo.png' }).some((el) => el.type === 'image' && el.props.src === '/logo.png'))
const sampleVideo = makeElement('video', { props: { url: '/clip.mp4', poster: '/editor-demo/trail.jpg' } })
assert.match(renderToStaticMarkup(React.createElement(FreeElementView, { el: sampleVideo })), /poster="\/editor-demo\/trail.jpg"/)
assert.match(renderToStaticMarkup(React.createElement(FreeElementView, { el: sampleVideo, editing: true })), /\/editor-demo\/trail.jpg/)
const legacyMarkup = renderToStaticMarkup(React.createElement(FreeElementView, { el: legacyButton }))
const scrollButton = { ...legacyButton, props: { ...legacyButton.props, _scroll: { mode: 'progress', fromOpacity: 0 }, _states: { hover: { desktop: { scale: 1.1 } } }, rotate: 12 } }
const scrollMarkup = renderToStaticMarkup(React.createElement(FreeElementView, { el: scrollButton }))
assert.match(scrollMarkup, /data-scroll-effect="progress"/)
assert.match(scrollMarkup, /rotate\(12deg\)/)
assert.match(scrollMarkup, /scale\(1.1\)/)
assert.doesNotMatch(renderToStaticMarkup(React.createElement(FreeElementView, { el: scrollButton, editing: true })), /data-scroll-effect/)
assert.doesNotMatch(renderToStaticMarkup(React.createElement(FreeElementView, { el: scrollButton, scrollEffects: false })), /data-scroll-effect/)
assert.doesNotMatch(renderToStaticMarkup(React.createElement(FreeElementView, { el: { ...legacyButton, props: { ...legacyButton.props, _scroll: { mode: 'invalid' } } } })), /data-scroll-effect/)
assert.match(renderToStaticMarkup(React.createElement(FreeOverlay, { elements: [scrollButton] })), /data-scroll-boundary="true"/)
const { ScrollEffectControls } = compile('../apps/studio/src/app/(editor)/editor/[id]/ScrollEffectControls.tsx', { '@hosso/studio-blocks': scrollEffects })
const scrollControls = renderToStaticMarkup(React.createElement(ScrollEffectControls, { value: { mode: 'progress' }, onChange: () => {} }))
for (const label of ['Khi cuộn', 'Parallax', 'Ghim trong section', 'Theo tiến độ cuộn', 'X đầu (px)', 'Tỉ lệ cuối', 'Kết thúc (%)', 'Tắt trên điện thoại']) assert.ok(scrollControls.includes(label))
console.log('PASS: scroll controls, SSR content, state/rotation composition and stable editing geometry')
assert.match(legacyMarkup, /href="\/legacy"/)
assert.doesNotMatch(legacyMarkup, /<style>/)
assert.match(renderToStaticMarkup(React.createElement(FreeElementView, { el: { ...legacyButton, props: { ...legacyButton.props, icon: 'test' } } })), /<svg/)
assert.doesNotMatch(renderToStaticMarkup(React.createElement(FreeElementView, { el: { ...legacyButton, props: { ...legacyButton.props, icon: '__proto__' } } })), /<svg/)
const stateButton = { ...legacyButton, id: 'state-button', props: elementStates.writeElementState(legacyButton.props, 'hover', 'desktop', { backgroundColor: '#dc2626', scale: 1.1, transitionMs: 200 }) }
const stateMarkup = renderToStaticMarkup(React.createElement(FreeElementView, { el: stateButton }))
assert.match(stateMarkup, new RegExp(elementStates.elementStateScope(stateButton.id) + ':hover'))
assert.match(stateMarkup, /background-color:#dc2626!important/)
assert.match(stateMarkup, /prefers-reduced-motion:reduce/)
assert.equal(renderToStaticMarkup(React.createElement(FreeElementView, { el: JSON.parse(JSON.stringify(stateButton)) })), stateMarkup)
const editingMarkup = renderToStaticMarkup(React.createElement(FreeElementView, { el: stateButton, editing: true, state: 'hover' }))
const opacityMarkup = renderToStaticMarkup(React.createElement(FreeElementView, { el: { ...stateButton, props: { ...stateButton.props, opacity: 50 } } }))
assert.equal((opacityMarkup.match(/opacity:0.5/g) ?? []).length, 1)
assert.match(editingMarkup, /data-hs-state="hover"/)
assert.match(editingMarkup, /<span class=/)
assert.ok(editingMarkup.includes(elementStates.elementStatesCss(stateButton.id, stateButton.props)))
const sectionMarkup = renderToStaticMarkup(React.createElement(FreeCanvasView, { id: 'section-1', height: 400, _states: stateButton.props._states }))
assert.match(sectionMarkup, new RegExp(elementStates.elementStateScope('section-1') + ':hover'))
const hidden = renderToStaticMarkup(React.createElement(FreeOverlay, { elements: [{ ...stateButton, props: { ...stateButton.props, _hidden: true, _hide: 'm' } }] }))
assert.match(hidden, /display:none/)
assert.match(hidden, /hs-hide-m/)
const { ELEMENT_CATALOG } = compile('../apps/studio/src/app/(editor)/editor/[id]/BlockPanels.tsx', {
  '@puckeditor/core': {}, '@hosso/studio-blocks': { makeElement, ICON_CATS: {} }, './FreeCanvasEditor': {}, './SectionTemplates': {},
})
const { CanvasLeft } = compile('../apps/studio/src/app/(editor)/editor/[id]/CanvasLeft.tsx', {
  '@hosso/studio-blocks': { ICON_CATS: {}, makeElement }, './BlockPanels': {
    LIBRARY: [{ title: 'Văn bản', cols: 1, items: [{ label: 'Đoạn văn', make: () => makeElement('text') }] }],
    Preview: () => React.createElement('div', { 'data-preview': true }),
  }, './canvas-model': {}, './SitePanels': {}, './SectionTemplates': {},
})
const libraryMarkup = renderToStaticMarkup(React.createElement(CanvasLeft, { tab: 'library', open: true }))
assert.match(libraryMarkup, /aria-label="Kho mẫu"/)
assert.match(libraryMarkup, /Chưa có mẫu/)
assert.doesNotMatch(libraryMarkup, /Mẫu trang|Mẫu khối|he-card|aria-label="Trang"/)
const catalogMarkup = renderToStaticMarkup(React.createElement(CanvasLeft, { tab: 'text', open: true, config: { components: {} } }))
assert.match(catalogMarkup, /class="cv-catalog-heading"/)
assert.match(catalogMarkup, /aria-label="Đoạn văn"/)
assert.match(catalogMarkup, /class="cv-item-label"/)
assert.ok((catalogMarkup.match(/class="cv-chip"/g) ?? []).length > 0)
assert.match(catalogMarkup, /data-module="media"/)
const railMarkup = catalogMarkup.match(/<nav class="cv-rail"[\s\S]*?<\/nav>/)?.[0] ?? ''
const railIcons = [...railMarkup.matchAll(/<img[^>]+src="([^"]+)"[^>]*>/g)]
assert.equal(railIcons.length, 11)
for (const [tag, src] of railIcons) {
  assert.match(src, /^\/editor-icons\/[a-z]+\.png$/)
  assert.ok(existsSync(new URL(`../apps/studio/public${src}`, import.meta.url)), `Missing toolbar icon: ${src}`)
  assert.match(tag, /alt=""/)
  assert.match(tag, /width="44" height="44"/)
}
const { StatePicker, DevicePicker } = compile('../apps/studio/src/app/(editor)/editor/[id]/StateStyleEditor.tsx', { '@hosso/studio-blocks': elementStates })
let selectedState = 'normal'
const states = StatePicker({ value: 'hover', supported: ['normal', 'hover'], onChange: (value) => { selectedState = value } }).props.children
assert.equal(states.filter((item) => item.props['aria-pressed']).length, 1)
states[1].props.onClick()
assert.equal(selectedState, 'hover')
let selectedDevice = 'desktop'
const devices = DevicePicker({ value: 'tablet', onChange: (value) => { selectedDevice = value } }).props.children[1].props.children
assert.deepEqual(devices.map((item) => item.props['aria-pressed']), [false, true, false])
devices[2].props.onClick()
assert.equal(selectedDevice, 'mobile')
const deviceMarkup = renderToStaticMarkup(React.createElement(DevicePicker, { value: 'desktop', onChange: () => {} }))
for (const label of ['Máy tính', 'Máy tính bảng', 'Điện thoại']) assert.ok(deviceMarkup.includes(`aria-label="${label}"`))
const navCtx = { id: '1', collection: 'pages', locale: 'vi', defaultLocale: 'vi' }
const { PagesDropdown } = compile('../apps/studio/src/app/(editor)/editor/[id]/PagesDropdown.tsx', {
  './SitePanels': { PagesPanel: ({ ctx }) => { assert.equal(ctx, navCtx); return React.createElement('input', { 'aria-label': 'Tìm trang' }) } },
})
const pagesMarkup = renderToStaticMarkup(React.createElement(PagesDropdown, { ctx: navCtx }))
assert.match(pagesMarkup, /popoverTarget="([^"]+)"/)
assert.ok(pagesMarkup.includes(`id="${pagesMarkup.match(/popoverTarget="([^"]+)"/)[1]}"`))
assert.match(pagesMarkup, /popover="auto"/)
assert.match(pagesMarkup, /role="dialog" aria-label="Trang"/)
assert.match(pagesMarkup, /aria-label="Tìm trang"/)
console.log('PASS: empty template library retained, pages moved out of rail and accessible header dropdown')
assert.deepEqual(ELEMENT_CATALOG.map((item) => item.type), ['text', 'button', 'image'])
for (const item of ELEMENT_CATALOG) { assert.equal(item.create().type, item.type); assert.ok(item.preview); assert.notEqual(item.create().id, item.create().id) }
console.log('PASS: first-slice catalog, legacy/state rendering, canvas state preview, section scope, reduced motion and serialized round-trip')
assert.equal(PAGE_TEMPLATES.length, 8)
assert.equal(new Set(PAGE_TEMPLATES.map((t) => t.id)).size, 8)
for (const category of TEMPLATE_CATEGORIES) assert.equal(PAGE_TEMPLATES.filter((t) => t.category === category.id).length, 2)
for (const template of PAGE_TEMPLATES) {
  const pattern = pageTemplatePattern(template)
  const copy = pageTemplatePattern(template)
  assert.equal(pattern.blocks.length, 3)
  const ids = new Set()
  for (const block of pattern.blocks) {
    assert.equal(block.type, 'FreeCanvas')
    assert.ok(block.props.height > 0)
    for (const el of block.props._els) {
      assert.ok(!ids.has(el.id))
      ids.add(el.id)
      assert.ok(el.x >= 0 && el.y >= 0 && el.w > 0 && el.h > 0)
      assert.ok(el.x + el.w <= 1200 && el.y + el.h <= block.props.height)
      if (el.type === 'image') {
        assert.ok(el.props.alt)
        assert.ok(existsSync(new URL('../apps/studio/public' + el.props.src, import.meta.url)))
      }
    }
  }
  assert.ok(copy.blocks.every((b) => b.props._els.every((el) => !ids.has(el.id))))
  assert.equal(pattern.blocks.flatMap((b) => b.props._els).filter((el) => el.type === 'heading' && el.props.level === 1).length, 1)
  pattern.blocks[0].props._els[0].props.alt = 'Changed copy'
  assert.notEqual(copy.blocks[0].props._els[0].props.alt, 'Changed copy')
}
console.log('PASS: 8 page templates, 4 categories, editable geometry, local assets and independent copies')

const { withStyle } = compile('../packages/blocks/src/puck-config.ts', {
  './MediaField': {}, './RefField': {}, './ExtraBlocks': {}, './CoreExtras': {}, './PostList': {}, './FreeCanvas': { FreeOverlay, FreeCanvasView },
  './i18n': {}, './style-fields': {}, './widget-parts': widgetParts, './element-states': elementStates,
})
const Button = withStyle(({ submitLabel }) => React.createElement('form', { action: '/submit' }, React.createElement('button', { type: 'submit' }, submitLabel)))
const StyledSection = withStyle(FreeCanvasView)
const ownerMarkup = renderToStaticMarkup(React.createElement(StyledSection, { id: 'owner', height: 400, _states: stateButton.props._states, _els: [legacyButton] }))
assert.match(ownerMarkup, new RegExp('^<div class="hs-styled ' + elementStates.elementStateScope('owner')))
assert.match(ownerMarkup, /hs-free-layer/)
assert.equal((ownerMarkup.match(new RegExp('class="[^"<>]*' + elementStates.elementStateScope('owner'), 'g')) ?? []).length, 1)
assert.equal(renderToStaticMarkup(React.createElement(Button, { id: 'book', submitLabel: 'Book' })), '<form action="/submit"><button type="submit">Book</button></form>')
const customized = renderToStaticMarkup(React.createElement(Button, { id: 'book', submitLabel: 'Book', _parts: { 'form:nth-of-type(1) > button:nth-of-type(1)': { color: '#dc2626', x: 30 } } }))
assert.match(customized, /type="submit"/)
assert.match(customized, /action="\/submit"/)
assert.match(customized, /translate:30px 0px!important/)
assert.match(customized, /color:#dc2626!important/)
assert.match(renderToStaticMarkup(React.createElement(Button, { id: 'book', _editParts: true })), /data-hs-parts=/)

let user = { id: 1, roles: ['editor'] }
const calls = []
let fail = false
const payload = { auth: async () => ({ user }) }
const actions = compile('../apps/studio/src/app/(editor)/editor/[id]/actions.ts', {
  '@payload-config': {},
  '@hosso/studio-blocks': { editorPreviewParams },
  'next/headers': { headers: async () => new Headers() },
  payload: { getPayload: async () => payload },
  '@/lib/site': { loaderFor: (type) => async (props, ctx) => {
    calls.push({ type, props, ctx })
    if (fail) throw new Error('offline')
    return type.endsWith('Grid') ? { status: 'ok', items: [{ id: '42', slug: 'oil-filter', name: 'Oil filter', code: 'OF42' }] } : { status: 'ok', params: ctx.searchParams, cookies: ctx.cookies }
  } },
})
assert.deepEqual(await actions.loadBlockData('ShopProductDetail', {}, 'vi', preview), { status: 'ok', params: { p: 'oil-filter' }, cookies: {} })
assert.deepEqual(await actions.loadBlockData('WimProductDetail', {}, 'vi', preview), { status: 'ok', params: { p: 'wim-42' }, cookies: {} })
assert.deepEqual(await actions.loadBlockData('ShopProductDetail', {}, 'vi'), { status: 'ok', params: {}, cookies: {} })
const beforeInvalid = calls.length
assert.deepEqual(await actions.loadBlockData('ShopProductDetail', {}, 'vi', { ...preview, account: 'admin' }), { status: 'error', kind: 'internal' })
assert.equal(calls.length, beforeInvalid)
assert.deepEqual(await actions.listPreviewProducts('shop', ' filter ', 'vi'), { items: [{ value: 'oil-filter', label: 'Oil filter (OF42)' }] })
assert.deepEqual(calls.at(-1).ctx.searchParams, { q: 'filter' })
assert.deepEqual(await actions.listPreviewProducts('wim', '', 'vi'), { items: [{ value: '42', label: 'Oil filter (OF42)' }] })
assert.equal(calls.at(-1).type, 'WimProductGrid')
const beforeDenied = calls.length
assert.equal((await actions.listPreviewProducts('customers', '', 'vi')).error, 'invalid_request')
assert.equal((await actions.listPreviewProducts('shop', 'x'.repeat(201), 'vi')).error, 'invalid_request')
user = null
assert.deepEqual(await actions.loadBlockData('ShopProductDetail', {}, 'vi', preview), { status: 'error', kind: 'unauthorized' })
assert.deepEqual(await actions.listPreviewProducts('shop', '', 'vi'), { items: [], error: 'unauthorized' })
assert.equal(calls.length, beforeDenied)
user = { id: 1, roles: ['editor'] }
fail = true
assert.deepEqual(await actions.loadBlockData('ShopProductDetail', {}, 'vi', preview), { status: 'error', kind: 'internal' })
assert.deepEqual(await actions.listPreviewProducts('shop', '', 'vi'), { items: [], error: 'internal' })

let accountPreview = null
const { Portal } = compile('../packages/plugin-affiliate/src/Portal.tsx', {
  '@hosso/studio-blocks': { useEditorPreview: () => accountPreview, useLocale: () => ({ locale: 'en', defaultLocale: 'en' }) },
})
assert.equal(renderToStaticMarkup(React.createElement(Portal)), '')
accountPreview = preview
const partner = renderToStaticMarkup(React.createElement(Portal))
assert.match(partner, /Preview Partner/)
assert.match(partner, /<fieldset disabled=/)
assert.match(partner, /ref=PREVIEW/)
accountPreview = { ...preview, account: 'guest' }
const partnerGuest = renderToStaticMarkup(React.createElement(Portal))
assert.match(partnerGuest, /name="password"/)
assert.doesNotMatch(partnerGuest, /Preview Partner/)
console.log('PASS: preview product routing, validation, authenticated boundaries, guest/member rendering, live-site isolation')
