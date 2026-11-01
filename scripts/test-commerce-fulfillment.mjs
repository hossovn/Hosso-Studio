import test from 'node:test'
import assert from 'node:assert/strict'
import { fulfillmentGroups, finalizeFulfillment } from '../packages/plugin-shop/src/fulfillment.ts'

const draft = () => ({ items: [{ productId: '1', price: 100000, quantity: 2 }, { productId: '2', price: 300000, quantity: 1 }], subtotal: 500000, adjustments: [{ amount: 50000, scope: 'shipping' }, { amount: -50000, scope: 'goods' }], payment: 'cod', fulfillment: { type: 'delivery' }, meta: {}, customer: {} })
test('mixed delivery allocates one discounted customer total without duplicate COD', async () => {
  const order = draft()
  order.shipments = await fulfillmentGroups({ config: { custom: { hossoPlugins: [{ commerce: { fulfillmentGroups: async () => [{ key: 'partner-1', label: 'Partner', lineKeys: ['2'], fee: 30000, deliveryBy: 'partner', codCollector: 'partner' }] } }] } } }, order)
  order.shipments[0].fee = 20000
  finalizeFulfillment(order, 500000)
  assert.equal(order.shipments.reduce((n, g) => n + g.codAmount, 0), 500000)
  assert.deepEqual(order.shipments.map((g) => g.codAmount), [200000, 300000])
  order.payment = 'bank'; finalizeFulfillment(order, 500000)
  assert.ok(order.shipments.every((g) => g.codAmount === 0))
})
test('a product cannot be delivered and charged by two groups', async () => {
  const g = { key: 'a', label: 'A', lineKeys: ['1'], fee: 0, deliveryBy: 'partner', codCollector: 'partner' }
  await assert.rejects(() => fulfillmentGroups({ config: { custom: { hossoPlugins: [{ commerce: { fulfillmentGroups: async () => [g, { ...g, key: 'b' }] } }] } } }, draft()), /Duplicate/)
})
