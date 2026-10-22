import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire, Module } from 'node:module'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(new URL('../apps/studio/package.json', import.meta.url))
const ts = require('typescript')
const React = require('react')
const translate = (text, vars = {}) => text.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? key)
function compile(relative, stubs) {
  const filename = fileURLToPath(new URL(relative, import.meta.url))
  const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true } })
  const mod = new Module(filename)
  mod.filename = filename
  mod.paths = Module._nodeModulePaths(dirname(filename))
  mod.require = (id) => Object.hasOwn(stubs, id) ? stubs[id] : require(id)
  mod._compile(outputText, filename)
  return mod.exports
}
function find(node, predicate) {
  if (!node || typeof node !== 'object') return undefined
  if (predicate(node)) return node
  for (const child of React.Children.toArray(node.props?.children)) {
    const found = find(child, predicate)
    if (found) return found
  }
}
let states, index, pending
function picker(props) {
  states = [false, '', '', 'all']
  pending = { current: false }
  return render(props)
}
function render(props) {
  index = 0
  return SiteTemplates(props)
}
const { SiteTemplates } = compile('../apps/studio/src/components/admin/SiteTemplates.tsx', {
  react: { ...React, useRef: () => pending, useMemo: (fn) => fn(), useState: () => { const key = index++; return [states[key], (value) => { states[key] = value }] } },
  '@/lib/use-admin-t': { useAdminT: () => translate },
})
const props = { siteURL: '/', templates: [{ id: 'shop-template', size: 1024, title: 'Auto Parts', description: 'Parts store', category: 'Cửa hàng', pages: [{ slug: 'home', title: 'Home' }], cover: 'banner.webp', missing: [] }] }
let calls = 0
const navigations = []
const originalFetch = globalThis.fetch
const originalWindow = globalThis.window
try {
  globalThis.window = { confirm: () => false, location: { assign: (url) => navigations.push(url) } }
  globalThis.fetch = async (url, init) => {
    calls++
    assert.equal(url, '/api/site/template-install')
    assert.equal(init.credentials, 'include')
    assert.deepEqual(JSON.parse(init.body), { id: 'shop-template' })
    return { ok: true, json: async () => ({ ok: true, log: ['Imported'] }) }
  }
  const click = find(picker(props), (node) => node.props?.className === 'ht-use').props.onClick
  assert.equal(find(render(props), (node) => node.type === 'h4').props.children, 'Auto Parts')
  assert.equal(find(render(props), (node) => node.type === 'summary').props.children, 'Xem các trang')
  await click()
  assert.equal(calls, 0, 'Cancel must not install')
  assert.deepEqual(navigations, [])
  globalThis.window.confirm = (message) => { assert.match(message, /header\/footer/); return true }
  const request = click()
  await click()
  assert.equal(calls, 1, 'Repeated clicks must not submit twice')
  assert.equal(find(render(props), (node) => node.props?.className === 'ht-use').props.disabled, true)
  await request
  assert.equal(states[0], false)
  assert.deepEqual(navigations, ['/'])
  globalThis.fetch = async () => ({ ok: false, status: 403, json: async () => ({ error: 'forbidden' }) })
  await click()
  assert.match(states[1], /forbidden/)
  assert.equal(states[0], false)
  globalThis.fetch = async () => { throw new Error('offline') }
  await click()
  assert.match(states[1], /offline/)
  assert.equal(pending.current, false)
  assert.deepEqual(navigations, ['/'], 'Errors must not navigate')
  assert.equal(find(picker({ ...props, templates: [] }), (node) => node.props?.className === 'ht-use'), undefined)

  let listed = 0
  const access = { hasRole: (user, role) => user?.roles?.includes(role) }
  const i18n = { adminLang: () => 'vi', makeT: () => translate }
  const { DashboardHome } = compile('../apps/studio/src/components/admin/DashboardHome.tsx', {
    '@hosso-config': { brand: { name: 'Studio' } },
    '@/lib/access': access,
    '@/lib/admin-i18n': i18n,
    '@/lib/backup': { listTemplates: () => { listed++; return props.templates } },
    './SiteTemplates': { SiteTemplates },
  })
  const { TemplatesView } = compile('../apps/studio/src/components/admin/TemplatesView.tsx', {
    '@payloadcms/ui': { Gutter: 'div' },
    '@/lib/access': access,
    '@/lib/admin-i18n': i18n,
    '@/lib/backup': { listTemplates: () => { listed++; return props.templates } },
    './SiteTemplates': { SiteTemplates },
  })
  const payload = { findGlobal: async () => ({}), find: async () => ({ docs: [] }), count: async () => ({ totalDocs: 0 }) }
  for (const user of [undefined, { roles: ['editor'] }, { roles: ['publisher'] }]) {
    const dashboard = await DashboardHome({ payload, user })
    assert.equal(find(dashboard, (node) => node.props?.href === '/admin/templates'), undefined)
    const view = await TemplatesView({ initPageResult: { req: { user } } })
    assert.equal(find(view, (node) => node.type === SiteTemplates), undefined)
  }
  assert.equal(listed, 0, 'Non-admins must not list server templates')
  const admin = await DashboardHome({ payload, user: { roles: ['admin'] } })
  const dashboardGallery = find(admin, (node) => node.type === SiteTemplates)
  assert.deepEqual(dashboardGallery.props.templates, props.templates)
  assert.equal(listed, 1, 'Dashboard must load the catalog for admins')
  const view = await TemplatesView({ initPageResult: { req: { user: { roles: ['admin'] } } } })
  const gallery = find(view, (node) => node.type === SiteTemplates)
  assert.deepEqual(gallery.props.templates, props.templates)
  assert.equal(gallery.props.siteURL, process.env.HOSSO_PUBLIC_URL || '/')
  assert.equal(listed, 2)
  const backup = compile('../apps/studio/src/lib/backup.ts', { './site-package': {}, '@hosso-config': { themes: [{ manifest: { name: 'auto' } }], plugins: [{ id: 'shop' }] } })
  const templateFile = fileURLToPath(new URL('../seed/sites/shop-template.hosso-site.zip', import.meta.url))
  const details = backup.templateDetails(templateFile, 'shop-template')
  assert.equal(details.title, 'Thanh Cường Auto Parts & Service')
  assert.equal(details.pages.length, 13)
  assert.equal(details.cover, 'banner-1.webp')
  assert.equal(details.category, 'Cửa hàng')
  assert.deepEqual(details.missing, [])
  const unavailable = { templates: [{ ...props.templates[0], missing: ['shop-theme'] }] }
  const unavailableButton = find(picker(unavailable), (node) => node.props?.className === 'ht-use')
  assert.equal(unavailableButton.props.disabled, true)
  calls = 0
  globalThis.fetch = async () => { calls++; throw new Error('Should not apply an incompatible template') }
  await unavailableButton.props.onClick()
  assert.equal(calls, 0)
  assert.ok(details.pages.some((page) => page.slug === 'home' && page.title === 'Trang chủ'))
  assert.equal(backup.templatePath('../secret'), null)
  const { templateCover } = compile('../apps/studio/src/lib/endpoints.ts', {
    '@hosso-config': {},
    './access': {},
    './kiln': { adminOrService: (req) => req.user?.roles?.includes('admin') },
    './backup': { ...backup, templatePath: (id) => id === 'shop-template' ? templateFile : null },
    './admin-i18n': {}, './lang': {}, './notify': {}, './share': {}, './site-import': {}, './site-package': {}, './ratelimit': {},
  })
  assert.equal((await templateCover.handler({ query: { id: 'shop-template' } })).status, 403)
  assert.equal((await templateCover.handler({ user: { roles: ['editor'] }, query: { id: 'shop-template' } })).status, 403)
  assert.equal((await templateCover.handler({ user: { roles: ['admin'] }, query: { id: '../secret' } })).status, 404)
  const cover = await templateCover.handler({ user: { roles: ['admin'] }, query: { id: 'shop-template' } })
  assert.equal(cover.status, 200)
  assert.equal(cover.headers.get('Content-Type'), 'image/webp')
  assert.match(cover.headers.get('Content-Security-Policy'), /sandbox/)
  assert.ok((await cover.arrayBuffer()).byteLength > 0)
  console.log('Website gallery checks passed: catalog, cover endpoint, admin access, selection, locking and errors.')
} finally {
  globalThis.fetch = originalFetch
  if (originalWindow === undefined) delete globalThis.window
  else globalThis.window = originalWindow
}
