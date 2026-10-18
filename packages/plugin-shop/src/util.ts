/** Tiếng Việt không dấu, chỉ a-z0-9 và dấu gạch ngang: dùng làm đường dẫn. */
export const slugify = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

export const vnd = (n: number) => `${Math.round(n || 0).toLocaleString('vi-VN')} đ`

export type Product = {
  id: number | string
  name: string
  slug: string
  code?: string
  price: number
  salePrice?: number | null
  stock: number
  brand?: string
  makes?: string[]
  description?: string
  category?: { id: number | string; name: string; slug: string } | null
  images?: { image?: { filename?: string } | null }[]
  variants?: { id?: string; name: string; sku?: string; price?: number | null; stock?: number }[]
}

/** Giá đang bán: giá khuyến mãi nếu có và thấp hơn giá gốc. */
export const priceOf = (p: Pick<Product, 'price' | 'salePrice'>) => (p.salePrice && p.salePrice > 0 && p.salePrice < p.price ? p.salePrice : p.price)

export const imageOf = (p: Product) => {
  const f = p.images?.find((i) => i.image?.filename)?.image?.filename
  return f ? `/api/media/file/${encodeURIComponent(f)}` : ''
}
