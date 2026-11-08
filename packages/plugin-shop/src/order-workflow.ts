import type { CollectionConfig, CollectionSlug, Payload, PayloadRequest } from 'payload'
import type { HossoPlugin, OrderDraft, OrderLine } from '@hosso/studio-blocks'
import { adjustStock, inTransaction, StockConflict } from './stock'
import { finalizeFulfillment } from './fulfillment'

export const GROUPS = 'shop-order-groups' as CollectionSlug
type Plan = { key: string; source: string; label: string; items: OrderLine[]; data: Record<string, any> }
const plugins = (payload: Payload) => (payload.config.custom?.hossoPlugins || []) as HossoPlugin[]
const lineKey = (line: OrderLine) => line.productId + ':' + (line.variantId || '')
const orderById = (req: PayloadRequest, id: string | number): Promise<any> => req.payload.findByID({ collection: 'shop-orders' as any, id, depth: 0, req, overrideAccess: true })
/** CAS also locks this row until the surrounding transaction commits on PostgreSQL. */
async function lockOrder(req: PayloadRequest, id: string | number) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const order = await orderById(req, id)
    const version = order.operationsVersion || 0
    const claim = await req.payload.db.updateOne({ collection: 'shop-orders', req, where: { and: [{ id: { equals: id } }, { or: [{ operationsVersion: { equals: version } }, ...(version === 0 ? [{ operationsVersion: { exists: false } }] : [])] }] }, data: { operationsVersion: version + 1 }, options: { atomic: true } })
    if (claim) return order
  }
  throw new Error('order_changed')
}
export const groupsFor = async (payload: Payload, id: string | number, req?: PayloadRequest): Promise<any[]> => (await payload.find({ collection: GROUPS as any, where: { order: { equals: id } }, limit: 100, depth: 0, overrideAccess: true, req })).docs

export const OrderGroups: CollectionConfig = {
  slug: GROUPS,
  admin: { group: { vi: 'Cửa hàng', en: 'Shop' }, useAsTitle: 'label', defaultColumns: ['order', 'label', 'source', 'state', 'attempts', 'nextAttemptAt'] },
  access: { read: ({ req }) => Boolean((req.user as { roles?: string[] } | null)?.roles?.includes('admin')), create: () => false, update: () => false, delete: () => false },
  fields: [
    { name: 'key', type: 'text', unique: true, required: true },
    { name: 'order', type: 'relationship', relationTo: 'shop-orders' as any, required: true, index: true },
    { name: 'source', type: 'text', required: true },
    { name: 'label', type: 'text', required: true },
    { name: 'plan', type: 'json', required: true },
    { name: 'result', type: 'json' },
    { name: 'committed', type: 'checkbox', defaultValue: false },
    { name: 'state', type: 'select', required: true, defaultValue: 'pending', options: ['pending', 'processing', 'accepted', 'missing', 'unknown', 'cancelling', 'cancelled', 'fulfilled', 'attention'] },
    { name: 'intent', type: 'select', defaultValue: 'process', options: ['process', 'cancel'] },
    { name: 'stockReserved', type: 'checkbox', defaultValue: false },
    { name: 'stockReleased', type: 'checkbox', defaultValue: false },
    { name: 'attempts', type: 'number', defaultValue: 0 },
    { name: 'nextAttemptAt', type: 'date', index: true },
    { name: 'leaseToken', type: 'text' },
    { name: 'leaseUntil', type: 'date' },
    { name: 'issue', type: 'text' },
  ],
}

/** Build immutable, credential-free source snapshots before opening the order transaction. */
export async function buildProcessingPlan(payload: Payload, draft: OrderDraft): Promise<Plan[]> {
  const result: Plan[] = []
  const used = new Set<string>()
  for (const plugin of plugins(payload)) {
    for (const group of await plugin.commerce?.processingGroups?.(payload, draft) || []) {
      if (!group.items.length) throw new Error('Empty processing group')
      for (const line of group.items) {
        if (used.has(lineKey(line)) || !draft.items.some(item => lineKey(item) === lineKey(line) && item.quantity === line.quantity)) throw new Error('Invalid processing group lines')
        used.add(lineKey(line))
      }
      result.push({ ...group, source: plugin.id })
    }
  }
  for (const line of draft.items) {
    if (used.has(lineKey(line))) continue
    if (line.source === 'cross-sell') throw new Error('Supplier processing adapter is unavailable')
    result.push({ key: crypto.randomUUID(), source: line.source || 'shop', label: line.name, items: [line], data: {} })
  }
  if (!result.length || result.length > 100 || new Set(result.map(group => group.key)).size !== result.length) throw new Error('Invalid processing plan')
  return result
}

