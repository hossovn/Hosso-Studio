import { collectOrderExtras, emitBeforeOrder, orderTotal, type HossoPlugin, type OrderAdjustment, type OrderDraft, type OrderLine } from '@hosso/studio-blocks'
import type { Endpoint, Payload, PayloadRequest, Where } from 'payload'
import { COLUMNS, parseCsv, toCsv } from './csv'
import { card, pricingOf } from './loaders'
import { adjustStock, inTransaction, StockConflict } from './stock'
import { deliverOrderEvents } from './order-events'
import { hasStock } from './product-content'
import { fulfillmentGroups, finalizeFulfillment } from './fulfillment'
import { imageOf, priceOf, slugify, type Product } from './util'
import { buildProcessingPlan, createProcessingGroups, decideAvailable, groupsFor, processOrderWorkflow, requestCancellation } from './order-workflow'
import { clientPrincipal, takeCommerceLimit } from '@hosso/studio-blocks/rate-limits'
import { timingSafeEqual, createHash } from 'node:crypto'

const json = (body: unknown, status = 200) => Response.json(body, { status })
const text = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max)
const PHONE = /^(\+?84|0)\d{8,10}$/
const matchesToken = (a: string, b?: string) => Boolean(b) && timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b || '').digest())
const isManager = (req: PayloadRequest) => {
  const r = (req.user as { roles?: string[] } | null)?.roles
  return Boolean(r?.includes('admin'))
}
const fail = (status: number, code: string, message: string, extra: object = {}) => json({ ok: false, code, message, ...extra }, status)

type OrderDoc = { id: number | string; workflowVersion?: number; approvalState?: string; workflowState?: string; processingPlan?: any[]; decisionRevision?: number; reservationExpiresAt?: string; orderNo: string; status: string; total: number; subtotal?: number; adjustments?: OrderAdjustment[]; phone: string; email?: string; items: OrderLine[]; paymentMethod: string; paymentStatus: string; fulfillmentType: string; checkoutComplete?: boolean; checkoutState?: string; checkoutKey?: string; lookupToken?: string; checkoutDraft?: OrderDraft & { fingerprint: string }; sourceOrders?: Record<string, unknown> }
const publicOrder = (o: OrderDoc) => ({ id: o.orderNo, approvalState: o.approvalState, workflowState: o.workflowState, reservationExpiresAt: o.reservationExpiresAt, decisionRevision: o.decisionRevision || 0, status: o.checkoutDraft && !o.checkoutComplete && o.status !== 'cancelled' ? 'pending' : o.status, total: o.total, subtotal: o.subtotal ?? o.total, adjustments: (o.adjustments ?? []).map(({ label, amount }) => ({ label, amount })), payment: o.paymentMethod, paymentStatus: o.paymentStatus, fulfillment: o.fulfillmentType, shipments: o.checkoutDraft?.shipments, items: o.items.map(({ productId, variantId, name, quantity, price, image, priceGroup }) => ({ productId, variantId, name, quantity, price, image, priceGroup })) })

type Prepared = { draft: OrderDraft; stock: Record<string, number>; cartId: string; note: string }
const pluginsOf = (payload: Payload) => (payload.config.custom?.hossoPlugins ?? []) as HossoPlugin[]

