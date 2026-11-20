import assert from 'node:assert/strict'
import { cloneElements } from '../packages/blocks/src/free-geometry.ts'
import { expandReusableInstance } from '../packages/blocks/src/reusable-overrides.ts'
import { applyFrameVariant } from '../packages/blocks/src/design-presets.ts'
import { limitedJSON } from '../packages/blocks/src/request-body.ts'
const target: any = { id: 'target', type: 'heading', x: 0, y: 0, w: 100, h: 40, props: { text: 'Hello' } }
const trigger: any = { id: 'trigger', type: 'button', x: 0, y: 50, w: 100, h: 40, props: { href: '#motion:start:target' }, responsive: { mobile: { props: { href: '#motion:toggle:target' } } } }
const clone = cloneElements([target, trigger])
assert.equal(clone[1].props.href, `#motion:start:${clone[0].id}`)
assert.equal(clone[1].responsive?.mobile?.props?.href, `#motion:toggle:${clone[0].id}`)
const expanded = expandReusableInstance([{ type: 'FreeCanvas', props: { id: 'one', _els: [target] } }, { type: 'FreeCanvas', props: { id: 'two', _els: [trigger] } }], { type: 'Reusable', props: { id: 'instance' } })
assert.equal(expanded[1].props._els[0].props.href, `#motion:start:${expanded[0].props._els[0].id}`)
assert.equal(expanded[1].props._els[0].responsive.mobile.props.href, `#motion:toggle:${expanded[0].props._els[0].id}`)
const frame: any = { id: 'frame', type: 'container', x: 0, y: 0, w: 400, h: 300, props: {} }
let id = 0
const changed = applyFrameVariant([frame], 'frame', { id: 'alt', name: 'Alt', elements: [frame, { ...target, parentId: 'frame' }, { ...trigger, parentId: 'frame' }] }, () => 'next-' + ++id)
assert.equal(changed[2].props.href, `#motion:start:${changed[1].id}`)
assert.equal(changed[2].responsive?.mobile?.props?.href, `#motion:toggle:${changed[1].id}`)
assert.deepEqual(await limitedJSON(new Request('https://example.test', { method: 'POST', body: '{"ok":true}' }), 100), { ok: true })
await assert.rejects(limitedJSON(new Request('https://example.test', { method: 'POST', body: 'x'.repeat(101) }), 100), RangeError)
console.log('PASS motion clone, cross-section reusable and variant targets; bounded streamed JSON ingress')