export async function createProcessingGroups(req: PayloadRequest, order: any) {
  if (!req.transactionID) throw new Error('Approval and processing commands must commit together')
  if (!order.reservationExpiresAt) {
    const settings = await req.payload.findGlobal({ slug: 'shop-settings' as any, depth: 0, req, overrideAccess: true }) as any
    order.reservationExpiresAt = new Date(Date.now() + Math.max(5, Math.min(1440, Number(settings.reservationMinutes) || 30)) * 60000).toISOString()
    await req.payload.update({ collection: 'shop-orders' as any, id: order.id, req, overrideAccess: true, data: { reservationExpiresAt: order.reservationExpiresAt } })
  }
  for (const plan of order.processingPlan as Plan[]) {
    const existing = await req.payload.find({ collection: GROUPS as any, where: { key: { equals: plan.key } }, limit: 1, depth: 0, req, overrideAccess: true })
    if (!existing.docs.length) await req.payload.create({ collection: GROUPS as any, req, overrideAccess: true, data: { key: plan.key, order: order.id, source: plan.source, label: plan.label, plan, state: 'pending', intent: 'process', nextAttemptAt: new Date().toISOString() } })
  }
}

export async function approveOrder(req: PayloadRequest, order: any, version: number) {
  await inTransaction(req, async () => {
    const fresh = await orderById(req, order.id)
    if (fresh.approvalState === 'approved') return
    if (fresh.status !== 'new' || fresh.approvalState !== 'awaiting' || !Array.isArray(fresh.processingPlan)) throw new Error('invalid_transition')
    const claimed = await req.payload.db.updateOne({ collection: 'shop-orders', req, where: { and: [{ id: { equals: fresh.id } }, { approvalState: { equals: 'awaiting' } }, { operationsVersion: { equals: version } }] }, data: { operationsVersion: version + 1 }, options: { atomic: true } })
    if (!claimed) throw new Error('order_changed')
    await createProcessingGroups(req, fresh)
    await req.payload.update({ collection: 'shop-orders' as any, id: fresh.id, req, overrideAccess: true, data: {
      approvalState: 'approved', approvedBy: String(req.user?.id || 'trusted-partner'), approvedAt: new Date().toISOString(), status: 'confirmed', workflowState: 'processing', processingIssue: null,
      operationHistory: [...(fresh.operationHistory || []), { action: 'confirm', at: new Date().toISOString(), actor: String(req.user?.id || 'trusted-partner') }],
    } })
  })
}

