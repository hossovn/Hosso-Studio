import type { Payload } from 'payload'

/** Cộng/trừ tồn kho của sản phẩm, hoặc của biến thể nếu có `variantId`. Không để âm. */
export async function adjustStock(payload: Payload, productId: string, variantId: string | undefined, delta: number) {
  const p = (await payload.findByID({ collection: 'shop-products' as any, id: productId, depth: 0, overrideAccess: true }).catch(() => null)) as { stock?: number; variants?: { id?: string; stock?: number }[] } | null
  if (!p) return
  if (variantId && p.variants?.length) {
    const variants = p.variants.map((v) => (v.id === variantId ? { ...v, stock: Math.max(0, (v.stock ?? 0) + delta) } : v))
    await payload.update({ collection: 'shop-products' as any, id: productId, data: { variants }, overrideAccess: true })
  } else {
    await payload.update({ collection: 'shop-products' as any, id: productId, data: { stock: Math.max(0, (p.stock ?? 0) + delta) }, overrideAccess: true })
  }
}
