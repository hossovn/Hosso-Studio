import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import Module, { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Window } from 'happy-dom'
import { constrainedElements, axisConstraint } from '../packages/blocks/src/layout-constraints.ts'
import { pageForDevice } from '../packages/blocks/src/responsive-layout.ts'
import { batchStyle } from '../apps/studio/src/app/(editor)/editor/[id]/batch-style.ts'
import { snapPosition } from '../apps/studio/src/app/(editor)/editor/[id]/canvas-model.ts'
import { normalizeGuides, nearestDistances } from '../apps/studio/src/app/(editor)/editor/[id]/canvas-guides.ts'
import { parseRecovery, newestRecovery } from '../apps/studio/src/app/(editor)/editor/[id]/editor-recovery.ts'
import * as popupState from '../packages/blocks/src/popup-state.ts'
const require = createRequire(new URL('../apps/studio/package.json', import.meta.url))
const ts = require('typescript'), React = require('react')
function compile(relative, stubs = {}) {
  const path = fileURLToPath(new URL(relative, import.meta.url))
  const { outputText } = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } })
  const mod = new Module(path); mod.filename = path; mod.paths = Module._nodeModulePaths(dirname(path)); mod.require = (id) => Object.hasOwn(stubs, id) ? stubs[id] : require(id); mod._compile(outputText, path); return mod.exports
}
const el = (id, x, y, w = 100, h = 40, props = {}) => ({ id, type: 'text', x, y, w, h, props: { text: id, size: 20, ...props } })
const one = el('one', 80, 60), two = el('two', 280, 60), list = [one, two]
const data = { content: [{ type: 'FreeCanvas', props: { id: 'section', height: 400, _els: list } }] }
assert.equal(snapPosition(data, 'section', one, { x: 447, y: 139 }, { guides: [{ axis: 'x', value: 450 }] }).x, 450)
assert.deepEqual(snapPosition(data, 'section', one, { x: 447, y: 139 }, { enabled: false }), { x: 447, y: 139, guides: [] })
assert.equal(snapPosition(data, 'section', one, { x: 447, y: 139 }, { grid: 20 }).x, 440)
assert.equal(normalizeGuides([{ id: 'a', axis: 'x', value: 10 }, { id: 'a', axis: 'y', value: 30 }, { id: 'bad', axis: 'x', value: NaN }]).length, 1)
assert.deepEqual(nearestDistances(one, list), [{ axis: 'x', from: 180, to: 280, cross: 80 }])
assert.deepEqual(axisConstraint(80, 100, 1200, 390, 'end'), { position: -730, size: 100 })
const anchored = el('right', 1020, 60, 100, 40, { _constraints: { horizontal: 'end', vertical: 'start' } })
const mobile = constrainedElements([anchored], 'mobile')[0], factor = 1200 / 390
assert.ok(Math.abs(mobile.x / factor - 210) < 0.0001)
assert.ok(Math.abs(mobile.w / factor - 100) < 0.001)
assert.ok(Math.abs(mobile.y / factor - 60) < 0.001)
assert.ok(Math.abs(mobile.props.size / factor - 20) < 0.001)
const overridden = constrainedElements([{ ...anchored, responsive: { mobile: { x: 25, w: 500, props: { size: 70 } } } }], 'mobile')[0]
assert.equal(overridden.x, 25); assert.equal(overridden.w, 500); assert.equal(overridden.props.size, 70)
const stretch = constrainedElements([el('stretch', 20, 20, 1160, 60, { _constraints: { horizontal: 'stretch' } })], 'mobile')[0]
assert.ok(Math.abs(stretch.w / factor - 350) < 0.001)
const group = { ...el('group', 50, 50, 500, 300, { _layout: { direction: 'column', gap: 24, padding: 16, autoSize: true } }), type: 'container' }
const children = [group, { ...one, parentId: 'group' }, { ...two, parentId: 'group' }], original = structuredClone(children)
const flow = constrainedElements(children, 'desktop')
assert.equal(flow[1].x, 66); assert.equal(flow[2].y, flow[1].y + flow[1].h + 24)
assert.equal(flow[0].h, 40 + 40 + 24 + 32)
assert.deepEqual(children, original)
const resized = constrainedElements([group, { ...children[1], h: 80 }, children[2]], 'desktop')
assert.equal(resized[2].y, flow[2].y + 40, 'flow spacing follows edited child height')
const projected = pageForDevice({ content: [{ type: 'FreeCanvas', props: { id: 'g', height: 400, _els: children } }] }, 'desktop')
assert.equal(projected.content[0].props._els[2].y, flow[2].y)
const nested = { ...group, id: 'nested', parentId: 'group' }
const nestedFlow = constrainedElements([group, nested, { ...one, parentId: 'nested' }, { ...two, parentId: 'group' }], 'desktop')
assert.equal(nestedFlow[1].h, 72)
assert.equal(nestedFlow[3].y, nestedFlow[1].y + 72 + 24, 'outer flow measures the nested group after its content')
assert.equal(nestedFlow[2].y, nestedFlow[1].y + 16, 'nested children move with their group')
const rootFlow = pageForDevice({ content: [], root: { props: { _float: children } } }, 'desktop')
assert.equal(rootFlow.root.props._float[2].y, flow[2].y, 'page-level flow is projected on desktop')
const lockedGroup = { ...group, props: { _locked: true } }
const styled = batchStyle([one, { ...two, parentId: 'group' }, lockedGroup], ['one', 'two'], { color: '#123456', text: 'must not replace', _hidden: true, size: 32 })
assert.equal(styled[0].props.color, '#123456'); assert.equal(styled[0].props.text, 'one'); assert.equal(styled[0].props._hidden, undefined)
assert.equal(styled[1].props.color, undefined, 'locks inherited from groups protect batch edits')
const win = new Window({ url: 'https://studio.test/' })
const record = { version: 1, time: Date.now(), baseRevision: 'revision', data }
assert.deepEqual(parseRecovery(JSON.stringify(record)), record)
assert.equal(parseRecovery(JSON.stringify({ ...record, time: Date.now() - 8 * 86400_000 })), null)
assert.equal(parseRecovery(JSON.stringify({ ...record, data: { content: [{}] } })), null)
win.localStorage.setItem('user-a:one', JSON.stringify(record)); win.localStorage.setItem('user-b:one', JSON.stringify({ ...record, time: record.time + 1000 }))
assert.equal(newestRecovery(win.localStorage, 'user-a:').key, 'user-a:one')
const { assertEditorRevision } = compile('../apps/studio/src/lib/editor-conflict.ts')
const session = 'test-session-123456', revision = '2026-11-04T01:00:00.000Z'
const req = { headers: new Headers({ 'x-hosso-editor-base': revision, 'x-hosso-editor-session': session, 'x-hosso-editor-key': 'pages:1:vi' }), user: { id: 1 }, payload: { find: async () => ({ docs: [{ userId: `1:${session}`, expiresAt: new Date(Date.now() + 60_000).toISOString() }] }) } }
await assertEditorRevision({ req, originalDoc: { updatedAt: revision } })
await assert.rejects(() => assertEditorRevision({ req, originalDoc: { updatedAt: 'new-revision' } }), (error) => error.status === 409)
await assert.rejects(() => assertEditorRevision({ req: { ...req, payload: { find: async () => ({ docs: [{ userId: 'other-tab', expiresAt: new Date(Date.now() + 60000).toISOString() }] }) } }, originalDoc: { updatedAt: revision } }), (error) => error.status === 409)
console.log('PASS guides/grid snapping, distances, anchor/stretch/override geometry, flow groups, inherited locks, batch styles, isolated recovery and stale/session conflict rejection')