async function runGroup(req: PayloadRequest, order: any, group: any) {
  const now = Date.now()
  if (['missing', 'cancelled', 'fulfilled'].includes(group.state) || (group.state === 'attention' && group.intent !== 'cancel') || (group.state === 'accepted' && group.intent !== 'cancel')) return
  if (group.nextAttemptAt && Date.parse(group.nextAttemptAt) > now) return
  if (group.leaseUntil && Date.parse(group.leaseUntil) > now) return
  const token = crypto.randomUUID()
  const claim = await inTransaction(req, () => req.payload.db.updateOne({ collection: GROUPS, req, where: { and: [{ id: { equals: group.id } }, { state: { equals: group.state } }, { or: [{ leaseUntil: { exists: false } }, { leaseUntil: { less_than_equal: new Date().toISOString() } }] }] }, data: { state: group.intent === 'cancel' ? 'cancelling' : 'processing', leaseToken: token, leaseUntil: new Date(now + 5 * 60000).toISOString(), attempts: (group.attempts || 0) + 1 }, options: { atomic: true } }))
  if (!claim) return
  const finish = async (data: Record<string, any>) => req.payload.db.updateOne({ collection: GROUPS, req, where: { and: [{ id: { equals: group.id } }, { leaseToken: { equals: token } }] }, data: { ...data, leaseUntil: null }, options: { atomic: true } })
  const plan = group.plan as Plan
  try {
    if (group.intent === 'cancel' && !group.result && group.state === 'pending') {
      await inTransaction(req, () => finish({ state: 'cancelled' })); return
    }
    if (group.source === 'shop') {
      await inTransaction(req, async () => {
        const fresh = await req.payload.findByID({ collection: GROUPS as any, id: group.id, req, depth: 0, overrideAccess: true }) as any
        if (fresh.leaseToken !== token) return
        if (group.intent === 'cancel') {
          if (fresh.stockReserved && !fresh.stockReleased) for (const line of plan.items) await adjustStock(req.payload, line.productId, line.variantId, line.quantity, req)
          await finish({ state: 'cancelled', stockReleased: Boolean(fresh.stockReserved) })
        } else {
          if (!fresh.stockReserved) for (const line of plan.items) await adjustStock(req.payload, line.productId, line.variantId, -line.quantity, req, line.sourcePrice ?? line.price)
          await finish({ state: 'accepted', stockReserved: true, result: { id: order.orderNo + ':' + group.key, status: 'reserved' }, issue: null, nextAttemptAt: null, attempts: 0 })
        }
      })
      return
    }
    const adapter = plugins(req.payload).find(plugin => plugin.id === group.source)?.commerce
    if (!adapter) throw new Error('Processing adapter is unavailable')
    if (group.intent === 'cancel') {
      if (!adapter.cancelGroup) throw new Error('Source cancellation requires reconciliation')
      await adapter.cancelGroup(req.payload, { key: group.key, data: plan.data, result: group.result || undefined })
      await inTransaction(req, () => finish({ state: 'cancelled', issue: null }))
    } else {
      if (!adapter.processGroup) throw new Error('Source does not support verified reservation commands')
      const result = await adapter.processGroup(req.payload, { key: group.key, data: plan.data, reservationExpiresAt: order.reservationExpiresAt, draft: { ...order.checkoutDraft, items: plan.items, id: order.orderNo, checkoutKey: group.key } })
      await inTransaction(req, () => finish({ state: 'accepted', result, issue: null, nextAttemptAt: null, attempts: 0 }))
    }
  } catch (error) {
    const definitive = error instanceof StockConflict || (error as any)?.definitive === true
    const attempts = (group.attempts || 0) + 1
    await inTransaction(req, () => finish({ state: definitive && group.intent !== 'cancel' ? 'missing' : attempts >= 20 ? 'attention' : 'unknown', issue: definitive ? ((error as any)?.code === 'price_changed' ? 'price_changed' : 'stock_unavailable') : 'source_reconciliation_pending', nextAttemptAt: new Date(Date.now() + Math.min(3600000, 1000 * 2 ** Math.min(attempts, 12)) + Math.floor(Math.random() * 1000)).toISOString() }))
    req.payload.logger.error({ order: order.orderNo, group: group.key }, '[shop] Source processing pending')
  }
}

