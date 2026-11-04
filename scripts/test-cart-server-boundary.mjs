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
  const widgetsPath = fileURLToPath(new URL('../packages/blocks/src/canvas-widgets.tsx', import.meta.url))
  const widgetsModule = new Module(widgetsPath)
  widgetsModule.filename = widgetsPath
  widgetsModule.paths = Module._nodeModulePaths(dirname(widgetsPath))
  widgetsModule.require = require
  widgetsModule._compile(ts.transpileModule(readFileSync(widgetsPath, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, widgetsPath)
  const { renderCanvasWidgets } = widgetsModule.exports
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
  for (const editor of [false, true]) {
    const widgets = renderCanvasWidgets([{ id: 'nested-cart', type: 'widget', props: { widget: { type: 'ShopCart', props: { ...options, puck, _noFree: true, _els: [{ type: 'widget' }] } } } }], { ShopCart: { render: Cart } }, editor)
    const errors = []
    const output = await new Response(await renderToReadableStream(widgets['nested-cart'], { 'shop-client#CartView': { id: 'shop-client', chunks: [], name: 'CartView' } }, { onError: (error) => errors.push(error.message) })).text()
    assert.deepEqual(errors, [])
    assert.ok(output.includes('hs-canvas-widget'))
    assert.ok(output.includes(`"preview":${editor}`), 'Embedded published carts must remain functional; editor carts simulate')
    assert.doesNotMatch(output, /renderDropZone|dragRef|_els/)
    assert.ok(output.includes('Thanh toán'))
  }
  console.log('PASS: nested ShopCart crosses React Flight with live public actions and isolated editor previews')
  console.log('PASS: actual ShopCart renderer serializes through React Flight, preserves options and excludes editor callbacks')
  const affiliatePath = fileURLToPath(new URL('../packages/plugin-affiliate/src/client.ts', import.meta.url))
  const affiliateModule = new Module(affiliatePath)
  affiliateModule.filename = affiliatePath
  affiliateModule.paths = Module._nodeModulePaths(dirname(affiliatePath))
  const affiliateStubs = {
    '@hosso/studio-blocks': {},
    '../hosso.json': {},
    './Portal': { Portal: client('Portal') },
    './RefCapture': { RefCapture: client('RefCapture') },
    './styles': { css: '' },
  }
  affiliateModule.require = id => Object.hasOwn(affiliateStubs, id) ? affiliateStubs[id] : require(id)
  affiliateModule._compile(ts.transpileModule(readFileSync(affiliatePath, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, affiliatePath)
  const PortalRenderer = affiliateModule.exports.default.fallbackRenderers.AffiliatePortal
  const portalOptions = { heading: 'Cổng cộng tác viên', navigation: 'tabs', showAssisted: 'no', showWithdrawals: 'yes', policyText: 'Hoa hồng 15%' }
  for (const preview of [false, true]) {
    const errors = []
    const stream = await renderToReadableStream(React.createElement(PortalRenderer, { ...portalOptions, id: 'partners', _noFree: preview, puck, data: { unusedCallback() {} } }), { 'shop-client#Portal': { id: 'shop-client', chunks: [], name: 'Portal' } }, { onError: error => { errors.push(error.message) } })
    const output = await new Response(stream).text()
    assert.deepEqual(errors, [], 'AffiliatePortal must not send Puck callbacks to its client component')
    assert.doesNotMatch(output, /renderDropZone|unusedCallback|dragRef/)
    for (const value of Object.values(portalOptions)) assert.ok(output.includes(value), `Preserve portal option: ${value}`)
    assert.ok(output.includes(`"canvasPreview":${preview}`))
  }
  console.log('PASS: actual AffiliatePortal renderer crosses React Flight without editor callbacks')
}
