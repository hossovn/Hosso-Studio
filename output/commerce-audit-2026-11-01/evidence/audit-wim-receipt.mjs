import assert from 'node:assert/strict'
import { readFile, writeFile, unlink, mkdir } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
const original = await readFile('packages/plugin-cross-sell/test/wim.test.mjs', 'utf8')
const marker = "for (const supplier of ['shop', 'wim'])"
assert.ok(original.includes(marker))
let source = original.slice(0, original.indexOf(marker))
source = source.replace('const server = http.createServer', 'let failBeforeNative = false\nconst server = http.createServer')
source = source.replace("if (path === '/v1/orders') {", "if (path === '/v1/orders') { if (failBeforeNative) return res.destroy()")
source += String.raw`
test('F05: WIM supplier receipt created before a failed POST cannot resume when remote never accepted it', async () => {
  reset('wim')
  const req = { payload: source.payload, context: {} }
  const purchase = { key: crypto.randomUUID(), buyer: { name: 'Audit retailer', phone: '0901234567' }, items: [{ id: 'wim-31', quantity: 2, price: 100000, commissionPct: 10 }] }
  failBeforeNative = true
  await assert.rejects(receivePurchase(req, source.partner, purchase))
  assert.equal(source.db[RECEIPTS].length, 1)
  assert.equal(supplierPosts, 0)
  failBeforeNative = false
  await assert.rejects(receivePurchase(req, source.partner, purchase), /outcome is unknown/)
  assert.equal(supplierPosts, 0)
  assert.equal(nativeOrders.length, 0)
  console.log('REPRODUCED F05: receipt remains, remote orders=0, retry performs GET only and never resumes POST')
})
`
const generated = 'packages/plugin-cross-sell/test/.audit-receipt.generated.test.mjs'
await writeFile(generated, source)
try {
  const r = spawnSync(process.execPath, ['--experimental-transform-types', '--import', './test/register.mjs', '--test', 'test/.audit-receipt.generated.test.mjs'], { cwd: 'packages/plugin-cross-sell', encoding: 'utf8' })
  console.log(r.stdout); console.error(r.stderr)
  await mkdir('output/commerce-audit-2026-11-01', { recursive: true })
  await writeFile('output/commerce-audit-2026-11-01/wim-receipt-reproduction.log', r.stdout + r.stderr)
  process.exitCode = r.status ?? 1
} finally { await unlink(generated) }