/** Đọc và kiểm tra giỏ hàng, lấy giá và tồn kho từ DB (không tin giá từ trình duyệt), dựng đơn nháp. `quote` bỏ qua các trường khách chưa nhập. */
export async function prepare(req: PayloadRequest, input: Record<string, any>, quote: boolean): Promise<Prepared | Response> {
  const { payload } = req
  if (input.website) return fail(400, 'bad_request', 'bad_request') // ô bẫy bot
  const cartId = text(input.cartId, 64)
  const rawItems = Array.isArray(input.items) ? input.items : []
  const lines = rawItems
    .slice(0, 50)
    .map((i: any) => ({ productId: text(i?.productId, 200), variantId: text(i?.variantId, 40), quantity: Number(i?.quantity) }))
    .filter((i) => i.productId && Number.isInteger(i.quantity) && i.quantity >= 1 && i.quantity <= 99)
  const name = text(input.customer?.name, 120)
  const phone = text(input.customer?.phone, 20).replace(/[\s.\-()]/g, '')
  const address = text(input.customer?.address, 300)
  const email = text(input.customer?.email, 200).toLowerCase()
  const note = text(input.customer?.note, 500)
  const type = input.fulfillment?.type === 'pickup' ? 'pickup' : 'delivery'
  const fulfillment = { type, ...(type === 'pickup' && { branchId: text(input.fulfillment?.branchId, 100) }) } as OrderDraft['fulfillment']
  const payment = input.payment === 'bank' ? 'bank' : 'cod'

  if (!lines.length || lines.length !== rawItems.length) return fail(400, 'bad_request', 'empty')
  if (!quote) {
    if (cartId.length < 8) return fail(400, 'bad_request', 'cart')
    if (!name) return fail(400, 'bad_request', 'name')
    if (!PHONE.test(phone)) return fail(400, 'bad_request', 'phone')
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(400, 'bad_request', 'email')
    if (type === 'delivery' && !address) return fail(400, 'bad_request', 'address')
  }

  const items: OrderLine[] = []
  const stock: Record<string, number> = {}
  for (const l of lines) {
    const p = (l.productId.startsWith('wim:')
      ? (await payload.find({ collection: 'shop-products' as any, where: { wimId: { equals: l.productId.slice(4) } }, limit: 1, depth: 0, overrideAccess: true })).docs[0]
      : await payload.findByID({ collection: 'shop-products' as any, id: l.productId, depth: 1, overrideAccess: true }).catch(() => null)) as unknown as (Product & { active?: boolean }) | null
    if (!p || p.active === false) return fail(409, 'product_not_found', 'gone', { productId: l.productId })
    // Sản phẩm có biến thể: khách phải chọn một biến thể; giá và tồn kho lấy theo biến thể.
    let price = priceOf(p)
    let name = p.name
    let available = p.stock
    let code = p.code ?? ''
    let external: Awaited<ReturnType<NonNullable<NonNullable<HossoPlugin['commerce']>['resolveProduct']>>> | undefined
    try {
      for (const plugin of pluginsOf(payload)) {
        external = await plugin.commerce?.resolveProduct?.(payload, p, l.quantity, fulfillment)
        if (external) break
      }
    } catch {
      return fail(503, 'source_unavailable', 'Không kiểm tra được nguồn hàng. Vui lòng thử lại.')
    }
    if ((p.wimId || p.source === 'wim') && p.source !== 'cross-sell' && !external) return fail(503, 'source_unavailable', 'WIM chưa sẵn sàng.')
    if (p.source === 'cross-sell' && !pluginsOf(payload).some((plugin) => plugin.id === 'cross-sell')) return fail(503, 'source_unavailable', 'Nguồn hàng bán chéo chưa sẵn sàng.')
    if (external) { price = external.price; available = external.stock }
    if (p.variants?.length) {
      const v = p.variants.find((x) => x.id === l.variantId)
      if (!v) return fail(409, 'product_not_found', 'gone', { productId: l.productId })
      if (v.price && v.price > 0) price = v.price
      name = `${p.name} (${v.name})`
      available = v.stock ?? 0
      code = v.sku || code
    }
    const sourcePrice = price
    let customerPrice: { price: number; group: string; source: string } | undefined
    try {
      for (const plugin of pluginsOf(payload)) {
        customerPrice = await plugin.commerce?.customerPrice?.({ payload, headers: req.headers, product: p, variantId: l.variantId, quantity: l.quantity, price, assistedCustomerToken: typeof input.meta?.assistedCustomerToken === 'string' ? input.meta.assistedCustomerToken : undefined })
        if (customerPrice) { price = customerPrice.price; break }
      }
    } catch { return fail(409, 'customer_price_unavailable', 'Chưa xác nhận được quyền hoặc giá của khách. Vui lòng xác minh lại hoặc liên hệ cửa hàng.') }
    if (!Number.isSafeInteger(price) || price < 0) return fail(503, 'source_unavailable', 'Giá sản phẩm chưa hợp lệ.')
    const previous = items.find((i) => i.productId === String(p.id) && (i.variantId || '') === (l.variantId || ''))
    const quantity = l.quantity + (previous?.quantity ?? 0)
    if (quantity > 99) return fail(400, 'bad_request', 'quantity')
    if (p.variants?.length || external ? !external?.stockUnmanaged && available < quantity : !hasStock(p, quantity)) return fail(409, 'out_of_stock', 'stock', { productId: l.productId, name, available })
    if (previous) previous.quantity = quantity
    else items.push({ productId: String(p.id), ...(p.variants?.length && { variantId: l.variantId }), name: (p as any).displayName ? `${(p as any).displayName}${p.variants?.length ? ` (${p.variants.find((v) => v.id === l.variantId)?.name})` : ''}` : name, code, price, sourcePrice, quantity, image: imageOf(p), ...(customerPrice && { priceSource: customerPrice.source, priceGroup: customerPrice.group }), source: external?.source || p.source || 'shop', ...(external && { remoteId: external.remoteId }) })
  }
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0)
  const meta = typeof input.meta === 'object' && input.meta ? (input.meta as Record<string, unknown>) : {}
  const draft: OrderDraft = { items, subtotal, adjustments: [], customer: { name, phone, address, email }, fulfillment, payment, meta }
  try { draft.shipments = await fulfillmentGroups(payload, draft) }
  catch { return fail(409, 'fulfillment_unavailable', 'Chưa xác nhận được phương án giao và thu tiền. Vui lòng liên hệ cửa hàng.') }
  return { draft, stock, cartId, note }
}

/** Cho plugin điều chỉnh đơn nháp (phí ship, giảm giá); lỗi thì trả Response từ chối. */
export async function priced(req: PayloadRequest, p: Prepared) {
  const rejected = await emitBeforeOrder(req.payload, p.draft, req.headers, 'shop')
  if (rejected) return fail(400, rejected.code, rejected.message)
  const total = orderTotal(p.draft)
  finalizeFulfillment(p.draft, total)
  return { total }
}

