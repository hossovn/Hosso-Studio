import type { Payload, PayloadRequest } from 'payload'
import { priceOf } from './util'
export { inTransaction } from '@hosso/studio-blocks/transactions'

export class StockConflict extends Error {}
export class StockBusy extends Error {}

/** The revision claim locks the product until the stock write and its order commit together. */
export async function lockStock(payload: Payload, productId: string, req: PayloadRequest) {
  if (!req?.transactionID) throw new Error('Stock updates require a transaction')
  const p = await payload.findByID({ collection: 'shop-products' as any, id: productId, depth: 0, overrideAccess: true, req }) as any
  const version = p.stockVersion ?? 0
  const locked = await payload.db.updateOne({ collection: 'shop-products', req, where: { and: [{ id: { equals: p.id } }, { stockVersion: { equals: version } }] }, data: { stockVersion: version + 1 }, options: { atomic: true } })
  if (!locked) throw new StockBusy('Stock changed; retry checkout')
  return p
}

export async function adjustStock(payload: Payload, productId: string, variantId: string | undefined, delta: number, req?: PayloadRequest, expectedPrice?: number) {
  if (!req?.transactionID) throw new Error('Stock updates require a transaction')
  const p = await lockStock(payload, productId, req)
  if (p.supplierStockUnmanaged || (p.wimId && p.source !== 'cross-sell')) return
  const variant = variantId ? p.variants?.find((v: any) => v.id === variantId) : undefined
  if (variantId && !variant) throw new StockConflict('Variant is unavailable')
  if (delta < 0 && (p.active === false || (expectedPrice !== undefined && (variant?.price > 0 ? variant.price : priceOf(p)) !== expectedPrice))) throw Object.assign(new StockConflict('Product availability or price changed'), { code: 'price_changed' })
  const stock = Number(variant ? variant.stock : p.stock)
  if (!Number.isSafeInteger(stock) || stock + delta < 0) throw new StockConflict('Insufficient stock')
  const data = variant
    ? { variants: p.variants.map((v: any) => v.id === variantId ? { ...v, stock: stock + delta } : v) }
    : { stock: stock + delta }
  await payload.update({ collection: 'shop-products' as any, id: p.id, data, req, overrideAccess: true })
}
