import test from 'node:test'
import assert from 'node:assert/strict'
import { commission, DAY, eligibleAmount, evaluate, money, sameOrigin } from '../src/core.ts'

const policy = { affiliate: 1, click: 1, type: 'percent', rate: 10, base: 2_000_000, holdDays: 14, selfReferral: false }
const now = Date.parse('2026-10-30T00:00:00Z')
const order = { id: 'SO-1', total: 2_050_000, status: 'completed', paymentStatus: 'paid', completedAt: new Date(now - 15 * DAY).toISOString() }

test('CPS excludes shipping, applies merchandise discounts and validates money', () => {
  assert.equal(eligibleAmount(2_000_000, [{ amount: 50_000, source: 'shipping' }, { amount: -200_000, source: 'promotions' }, { amount: -50_000, source: 'shipping' }, { amount: -50_000, source: 'promotions', scope: 'shipping' }]), 1_800_000)
  assert.equal(eligibleAmount(100, [{ amount: -200 }]), 0)
  for (const v of [-1, NaN, Infinity, 1.1, '100', null, Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => money(v))
})
test('payment, delivery and holding period are independently required, including COD', () => {
  assert.equal(evaluate(policy, { ...order, status: 'new', paymentStatus: 'unpaid' }, now).status, 'pending')
  assert.equal(evaluate(policy, { ...order, paymentStatus: 'unpaid' }, now).status, 'pending')
  assert.equal(evaluate(policy, { ...order, status: 'shipping' }, now).status, 'holding')
  assert.equal(evaluate(policy, { ...order, completedAt: new Date(now - DAY).toISOString() }, now).status, 'holding')
  assert.equal(evaluate(policy, { ...order, completedAt: null }, now).status, 'holding')
  assert.equal(evaluate(policy, order, now).status, 'eligible')
  assert.equal(evaluate(policy, { ...order, completedAt: new Date(now - 14 * DAY).toISOString() }, now).status, 'eligible')
})
test('partial, full refunds and cancellation revoke the correct amount', () => {
  assert.equal(commission(policy), 200_000)
  assert.equal(evaluate(policy, { ...order, refundedAmount: 500_000 }, now).commission, 150_000)
  for (const status of ['cancelled', 'refunded', 'returned', 'failed']) assert.equal(evaluate(policy, { ...order, status }, now).commission, 0)
  assert.equal(evaluate(policy, { ...order, paymentStatus: 'refunded' }, now).status, 'cancelled')
  assert.equal(evaluate(policy, { ...order, refundedAmount: 2_000_000 }, now).status, 'cancelled')
})
test('fixed commission is per order, prorated and capped by retained goods', () => {
  const fixed = { ...policy, type: 'fixed', rate: 100_000 }
  assert.equal(commission(fixed), 100_000)
  assert.equal(commission(fixed, 500_000), 75_000)
  assert.equal(commission({ ...fixed, base: 0 }), 0)
  assert.equal(commission({ ...fixed, base: 50_000 }), 50_000)
  assert.equal(commission({ ...policy, rate: 0 }), 0)
  assert.throws(() => commission({ ...policy, rate: 101 }))
})
test('self referral is held for review even when payment and delivery are complete', () => {
  assert.equal(evaluate({ ...policy, selfReferral: true }, order, now).status, 'review')
})
test('admin mutation validates the real request origin, not forwarded hosts', () => {
  const url = 'https://shop.test/api/plugins/affiliate/manage'
  assert.doesNotThrow(() => sameOrigin(new Headers({ origin: 'https://shop.test' }), url))
  assert.doesNotThrow(() => sameOrigin(new Headers(), url))
  assert.throws(() => sameOrigin(new Headers({ origin: 'https://evil.test', 'x-forwarded-host': 'evil.test' }), url))
  assert.throws(() => sameOrigin(new Headers({ origin: 'null' }), url))
})

import { sessionOf } from '../../blocks/src/session.ts'
test('customer and affiliate sessions cannot be replayed across roles', async () => {
  const secret = 'affiliate-test-secret'; const aff = sessionOf('hs_aff'); const customer = sessionOf('hs_customer')
  const token = await customer.make(secret, 1)
  assert.equal(await customer.read(secret, new Headers({ cookie: 'hs_customer=' + token })), '1')
  assert.equal(await aff.read(secret, new Headers({ cookie: 'hs_aff=' + token })), null)
  assert.equal(await aff.read(secret, new Headers({ cookie: 'hs_aff=' + await aff.make(secret, 1) })), '1')
})

import { settle } from '../src/service.ts'
test('payout requires PostgreSQL and an active database transaction', async () => {
  await assert.rejects(() => settle({ payload: { db: { name: 'sqlite' } } }, {}), /require PostgreSQL/)
  await assert.rejects(() => settle({ payload: { db: { name: 'postgres', beginTransaction: async () => null } } }, { ids: [1], reference: 'REF', evidence: 'Receipt' }), /active database transaction/)
})
