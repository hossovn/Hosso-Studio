import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import Module, { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(new URL('../apps/studio/package.json', import.meta.url))
const ts = require('typescript')
const { unzipSync, zipSync, strFromU8, strToU8 } = require('fflate')

function compile(relative, stubs) {
  const path = fileURLToPath(new URL(relative, import.meta.url))
  const { outputText } = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } })
  const mod = new Module(path)
  mod.filename = path
  mod.paths = Module._nodeModulePaths(dirname(path))
  mod.require = (id) => Object.hasOwn(stubs, id) ? stubs[id] : require(id)
  mod._compile(outputText, path)
  return mod.exports
}

const areasModule = compile('../apps/studio/src/globals/SiteAreas.ts', { '../lib/access': { publishers: () => true } })
const { AREAS } = areasModule
const locales = ['vi', 'en']
const config = {
  brand: { name: 'Hosso Studio' },
  locales: locales.map((code) => ({ code })),
  themes: [{ manifest: { name: 'auto', version: '1.0.0' } }],
  plugins: [{ id: 'test', portable: { globals: [{ slug: 'test-settings', secretFields: ['apiKey'] }] } }],
}
const areas = Object.fromEntries(locales.map((locale) => [locale, Object.fromEntries(AREAS.map(({ name }) => [name, {
  content: name === 'postSidebar' ? [] : [{ type: 'FreeCanvas', props: { id: name, text: locale + '-' + name } }],
  root: { props: {} },
}]))]))
const findCalls = []
const elementStates = { normal: { mobile: { scale: 0.9 } }, hover: { desktop: { backgroundColor: '#15803d', opacity: 0.9, transitionMs: 200 }, tablet: { backgroundColor: '#166534' }, mobile: { translateY: -2 } } }
areas.vi.siteHeader.content[0].props._states = { hover: { desktop: { opacity: 0.8 } } }
areas.vi.siteHeader.content[0].props._els = [{ id: 'state-button', type: 'button', x: 80, y: 24, w: 200, h: 48, props: { text: 'Button', _states: elementStates } }]
const portableScroll = { mode: 'progress', fromY: 120, toY: -40, fromScale: 0.8, toScale: 1.2, start: 10, end: 90, disableOnMobile: true }
areas.vi.siteHeader.content[0].props._els[0].props._scroll = portableScroll
const image = 'legacy banner.webp'
areas.vi.siteFooter.content[0].props.image = '/api/media/file/legacy%20banner.webp?download=1'
areas.en.siteFooter.content[0].props.image = '/api/media/file/legacy%20banner.webp'
let mediaExists = true
const { buildSitePackage } = compile('../apps/studio/src/lib/site-package.ts', {
  '@hosso-config': config,
  '../globals/SiteAreas': areasModule,
  fs: { existsSync: () => mediaExists, readFileSync: () => new Uint8Array([1, 2, 3]) },
})
const source = {
  find: async (args) => { findCalls.push(args); return { docs: [] } },
  findGlobal: async ({ slug, locale }) => {
    if (slug === 'site-areas') return { id: 1, ...areas[locale] }
    if (slug === 'site-settings') return { id: 1, siteName: locale + '-Site', theme: 'auto', contact: { phone: '123' } }
    assert.equal(slug, 'test-settings')
    return { id: 1, enabled: false, apiKey: 'must-not-leak' }
  },
}
const exported = await buildSitePackage(source)
const files = unzipSync(exported.data)
const read = (name) => JSON.parse(strFromU8(files[name]))
assert.deepEqual(read('data/site-areas.json').translations, areas)
assert.deepEqual([...files['media/' + image]], [1, 2, 3])
assert.equal(read('data/media.json').length, 1, 'referenced files must be deduplicated across locales')
assert.equal(read('data/media.json')[0].filename, image)
assert.equal(exported.media, 1)
assert.deepEqual(read('data/plugins/test-settings.json'), { enabled: false })
assert.deepEqual(exported.secretsOmitted, ['test-settings.apiKey'])
assert.equal(read('data/site-settings.json').shared.theme, 'auto')
for (const collection of ['pages', 'posts', 'reusable-blocks']) {
  assert.equal(findCalls.filter((c) => c.collection === collection).length, locales.length)
  assert.ok(findCalls.filter((c) => c.collection === collection).every((c) => c.draft === false && c.fallbackLocale === false))
}

const { importSitePackage } = compile('../apps/studio/src/lib/site-import.ts', {
  '@hosso-config': config,
  './lang': { serverLang: () => 'en' },
})
const restored = Object.fromEntries(locales.map((locale) => [locale, {}]))
const target = {
  count: async () => ({ totalDocs: 1 }),
  find: async () => ({ docs: [] }),
  updateGlobal: async ({ slug, data, locale }) => {
    if (slug === 'site-areas') Object.assign(restored[locale], data)
    return data
  },
}
await importSitePackage(target, exported.data, () => {}, 'en')
assert.deepEqual(restored, areas, 'all editor areas must survive export and import in every locale')
assert.deepEqual(restored.vi.siteHeader.content[0].props._els[0].props._states, elementStates, 'all state and device overrides must survive the actual ZIP export/import pipeline')
assert.deepEqual(restored.vi.siteHeader.content[0].props._els[0].props._scroll, portableScroll, 'scroll effects must survive the actual ZIP export/import pipeline')

const legacy = structuredClone(read('data/site-areas.json'))
for (const locale of locales) {
  delete legacy.translations[locale].siteHeader
  delete legacy.translations[locale].siteFooter
}
files['data/site-areas.json'] = strToU8(JSON.stringify(legacy))
await importSitePackage(target, zipSync(files), () => {}, 'en')
assert.deepEqual(restored, areas, 'old packages must not erase existing custom headers or footers')
mediaExists = false
await assert.rejects(buildSitePackage(source), /Referenced media file is missing/)
mediaExists = true
areas.vi.siteFooter.content[0].props.image = '/api/media/file/%2e%2e%2fsecret.txt'
await assert.rejects(buildSitePackage(source), /Invalid media filename/)
console.log('PASS: editor areas round-trip in vi/en, legacy import, published-only export, secret omission, referenced media, missing-file and path validation')
