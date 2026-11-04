import assert from 'node:assert/strict'
import { deliverForm, normalizeFormDelivery } from '../apps/studio/src/lib/form-delivery.ts'
process.env.NODE_ENV = 'production'

assert.deepEqual(normalizeFormDelivery(null), {})
assert.deepEqual(normalizeFormDelivery({ email: ' owner@example.com ', successHref: '/cam-on?form=lead' }), { email: 'owner@example.com', successHref: '/cam-on?form=lead' })
for (const successHref of ['https://example.com', '//example.com', '/\\example.com', '/\t/example.com', '/\n/example.com']) assert.throws(() => normalizeFormDelivery({ successHref }))
for (const email of ['invalid', 'a@b', 'a\nb@example.com']) assert.throws(() => normalizeFormDelivery({ email }))
for (const webhookUrl of ['http://example.com', 'https://localhost', 'https://127.0.0.1', 'file:///data']) assert.throws(() => normalizeFormDelivery({ webhookUrl }))
let sent = 0, warnings = 0
const payload = { sendEmail: async () => { sent++; throw new Error('offline') }, logger: { warn: () => { warnings++ } } }
await deliverForm(payload as any, { title: 'Lead', slug: 'lead', delivery: { email: 'owner@example.com' } }, 7, { name: 'Khách' })
assert.equal(sent, 1)
assert.equal(warnings, 1, 'Delivery failure is logged without failing a saved submission')
await deliverForm(payload as any, { title: 'Lead', slug: 'lead', delivery: { successHref: '//example.com' } }, 8, {})
assert.equal(sent, 1)
console.log('PASS form delivery validation, internal redirects and failure isolation')
