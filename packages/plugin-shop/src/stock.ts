import type { Payload, PayloadRequest } from 'payload'

export class StockConflict extends Error {}
const sqliteWriter = Symbol.for('hosso.shop.sqliteWriter')

export async function inTransaction<T>(req: PayloadRequest, work: () => Promise<T>): Promise<T> {
  if (req.transactionID) return work()
  let release: (() => void) | undefined
  if (req.payload.db.name === 'sqlite') {
    // Share the queue across server module reloads and plugin entry points.
    const state = req.payload as Payload & { [sqliteWriter]?: Promise<void> }
    const previous = state[sqliteWriter]
    const next = new Promise<void>((resolve) => { release = resolve })
    state[sqliteWriter] = next
    await previous
  }
  let id: string | number | null | undefined
  try {
    id = await req.payload.db.beginTransaction()
    if (!id) throw new Error('Shop requires database transactions')
    req.transactionID = id
    const result = await work()
    await req.payload.db.commitTransaction(id)
    return result
  } catch (error) { if (id) await req.payload.db.rollbackTransaction(id); throw error }
  finally { delete req.transactionID; release?.() }
}

/** The revision claim locks the product until the stock write and its order commit together. */
export async function lockStock(payload: Payload, productId: string, req: PayloadRequest) {
  if (!req?.transactionID) throw new Error('Stock updates require a transaction')
  const p = await payload.findByID({ collection: 'shop-products' as any, id: productId, depth: 0, overrideAccess: true, req }) as any
  const version = p.stockVersion ?? 0
  const locked = await payload.db.updateOne({ collection: 'shop-products', req, where: { and: [{ id: { equals: p.id } }, { stockVersion: { equals: version } }] }, data: { stockVersion: version + 1 }, options: { atomic: true } })
  if (!locked) throw new StockConflict('Stock changed; retry checkout')
  return p
}

export async function adjustStock(payload: Payload, productId: string, variantId: string | undefined, delta: number, req?: PayloadRequest) {
  if (!req?.transactionID) throw new Error('Stock updates require a transaction')
  const p = await lockStock(payload, productId, req)
  if (p.supplierStockUnmanaged || (p.wimId && p.source !== 'cross-sell')) return
  const variant = variantId ? p.variants?.find((v: any) => v.id === variantId) : undefined
  if (variantId && !variant) throw new StockConflict('Variant is unavailable')
  const stock = Number(variant ? variant.stock : p.stock)
  if (!Number.isSafeInteger(stock) || stock + delta < 0) throw new StockConflict('Insufficient stock')
  const data = variant
    ? { variants: p.variants.map((v: any) => v.id === variantId ? { ...v, stock: stock + delta } : v) }
    : { stock: stock + delta }
  await payload.update({ collection: 'shop-products' as any, id: p.id, data, req, overrideAccess: true })
}
