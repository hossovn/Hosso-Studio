import assert from 'node:assert/strict'
import { elementForDevice, pageForDevice, mergeDevicePage, stackDeviceSection, resetDeviceLayout, responsiveBlockCss } from '../packages/blocks/src/responsive-layout.ts'
import { inspectPage } from '../apps/studio/src/lib/publish-checks.ts'

const element = { id: 'heading', type: 'heading', x: 80, y: 60, w: 560, h: 80, props: { text: 'Company', level: 1, size: 48 } }
const source = { root: { props: {} }, content: [{ type: 'FreeCanvas', props: { id: 'hero', height: 400, _els: [element, { id: 'image', type: 'image', x: 700, y: 60, w: 400, h: 300, props: { src: '/photo.jpg', alt: 'Our shop' } }] } }, { type: 'FreeCanvas', props: { id: 'second', height: 400, _els: [] } }] }
const original = structuredClone(source)
const mobile = structuredClone(pageForDevice(source, 'mobile'))
mobile.content[0].props._els[0].x = 30
mobile.content[0].props._els[0].props.size = 90
mobile.content[0].props._els[0].props.text = 'Updated company'
mobile.content[0].props.height = 800
mobile.content[0].props._padL = 20
const changed = mergeDevicePage(source, mobile, 'mobile')
assert.deepEqual(source, original, 'projection and editing must not mutate the saved document')
assert.equal(changed.content[0].props._els[0].x, 80)
assert.equal(changed.content[0].props._els[0].props.size, 48)
assert.equal(changed.content[0].props._els[0].props.text, 'Updated company')
assert.equal(pageForDevice(changed, 'mobile').content[0].props._els[0].x, 30)
assert.equal(pageForDevice(changed, 'tablet').content[0].props._els[0].x, 80)
assert.equal(changed.content[0].props.height, 400)
assert.equal(pageForDevice(changed, 'mobile').content[0].props.height, 800)
assert.match(responsiveBlockCss('hero', changed.content[0].props), /padding-left:20px!important/)
assert.equal(elementForDevice(element, 'desktop'), element)
const moved = structuredClone(pageForDevice(changed, 'mobile'))
moved.content[1].props._els.push(moved.content[0].props._els.shift())
moved.content[1].props._els[0].y = 120
const transfer = mergeDevicePage(changed, moved, 'mobile')
assert.equal(transfer.content[1].props._els[0].x, 80, 'moving sections on mobile must preserve desktop geometry')
assert.equal(pageForDevice(transfer, 'mobile').content[1].props._els[0].y, 120)
const stacked = stackDeviceSection(changed, 'hero', 'mobile')
const preview = pageForDevice(stacked, 'mobile').content[0].props
assert.ok(preview._els[1].y >= preview._els[0].y + preview._els[0].h)
assert.ok(preview.height > preview._els[1].y + preview._els[1].h)
assert.equal(stacked.content[0].props.height, 400)
assert.equal(pageForDevice(resetDeviceLayout(stacked, 'hero', 'mobile'), 'mobile').content[0].props._els[0].x, 80)
console.log('PASS independent device layout, shared copy, nonmutating projections, section transfer, stack and reset')

const options = { paths: new Set(['/']), blockTypes: new Set(['FreeCanvas']), locale: 'vi', locales: ['vi', 'en'] }
assert.deepEqual(inspectPage({ title: 'Company', description: 'Welcome to our company.', content: source }, options), [])
const broken = structuredClone(changed)
broken.content[0].props._els[0].responsive.mobile.x = 1300
broken.content[0].props._els[1].props.alt = ''
broken.content[0].props._els[1].props.href = '/missing'
const issues = inspectPage({ title: 'Company', content: broken }, options)
assert.ok(issues.some((issue) => issue.code === 'overflow' && issue.device === 'mobile' && issue.element === 'heading'))
assert.ok(issues.some((issue) => issue.code === 'imageAlt'))
assert.ok(issues.some((issue) => issue.code === 'link' && issue.path === '/missing'))
assert.ok(issues.some((issue) => issue.code === 'seoDescription'))
assert.ok(inspectPage({ content: { content: 'invalid' } }, options).some((issue) => issue.severity === 'error'))
assert.ok(inspectPage({ content: { content: [null], root: { props: { _float: 'invalid' } } } }, options).some((issue) => issue.code === 'structure'))
const invalidFloating = structuredClone(source)
invalidFloating.root.props._float = [{ ...element, id: 'floating', w: -10 }]
assert.ok(inspectPage({ content: invalidFloating }, options).some((issue) => issue.code === 'geometry' && issue.block === '@page'))
const duplicate = structuredClone(source)
duplicate.content[0].props._els[1].id = 'heading'
assert.ok(inspectPage({ content: duplicate }, options).some((issue) => issue.code === 'duplicate' && issue.severity === 'error'))
console.log('PASS publish checks: device overflow, image descriptions, internal links, SEO, invalid structure and duplicate IDs')
