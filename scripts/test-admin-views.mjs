import assert from 'node:assert/strict'
import fs from 'node:fs'
import Module, { createRequire } from 'node:module'
const require = createRequire(new URL('../apps/studio/package.json', import.meta.url))
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
function compile(relative, stubs = {}) {
  const source = new URL(relative, import.meta.url)
  const compiled = new Module(source.pathname)
  compiled.require = id => id in stubs ? stubs[id] : require(id)
  compiled._compile(ts.transpileModule(fs.readFileSync(source, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText, source.pathname)
  return compiled.exports
}
const file = new URL('../apps/studio/src/lib/admin-views.ts', import.meta.url)
const mod = new Module(file.pathname)
mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, file.pathname)
const { frameAdminViews } = mod.exports
const original = { path: '/plugin/Reports', exportName: 'Reports', serverProps: { mode: 'sales' } }
const config = { admin: { components: { views: {
  dashboard: { Component: '/Dashboard' },
  reports: { Component: original, path: '/reports', exact: true },
  futurePlugin: { Component: '/Future#View', path: '/future' },
} } } }
const framed = frameAdminViews(config)
assert.equal(framed.admin.components.views.dashboard, config.admin.components.views.dashboard)
assert.equal(framed.admin.components.views.reports.exact, true)
assert.equal(framed.admin.components.views.reports.Component.serverProps.Content, original)
assert.equal(framed.admin.components.views.futurePlugin.Component.path, '/components/admin/AdminViewShell#AdminViewShell')
assert.equal(config.admin.components.views.reports.Component, original)
const registered = []
framed.admin.importMap.generators[0]({ addToImportMap: value => registered.push(value) })
assert.deepEqual(registered, [original, '/Future#View'])
assert.deepEqual(frameAdminViews(framed), framed)
assert.deepEqual(frameAdminViews({}), {})
let renderArgs
const { AdminViewShell } = compile('../apps/studio/src/components/admin/AdminViewShell.tsx', {
  '@payloadcms/next/templates': { DefaultTemplate: 'admin-shell' },
  '@payloadcms/ui/elements/RenderServerComponent': { RenderServerComponent: args => { renderArgs = args; return null } },
})
const req = { payload: { secret: 'server-only' }, i18n: { language: 'vi' } }
const visibleEntities = Object.freeze({ collections: Object.freeze(['posts']), globals: Object.freeze(['settings']) })
const shell = AdminViewShell({ Content: original, clientConfig: {}, importMap: {}, user: { id: 1 }, viewType: 'custom', searchParams: { days: '90' }, initPageResult: { req, permissions: { canAccessAdmin: true }, visibleEntities } })
assert.equal(shell.type, 'admin-shell')
assert.equal(shell.props.req, req)
assert.deepEqual(shell.props.visibleEntities, visibleEntities)
assert.notEqual(shell.props.visibleEntities, visibleEntities)
assert.equal(renderArgs.Component, original)
assert.equal(renderArgs.serverProps.initPageResult.req, req)
assert.equal(renderArgs.clientProps.req, undefined)
assert.equal(renderArgs.clientProps.payload, undefined)
assert.equal(renderArgs.clientProps.initPageResult, undefined)
const { ReportsView } = compile('../packages/plugin-reports/src/admin.tsx', { '@payloadcms/ui': { Gutter: props => React.createElement('div', props) } })
let calls = 0
const orders = [
  { orderNo: 'A', status: 'completed', total: 200000, paymentStatus: 'paid', createdAt: new Date().toISOString(), items: [{ productId: 'p1', name: 'Product A', quantity: 2, price: 100000 }] },
  { orderNo: 'B', status: 'cancelled', total: 500000, createdAt: new Date().toISOString() },
]
const reportReq = { i18n: { language: 'vi' }, user: { roles: ['admin'] }, payload: { collections: { 'shop-orders': {} }, find: async ({ collection }) => { calls++; return { docs: collection === 'shop-orders' ? orders : [] } } } }
const html = renderToStaticMarkup(await ReportsView({ initPageResult: { req: reportReq }, searchParams: { days: '90' } }))
assert.equal(calls, 2)
assert.match(html, /200\.000 đ/)
assert.doesNotMatch(html, /700\.000 đ/)
assert.equal((html.split('<details')[1].split('</details>')[0].match(/<tr>/g) ?? []).length, 91)
assert.match(html, /aria-current="page">90 ngày qua/)
assert.match(html, /<meter/)
calls = 0
await ReportsView({ initPageResult: { req: { ...reportReq, user: { roles: ['editor'] } } } })
assert.equal(calls, 0, 'unauthorized report views must not query sales data')
const emptyReq = { ...reportReq, payload: { ...reportReq.payload, find: async () => ({ docs: [] }) } }
const empty = renderToStaticMarkup(await ReportsView({ initPageResult: { req: emptyReq } }))
assert.match(empty, /Chưa có dữ liệu/)
assert.doesNotMatch(empty, /<details/)
console.log('Admin view checks passed: custom route coverage, import registration, idempotence, server/client boundary, report permissions, totals, empty state and all 90 days.')
