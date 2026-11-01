import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(new URL('../apps/studio/package.json', import.meta.url))
const { tsImport } = require('tsx/esm/api')
const storage = new Map()
globalThis.localStorage = { getItem: (k) => storage.get(k) || null, setItem: (k, v) => storage.set(k, v), removeItem: (k) => storage.delete(k) }
globalThis.window = new EventTarget()
const cart = await tsImport('../packages/plugin-shop/src/cart.ts', { parentURL: import.meta.url, tsconfig: fileURLToPath(new URL('../apps/studio/tsconfig.json', import.meta.url)) })
const read = () => JSON.parse(storage.get('hs_shop_cart'))
const item = { productId: '1', name: 'Test product', price: 120000 }
const intent = { items: [{ productId: '1', quantity: 1 }], customer: { name: 'Buyer', phone: '0912345678', address: 'Test address' }, fulfillment: { type: 'delivery' }, payment: 'cod', meta: { locale: 'vi' } }
cart.addToCart(item)
const first = read()
const id = await cart.checkoutIdentity(first.id, intent)
assert.equal(await cart.checkoutIdentity(first.id, JSON.parse(JSON.stringify(intent))), id, 'Reloads and other tabs reuse the same checkout request')
cart.refreshCart([{ ...item, name: 'New server name', price: 130000, quantity: 1 }])
assert.equal(read().id, first.id, 'A price/thumbnail refresh is not a new checkout request')
assert.notEqual(await cart.checkoutIdentity(first.id, { ...intent, customer: { ...intent.customer, address: 'Changed address' } }), id)
cart.setQuantity('1', 2)
const edited = read()
assert.notEqual(edited.id, first.id)
cart.consumeCart(first.id)
assert.equal(read().id, edited.id, 'Delayed response cannot clear a basket edited in another tab')
cart.setQuantity('1', 2)
assert.equal(read().id, edited.id, 'No-op edits preserve retry identity')
cart.consumeCart(edited.id)
assert.equal(read().lines.length, 0)
cart.addToCart(item)
assert.notEqual(await cart.checkoutIdentity(read().id, intent), id, 'Same product and recipient can be purchased again')
console.log('PASS checkout identity: retries, reloads, price refresh, recipient changes, concurrent basket edits and subsequent purchases')