Object.assign(globalThis, { window: win, document: win.document, localStorage: win.localStorage, sessionStorage: win.sessionStorage, matchMedia: (query) => win.matchMedia(query), HTMLElement: win.HTMLElement, Node: win.Node, Event: win.Event, IS_REACT_ACT_ENVIRONMENT: true })
const { createRoot } = require('react-dom/client')
const { PopupBlock } = compile('../packages/blocks/src/Popup.tsx', { './popup-state': popupState })
const host = document.createElement('div'); document.body.append(host)
const root = createRoot(host), settle = async (run) => React.act(async () => { run?.(); for (let i = 0; i < 4; i++) await new Promise((resolve) => setImmediate(resolve)) })
const props = { id: 'offer', title: 'Tư vấn', body: 'Đăng ký', triggerKey: 'offer', trigger: 'click', every: 'session' }
const button = document.createElement('a'); button.href = '#popup:offer'; button.textContent = 'Open'; document.body.append(button)
await settle(() => root.render(React.createElement(PopupBlock, props)))
assert.equal(host.querySelector('dialog').open, false)
await settle(() => button.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true })))
assert.equal(host.querySelector('dialog').open, true)
assert.equal(document.body.style.overflow, 'hidden')
await settle(() => host.querySelector('button[aria-label="Đóng popup"]').click())
assert.equal(host.querySelector('dialog').open, false)
assert.equal(document.body.style.overflow, '')
await settle(() => button.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true })))
assert.equal(host.querySelector('dialog').open, true, 'explicit clicks reopen a dismissed popup')
await settle(() => root.unmount())
assert.equal(document.body.style.overflow, '')
await win.happyDOM.close()
console.log('PASS actual popup click runtime, native modal state, manual reopening, scroll lock and cleanup')