/** Per-line inspection keeps source outages distinct from zero stock. Checkout still revalidates the full order. */
export async function inspectCart(req: PayloadRequest, input: Record<string, any>) {
  if (!Array.isArray(input.items) || !input.items.length || input.items.length > 50) return { items: [], issues: [{ code: 'bad_request', message: 'empty' }] }
  const items: any[] = [], issues: any[] = []
  for (const line of input.items) {
    const prepared = await prepare(req, { ...input, items: [line] }, true)
    if (prepared instanceof Response) { issues.push({ ...(await prepared.json()), productId: line.productId, variantId: line.variantId }); continue }
    items.push({ ...prepared.draft.items[0], productId: line.productId, variantId: line.variantId })
  }
  return { items, issues }
}

export async function quoteKey(draft: OrderDraft, total: number) {
  return fingerprint({ items: draft.items, fulfillment: draft.fulfillment, payment: draft.payment, meta: { adjustments: draft.adjustments, shipments: draft.shipments, total } })
}

async function fingerprint(input: Record<string, any>) {
  const bytes = new TextEncoder().encode(JSON.stringify({ items: input.items, customer: input.customer, fulfillment: input.fulfillment, payment: input.payment, meta: input.meta }))
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), (b) => b.toString(16).padStart(2, '0')).join('')
}

async function completeOrder(req: PayloadRequest, order: OrderDoc) {
  const { payload } = req
  const draft = order.checkoutDraft!
  const orderNo = order.orderNo || `SO-${String(order.id).padStart(6, '0')}`
  const success = (redirectUrl?: string) => json({ ok: true, order: { id: orderNo, status: order.status, total: order.total }, lookupToken: order.lookupToken, ...(redirectUrl && { redirectUrl }) })
  if (order.workflowVersion === 1) {
    await processOrderWorkflow(req, order)
    const fresh = await payload.findByID({ collection: 'shop-orders' as any, id: order.id, depth: 0, overrideAccess: true }) as unknown as OrderDoc
    if (fresh.checkoutComplete && fresh.workflowState === 'ready') await deliverOrderEvents(req, fresh)
    return json({ ok: true, accepted: true, order: publicOrder(fresh), lookupToken: fresh.lookupToken })
  }
  if (order.status === 'cancelled') return fail(409, 'order_cancelled', 'Đơn đã hủy. Vui lòng tạo giỏ mới.', { resetCart: true })
  if (order.checkoutComplete || !draft) return success(await deliverOrderEvents(req, order))
  if (order.checkoutState === 'legacy_review') return fail(503, 'reconciliation_required', 'Đơn cũ cần đối soát tồn kho trước khi tiếp tục.')
  const sourceOrders = { ...order.sourceOrders }
  try {
    for (const source of new Set(draft.items.map((i) => i.source).filter((s) => s && s !== 'shop' && s !== 'cross-sell'))) {
      if (sourceOrders[source!]) continue
      const adapter = pluginsOf(payload).find((p) => p.id === source)?.commerce?.submitOrder
      if (!adapter) throw new Error('Source is unavailable')
      sourceOrders[source!] = await adapter(payload, { ...draft, id: orderNo, checkoutKey: order.checkoutKey, items: draft.items.filter((i) => i.source === source) })
      await inTransaction(req, () => payload.update({ collection: 'shop-orders' as any, id: order.id, req, data: { sourceOrders }, overrideAccess: true, context: { skipStatusEvent: true } }))
    }
  } catch (error) {
    if ((error as { definitive?: boolean }).definitive && !Object.keys(sourceOrders).length) {
      await inTransaction(req, async () => {
        await payload.update({ collection: 'shop-orders' as any, id: order.id, data: { status: 'cancelled', checkoutState: 'source_rejected', cancellationReason: 'Nguồn hàng từ chối xác nhận đơn.' }, req, overrideAccess: true, context: { sourceRejected: true } })
      })
      return fail(409, 'out_of_stock', 'Nguồn hàng đã từ chối đơn. Vui lòng kiểm tra lại giỏ.', { resetCart: true })
    }
    payload.logger.error(error, '[shop] Source confirmation pending; background recovery will retry')
    return fail(503, 'source_pending', 'Đơn đang chờ nguồn hàng xác nhận. Giữ nguyên giỏ và thử lại.', { orderId: orderNo, lookupToken: order.lookupToken })
  }
  try { for (const plugin of pluginsOf(payload)) await plugin.commerce?.confirmPayment?.(payload, { ...draft, id: orderNo }) }
  catch (error) {
    payload.logger.error(error, '[shop] Payment preparation pending')
    return fail(503, 'payment_pending', 'Đơn đang chờ khởi tạo thanh toán. Vui lòng thử lại cùng giỏ.', { orderId: orderNo, lookupToken: order.lookupToken })
  }
  // Claim completion atomically so concurrent retries cannot emit duplicate payment/order events.
  const claimed = await inTransaction(req, () => payload.db.updateOne({ collection: 'shop-orders', req, where: { and: [{ id: { equals: order.id } }, { checkoutComplete: { equals: false } }, { status: { not_equals: 'cancelled' } }] }, data: { orderNo, checkoutComplete: true, checkoutState: 'confirmed' }, options: { atomic: true } }))
  if (!claimed) return completeOrder(req, await payload.findByID({ collection: 'shop-orders' as any, id: order.id, depth: 0, overrideAccess: true }) as unknown as OrderDoc)
  return success(await deliverOrderEvents(req, { ...order, checkoutComplete: true }))
}