export async function processOrderWorkflow(req: PayloadRequest, order: any) {
  if (order.approvalState !== 'approved' || order.status === 'cancelled') return
  const current = await orderById(req, order.id)
  if (current.fulfillmentIntent && current.workflowState === 'fulfilling') { await fulfillOrder(req, current); return }
  let groups = await groupsFor(req.payload, order.id)
  const deadline = Date.now() + 45000
  for (const group of groups) { if (Date.now() >= deadline) break; await runGroup(req, order, group) }
  groups = await groupsFor(req.payload, order.id)
  const fresh = await orderById(req, order.id)
  if (fresh.status === 'cancelled') return
  if (fresh.workflowState === 'cancelling') {
    if (groups.every(group => ['cancelled', 'missing'].includes(group.state))) {
      await inTransaction(req, async () => {
        const latest = await lockOrder(req, fresh.id)
        if (latest.workflowState !== 'cancelling') return
        const revise = plugins(req.payload).find(plugin => plugin.commerce?.revisePayment)?.commerce?.revisePayment
        const balance = revise ? await revise(req, latest.orderNo, 0) : undefined
        await req.payload.update({ collection: 'shop-orders' as any, id: latest.id, req, overrideAccess: true, context: { skipRestock: true, workflowCancellation: true }, data: { status: 'cancelled', workflowState: 'cancelled', processingIssue: null, refundDue: balance?.refundDue ?? latest.refundDue ?? 0 } })
      })
    }
    return
  }
  const missing = groups.some(group => group.state === 'missing')
  const waiting = groups.some(group => !['accepted', 'missing', 'cancelled', 'fulfilled'].includes(group.state))
  if (waiting) {
    await inTransaction(req, async () => {
      const latest = await lockOrder(req, fresh.id)
      if (['cancelling', 'fulfilling'].includes(latest.workflowState) || latest.status === 'cancelled') return
      await req.payload.update({ collection: 'shop-orders' as any, id: fresh.id, req, overrideAccess: true, data: { workflowState: 'processing', processingIssue: 'source_reconciliation_pending' } })
    }); return
  }
  if (missing && !fresh.customerDecision) {
    const settings = await req.payload.findGlobal({ slug: 'shop-settings' as any, depth: 0, overrideAccess: true }) as any
    const expires = fresh.reservationExpiresAt || new Date(Date.now() + Math.max(5, Math.min(1440, Number(settings.reservationMinutes) || 30)) * 60000).toISOString()
    await inTransaction(req, async () => {
      const latest = await lockOrder(req, fresh.id)
      if (['cancelling', 'fulfilling'].includes(latest.workflowState) || latest.status === 'cancelled') return
      const receipt = 'shortage:' + (latest.decisionRevision || 0)
      if (!latest.placedHooks?.[receipt]) for (const plugin of plugins(req.payload)) await plugin.commerce?.notifyShortage?.(req.payload, latest.orderNo, req)
      await req.payload.update({ collection: 'shop-orders' as any, id: fresh.id, req, overrideAccess: true, data: { workflowState: 'awaiting_customer', processingIssue: 'partial_stock', reservationExpiresAt: expires, placedHooks: { ...latest.placedHooks, [receipt]: true } } })
    })
    return
  }
  if (groups.length && groups.every(group => ['accepted', 'fulfilled', 'cancelled', 'missing'].includes(group.state))) {
    const accepted = groups.filter(group => ['accepted', 'fulfilled'].includes(group.state))
    if (!accepted.length) { await requestCancellation(req, fresh, 'Không còn phần hàng được xác nhận'); return }
    if (fresh.checkoutDraft?.provisional && !fresh.checkoutDraft.provisional.committedAt) {
      await inTransaction(req, async () => {
        const latest = await lockOrder(req, fresh.id)
        if (latest.workflowState !== 'processing' || latest.checkoutDraft?.provisional?.committedAt) return
        if (Date.parse(latest.reservationExpiresAt || '') <= Date.now()) {
          await requestCancellation(req, latest, 'Supplier reservation expired')
          return
        }
        await req.payload.update({ collection: 'shop-orders' as any, id: latest.id, req, overrideAccess: true, data: { checkoutState: 'reserved', processingIssue: null } })
      })
      return
    }
    const sourceOrders = Object.fromEntries(accepted.filter(group => group.source !== 'shop').map(group => [group.key, { source: group.source, ...group.result }]))
    // A reservation may be provisional while the customer chooses the available part.
    // Commit the final delivery/COD snapshot before exposing the order to fulfillment.
    for (const group of accepted) {
      if (group.committed) continue
      if ((group.attempts || 0) >= 20 || (group.nextAttemptAt && Date.parse(group.nextAttemptAt) > Date.now())) return
      const token = crypto.randomUUID()
      const claimed = await inTransaction(req, () => req.payload.db.updateOne({ collection: GROUPS, req, where: { and: [{ id: { equals: group.id } }, { state: { equals: 'accepted' } }, { committed: { equals: false } }, { intent: { equals: 'process' } }, { or: [{ leaseUntil: { exists: false } }, { leaseUntil: { less_than_equal: new Date().toISOString() } }] }] }, data: { leaseToken: token, leaseUntil: new Date(Date.now() + 5 * 60000).toISOString() }, options: { atomic: true } }))
      if (!claimed) return
      const current = await orderById(req, fresh.id)
      if (current.workflowState === 'cancelling' || current.status === 'cancelled') return
      const adapter = plugins(req.payload).find(plugin => plugin.id === group.source)?.commerce
      try {
        const result = adapter?.commitGroup ? await adapter.commitGroup(req.payload, { key: group.key, data: group.plan.data, result: group.result, draft: current.checkoutDraft }) : group.result
        await inTransaction(req, async () => {
          const latest = await lockOrder(req, fresh.id)
          if (latest.workflowState === 'cancelling' || latest.status === 'cancelled') return
          await req.payload.db.updateOne({ collection: GROUPS, req, where: { and: [{ id: { equals: group.id } }, { leaseToken: { equals: token } }, { intent: { equals: 'process' } }] }, data: { committed: true, result, issue: null, leaseUntil: null }, options: { atomic: true } })
        })
      } catch {
        const attempts = (group.attempts || 0) + 1
        await inTransaction(req, () => req.payload.db.updateOne({ collection: GROUPS, req, where: { and: [{ id: { equals: group.id } }, { leaseToken: { equals: token } }] }, data: { issue: attempts >= 20 ? 'commit_attention' : 'commit_reconciliation_pending', attempts, leaseUntil: null, nextAttemptAt: new Date(Date.now() + Math.min(3600000, 1000 * 2 ** Math.min(attempts, 12))).toISOString() }, options: { atomic: true } }))
        return
      }
    }
    await inTransaction(req, async () => {
      const latest = await lockOrder(req, fresh.id)
      const committed = await groupsFor(req.payload, fresh.id, req)
      if (['cancelling', 'fulfilling'].includes(latest.workflowState) || latest.status === 'cancelled' || committed.some(group => group.state === 'accepted' && (!group.committed || group.intent === 'cancel'))) return
      await req.payload.update({ collection: 'shop-orders' as any, id: fresh.id, req, overrideAccess: true, data: { workflowState: 'ready', reservationExpiresAt: null, processingIssue: null, checkoutComplete: true, checkoutState: 'confirmed', sourceOrders } })
    })
  }
}

