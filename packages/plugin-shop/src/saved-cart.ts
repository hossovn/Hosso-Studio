import { createHmac } from 'node:crypto'
import type { CollectionConfig, Endpoint, PayloadRequest } from 'payload'
import type { HossoPlugin } from '@hosso/studio-blocks'
import { inTransaction } from '@hosso/studio-blocks/transactions'
import { takeCommerceLimit } from '@hosso/studio-blocks/rate-limits'

export const SavedCarts: CollectionConfig = {
  slug: 'shop-saved-carts', admin: { hidden: true },
  access: { read: () => false, create: () => false, update: () => false, delete: () => false },
  fields: [{ name: 'owner', type: 'text', required: true, unique: true }, { name: 'generation', type: 'text' }, { name: 'lines', type: 'json', defaultValue: [] }, { name: 'revision', type: 'number', defaultValue: 0 }],
}

export function cleanCartLines(value: unknown) {
  if (!Array.isArray(value) || value.length > 50) throw new Error('invalid_cart')
  const keys = new Set<string>()
  return value.map((line) => {
    if (!line || typeof line.productId !== 'string' || !/^[a-zA-Z0-9_:-]{1,200}$/.test(line.productId) || (line.variantId && (typeof line.variantId !== 'string' || !/^[a-zA-Z0-9_-]{1,200}$/.test(line.variantId))) || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 99) throw new Error('invalid_cart')
    const key = `${line.productId}:${line.variantId || ''}`
    if (keys.has(key)) throw new Error('duplicate_line')
    keys.add(key)
    return { productId: line.productId, ...(line.variantId && { variantId: line.variantId }), quantity: line.quantity }
  })
}

export async function ownerOf(req: Pick<PayloadRequest, 'payload' | 'headers'>) {
  for (const plugin of (req.payload.config.custom?.hossoPlugins ?? []) as HossoPlugin[]) {
    const identity = await plugin.commerce?.customerIdentity?.(req.payload, req.headers)
    if (identity) return createHmac('sha256', req.payload.secret).update(`${plugin.id}:${identity}`).digest('hex')
  }
}
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } })
const find = async (req: PayloadRequest, owner: string) => (await req.payload.find({ collection: 'shop-saved-carts' as any, where: { owner: { equals: owner } }, limit: 1, depth: 0, overrideAccess: true, req })).docs[0] as any

export const savedCartEndpoints: Endpoint[] = [
  { path: '/plugins/shop/saved-cart', method: 'get', handler: async (req) => {
    const owner = await ownerOf(req)
    if (!owner) return json({ ok: false }, 401)
    const cart = await find(req, owner)
    const lines = cart?.lines || []
    const details = lines.length ? await (await import('./endpoints')).inspectCart(req, { items: lines }) : { items: [], issues: [] }
    const items = lines.map((line: any) => details.items.find((item) => item.productId === line.productId && (item.variantId || '') === (line.variantId || '')) || { ...line, name: `Sản phẩm ${line.productId}`, price: 0 })
    return json({ ok: true, owner, revision: cart?.revision || 0, generation: cart?.generation || '', lines: items, issues: details.issues })
  } },
  { path: '/plugins/shop/saved-cart', method: 'post', handler: async (req) => {
    const expected = new URL(req.payload.config.serverURL || req.url!).origin
    if (req.headers.get('origin') !== expected) return json({ ok: false, code: 'origin' }, 403)
    const owner = await ownerOf(req)
    if (!owner) return json({ ok: false }, 401)
    if (!await takeCommerceLimit(req, 'saved-cart', owner, 60)) return json({ ok: false }, 429)
    const input = await req.json?.().catch(() => null)
    let lines
    try { lines = cleanCartLines(input?.lines) } catch { return json({ ok: false, code: 'invalid_cart' }, 400) }
    if (input.owner !== owner || !Number.isSafeInteger(input.revision) || !/^[a-zA-Z0-9_-]{1,100}$/.test(input.generation || '')) return json({ ok: false, code: 'invalid_version' }, 400)
    try {
      const revision = await inTransaction(req, async () => {
        const prior = await find(req, owner)
        if ((prior?.revision || 0) !== input.revision) return null
        if (!prior) { await req.payload.create({ collection: 'shop-saved-carts' as any, data: { owner, lines, generation: input.generation, revision: 1 }, overrideAccess: true, req }); return 1 }
        const changed = await req.payload.db.updateOne({ collection: 'shop-saved-carts', req, where: { and: [{ id: { equals: prior.id } }, { revision: { equals: input.revision } }] }, data: { lines, generation: input.generation, revision: input.revision + 1 }, options: { atomic: true } })
        return changed ? input.revision + 1 : null
      })
      return revision === null ? json({ ok: false, code: 'conflict' }, 409) : json({ ok: true, revision })
    } catch (error: any) {
      if (['23505', 'SQLITE_CONSTRAINT_UNIQUE'].includes(error?.code || error?.cause?.code)) return json({ ok: false, code: 'conflict' }, 409)
      throw error
    }
  } },
]
