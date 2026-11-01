import assert from 'node:assert/strict'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import Module, { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Window } from 'happy-dom'
const require = createRequire(new URL('../apps/studio/package.json', import.meta.url))
const ts = require('typescript'), React = require('react')
const win = new Window({ url: 'https://example.test/thanh-toan' })
Object.assign(globalThis, { window: win, document: win.document, location: win.location, localStorage: win.localStorage, HTMLElement: win.HTMLElement, Node: win.Node, Event: win.Event, CustomEvent: win.CustomEvent, FormData: win.FormData, IS_REACT_ACT_ENVIRONMENT: true })
function compile(relative, stubs = {}) {
  const path = fileURLToPath(new URL(relative, import.meta.url))
  const { outputText } = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } })
  const mod = new Module(path); mod.filename = path; mod.paths = Module._nodeModulePaths(dirname(path))
  mod.require = (id) => Object.hasOwn(stubs, id) ? stubs[id] : require(id)
  mod._compile(outputText, path); return mod.exports
}
const cart = compile('../packages/plugin-shop/src/cart.ts')
const util = compile('../packages/plugin-shop/src/util.ts', { './product-content': { imagesOf: () => [] } })
const { CheckoutForm, OrderLookup } = compile('../packages/plugin-shop/src/client/Shop.tsx', { '../cart': cart, '../util': util, '@hosso/studio-blocks': { useLocale: () => ({ locale: 'vi', defaultLocale: 'vi' }), localizeHref: (p) => p, useEditorPreview: () => null } })
const { createRoot } = require('react-dom/client')
const host = document.createElement('div'); document.body.append(host); const root = createRoot(host)
const settle = async (run = () => {}) => React.act(async () => { run(); for (let i = 0; i < 5; i++) await new Promise((r) => setImmediate(r)) })
let requests = [], resolveCheckout
globalThis.fetch = async (url, options) => {
  if (url.endsWith('/quote')) return Response.json({ ok: true, total: 150000, adjustments: [], quoteKey: 'quote' })
  if (url.endsWith('/checkout')) { requests.push(JSON.parse(options.body)); return new Promise((r) => { resolveCheckout = r }) }
  throw new Error('Unexpected request: ' + url)
}
cart.addToCart({ productId: '1', name: 'Bộ lọc dầu', price: 150000 })
await settle(() => root.render(React.createElement(CheckoutForm, { statusPath: '/trang-thai-don', cartPath: '/gio-hang' })))
const form = host.querySelector('form')
for (const [name, value] of Object.entries({ name: 'Khách thử nghiệm', phone: '0912345678', email: 'buyer@example.test', address: 'Địa chỉ thử nghiệm' })) form.elements.namedItem(name).value = value
await settle(() => { form.dispatchEvent(new win.Event('submit', { bubbles: true, cancelable: true })); form.dispatchEvent(new win.Event('submit', { bubbles: true, cancelable: true })) })
assert.equal(requests.length, 1, 'Rapid double click sends one checkout request')
assert.match(requests[0].checkoutId, /^[a-f0-9]{64}$/)
const purchasedId = requests[0].cartId
await settle(() => cart.addToCart({ productId: '2', name: 'Sản phẩm mua thêm', price: 50000 }))
await settle(() => resolveCheckout(Response.json({ ok: true, accepted: true, order: { id: 'SO-TEST', total: 150000 }, lookupToken: 'a'.repeat(64) }, { status: 202 })))
const saved = JSON.parse(localStorage.getItem('hs_shop_cart'))
assert.notEqual(saved.id, purchasedId); assert.equal(saved.lines.length, 2, 'Newer basket survives a delayed receipt')
assert.equal(JSON.parse(localStorage.getItem('hs_customer')).address, 'Địa chỉ thử nghiệm')
assert.equal(localStorage.getItem('hs_lookup_SO-TEST'), 'a'.repeat(64))
assert.match(win.location.href, /trang-thai-don\?id=SO-TEST&token=a+&new=1/)
await settle(() => root.unmount())

