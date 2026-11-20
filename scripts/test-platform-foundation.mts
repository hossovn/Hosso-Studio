import assert from 'node:assert/strict'
import { copyFile, mkdir, mkdtemp, rm } from 'node:fs/promises'
import path from 'node:path'
import { mediaVariant } from '../apps/studio/src/lib/media-variants'
import { loadEntryRepeater } from '../apps/studio/src/lib/entry-repeater'
import { responsiveImage } from '../packages/blocks/src/responsive-image'
import { bindingValue, bindRepeatTemplate } from '../packages/blocks/src/repeater-data'
import { elementStateCss } from '../packages/blocks/src/element-states'
import { registerScrollTask } from '../packages/blocks/src/scroll-scheduler'
import { inspectPage } from '../apps/studio/src/lib/publish-checks'

const calls: any[] = []
const payload = { find: async (options: any) => {
  calls.push(options)
  return options.collection === 'content-types' ? { docs: [{ slug: 'team', title: 'Team', fields: [] }] } : { docs: Array.from({ length: 6 }, (_, i) => ({ id: i, title: 'Member', kind: 'team', data: { role: 'Engineer', years: 7 } })), page: 2, totalPages: 1667, totalDocs: 10000 }
} }
const result = await loadEntryRepeater(payload as any, { source: 'entries', entryKind: 'team', paginate: 'yes' }, { q: 'Đội ngũ', category: '', page: 2, size: 6, sort: 'title' }, 'vi')
assert.equal(result.items.length, 6)
assert.equal(result.total, 10000)
assert.equal(calls.length, 2, 'A large collection still makes a bounded number of queries')
assert.equal(calls[0].page, 2)
assert.equal(calls[0].limit, 6)
assert.deepEqual(calls[0].where.and.at(-1), { searchText: { contains: 'doi ngu' } })
assert.equal(bindingValue(result.items[0], 'data.years'), 7)
assert.equal(bindingValue({ data: { constructor: 'unsafe' } }, 'data.constructor'), undefined)
assert.equal(bindingValue({ data: { nested: { value: 'unsafe' } } }, 'data.nested'), undefined)
const bound = bindRepeatTemplate([{ id: 'x', type: 'number', x: 0, y: 0, w: 10, h: 10, props: { _bind: { value: 'data.years' } } }], result.items[0], 'entry')
assert.equal(bound[0].props.value, 7)
assert.match(elementStateCss('.safe', 'hover', 'desktop', { scale: 1.02, transitionMs: 200 }), /@media\(hover:hover\) and \(pointer:fine\)/)
assert.match(elementStateCss('.safe', 'hover', 'desktop', { scale: 1.02 }), /\[data-hs-state=hover\]/)
assert.match(elementStateCss('.safe', 'normal', 'desktop', { transitionMs: 200 }), /cubic-bezier/)
assert.deepEqual(responsiveImage('https://example.test/img.jpg'), {})
assert.equal(responsiveImage('/api/media/file/hero.jpg').srcSet?.split(', ').length, 5)

let frame: (() => void) | undefined
const events = new Set<string>(), ordering: string[] = []
const fakeWindow: any = { document: { hidden: false, addEventListener() {}, removeEventListener() {} }, requestAnimationFrame(fn: () => void) { frame = fn; return 1 }, cancelAnimationFrame() { frame = undefined }, addEventListener(name: string) { events.add(name) }, removeEventListener(name: string) { events.delete(name) } }
const first = registerScrollTask(fakeWindow, { read: () => { ordering.push('read1'); return () => { ordering.push('write1') } } })
const second = registerScrollTask(fakeWindow, { read: () => { ordering.push('read2'); return () => { ordering.push('write2') } } })
frame!()
assert.deepEqual(ordering, ['read1', 'read2', 'write1', 'write2'])
first.dispose()
assert.equal(events.size, 2)
second.dispose()
assert.equal(events.size, 0)

const issues = inspectPage({ content: { root: { props: { _breakpoints: [{ width: 900 }] } }, content: [{ type: 'FreeCanvas', props: { id: 'section', height: 500, _els: [{ id: 'element', type: 'shape', x: 0, y: 0, w: 50, h: 50, props: {}, responsive: { 'bp-900': { x: 1300 } } }] } }] } }, { paths: new Set(), blockTypes: new Set(['FreeCanvas']), locale: 'vi', locales: ['vi'], seo: false })
assert.ok(issues.some((issue) => issue.device === 'bp-900' && issue.code === 'overflow'))

const tempRoot = path.resolve('.tmp')
await mkdir(tempRoot, { recursive: true })
const temp = await mkdtemp(path.join(tempRoot, 'media-test-'))
try {
  await copyFile('apps/studio/public/editor-demo/mountain.jpg', path.join(temp, 'hero.jpg'))
  const request = new Request('http://localhost/api/media-variant/hero.jpg?w=320')
  const response = await mediaVariant(request, 'hero.jpg', temp)
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('content-type'), 'image/webp')
  const bytes = new Uint8Array(await response.arrayBuffer())
  assert.ok(bytes.length > 100)
  const cached = await mediaVariant(request, 'hero.jpg', temp)
  assert.equal(cached.headers.get('etag'), response.headers.get('etag'))
  const unchanged = await mediaVariant(new Request(request, { headers: { 'if-none-match': response.headers.get('etag')! } }), 'hero.jpg', temp)
  assert.equal(unchanged.status, 304)
  assert.equal((await mediaVariant(request, '../hero.jpg', temp)).status, 400)
  assert.equal((await mediaVariant(new Request('http://localhost/image?w=9999'), 'hero.jpg', temp)).status, 400)
  assert.equal((await mediaVariant(request, 'missing.jpg', temp)).status, 404)
} finally {
  assert.equal(path.dirname(path.resolve(temp)), tempRoot)
  await rm(temp, { recursive: true, force: true })
}
console.log('PASS platform foundation: DB pagination, custom bindings, breakpoint checks, batched scroll, responsive media, transform/cache and path confinement')