/** Commit only a live supplier hold; row locking serializes commit, cancellation and expiry. */
export async function commitProvisionalOrder(req: PayloadRequest, id: string | number) {
  await inTransaction(req, async () => {
    const order = await lockOrder(req, id)
    if (!order.checkoutDraft?.provisional) throw new Error('Not a provisional supplier order')
    if (order.status === 'cancelled' || order.workflowState === 'cancelling') throw new Error('order_cancelled')
    if (order.checkoutDraft.provisional.committedAt) return
    if (order.checkoutState !== 'reserved' || order.workflowState !== 'processing' || Date.parse(order.reservationExpiresAt || '') <= Date.now()) throw new Error('reservation_expired')
    const groups = await groupsFor(req.payload, order.id, req)
    if (!groups.length || groups.some(group => group.intent === 'cancel' || group.state !== 'accepted')) throw new Error('Source reservation is not ready')
    await req.payload.update({ collection: 'shop-orders' as any, id: order.id, req, overrideAccess: true, data: { checkoutDraft: { ...order.checkoutDraft, provisional: { ...order.checkoutDraft.provisional, committedAt: new Date().toISOString() } } } })
  })
  await processOrderWorkflow(req, await orderById(req, id))
}

export async function retryOrderGroups(req: PayloadRequest, order: any) {
  await inTransaction(req, async () => {
    for (const group of await groupsFor(req.payload, order.id, req)) {
      if (group.leaseUntil && Date.parse(group.leaseUntil) > Date.now()) continue
      if (!['unknown', 'attention', 'pending'].includes(group.state) && !group.issue) continue
      await req.payload.update({ collection: GROUPS as any, id: group.id, req, overrideAccess: true, data: { ...(group.state === 'attention' && { state: 'unknown' }), attempts: 0, nextAttemptAt: new Date().toISOString(), leaseUntil: null } })
    }
  })
}

