export type ProductContent = { description?: string; shortDescription?: string; images?: string[]; attributes?: { name: string; value: string }[] }
type ContentRecord = { description?: string | null; shortDescription?: string | null; additionalInformation?: { name: string; value: string }[] | null; images?: { image?: { filename?: string } | null }[] | null; supplierContent?: ProductContent | null }

// Empty local fields inherit supplier content; syncing never writes local overrides.
export const contentOf = (p: ContentRecord): ProductContent => ({
  description: p.description || p.supplierContent?.description,
  shortDescription: p.shortDescription || p.supplierContent?.shortDescription,
  attributes: p.additionalInformation?.length ? p.additionalInformation : p.supplierContent?.attributes ?? [],
})
export const imagesOf = (p: ContentRecord): string[] => {
  const local = (p.images ?? []).flatMap((i) => i.image?.filename ? ['/api/media/file/' + encodeURIComponent(i.image.filename)] : [])
  return local.length ? local : (p.supplierContent?.images ?? []).filter((s) => {
    try { const u = new URL(s); return u.protocol === 'https:' && !u.username && !u.password } catch { return false }
  })
}
export const hasStock = (p: { stock?: number; supplierStockUnmanaged?: boolean }, quantity = 1) => p.supplierStockUnmanaged === true || (p.stock ?? 0) >= quantity