/** Reservation is already durable. Source, payment and email processing continue on the server. */
async function acceptedOrder(req: PayloadRequest, order: OrderDoc, enqueue = false) {
  if (order.status === 'cancelled') return json({ ok: true, accepted: true, order: publicOrder(order), lookupToken: order.lookupToken })
  try { if (enqueue) await req.payload.jobs.queue({ task: 'shop-order-recovery', input: {}, queue: 'default' }) }
  catch (error) { req.payload.logger.error(error, '[shop] Immediate recovery queue failed; scheduled recovery will retry') }
  return json({ ok: true, accepted: true, order: publicOrder(order), lookupToken: order.lookupToken }, order.checkoutComplete ? 200 : 202)
}

export async function recoverOrders(req: PayloadRequest) {
  const pending = await req.payload.find({ collection: 'shop-orders' as any, where: { and: [{ checkoutDraft: { exists: true } }, { checkoutState: { not_equals: 'legacy_review' } }, { status: { not_equals: 'cancelled' } }, { or: [{ hooksComplete: { not_equals: true } }, { and: [{ approvalState: { not_equals: 'awaiting' } }, { or: [{ checkoutComplete: { equals: false } }, { workflowState: { in: ['cancelling', 'processing', 'awaiting_customer', 'fulfilling'] } }] }] }] }] }, limit: 25, sort: 'updatedAt', depth: 0, overrideAccess: true })
  for (const order of pending.docs as unknown as OrderDoc[]) {
    await recoverOrder(req, order)
  }
}

export async function recoverOrder(req: PayloadRequest, order: OrderDoc) {
  const lease = new Date(Date.now() + 10 * 60000).toISOString()
  const claimed = await inTransaction(req, () => req.payload.db.updateOne({ collection: 'shop-orders', req, where: { and: [{ id: { equals: order.id } }, { status: { not_equals: 'cancelled' } }, { or: [{ processingUntil: { exists: false } }, { processingUntil: { less_than: new Date().toISOString() } }] }] }, data: { processingUntil: lease }, options: { atomic: true } }))
  if (!claimed) return
    try {
      await deliverOrderEvents(req, order, 'received')
      if (order.workflowVersion === 1 && order.approvalState === 'awaiting') return
      if (order.workflowVersion === 1 && ['processing', 'awaiting_customer'].includes(order.workflowState || '') && !order.checkoutDraft?.provisional?.committedAt && order.reservationExpiresAt && Date.parse(order.reservationExpiresAt) <= Date.now()) await requestCancellation(req, order, 'Hết thời gian giữ hàng tạm trước khi chốt nguồn')
      const result = await completeOrder(req, order)
      if (!result.ok) {
        const body = await result.json()
        await req.payload.update({ collection: 'shop-orders' as any, id: order.id, data: { processingIssue: body.code === 'out_of_stock' ? null : body.code }, overrideAccess: true, req, context: { skipStatusEvent: true } })
      } else {
        const fresh = await req.payload.findByID({ collection: 'shop-orders' as any, id: order.id, depth: 0, overrideAccess: true, req }) as any
        if (fresh.workflowVersion !== 1) await req.payload.update({ collection: 'shop-orders' as any, id: order.id, data: { processingIssue: fresh.hooksComplete ? null : 'events_pending' }, overrideAccess: true, req, context: { skipStatusEvent: true } })
      }
    }
    catch (error) {
      req.payload.logger.error(error, '[shop] Order recovery failed')
      await req.payload.update({ collection: 'shop-orders' as any, id: order.id, data: { processingIssue: 'retry_pending' }, overrideAccess: true, req, context: { skipStatusEvent: true } })
    } finally {
      await inTransaction(req, () => req.payload.db.updateOne({ collection: 'shop-orders', req, where: { and: [{ id: { equals: order.id } }, { processingUntil: { equals: lease } }] }, data: { processingUntil: null }, options: { atomic: true } }))
    }
}

