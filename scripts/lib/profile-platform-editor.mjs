import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { expect } from '@playwright/test'

// Run only against the disposable server owned by test-platform-production.mjs.
export async function profilePlatformEditor(browser, base, output) {
  assert.equal(base, 'http://localhost:3120')
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, extraHTTPHeaders: { Origin: base } })
  let id, page
  try {
    await context.addInitScript(() => {
      localStorage.setItem('hosso-editor-intro:v2', 'done')
      window.__editorLab = { longTasks: [] }
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) window.__editorLab.longTasks.push({ at: entry.startTime, duration: entry.duration })
      }).observe({ type: 'longtask', buffered: true })
    })
    const login = await context.request.post(base + '/api/users/login', { data: { email: 'browser@studio.test', password: 'studio-browser-test-password' } })
    assert.ok(login.ok(), 'Editor fixture login')
    const content = { root: { props: {} }, content: Array.from({ length: 30 }, (_, section) => ({
      type: 'FreeCanvas', props: { id: `profile-section-${section}`, height: 600, _bgHex: '#ffffff',
        _els: Array.from({ length: 20 }, (_, index) => ({ id: `profile-${section}-${index}`, type: 'text', x: 50 + (index % 4) * 280, y: 60 + Math.floor(index / 4) * 100, w: 240, h: 60, props: { text: `Nội dung ${section + 1}.${index + 1}`, size: 20 } })),
      },
    })) }
    const response = await context.request.post(base + '/api/pages', { data: { title: 'Editor performance fixture', slug: 'editor-performance-fixture', _status: 'draft', content } })
    assert.ok(response.ok(), await response.text())
    id = (await response.json()).doc.id
    page = await context.newPage()
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    const cdp = await context.newCDPSession(page)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
    await page.goto(base + '/editor/' + id + '?block=profile-section-0', { timeout: 120000 })
    const frame = page.locator('iframe[title="Trang"]').contentFrame()
    const target = frame.locator('[data-element="profile-0-0"]')
    await expect(target).toBeVisible({ timeout: 120000 })
    const loadToCanvasMs = await page.evaluate(() => performance.now())
    await target.click()
    const initialLeft = await target.evaluate((element) => element.style.left)
    await target.evaluate((element) => {
      const win = element.ownerDocument.defaultView
      const values = []
      win.__nudgeLab = values
      let start = null, before = ''
      const onKey = (event) => {
        if (event.key === 'ArrowRight') { start = win.performance.now(); before = element.style.left }
      }
      // Canvas shortcuts are handled in both documents. Pointer selection may leave
      // keyboard focus in the editor shell even when the selection is in the iframe.
      const documents = new Set([element.ownerDocument, win.parent.document])
      documents.forEach((doc) => doc.addEventListener('keydown', onKey, true))
      const observer = new MutationObserver(() => {
        if (start === null || before === element.style.left) return
        const at = start
        start = null
        win.requestAnimationFrame(() => win.requestAnimationFrame(() => values.push(win.performance.now() - at)))
      })
      observer.observe(element, { attributes: true, attributeFilter: ['style'] })
      win.__stopNudgeLab = () => { observer.disconnect(); documents.forEach((doc) => doc.removeEventListener('keydown', onKey, true)) }
    })
    for (let i = 0; i < 12; i++) {
      await frame.locator('body').press('ArrowRight')
      await expect.poll(() => target.evaluate((element) => element.ownerDocument.defaultView.__nudgeLab.length)).toBe(i + 1)
    }
    const commands = await target.evaluate((element) => {
      const win = element.ownerDocument.defaultView
      win.__stopNudgeLab()
      return win.__nudgeLab
    })
    let undoSteps = 0
    for (; undoSteps < commands.length; undoSteps++) {
      const before = await target.evaluate((element) => element.style.left)
      if (before === initialLeft) break
      await frame.locator('body').press('Control+z')
      await expect.poll(() => target.evaluate((element) => element.style.left)).not.toBe(before)
    }
    await expect.poll(() => target.evaluate((element) => element.style.left)).toBe(initialLeft)
    assert.deepEqual(errors, [], 'Editor production errors')
    const measured = await page.evaluate(() => ({
      resourceBytes: performance.getEntriesByType('resource').reduce((sum, entry) => sum + entry.transferSize, 0),
      mountedElements: document.querySelector('iframe[title="Trang"]').contentDocument.querySelectorAll('[data-element]').length,
      longTasks: window.__editorLab.longTasks,
    }))
    const sorted = [...commands].sort((a, b) => a - b)
    const result = {
      at: new Date().toISOString(), conditions: 'Production editor, 1440x1000, 4x CPU, unthrottled local network, 30 sections / 600 text elements. Keyboard-to-DOM-change plus two animation frames; not INP, React profiling or field p75.',
      loadToCanvasMs, ...measured, nudgeMs: commands, nudgeMedianMs: sorted[Math.floor(sorted.length / 2)], nudgeP95Ms: sorted[Math.ceil(sorted.length * 0.95) - 1], undoSteps, undoVerified: true,
    }
    await writeFile(join(output, 'editor-profile.json'), JSON.stringify(result, null, 2))
    await page.screenshot({ path: join(output, 'editor-profile.png') })
    console.log(`PASS production editor 600 elements: median nudge ${Math.round(result.nudgeMedianMs)}ms, p95 ${Math.round(result.nudgeP95Ms)}ms; undo verified`)
  } catch (error) {
    if (page) {
      await page.screenshot({ path: join(output, 'editor-profile-failure.png') }).catch(() => {})
      await writeFile(join(output, 'editor-profile-failure.json'), JSON.stringify(await page.evaluate(() => {
        const frame = document.querySelector('iframe[title="Trang"]')
        return { samples: frame?.contentWindow.__nudgeLab, left: frame?.contentDocument.querySelector('[data-element="profile-0-0"]')?.style.left }
      }), null, 2)).catch(() => {})
    }
    throw error
  } finally {
    if (id) await context.request.delete(base + '/api/pages/' + id).catch(() => {})
    await context.close()
  }
}
