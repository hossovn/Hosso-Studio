import assert from 'node:assert/strict'
import { mkdtemp, mkdir, stat, writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'
import { chromium } from '@playwright/test'
import { profilePlatformEditor } from './lib/profile-platform-editor.mjs'

const require = createRequire(new URL('../apps/studio/package.json', import.meta.url))
const root = fileURLToPath(new URL('../apps/studio/', import.meta.url))
const output = fileURLToPath(new URL('../output/platform-production/', import.meta.url))
await mkdir(output, { recursive: true })
const directory = await mkdtemp(join(output, 'hosso-platform-browser-production-'))
await writeFile(join(output, 'fixture.json'), JSON.stringify({ directory }))
const base = 'http://localhost:3120'
const editorOnly = process.argv.includes('--editor-only')
const env = { ...process.env, HOSSO_DATABASE_URL: 'file:' + join(directory, 'studio.db').replaceAll('\\', '/'), HOSSO_MEDIA_DIR: join(directory, 'media'), HOSSO_PRIVATE_DIR: join(directory, 'private'), HOSSO_SECRET: 'platform-production-disposable-secret', HOSSO_SEED: 'false', HOSSO_SCRIPT: '1', HOSSO_ADMIN_EMAIL: 'browser@studio.test', HOSSO_ADMIN_PASSWORD: 'studio-browser-test-password', HOSSO_SMTP_URL: '', HOSSO_DB_PUSH: 'true', HOSSO_PUBLIC_URL: base, NODE_ENV: 'development', HOSSO_PLATFORM_BUILD: '1', HOSSO_ADMIN_PREVIEW: '0', HOSSO_LICENSE_KEY: '', HOSSO_LICENSE_SERVER: '' }
const run = (args, options = {}) => new Promise((resolve, reject) => {
  const child = spawn(process.execPath, args, { cwd: root, stdio: 'inherit', env, ...options })
  child.on('error', reject)
  child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`${args.join(' ')} exited ${code}`)))
})
await run([join(dirname(require.resolve('payload')), '..', 'bin.js'), 'run', 'scripts/seed-platform-browser.ts'])
assert.ok((await stat(join(directory, 'studio.db'))).size > 0, 'Fixture database must exist after seeding')
await run([join(root, '../../scripts/prepare-installed-plugins.mjs')])
await run([join(dirname(require.resolve('payload')), '..', 'bin.js'), 'generate:importmap'])
env.NODE_ENV = 'production'; env.HOSSO_DB_PUSH = 'false'
const next = require.resolve('next/dist/bin/next')
if (process.env.HOSSO_REUSE_BUILD !== '1') await run([next, 'build'])
assert.ok((await stat(join(directory, 'studio.db'))).size > 0, 'Fixture database must survive the build')
const server = spawn(process.execPath, [next, 'start', '-p', '3120'], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] })
let log = '', browser
server.stdout.on('data', (chunk) => { log += chunk }); server.stderr.on('data', (chunk) => { log += chunk })
try {
  let ready = false
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(base + '/api/health', { signal: AbortSignal.timeout(2000) })).ok) { ready = true; break } } catch {}
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  assert.ok(ready, log)
  // Production must continue enforcing licenses, including in this fixture.
  assert.equal((await fetch(base + '/api/plugins/analytics/config')).status, 402)
  browser = await chromium.launch({ headless: true })
  const results = []
  for (const route of editorOnly ? [] : ['/cua-hang', '/nhan-tai-lieu', '/san-pham', '/chi-tiet?p=platform-product', '/gio-hang', '/thanh-toan']) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
    const page = await context.newPage(), errors = [], pending = new Map(), failed = []
    page.on('request', (request) => pending.set(request, { url: request.url(), type: request.resourceType(), at: Date.now() }))
    page.on('requestfinished', (request) => pending.delete(request))
    page.on('requestfailed', (request) => { pending.delete(request); failed.push({ url: request.url(), error: request.failure()?.errorText }) })
    page.on('pageerror', (error) => errors.push(error.message))
    const session = await context.newCDPSession(page)
    await session.send('Network.enable')
    await session.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 200000, uploadThroughput: 93750 })
    await session.send('Emulation.setCPUThrottlingRate', { rate: 4 })
    await page.addInitScript(() => {
      window.__lab = { lcp: 0, cls: 0, longTasks: 0 }
      new PerformanceObserver((list) => { for (const entry of list.getEntries()) window.__lab.lcp = entry.startTime }).observe({ type: 'largest-contentful-paint', buffered: true })
      new PerformanceObserver((list) => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__lab.cls += entry.value }).observe({ type: 'layout-shift', buffered: true })
      new PerformanceObserver((list) => { for (const entry of list.getEntries()) window.__lab.longTasks += Math.max(0, entry.duration - 50) }).observe({ type: 'longtask', buffered: true })
    })
    let response
    try { response = await page.goto(base + route, { timeout: 120000, waitUntil: 'networkidle' }) }
    catch (error) {
      await writeFile(join(output, 'navigation-failure.json'), JSON.stringify({ route, pending: [...pending.values()].map((request) => ({ ...request, elapsedMs: Date.now() - request.at })), failed, errors, metrics: await page.evaluate(() => ({ ...window.__lab, resources: performance.getEntriesByType('resource').map((entry) => ({ name: entry.name, duration: entry.duration, bytes: entry.transferSize })) })) }, null, 2))
      await page.screenshot({ path: join(output, 'navigation-failure.png'), fullPage: true })
      throw error
    }
    assert.equal(response.status(), 200, route)
    assert.deepEqual(errors, [], route)
    const metrics = await page.evaluate(() => ({ ...window.__lab, loadMs: performance.getEntriesByType('navigation')[0].loadEventEnd, transferBytes: performance.getEntriesByType('resource').reduce((sum, entry) => sum + entry.transferSize, 0), scripts: performance.getEntriesByType('resource').filter((entry) => entry.initiatorType === 'script').length, overflow: document.documentElement.scrollWidth > innerWidth + 2 }))
    assert.equal(metrics.overflow, false, route + ' overflows mobile')
    results.push({ route, ...metrics })
    await context.close()
    console.log(`PASS production ${route}: LCP ${Math.round(metrics.lcp)}ms, CLS ${metrics.cls.toFixed(3)}, ${metrics.transferBytes} transferred bytes`)
  }
  if (!editorOnly) {
    await writeFile(join(output, 'baseline.json'), JSON.stringify({ at: new Date().toISOString(), conditions: 'Chromium headless, 390x844, 4x CPU, 1.6Mbps down, 150ms latency, cold browser cache, local server; lab samples, not field p75 or INP', results }, null, 2))
    console.log('PASS production build, license enforcement and six storefront mobile routes')
  }
  await profilePlatformEditor(browser, base, output)
} finally {
  await browser?.close(); server.kill()
  await writeFile(join(output, 'server.log'), log)
}
