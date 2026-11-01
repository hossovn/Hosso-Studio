import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import Module, { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

if (!process.execArgv.includes('--conditions=react-server')) {
  const result = spawnSync(process.execPath, ['--conditions=react-server', fileURLToPath(import.meta.url)], { stdio: 'inherit', env: { ...process.env, NODE_ENV: 'production' } })
  assert.equal(result.status, 0, 'Cart must cross the React Server Component boundary without editor callbacks')
} else {
  const require = createRequire(new URL('../apps/studio/package.json', import.meta.url))
  const React = require('react')
  const ts = require('typescript')
  const { registerClientReference, renderToReadableStream } = require('next/dist/compiled/react-server-dom-webpack/server.node')
  const client = (name) => registerClientReference(() => {}, 'shop-client', name)
  const path = fileURLToPath(new URL('../packages/plugin-shop/src/renderers.tsx', import.meta.url))
  const mod = new Module(path)
  mod.filename = path
  mod.paths = Module._nodeModulePaths(dirname(path))
  const stubs = {
    '@hosso/studio-blocks': {},
    './client/Carousel': { Carousel: client('Carousel') },
    './client/Wishlist': { WishlistButton: client('WishlistButton'), WishlistView: client('WishlistView') },
    './client/Shop': Object.fromEntries(['AddToCart', 'CartView', 'CheckoutForm', 'OrderLookup', 'ReviewForm'].map((name) => [name, client(name)])),
    './util': {},
  }
  mod.require = (id) => Object.hasOwn(stubs, id) ? stubs[id] : require(id)
  mod._compile(ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, path)
  const Cart = mod.exports.fallbackRenderers.ShopCart
  const puck = { renderDropZone() {}, metadata: {}, dragRef() {}, isEditing: false }
  const options = { heading: 'Giỏ hàng', layout: 'split', showImages: 'yes', stickySummary: 'yes', summaryHeading: 'Đơn hàng', checkoutLabel: 'Thanh toán', emptyHeading: 'Giỏ trống', emptyText: 'Chọn sản phẩm' }
  for (const preview of [false, true]) {
    const tree = React.createElement(Cart, { ...options, id: 'cart', width: 'wide', _noFree: preview, puck, data: { unusedCallback() {} } })
    const errors = []
    const stream = await renderToReadableStream(tree, { 'shop-client#CartView': { id: 'shop-client', chunks: [], name: 'CartView' } }, { onError: (error) => { errors.push(error.message) } })
    const output = await new Response(stream).text()
    assert.deepEqual(errors, [], 'Puck callbacks must stay on the server side of the CartView boundary')
    assert.doesNotMatch(output, /renderDropZone|unusedCallback|dragRef/)
    for (const value of Object.values(options)) assert.ok(output.includes(value), `Preserve cart option: ${value}`)
    assert.ok(output.includes('sp-w-wide'))
    assert.ok(output.includes('/thanh-toan'))
    assert.ok(output.includes('/san-pham'))
    assert.ok(output.includes(`"preview":${preview}`))
  }
  console.log('PASS: actual ShopCart renderer serializes through React Flight, preserves options and excludes editor callbacks')
}
