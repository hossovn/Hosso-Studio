export type EditorPreview = { products: { shop: string; wim: string }; account: 'guest' | 'member' }

export function normalizeEditorPreview(value: unknown): EditorPreview {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid_preview')
  const input = value as Record<string, unknown>
  if (input.account !== 'guest' && input.account !== 'member') throw new Error('invalid_preview')
  if (!input.products || typeof input.products !== 'object' || Array.isArray(input.products)) throw new Error('invalid_preview')
  const products = input.products as Record<string, unknown>
  const valid = (v: unknown): v is string => typeof v === 'string' && v.length <= 200 && !/[\x00-\x1f\x7f]/.test(v)
  if (!valid(products.shop) || !valid(products.wim)) throw new Error('invalid_preview')
  return { products: { shop: products.shop.trim(), wim: products.wim.trim() }, account: input.account }
}

export function editorPreviewParams(type: string, preview?: unknown): Record<string, string> {
  if (preview === undefined) return {}
  const { products } = normalizeEditorPreview(preview)
  const p = type.startsWith('Wim') ? products.wim : type.startsWith('Shop') ? products.shop : ''
  return p ? { p } : {}
}
