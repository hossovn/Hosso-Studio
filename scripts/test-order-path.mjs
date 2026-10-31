import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(new URL('../apps/studio/package.json', import.meta.url))
const { tsImport } = require('tsx/esm/api')
const { orderLookupPath } = await tsImport('../packages/plugin-shop/src/order-path.ts', { parentURL: import.meta.url, tsconfig: fileURLToPath(new URL('../apps/studio/tsconfig.json', import.meta.url)) })
assert.equal(await orderLookupPath({ collections: {} }), '/trang-thai-don')
const page = (slug, type) => ({ slug, content: { content: [{ type }] } })
const payload = { collections: { pages: {} }, find: async (args) => { assert.deepEqual(args.where, { _status: { equals: 'published' } }); return { docs: [page('tra-cuu-don', 'ShopOrderStatus'), page('legacy', 'WimOrderStatus')] } } }
assert.equal(await orderLookupPath(payload), '/tra-cuu-don')
assert.equal(await orderLookupPath(payload, '/legacy'), '/legacy')
assert.equal(await orderLookupPath({ ...payload, find: async () => ({ docs: [] }) }, '/custom'), '/custom')
console.log('PASS order lookup links resolve published Shop/WIM pages and preserve configured or standalone paths')