export async function requestCancellation(req: PayloadRequest, order: any, reason: string) {
  await inTransaction(req, async () => {
    const fresh = await lockOrder(req, order.id)
    if (fresh.status === 'cancelled') return
    const groups = await groupsFor(req.payload, fresh.id, req)
    // Physical shipments/returns require their own evidence. Do not fake a cancellation.
    if (fresh.fulfillmentIntent || fresh.workflowState === 'fulfilling' || fresh.status === 'shipping' || fresh.status === 'completed' || groups.some(group => group.state === 'fulfilled')) throw new Error('return_required')
    for (const group of groups) {
      if (['cancelled', 'missing'].includes(group.state)) continue
      await req.payload.update({ collection: GROUPS as any, id: group.id, req, overrideAccess: true, data: { intent: 'cancel', nextAttemptAt: new Date().toISOString() } })
    }
    const revise = plugins(req.payload).find(plugin => plugin.commerce?.revisePayment)?.commerce?.revisePayment
    const balance = !groups.length && revise ? await revise(req, fresh.orderNo, 0) : undefined
    await req.payload.update({ collection: 'shop-orders' as any, id: fresh.id, req, overrideAccess: true, context: { skipRestock: true, workflowCancellation: true }, data: { workflowState: groups.length ? 'cancelling' : 'cancelled', ...(groups.length ? {} : { status: 'cancelled', approvalState: 'rejected' }), cancellationReason: reason, refundDue: balance?.refundDue ?? fresh.refundDue ?? 0 } })
  })
}

/** The admin action is durable before any physical/ERP command leaves Studio. */
export async function requestFulfillment(req: PayloadRequest, order: any, stage: 'shipping' | 'completed') {
  await inTransaction(req, async () => {
    const latest = await lockOrder(req, order.id)
    if (latest.workflowState !== 'ready' || !latest.checkoutComplete || !['confirmed', 'shipping'].includes(latest.status)) throw new Error('source_pending')
    await req.payload.update({ collection: 'shop-orders' as any, id: latest.id, req, overrideAccess: true, data: { fulfillmentIntent: stage, workflowState: 'fulfilling', processingIssue: null } })
  })
}

async function fulfillOrder(req: PayloadRequest, order: any) {
  const stage = order.fulfillmentIntent as 'shipping' | 'completed'
  const groups = (await groupsFor(req.payload, order.id)).filter(group => ['accepted', 'fulfilled'].includes(group.state))
  const deadline = Date.now() + 45000
  for (const group of groups) {
    if (group.result?.fulfillmentStage === stage) continue
    if (Date.now() >= deadline || (group.attempts || 0) >= 20 || (group.nextAttemptAt && Date.parse(group.nextAttemptAt) > Date.now())) return
    const token = crypto.randomUUID()
    const claim = await inTransaction(req, () => req.payload.db.updateOne({ collection: GROUPS, req, where: { and: [{ id: { equals: group.id } }, { intent: { equals: 'process' } }, { committed: { equals: true } }, { or: [{ leaseUntil: { exists: false } }, { leaseUntil: { less_than_equal: new Date().toISOString() } }] }] }, data: { leaseToken: token, leaseUntil: new Date(Date.now() + 5 * 60000).toISOString() }, options: { atomic: true } }))
    if (!claim) return
    const update = (data: Record<string, any>) => inTransaction(req, () => req.payload.db.updateOne({ collection: GROUPS, req, where: { and: [{ id: { equals: group.id } }, { leaseToken: { equals: token } }] }, data: { ...data, leaseUntil: null }, options: { atomic: true } }))
    try {
      const adapter = plugins(req.payload).find(plugin => plugin.id === group.source)?.commerce
      if (group.source !== 'shop' && !adapter?.fulfillGroup) throw new Error('Source fulfillment upgrade required')
      const result = group.source === 'shop' ? group.result : await adapter!.fulfillGroup!(req.payload, { key: group.key, data: group.plan.data, result: group.result, stage })
      await update({ state: 'fulfilled', result: { ...result, fulfillmentStage: stage }, issue: null, attempts: 0, nextAttemptAt: null })
    } catch {
      const attempts = (group.attempts || 0) + 1
      await update({ issue: attempts >= 20 ? 'fulfillment_attention' : 'fulfillment_reconciliation_pending', attempts, nextAttemptAt: new Date(Date.now() + Math.min(3600000, 1000 * 2 ** Math.min(attempts, 12))).toISOString() })
      await req.payload.update({ collection: 'shop-orders' as any, id: order.id, req, overrideAccess: true, data: { processingIssue: 'fulfillment_reconciliation_pending' } })
      return
    }
  }
  await inTransaction(req, async () => {
    const latest = await lockOrder(req, order.id)
    const done = (await groupsFor(req.payload, order.id, req)).filter(group => ['accepted', 'fulfilled'].includes(group.state))
    if (latest.workflowState !== 'fulfilling' || latest.fulfillmentIntent !== stage || !done.length || done.some(group => group.result?.fulfillmentStage !== stage)) return
    await req.payload.update({ collection: 'shop-orders' as any, id: order.id, req, overrideAccess: true, data: { status: stage, fulfillmentIntent: null, workflowState: 'ready', processingIssue: null } })
  })
}