export async function placeOrder(req: PayloadRequest, input: Record<string, any>, options: { background?: boolean; trustedApproval?: boolean; provisionalUntil?: string } = {}) {
  const { payload } = req
  if (options.provisionalUntil && (!options.trustedApproval || !Number.isFinite(Date.parse(options.provisionalUntil)) || Date.parse(options.provisionalUntil) <= Date.now() || Date.parse(options.provisionalUntil) > Date.now() + 1440 * 60000)) return fail(400, 'invalid_reservation', 'Invalid supplier reservation deadline')
  if (input.website) return fail(400, 'bad_request', 'bad_request')
  const cartId = text(input.checkoutId || input.cartId, 64)
  input = { ...input, cartId }
  if (cartId.length < 8) return fail(400, 'bad_request', 'cart')
  const requestFingerprint = await fingerprint(input)
  const dup = (await payload.find({ collection: 'shop-orders' as any, where: { cartId: { equals: cartId } }, limit: 1, depth: 0, overrideAccess: true })).docs[0] as unknown as OrderDoc | undefined
  if (dup) {
    if (dup.checkoutDraft ? dup.checkoutDraft.fingerprint !== requestFingerprint : dup.phone !== text(input.customer?.phone, 20).replace(/[\s.\-()]/g, '')) return fail(409, 'cart_changed', 'Giỏ đã tạo đơn với nội dung khác. Vui lòng tạo giỏ mới.')
    if (options.background) return acceptedOrder(req, dup)
    await deliverOrderEvents(req, dup, 'received')
    return completeOrder(req, dup)
  }
  try {
    if (!await takeCommerceLimit(req, 'checkout-ingress', clientPrincipal(req), 300) || !await takeCommerceLimit(req, 'checkout-customer', text(input.customer?.phone, 30), 30, 600000)) return fail(429, 'too_many', 'Có quá nhiều yêu cầu. Vui lòng thử lại sau ít phút.')
  } catch { return fail(429, 'too_many', 'Vui lòng thử lại sau ít phút.') }
  const p = await prepare(req, input, false)
  if (p instanceof Response) return p

  const price = await priced(req, p)
  if (price instanceof Response) return price
  const { draft } = p
  if (options.provisionalUntil) draft.provisional = { expiresAt: options.provisionalUntil }
  const { total } = price
  if (input.quoteKey && input.quoteKey !== await quoteKey(draft, total)) return fail(409, 'quote_changed', 'Giá hoặc phí đã thay đổi. Vui lòng xem lại tổng và xác nhận đặt hàng lần nữa.')
  let processingPlan: Awaited<ReturnType<typeof buildProcessingPlan>>
  try { processingPlan = await buildProcessingPlan(payload, draft) }
  catch { return fail(503, 'source_unavailable', 'Chưa lập được phương án xử lý nguồn hàng. Vui lòng thử lại.') }

  let order: OrderDoc
  try {
    order = await inTransaction(req, async () => {
      const created = (await payload.create({
        collection: 'shop-orders' as any,
        req,
        overrideAccess: true,
        context: req.context,
        data: { workflowVersion: 1, approvalState: options.trustedApproval ? 'approved' : 'awaiting', workflowState: options.trustedApproval ? 'processing' : 'awaiting_admin', processingPlan, ...(options.provisionalUntil && { reservationExpiresAt: options.provisionalUntil }), ...(options.trustedApproval && { approvedAt: new Date().toISOString(), approvedBy: 'trusted-partner', status: 'confirmed' }), cartId: p.cartId, checkoutDraft: { ...draft, fingerprint: requestFingerprint }, checkoutComplete: false, checkoutState: 'awaiting_admin', checkoutKey: crypto.randomUUID(), lookupToken: crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', ''), subtotal: draft.subtotal, adjustments: draft.adjustments, total, paymentMethod: draft.payment, fulfillmentType: draft.fulfillment.type, branchId: draft.fulfillment.branchId, customerName: draft.customer.name, phone: draft.customer.phone, email: draft.customer.email, address: draft.customer.address, note: p.note, items: draft.items },
      })) as unknown as OrderDoc
      const orderNo = `SO-${String(created.id).padStart(6, '0')}`
      await payload.update({ collection: 'shop-orders' as any, id: created.id, req, data: { orderNo }, overrideAccess: true, context: { skipStatusEvent: true } })
      if (options.trustedApproval) await createProcessingGroups(req, created)
      return { ...created, orderNo }
    })
  } catch (error) {
    const existing = (await payload.find({ collection: 'shop-orders' as any, where: { cartId: { equals: cartId } }, limit: 1, depth: 0, overrideAccess: true })).docs[0] as unknown as OrderDoc | undefined
    if (existing?.checkoutDraft?.fingerprint === requestFingerprint) {
      if (options.background) return acceptedOrder(req, existing)
      await deliverOrderEvents(req, existing, 'received')
      return completeOrder(req, existing)
    }
    if (error instanceof StockConflict) return fail(409, 'out_of_stock', 'Tồn kho đã thay đổi. Vui lòng kiểm tra lại giỏ.')
    payload.logger.error(error, '[shop] Reservation failed; order transaction rolled back')
    return fail(503, 'reservation_failed', 'Chưa giữ được hàng. Vui lòng thử lại.')
  }

  if (options.background) return acceptedOrder(req, order, true)
  await deliverOrderEvents(req, order, 'received')
  return completeOrder(req, order)
}

/** Nhập CSV: cập nhật theo `code` (mã sản phẩm), chưa có thì tạo; danh mục theo tên (chưa có thì tạo); ảnh theo tên tệp đã có trong Media. */
async function importCsv(payload: Payload, csv: string) {
  const [head, ...rows] = parseCsv(csv)
  if (!head) return { created: 0, updated: 0, errors: ['empty'] }
  const col = Object.fromEntries(head.map((h, i) => [h.trim(), i]))
  if (col.name === undefined) return { created: 0, updated: 0, errors: ['missing column: name'] }
  const get = (r: string[], k: string) => (col[k] === undefined ? '' : (r[col[k]] ?? '').trim())
  const cats = new Map<string, number | string>()
  let created = 0
  let updated = 0
  const errors: string[] = []
  for (const [n, r] of rows.entries()) {
    try {
      const name = get(r, 'name')
      if (!name) throw new Error('name is empty')
      let category: number | string | undefined
      const catName = get(r, 'category')
      if (catName) {
        if (!cats.has(catName)) {
          const found = (await payload.find({ collection: 'shop-categories' as any, where: { name: { equals: catName } }, limit: 1, depth: 0, overrideAccess: true })).docs[0]
          cats.set(catName, found ? found.id : (await payload.create({ collection: 'shop-categories' as any, data: { name: catName }, overrideAccess: true })).id)
        }
        category = cats.get(catName)
      }
      const imageName = get(r, 'image')
      const media = imageName ? (await payload.find({ collection: 'media', where: { filename: { equals: imageName } }, limit: 1, depth: 0, overrideAccess: true })).docs[0] : undefined
      const num = (k: string) => (get(r, k) === '' ? undefined : Number(get(r, k)))
      const source = get(r, 'source')
      if (source && !['shop', 'wim', 'cross-sell'].includes(source)) throw new Error('Invalid product source')
      const data: Record<string, unknown> = {
        name,
        ...(source && { source }),
        ...(col.wimId !== undefined && { wimId: get(r, 'wimId') || null }),
        brand: get(r, 'brand') || undefined,
        price: num('price') ?? 0,
        salePrice: num('salePrice'),
        stock: num('stock') ?? 0,
        makes: get(r, 'makes') ? get(r, 'makes').split(/[,;|]/).map((m) => slugify(m)).filter(Boolean) : undefined,
        description: get(r, 'description') || undefined,
        active: get(r, 'active') === '' ? true : !/^(0|false|no|không)$/i.test(get(r, 'active')),
        ...(category !== undefined && { category }),
        ...(media && { images: [{ image: media.id }] }),
      }
      const code = get(r, 'code')
      const existing = code ? (await payload.find({ collection: 'shop-products' as any, where: { code: { equals: code } }, limit: 1, depth: 0, overrideAccess: true })).docs[0] : undefined
      if (existing) {
        await payload.update({ collection: 'shop-products' as any, id: existing.id, data, overrideAccess: true })
        updated++
      } else {
        await payload.create({ collection: 'shop-products' as any, data: { ...data, code: code || undefined, ...(source === 'cross-sell' && { active: false, stock: 0 }) }, overrideAccess: true })
        created++
      }
    } catch (e) {
      errors.push(`#${n + 2}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  return { created, updated, errors }
}

// ponytail: giới hạn tần suất gửi đánh giá nằm trong bộ nhớ của một tiến trình; dùng Redis hoặc bảng riêng khi chạy nhiều bản.
const reviewHits = new Map<string, number[]>()

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
const vndText = (n: number) => `${Math.round(n || 0).toLocaleString('vi-VN')} đ`

/** Trang in đơn hàng + phiếu giao hàng (A4), mở từ admin; chỉ admin/publisher. */
async function printPage(req: PayloadRequest) {
  const key = text(new URL(req.url!).searchParams.get('id'), 40)
  const where: Where = /^\d+$/.test(key) ? { id: { equals: Number(key) } } : { orderNo: { equals: key } }
  const o = (await req.payload.find({ collection: 'shop-orders' as any, where, limit: 1, depth: 0, overrideAccess: true })).docs[0] as unknown as
    | (OrderDoc & { customerName: string; address?: string; note?: string; createdAt: string })
    | undefined
  if (!o) return new Response('Not found', { status: 404 })
  const site = (await req.payload.findGlobal({ slug: 'site-settings' as any, depth: 0, overrideAccess: true }).catch(() => null)) as { siteName?: string; contact?: { phone?: string; address?: string } } | null
  const cod = o.paymentMethod === 'cod' && o.paymentStatus !== 'paid' ? o.total : 0
  const rows = o.items.map((i) => `<tr><td>${esc(i.name)}</td><td class="r">${i.quantity}</td><td class="r">${vndText(i.price)}</td><td class="r">${vndText(i.price * i.quantity)}</td></tr>`).join('')
  const adj = (o.adjustments ?? []).map((a) => `<tr><td colspan="3">${esc(a.label)}</td><td class="r">${a.amount < 0 ? '−' : '+'}${vndText(Math.abs(a.amount))}</td></tr>`).join('')
  const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>${esc(o.orderNo)}</title><style>
body{font:14px/1.5 Arial,sans-serif;margin:0;padding:24px;color:#111}h1{font-size:20px;margin:0}h2{font-size:15px;margin:18px 0 6px}
table{border-collapse:collapse;width:100%}th,td{border:1px solid #bbb;padding:6px 8px;text-align:left}.r{text-align:right}.tot td{font-weight:700}
.label{border:2px dashed #111;padding:14px;margin-top:28px;page-break-inside:avoid}.big{font-size:18px;font-weight:700}
@media print{.noprint{display:none}body{padding:0}}</style></head><body>
<p class="noprint"><button onclick="print()">In / Print</button></p>
<h1>${esc(site?.siteName ?? 'Shop')}</h1><p>${esc(site?.contact?.phone ?? '')} ${esc(site?.contact?.address ?? '')}</p>
<h2>Đơn hàng ${esc(o.orderNo)} · ${new Date(o.createdAt).toLocaleString('vi-VN')}</h2>
<p>Khách: <b>${esc(o.customerName)}</b> · ${esc(o.phone)}${o.email ? ' · ' + esc(o.email) : ''}<br>Địa chỉ: ${esc(o.address || '(nhận tại cửa hàng)')}<br>Thanh toán: ${esc(o.paymentMethod)} (${esc(o.paymentStatus)})${o.note ? '<br>Ghi chú: ' + esc(o.note) : ''}</p>
<table><thead><tr><th>Sản phẩm</th><th class="r">SL</th><th class="r">Đơn giá</th><th class="r">Thành tiền</th></tr></thead><tbody>${rows}${adj}
<tr class="tot"><td colspan="3">Tổng cộng</td><td class="r">${vndText(o.total)}</td></tr></tbody></table>
<div class="label"><div>PHIẾU GIAO HÀNG · ${esc(o.orderNo)}</div>
<p class="big">${esc(o.customerName)} · ${esc(o.phone)}</p><p>${esc(o.address || '(nhận tại cửa hàng)')}</p>
<p class="big">Thu hộ (COD): ${vndText(cod)}</p><p>Người gửi: ${esc(site?.siteName ?? '')} · ${esc(site?.contact?.phone ?? '')}</p></div>
</body></html>`
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } })
}

export const endpoints: Endpoint[] = [
  { path: '/plugins/shop/order-decision', method: 'post', handler: async (req) => {
    if (!await takeCommerceLimit(req, 'order-decision', clientPrincipal(req), 60)) return fail(429, 'rate_limit', 'Vui lòng thử lại sau.')
    const input = await req.json?.().catch(() => null) as any
    const token = text(input?.token, 128)
    const order = (await req.payload.find({ collection: 'shop-orders' as any, where: { orderNo: { equals: text(input?.id, 40) } }, depth: 0, limit: 1, overrideAccess: true })).docs[0] as any
    if (!order || !/^[a-f0-9]{64}$/.test(token) || !matchesToken(token, order.lookupToken) || order.workflowVersion !== 1) return fail(404, 'not_found', 'not_found')
    try {
      await decideAvailable(req, order, String(input?.decision || ''), Number(input?.revision))
      await req.payload.jobs.queue({ task: 'shop-order-recovery', input: {}, queue: 'default' }).catch(() => undefined)
      return json({ ok: true })
    }
    catch { return fail(409, 'decision_changed', 'Lựa chọn đã thay đổi hoặc hết hạn. Vui lòng tải lại đơn.') }
  } },
  { path: '/plugins/shop/receipt', method: 'post', handler: async (req) => {
    const input = await req.json?.().catch(() => null) as any
    if (!/^[a-f0-9]{64}$/.test(input?.checkoutId || '')) return fail(404, 'not_found', 'not_found')
    const o = (await req.payload.find({ collection: 'shop-orders' as any, where: { cartId: { equals: input.checkoutId } }, limit: 1, depth: 0, overrideAccess: true })).docs[0] as unknown as OrderDoc | undefined
    if (!o || o.checkoutDraft?.fingerprint !== await fingerprint(input)) return fail(404, 'not_found', 'not_found')
    const response = await acceptedOrder(req, o)
    response.headers.set('Cache-Control', 'no-store')
    response.headers.set('Referrer-Policy', 'no-referrer')
    return response
  } },
  { path: '/plugins/shop/manage-order', method: 'get', handler: async (req) => {
    if (!isManager(req)) return fail(403, 'forbidden', 'forbidden')
    return (await import('./order-operations')).readManagedOrder(req)
  } },
  { path: '/plugins/shop/manage-order', method: 'post', handler: async (req) => {
    if (!(req.user as { roles?: string[] } | null)?.roles?.includes('admin')) return fail(403, 'forbidden', 'forbidden')
    return (await import('./order-operations')).operateOrder(req)
  } },
  {
    path: '/plugins/shop/print',
    method: 'get',
    handler: async (req) => (isManager(req) ? printPage(req) : new Response('Forbidden', { status: 403 })),
  },
  {
    // Danh sách yêu thích: khách gửi các id đã lưu ở trình duyệt, trả thẻ sản phẩm đang bán (tối đa 50).
    path: '/plugins/shop/wishlist',
    method: 'get',
    handler: async (req) => {
      const ids = text(new URL(req.url!).searchParams.get('ids'), 1000).split(',').map((s) => s.trim()).filter((s) => /^\d+$/.test(s)).slice(0, 50).map(Number)
      if (!ids.length) return json({ items: [] })
      const r = await req.payload.find({ collection: 'shop-products' as any, where: { and: [{ active: { equals: true } }, { id: { in: ids } }] }, limit: 50, depth: 2, pagination: false, overrideAccess: true })
      const pr = await pricingOf(req.payload)
      return json({ items: (r.docs as unknown as Product[]).map((p) => card(p, pr)) })
    },
  },
  {
    // Khách gửi đánh giá: chờ quản trị viên duyệt; bẫy bot, tối đa 3 đánh giá mỗi giờ mỗi địa chỉ.
    path: '/plugins/shop/review',
    method: 'post',
    handler: async (req) => {
      const b = ((await req.json?.().catch(() => null)) ?? {}) as Record<string, unknown>
      if (b.website) return json({ ok: true }) // bẫy bot: giả vờ thành công
      const name = text(b.name, 80)
      const rating = Math.round(Number(b.rating))
      if (!name) return fail(400, 'bad_request', 'name')
      if (!(rating >= 1 && rating <= 5)) return fail(400, 'bad_request', 'rating')
      const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'local'
      const now = Date.now()
      const hits = (reviewHits.get(ip) ?? []).filter((t) => now - t < 3600_000)
      if (hits.length >= 3) return fail(429, 'too_many', 'too_many')
      reviewHits.set(ip, [...hits, now])
      const product = await req.payload.findByID({ collection: 'shop-products' as any, id: text(b.productId, 40), depth: 0, overrideAccess: true }).catch(() => null)
      if (!product) return fail(404, 'product_not_found', 'gone')
      await req.payload.create({ collection: 'shop-reviews' as any, data: { product: product.id, name, rating, comment: text(b.comment, 1000), status: 'pending' }, overrideAccess: true })
      return json({ ok: true })
    },
  },
  {
    // Xem trước tổng tiền (phí ship, giảm giá do plugin khác thêm) trước khi đặt, không tạo đơn.
    path: '/plugins/shop/cart', method: 'post', handler: async (req) => {
      const result = await inspectCart(req, (await req.json?.().catch(() => null)) ?? {})
      return json({ ok: true, ...result })
    },
  },
  {
    path: '/plugins/shop/quote',
    method: 'post',
    handler: async (req) => {
      const input = (await req.json?.().catch(() => null)) ?? {}
      const p = await prepare(req, input, true)
      if (p instanceof Response) {
        const error = await p.json()
        if (['product_not_found', 'out_of_stock'].includes(error.code)) return fail(p.status, error.code, error.message, await inspectCart(req, input))
        return json(error, p.status)
      }
      const price = await priced(req, p)
      if (price instanceof Response) return price
      return json({ ok: true, items: p.draft.items, shipments: p.draft.shipments, quoteKey: await quoteKey(p.draft, price.total), subtotal: p.draft.subtotal, adjustments: p.draft.adjustments.map(({ label, amount }) => ({ label, amount })), total: price.total })
    },
  },
  {
    path: '/plugins/shop/checkout',
    method: 'post',
    handler: async (req) => {
      const body = await req.json?.().catch(() => null)
      return placeOrder(req, body ?? {}, { background: true })
    },
  },
  {
    // Khách tra cứu bằng mã đơn và token riêng, không dùng số điện thoại làm quyền truy cập.
    path: '/plugins/shop/order',
    method: 'get',
    handler: async (req) => {
      const sp = new URL(req.url!).searchParams
      const orderNo = text(sp.get('id'), 40)
      const token = text(sp.get('token'), 128)
      const o = orderNo ? ((await req.payload.find({ collection: 'shop-orders' as any, where: { orderNo: { equals: orderNo } }, limit: 1, depth: 0, overrideAccess: true })).docs[0] as unknown as OrderDoc | undefined) : undefined
      if (!o || !/^[a-f0-9]{64}$/.test(token) || !matchesToken(token, o.lookupToken)) return json({ ok: false }, 404)
      const extras = o.checkoutDraft && !o.checkoutComplete || o.status === 'cancelled' ? {} : await collectOrderExtras(req.payload, { id: o.orderNo, total: o.total, status: o.status, payment: o.paymentMethod, paymentStatus: o.paymentStatus })
      if ((!o.checkoutDraft || o.checkoutComplete) && o.status !== 'cancelled' && o.paymentMethod === 'bank' && o.paymentStatus !== 'paid' && !('payment' in extras)) {
        const settings = await req.payload.findGlobal({ slug: 'shop-settings' as any, depth: 0, overrideAccess: true }) as { bankInfo?: string }
        if (settings.bankInfo) Object.assign(extras, { payment: { note: settings.bankInfo } })
      }
      const availability = o.workflowVersion === 1 ? (await groupsFor(req.payload, o.id)).map(group => ({ state: group.state, items: group.plan.items.map((line: OrderLine) => ({ name: line.name, quantity: line.quantity })) })) : []
      return Response.json({ ok: true, order: publicOrder(o), extras, availability }, { headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } })
    },
  },
  {
    path: '/plugins/shop/import',
    method: 'post',
    handler: async (req) => {
      if (!isManager(req)) return json({ ok: false, message: 'forbidden' }, 403)
      const csv = await (typeof req.text === 'function' ? req.text() : Promise.resolve(''))
      return json({ ok: true, ...(await importCsv(req.payload, csv)) })
    },
  },
  {
    path: '/plugins/shop/export',
    method: 'get',
    handler: async (req) => {
      if (!isManager(req)) return json({ ok: false, message: 'forbidden' }, 403)
      const docs = (await req.payload.find({ collection: 'shop-products' as any, limit: 10000, depth: 2, pagination: false, overrideAccess: true })).docs as unknown as (Product & { active?: boolean })[]
      const rows = docs.map((p) => [p.code, p.name, p.category?.name, p.brand, p.price, p.salePrice, p.stock, (p.makes ?? []).join(';'), p.description, p.images?.[0]?.image?.filename, p.active === false ? 0 : 1, p.source || (p.wimId ? 'wim' : 'shop'), p.wimId])
      return new Response(toCsv([[...COLUMNS], ...rows]), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="products.csv"' } })
    },
  },
]

