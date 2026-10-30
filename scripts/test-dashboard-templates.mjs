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
const affiliatePackage = JSON.parse(readFileSync(new URL('../packages/plugin-affiliate/package.json', import.meta.url), 'utf8'))
assert.equal(affiliatePackage.exports['.'].browser, './src/client.ts')
assert.equal(affiliatePackage.exports['.'].default, './src/index.ts')
const { default: affiliateClient } = compile('../packages/plugin-affiliate/src/client.ts', {
  '../hosso.json': { name: { vi: 'Tiếp thị liên kết', en: 'Affiliate' } },
  './Portal': { Portal: 'affiliate-portal' },
  './RefCapture': { RefCapture: 'ref-capture' },
  './styles': { css: '' },
})
assert.equal(affiliateClient.blocks[0].type, 'AffiliatePortal')
assert.equal(affiliateClient.fallbackRenderers.AffiliatePortal({ heading: 'Partners' }).props.heading, 'Partners')
assert.equal(affiliateClient.headerSlot, 'ref-capture')
assert.equal(affiliateClient.payload, undefined, 'Browser entry must not load server hooks')
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
  const access = compile('../apps/studio/src/lib/access.ts', {})
  const i18n = { adminLang: () => 'vi', makeT: () => translate }
  const { DashboardHome } = compile('../apps/studio/src/components/admin/DashboardHome.tsx', {
    '@hosso-config': { brand: { name: 'Studio' }, plugins: [] },
    '@payloadcms/ui': { Gutter: 'div' },
    '@/lib/access': access,
    '@/lib/admin-i18n': i18n,
    './GettingStarted': { GettingStarted: 'getting-started' },
  })
  const { TemplatesView } = compile('../apps/studio/src/components/admin/TemplatesView.tsx', {
    '@payloadcms/ui': { Gutter: 'div' },
    '@/lib/access': access,
    '@/lib/admin-i18n': i18n,
    '@/lib/backup': { listTemplates: () => { listed++; return props.templates } },
    './SiteTemplates': { SiteTemplates },
  })
  const payload = { collections: {}, findGlobal: async () => ({}), find: async () => ({ docs: [] }), count: async () => ({ totalDocs: 0 }) }
  for (const user of [undefined, { roles: ['editor'] }, { roles: ['publisher'] }]) {
    const dashboard = await DashboardHome({ payload, user })
    assert.equal(find(dashboard, (node) => node.props?.href === '/admin/templates'), undefined)
    const view = await TemplatesView({ initPageResult: { req: { user } } })
    assert.equal(find(view, (node) => node.type === SiteTemplates), undefined)
  }
  assert.equal(listed, 0, 'Non-admins must not list server templates')
  const admin = await DashboardHome({ payload, user: { roles: ['admin'] } })
  assert.equal(find(admin, (node) => node.type === SiteTemplates), undefined, 'The template catalog belongs on Appearance, not the daily dashboard')
  assert.ok(find(admin, (node) => node.props?.href === '/admin/templates'))
  assert.equal(listed, 0, 'Dashboard must not load the template catalog')
  const view = await TemplatesView({ initPageResult: { req: { user: { roles: ['admin'] } } } })
  const gallery = find(view, (node) => node.type === SiteTemplates)
  assert.deepEqual(gallery.props.templates, props.templates)
  assert.equal(gallery.props.siteURL, process.env.HOSSO_PUBLIC_URL || '/')
  assert.equal(listed, 1)
  const requests = []
  const scopedPayload = {
    ...payload,
    collections: { 'shop-orders': {} },
    count: async (options) => { requests.push(options); return { totalDocs: 2 } },
    find: async (options) => { requests.push(options); return { docs: [{ id: 7, title: 'Draft', updatedAt: '2026-10-30T00:00:00Z' }] } },
  }
  const authorReq = { user: { id: 5, roles: ['author'] } }
  const author = await DashboardHome({ payload: scopedPayload, req: authorReq, user: authorReq.user })
  assert.equal(find(author, (node) => node.props?.href === '/admin/collections/shop-products/create'), undefined)
  assert.equal(find(author, (node) => node.props?.href === '/admin/collections/pages/create'), undefined)
  assert.ok(requests.every((options) => options.overrideAccess === false && options.req === authorReq))
  assert.deepEqual(requests.find((options) => options.draft).where.createdBy, { equals: 5 }, 'Author drafts must be scoped to the current author')
  assert.ok(requests.every((options) => ['posts', 'media'].includes(options.collection)))
  const failed = await DashboardHome({ payload: { ...scopedPayload, find: async () => { throw new Error('offline') }, count: async () => { throw new Error('offline') } }, user: { roles: ['admin'] } })
  assert.ok(find(failed, (node) => node.props?.role === 'status'), 'Query errors must not look like zero work to do')

  const { pluginAdminLinks } = compile('../apps/studio/src/lib/admin-plugins.ts', {})
  const fallbackPlugin = { id: 'custom', manifest: { name: { vi: 'Custom' }, settings: '/admin/custom' } }
  assert.deepEqual(pluginAdminLinks(fallbackPlugin, { roles: ['editor'] }), [])
  assert.equal(pluginAdminLinks(fallbackPlugin, { roles: ['admin'] })[0].href, '/admin/custom')
  const plugin = { ...fallbackPlugin, adminNav: [{ label: 'Orders', href: '/admin/orders', roles: ['admin', 'publisher'] }, { label: 'Settings', href: '/admin/settings', roles: ['admin'] }] }
  assert.deepEqual(pluginAdminLinks(plugin, { roles: ['publisher'] }).map((link) => link.label), ['Orders'])
  const { filterPlugins } = compile('../apps/studio/src/components/admin/PluginsClient.tsx', { '@/lib/use-admin-t': { useAdminT: () => translate } })
  const plugins = [
    { id: 'shop', name: 'Cửa hàng', description: 'Products', enabled: true },
    { id: 'wim', name: 'WIM', description: 'Inventory', enabled: false, license: { ok: false } },
    { id: 'shipping', name: 'Giao vận', description: 'Delivery', enabled: true, license: { ok: false } },
  ]
  assert.equal(filterPlugins(plugins, 'all', '').length, 3)
  assert.equal(filterPlugins(plugins, 'enabled', '').length, 2)
  assert.equal(filterPlugins(plugins, 'disabled', '  WIM  ')[0].id, 'wim')
  assert.deepEqual(filterPlugins(plugins, 'license', '').map((plugin) => plugin.id), ['shipping'])
  assert.deepEqual(filterPlugins(plugins, 'all', 'no match'), [])

  let nextWhere
  const where = { _status: { equals: 'draft' }, title: { contains: 'Workshop' } }
  const { ContentTabs } = compile('../apps/studio/src/components/admin/ContentTabs.tsx', {
    '@payloadcms/ui': { useListQuery: () => ({ query: { where }, handleWhereChange: (value) => { nextWhere = value } }) },
    '@/lib/use-admin-t': { useAdminT: () => translate },
  })
  const tabs = ContentTabs()
  find(tabs, (node) => node.type === 'button' && node.props.children === 'Tất cả').props.onClick()
  assert.deepEqual(nextWhere, { title: { contains: 'Workshop' } }, 'Changing status must preserve other list filters')
  find(tabs, (node) => node.type === 'button' && node.props.children === 'Đã xuất bản').props.onClick()
  assert.deepEqual(nextWhere, { ...where, _status: { equals: 'published' } })
  assert.equal(where._status.equals, 'draft', 'Changing tabs must not mutate the current query')

  const navPlugins = [
    { id: 'shop', adminNav: [{ label: 'Sản phẩm', href: '/admin/collections/shop-products', roles: ['admin', 'publisher'] }] },
    { id: 'shipping', adminNav: [{ label: 'Vận đơn', href: '/admin/collections/shipments', roles: ['admin'] }] },
    { id: 'promotions', adminNav: [{ label: 'Khuyến mãi', href: '/admin/collections/vouchers', roles: ['admin', 'publisher'] }] },
    fallbackPlugin,
  ]
  const { Nav } = compile('../apps/studio/src/components/admin/Nav.tsx', {
    '@hosso-config': { brand: {}, plugins: navPlugins },
    '@payloadcms/next/client': { NavHamburger: 'hamburger', NavWrapper: 'div' },
    '@payloadcms/ui': { Logout: 'logout' },
    '@/lib/access': access,
    '@/lib/admin-i18n': i18n,
    '@/lib/admin-plugins': { pluginAdminLinks },
    './NavClient': { NavClient: 'nav-client' },
  })
  const navigation = async (role) => {
    const tree = await Nav({ payload: scopedPayload, user: { id: 5, roles: [role] } })
    return find(tree, (node) => node.type === 'nav-client').props.sections
  }
  const adminSections = await navigation('admin')
  assert.ok(adminSections.find((section) => section.title === 'Bán hàng').items.some((item) => item.href === '/admin/collections/shipments'))
  assert.equal(adminSections.flatMap((section) => section.items).filter((item) => item.href === '/admin/collections/shop-products').length, 1, 'Shop navigation must not be duplicated under plugins')
  const publisherItems = (await navigation('publisher')).flatMap((section) => section.items)
  assert.ok(publisherItems.some((item) => item.href === '/admin/collections/vouchers'))
  assert.ok(publisherItems.every((item) => !['/admin/plugins', '/admin/collections/shipments', '/admin/custom'].includes(item.href)))
  const authorItems = (await navigation('author')).flatMap((section) => section.items)
  assert.ok(authorItems.every((item) => !item.id.startsWith('plugin-')))
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
  console.log('Admin checks passed: dashboard access and errors, author drafts, plugin filters and navigation, content filters, template catalog and installation.')
} finally {
  globalThis.fetch = originalFetch
  if (originalWindow === undefined) delete globalThis.window
  else globalThis.window = originalWindow
}