export async function decideAvailable(req: PayloadRequest, order: any, decision: string, revision: number) {
  if (!['accept_available', 'cancel_all'].includes(decision)) throw new Error('invalid_decision')
  await inTransaction(req, async () => {
    const fresh = await lockOrder(req, order.id)
    if (fresh.customerDecision === decision && fresh.decisionAt) return
    if (fresh.workflowState !== 'awaiting_customer' || fresh.customerDecision || (fresh.decisionRevision || 0) !== revision || Date.parse(fresh.reservationExpiresAt || '') <= Date.now()) throw new Error('decision_expired')
    const groups = await groupsFor(req.payload, fresh.id, req)
    if (decision === 'accept_available') {
      const accepted = groups.filter(group => group.state === 'accepted')
      if (!accepted.length) throw new Error('no_available_items')
      const items = accepted.flatMap(group => (group.plan as Plan).items)
      const subtotal = items.reduce((sum, line) => sum + line.price * line.quantity, 0)
      const originalSubtotal = fresh.checkoutDraft.subtotal
      // Proportional allocation never increases the agreed customer total or any fee.
      const total = Math.min(fresh.total, Math.round(fresh.total * subtotal / originalSubtotal))
      const draft: OrderDraft = { ...fresh.checkoutDraft, items, subtotal, adjustments: [{ source: 'partial-order', label: 'Phân bổ phí và giảm giá', amount: total - subtotal }], shipments: (fresh.checkoutDraft.shipments || []).map((group: any) => ({ ...group, lineKeys: group.lineKeys.filter((key: string) => items.some(line => line.productId + (line.variantId ? ':' + line.variantId : '') === key)) })).filter((group: any) => group.lineKeys.length) }
      finalizeFulfillment(draft, total)
      const revise = plugins(req.payload).find(plugin => plugin.commerce?.revisePayment)?.commerce?.revisePayment
      const balance = revise ? await revise(req, fresh.orderNo, total) : undefined
      await req.payload.update({ collection: 'shop-orders' as any, id: fresh.id, req, overrideAccess: true, data: { customerDecision: decision, decisionAt: new Date().toISOString(), decisionRevision: revision + 1, originalTotal: fresh.originalTotal || fresh.total, total, subtotal, adjustments: draft.adjustments, items, checkoutDraft: draft, workflowState: 'processing', ...(balance && { paymentStatus: balance.paymentStatus }), refundDue: balance?.refundDue ?? (fresh.paymentStatus === 'paid' ? (fresh.originalTotal || fresh.total) - total : 0) } })
    } else {
      await req.payload.update({ collection: 'shop-orders' as any, id: fresh.id, req, overrideAccess: true, data: { customerDecision: decision, decisionAt: new Date().toISOString(), decisionRevision: revision + 1 } })
      await requestCancellation(req, fresh, 'Khách yêu cầu hủy sau khi báo thiếu hàng')
    }
  })
}