// Reload after a lost response must find the receipt even when the last unit is now reserved.
cart.clearCart(); cart.addToCart({ productId: '1', name: 'Bộ lọc dầu', price: 150000 })
const retryRoot = createRoot(host)
await settle(() => retryRoot.render(React.createElement(CheckoutForm, { statusPath: '/trang-thai-don', cartPath: '/gio-hang' })))
const retryForm = host.querySelector('form')
assert.equal(retryForm.elements.namedItem('address').value, 'Địa chỉ thử nghiệm', 'Next purchase retains the recipient')
await settle(() => retryForm.dispatchEvent(new win.Event('submit', { bubbles: true, cancelable: true })))
assert.equal(requests.length, 2)
const retryCartId = requests[1].cartId
assert.ok(localStorage.getItem('hs_checkout_pending_' + retryCartId))
await settle(() => retryRoot.unmount())
let receiptLookups = 0
globalThis.fetch = async (url) => {
  if (url.endsWith('/quote')) return Response.json({ ok: false, code: 'out_of_stock', message: 'stock' }, { status: 409 })
  if (url.endsWith('/receipt')) { receiptLookups++; return Response.json({ ok: true, accepted: true, order: { id: 'SO-RECOVERED', total: 150000 }, lookupToken: 'b'.repeat(64) }) }
  throw new Error('Reload must not create a new order')
}
const reloadRoot = createRoot(host)
await settle(() => reloadRoot.render(React.createElement(CheckoutForm, { statusPath: '/trang-thai-don', cartPath: '/gio-hang' })))
assert.equal(receiptLookups, 1)
assert.equal(JSON.parse(localStorage.getItem('hs_shop_cart')).lines.length, 0)
assert.equal(localStorage.getItem('hs_checkout_pending_' + retryCartId), null)
assert.match(win.location.href, /SO-RECOVERED/)
await settle(() => reloadRoot.unmount())

win.location.href = 'https://example.test/trang-thai-don?id=SO-TEST&token=' + 'a'.repeat(64) + '&new=1'
globalThis.fetch = async () => Response.json({ ok: true, order: { id: 'SO-TEST', status: 'pending', total: 150000, subtotal: 150000, adjustments: [], payment: 'cod', paymentStatus: 'unpaid', items: [{ productId: '1', name: 'Bộ lọc dầu động cơ', quantity: 1, price: 150000 }] } })
const receiptRoot = createRoot(host)
await settle(() => receiptRoot.render(React.createElement(OrderLookup)))
assert.match(host.textContent, /ĐÃ NHẬN ĐƠN HÀNG/)
assert.match(host.textContent, /Tiếp tục mua sắm/)
assert.match(host.textContent, /Đang chờ xác nhận/)
assert.ok(host.querySelector('a[href="/san-pham"]'))
assert.match(host.querySelector('.sp-receipt-code').textContent, /a{64}/)
const { css } = compile('../packages/plugin-shop/src/styles.ts')
mkdirSync('output/email-preview', { recursive: true })
writeFileSync('output/email-preview/receipt.html', `<!doctype html><html lang="vi"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Đã nhận đơn · TCAP</title><style>:root{--hs-bg:#fff;--hs-surface:#fafafa;--hs-text:#111;--hs-muted:#666;--hs-border:#e5e5e5;--hs-primary:#f5a31a;--hs-radius:4px;--hs-font:Arial,sans-serif;--hs-max:1120px}body{margin:0;font:16px/1.5 Arial,sans-serif}header.site{padding:20px;background:#0a0a0a;color:#fff}a{color:inherit}${css}</style><header class="site">TCAP</header>${host.innerHTML}</html>`)
await settle(() => receiptRoot.unmount())
await win.happyDOM.close()
console.log('PASS actual checkout UI: double click lock, per-request identity, delayed receipt, recipient retention and received/continue-shopping screen')
