// Audit reproductions use bootPos' disposable encrypted DB and fake ERPNext.
import request from 'supertest';
import { createHash } from 'node:crypto';
import { bootPos, type PosTestApp } from './support/pos-app';
import { PosOrderService } from '../src/wim/pos-order.service';

describe('Commerce audit 2026-11-01: reproduce current integration gaps', () => {
  let app: PosTestApp | undefined;
  afterEach(async () => { await app?.close(); app = undefined; });

  const input = (quantity = 1) => ({
    items: [{ productId: 'OIL-FILTER-01', quantity }],
    customer: { name: 'Audit fixture', phone: '0901234567', address: 'Local fixture address' },
    fulfillment: { type: 'delivery' },
  });

  it('F03: two web orders each accept all remaining units before pick allocation', async () => {
    app = await bootPos({ enabled: true, withOpenShift: true });
    const key = app.auth.createSiteKey('audit-fixture', null).key;
    const availability = async () => (await request(app!.getHttpServer()).get('/v1/products/OIL-FILTER-01/availability').set('x-api-key', key).expect(200)).body.branches[0].available as number;
    const available = await availability();
    expect(available).toBeGreaterThan(0);
    const place = (id: string) => request(app!.getHttpServer()).post('/v1/orders').set('x-api-key', key).set('Idempotency-Key', id).send(input(available));
    const first = await place('audit-stock-first').expect(201);
    const second = await place('audit-stock-second').expect(201);
    expect(second.body.id).not.toBe(first.body.id);
    expect(await availability()).toBe(available);
    expect(app.pos.getOrder(first.body.id)!.lines[0].pickTaskId).toBeNull();
    console.log('REPRODUCED F03', JSON.stringify({ physicalAvailable: available, ordered: available * 2, availableAfterBoth: await availability(), erpDrafts: app.erp.draftInvoiceCount() }));
  });

  it('F04: retry after crash boundary returns the linked order with missing lines', async () => {
    app = await bootPos({ enabled: true, withOpenShift: true });
    const key = app.auth.createSiteKey('audit-crash-fixture', null);
    const body = input();
    const idempotencyKey = 'audit-crash-boundary';
    app.pos.beginWebOrder({ siteKeyId: key.view.id, idempotencyKey, bodyHash: createHash('sha256').update(JSON.stringify(body)).digest('hex'), fulfillmentType: 'delivery', branchId: null, note: null, now: new Date().toISOString() });
    // Reserve the real POS order through its service, then simulate a process death before addLine.
    const orders = app.app.get(PosOrderService);
    const created = await orders.createOrder({ idempotency_key: `web:${key.view.id}:${idempotencyKey}`, customer: 'Walk-in Customer', customer_name: body.customer.name }, app.managerId);
    app.pos.setWebOrderOrderId(key.view.id, idempotencyKey, created.id);
    const retry = await request(app.getHttpServer()).post('/v1/orders').set('x-api-key', key.key).set('Idempotency-Key', idempotencyKey).send(body).expect(200);
    expect(retry.body.id).toBe(created.id);
    expect(retry.body.items).toHaveLength(0);
    console.log('REPRODUCED F04', JSON.stringify({ retryStatus: retry.status, requestedLines: 1, actualLines: retry.body.items.length }));
  });
});
