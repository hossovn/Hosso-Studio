// Local-only review harness: disposable SQLite, real plugin endpoints, no upstream credentials.
import http from 'node:http'
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, extname, dirname } from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url)), dir = join(root, 'output/commerce-prototype')
const fixtures = join(root, 'scripts/fixtures/commerce-review'), assets = join(root, 'seed/template-assets/shop')
await mkdir(dir, { recursive: true })
const require = createRequire(new URL('../apps/studio/package.json', import.meta.url))
const { tsImport } = require('tsx/esm/api'), { build } = require('esbuild')
const load = (path) => tsImport(path, { parentURL: import.meta.url, tsconfig: join(root, 'apps/studio/tsconfig.json') })
process.env.NODE_ENV = 'test'; process.env.HOSSO_LICENSE_ENFORCE = '0'
delete process.env.HOSSO_LICENSE_SERVER
const [{ default: shop }, { default: affiliate }, { default: accounts }, { default: shipping }, { css: shopCss }, { css: affiliateCss }, auth, accountAuth] = await Promise.all([
  load('../packages/plugin-shop/src/index.ts'), load('../packages/plugin-affiliate/src/index.ts'), load('../packages/plugin-accounts/src/index.ts'), load('../packages/plugin-shipping/src/index.ts'),
  load('../packages/plugin-shop/src/styles.ts'), load('../packages/plugin-affiliate/src/styles.ts'), load('../packages/plugin-affiliate/src/auth.ts'), load('../packages/plugin-accounts/src/endpoints.ts'),
])
await build({ entryPoints: [join(fixtures, 'app.tsx')], outfile: join(dir, 'app.js'), bundle: true, platform: 'browser', format: 'esm', jsx: 'automatic', alias: { react: dirname(require.resolve('react/package.json')), 'react-dom': dirname(require.resolve('react-dom/package.json')), '@hosso/studio-blocks': join(fixtures, 'blocks.ts') }, define: { 'process.env.NODE_ENV': '"development"' }, logLevel: 'warning' })
await writeFile(join(dir, 'index.html'), await readFile(join(fixtures, 'index.html')))
const baseCss = `:root{--hs-primary:#f5a31a;--hs-on-primary:#171717;--hs-bg:#fff;--hs-surface:#f5f6f7;--hs-text:#202326;--hs-muted:#60666c;--hs-border:#dfe2e5;--hs-space:20px;--hs-radius:4px;--hs-font-heading:'Chakra Petch',Arial,sans-serif;--theme-elevation-150:#dfe2e5;--theme-error-500:#b42318}*{box-sizing:border-box}body{margin:0;font:16px/1.5 Barlow,Arial,sans-serif;background:#fff;color:#202326}button,input,select,textarea{font:inherit}button{cursor:pointer}a{color:inherit}h1,h2,h3{letter-spacing:0}button:disabled{cursor:not-allowed;opacity:.5}main{min-height:70vh}.review-banner{background:#e9eef0;color:#39454a;padding:8px 20px;font-size:13px;text-align:center}.review-header{background:#0a0a0a;color:white;padding:16px max(20px,calc((100% - 1200px)/2));display:flex;gap:40px;align-items:center}.review-header img{width:160px;height:64px;object-fit:contain}.review-header nav{display:flex;flex-wrap:wrap;gap:24px}.review-header nav a{text-decoration:none;font-size:15px;white-space:nowrap}.review-header a[aria-current=page]{color:#f5a31a}.review-footer{display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap;padding:32px max(20px,calc((100% - 1200px)/2));background:#0a0a0a;color:white;font-size:14px}.review-footer span{color:#c4c8cb}.review-footer button{background:transparent;border:1px solid #72777a;color:white;padding:8px 12px;border-radius:4px}.review-seed{max-width:1200px;margin:40px auto;padding:20px}@media(max-width:800px){.review-header{flex-direction:column;align-items:start;gap:12px}.review-header nav{gap:12px 20px}.review-header img{height:48px}.review-footer{display:grid}.review-banner{text-align:left}}`
await writeFile(join(dir, 'preview.css'), baseCss + shopCss + affiliateCss + accounts.css)
const temp = await mkdtemp(join(tmpdir(), 'hosso-commerce-review-'))
await mkdir(join(temp, 'media'))
const { buildConfig, getPayload, createLocalReq } = await import(pathToFileURL(require.resolve('payload')).href)
const { sqliteAdapter } = await import(pathToFileURL(require.resolve('@payloadcms/db-sqlite')).href)
const plugins = [shop, affiliate, accounts, shipping]
let config = { secret: 'local-commerce-review-disposable-secret', telemetry: false, db: sqliteAdapter({ client: { url: 'file:' + join(temp, 'review.db') }, transactionOptions: {} }), collections: [{ slug: 'users', auth: true, fields: [{ name: 'roles', type: 'select', hasMany: true, options: ['admin'] }] }, { slug: 'media', upload: { staticDir: join(temp, 'media') }, fields: [] }], globals: [], jobs: { autoRun: [] }, admin: { user: 'users' }, custom: { hossoPlugins: plugins } }
for (const plugin of plugins) if (plugin.payload) config = plugin.payload(config)
config.jobs.autoRun = []
const payload = await getPayload({ config: buildConfig(config), disableOnInit: true, key: 'review-' + crypto.randomUUID() })
const affiliateUser = await payload.create({ collection: 'affiliates', data: { name: 'Nguyễn Minh · Minh họa', email: 'partner@review.invalid', code: 'TCAPDEMO', approval: 'approved', bankInfo: 'Ngân hàng minh họa / 00000000 / NGUYEN MINH' }, overrideAccess: true })
const customer = await payload.create({ collection: 'customers', data: { name: 'Khách hàng minh họa', email: 'customer@review.invalid', phone: '0900000000', garageStatus: 'retail' }, overrideAccess: true })
const demoProducts = []
for (const [name, price, image, quantity] of [['Bộ đánh lửa · Sản phẩm minh họa', 850000, 'cat-phu-tung-danh-lua.png', 1], ['Bộ lọc · Sản phẩm minh họa', 245000, 'cat-loc.png', 2], ['Chăm sóc xe · Sản phẩm minh họa', 320000, 'cat-cham-soc-xe.jpg', 1]]) {
  const data = await readFile(join(assets, image))
  const media = await payload.create({ collection: 'media', data: {}, file: { data, name: image, size: data.length, mimetype: image.endsWith('.jpg') ? 'image/jpeg' : 'image/png' }, overrideAccess: true })
  const product = await payload.create({ collection: 'shop-products', data: { name, code: 'REVIEW-' + demoProducts.length, price, stock: 20, active: true, images: [{ image: media.id }] }, overrideAccess: true })
  demoProducts.push({ id: String(product.id), name, price, image: '/assets/' + image, quantity })
}
await payload.updateGlobal({ slug: 'shipping-settings', data: { flatFee: 35000, feeMode: 'order' }, overrideAccess: true })
await payload.updateGlobal({ slug: 'shop-settings', data: { bankInfo: 'Ngân hàng minh họa. Không chuyển tiền thật.' }, overrideAccess: true })
const cookies = [auth.sessionCookie(await auth.makeSession(payload.secret, affiliateUser.id)), accountAuth.session.cookie(await accountAuth.session.make(payload.secret, customer.id))]
const port = Number(process.env.COMMERCE_REVIEW_PORT || 4187)
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://127.0.0.1:${port}`)
    if (url.pathname === '/review/products') { res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify(demoProducts)) }
    if (url.pathname.startsWith('/api/media/file/')) {
      const name = decodeURIComponent(url.pathname.slice('/api/media/file/'.length))
      if (!demoProducts.some((p) => p.image === '/assets/' + name)) { res.writeHead(404).end(); return }
      res.setHeader('Content-Type', name.endsWith('.jpg') ? 'image/jpeg' : 'image/png')
      return res.end(await readFile(join(assets, name)))
    }
    if (url.pathname.startsWith('/api/')) {
      let raw = ''; for await (const chunk of req) { raw += chunk; if (raw.length > 200000) throw new Error('Request too large') }
      const route = payload.config.endpoints.find((e) => '/api' + e.path === url.pathname && e.method.toUpperCase() === req.method)
      if (!route) { res.writeHead(404).end(); return }
      const headers = new Headers(Object.entries(req.headers).filter(([, v]) => typeof v === 'string'))
      const localReq = await createLocalReq({ user: url.pathname.endsWith('/dashboard') || url.pathname.endsWith('/manage') ? { id: 1, collection: 'users', roles: ['admin'] } : undefined, req: { headers, url: url.toString(), json: async () => raw ? JSON.parse(raw) : {} } }, payload)
      const response = await route.handler(localReq)
      res.writeHead(response.status, Object.fromEntries(response.headers)); return res.end(Buffer.from(await response.arrayBuffer()))
    }
    if (url.pathname === '/') res.setHeader('Set-Cookie', cookies)
    const relative = url.pathname === '/' || url.pathname === '/trang-thai-don' ? 'index.html' : url.pathname.slice(1)
    const staticRoot = url.pathname.startsWith('/assets/') ? assets : dir
    const path = resolve(staticRoot, staticRoot === assets ? relative.slice('assets/'.length) : relative)
    if (!path.startsWith(staticRoot + '\\') && !path.startsWith(staticRoot + '/')) { res.writeHead(403).end(); return }
    const data = await readFile(path).catch(() => null)
    if (!data) { res.writeHead(404).end(); return }
    res.setHeader('Content-Type', ({ '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' })[extname(path)] || 'application/octet-stream')
    res.end(data)
  } catch (e) { console.error(e); res.writeHead(500).end('Local review error') }
})
server.listen(port, '127.0.0.1', () => console.log(`Commerce review: http://127.0.0.1:${port}/ · isolated database: ${temp}`))
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(async () => { await payload.destroy(); process.exit() }))
