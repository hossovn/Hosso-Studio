// Extend the existing isolated SQLite + loopback integration fixture; never uses the running site.
import { readFile, writeFile, unlink } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
const source = await readFile('scripts/test-product-pool.mjs', 'utf8')
const marker = "  console.log('Disposable test database: ' + join(directory, 'test.db'))"
if (!source.includes(marker)) throw new Error('Fixture marker changed')
const generated = source.replace(marker, String.raw`
  const rawInput = { ...input, cartId: crypto.randomUUID(), items: [{ productId: String(native.id), quantity: 1 }] }
  const rawResponse = await checkout(rawInput)
  assert.equal(rawResponse.status, 200)
  const rawOrder = (await payload.find({ collection: 'shop-orders', where: { cartId: { equals: rawInput.cartId } }, depth: 0 })).docs[0]
  const publisher = { id: 9981, collection: 'users', roles: ['publisher'] }
  const patched = await payload.update({ collection: 'shop-orders', id: rawOrder.id, overrideAccess: false, user: publisher, data: { status: 'completed', paymentStatus: 'paid', total: 1, operationsVersion: 0, operationHistory: [] } })
  assert.equal(patched.status, 'completed'); assert.equal(patched.paymentStatus, 'paid'); assert.equal(patched.total, 1)
  assert.equal(patched.operationsVersion, 0); assert.deepEqual(patched.operationHistory, [])
  console.log('REPRODUCED S03: publisher raw update changes money/payment/status without command version or operation history')
  await payload.delete({ collection: 'shop-orders', id: rawOrder.id, overrideAccess: false, user: publisher })
  assert.equal((await payload.count({ collection: 'shop-orders', where: { id: { equals: rawOrder.id } } })).totalDocs, 0)
  console.log('REPRODUCED S03: publisher deletes completed order through collection access')
` + marker)
const path = new URL('../scripts/.audit-commerce-payload.generated.mjs', import.meta.url)
await writeFile(path, generated)
try { await import(pathToFileURL(path.pathname.replace(/^\/(?=[A-Za-z]:)/, '')).href); console.log('AUDIT FIXTURE COMPLETE; inherited exitCode:', process.exitCode ?? 0) }
finally { await unlink(path) }
