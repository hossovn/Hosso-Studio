'use client'
import React, { useEffect, useState } from 'react'
import { Search, X, Package, RefreshCw } from 'lucide-react'
import { imagesOf, type ProductContent } from '@hosso/plugin-shop/product-content'

type Product = { id: string | number; name: string; code?: string; active?: boolean; images?: { image?: { filename?: string } | null }[] | null; supplierContent?: ProductContent | null }

export function ProductSelection({ value, onChange }: { value: unknown; onChange: (ids: (string | number)[] | undefined) => void }) {
  const manual = Array.isArray(value)
  const ids: (string | number)[] = manual ? value : []
  const [query, setQuery] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [known, setKnown] = useState<Record<string, Product>>({})
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const selectedKey = ids.map(String).join(',')
  useEffect(() => {
    if (!manual) return
    const controller = new AbortController()
    setLoading(true)
    setError('')
    const timer = setTimeout(async () => {
      const params = new URLSearchParams({ limit: '12', page: String(page), depth: '1', sort: 'name', 'where[active][equals]': 'true' })
      if (query.trim()) {
        params.set('where[or][0][name][contains]', query.trim())
        params.set('where[or][1][code][contains]', query.trim())
      }
      try {
        const response = await fetch(`/api/shop-products?${params}`, { credentials: 'same-origin', signal: controller.signal })
        if (!response.ok) throw new Error('catalog')
        const result = await response.json()
        if (controller.signal.aborted) return
        const docs: Product[] = result.docs ?? []
        setProducts(docs)
        setPages(Math.max(1, result.totalPages ?? 1))
        setKnown((previous) => ({ ...previous, ...Object.fromEntries(docs.map((product) => [String(product.id), product])) }))
      } catch {
        if (!controller.signal.aborted) setError('Không tải được sản phẩm. Vui lòng thử lại.')
      } finally { if (!controller.signal.aborted) setLoading(false) }
    }, 250)
    return () => { clearTimeout(timer); controller.abort() }
  }, [manual, query, page, retry])
  useEffect(() => {
    if (!manual || !ids.length) return
    const controller = new AbortController()
    const params = new URLSearchParams({ limit: String(ids.length), depth: '0' })
    ids.forEach((id, index) => params.set(`where[id][in][${index}]`, String(id)))
    fetch(`/api/shop-products?${params}`, { credentials: 'same-origin', signal: controller.signal }).then(async (response) => {
      if (!response.ok) return
      const result = await response.json()
      if (!controller.signal.aborted) setKnown((previous) => ({ ...previous, ...Object.fromEntries((result.docs ?? []).map((product: Product) => [String(product.id), product])) }))
    }).catch(() => {})
    return () => controller.abort()
  }, [manual, selectedKey]) // Keep selections visible when changing the search or reopening the inspector.
  const remove = (id: string | number) => onChange(ids.filter((selected) => String(selected) !== String(id)))
  return <section className="cv-product-selection" aria-label="Sản phẩm hiển thị">
    <label className="cv-brand-field"><span>Nguồn sản phẩm</span><select aria-label="Nguồn sản phẩm" value={manual ? 'manual' : 'auto'} onChange={(event) => onChange(event.target.value === 'manual' ? [] : undefined)}><option value="auto">Tự động theo bộ lọc</option><option value="manual">Chọn sản phẩm cụ thể</option></select></label>
    {manual ? <>
      <p className="cv-panel-note">Chỉ các sản phẩm bạn chọn mới xuất hiện trong khối này. Bộ lọc danh mục, thương hiệu và sắp xếp bên dưới vẫn được áp dụng.</p>
      <div className="cv-product-selected"><strong>{ids.length} sản phẩm đã chọn</strong>{ids.length > 0 && <button type="button" onClick={() => onChange([])}>Bỏ chọn tất cả</button>}</div>
      {ids.length > 0 && <ul className="cv-product-chips">{ids.map((id) => <li key={String(id)}><span>{known[String(id)]?.name ?? `Sản phẩm #${id}`}{known[String(id)]?.active === false ? ' · Đã ngừng bán' : ''}</span><button type="button" aria-label={`Bỏ chọn ${known[String(id)]?.name ?? id}`} onClick={() => remove(id)}><X size={13} /></button></li>)}</ul>}
      <label className="cv-search"><Search size={16} /><input type="search" aria-label="Tìm sản phẩm để hiển thị" placeholder="Tìm tên hoặc mã sản phẩm…" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} /></label>
      {loading ? <p role="status" className="cv-panel-note">Đang tải sản phẩm…</p> : error ? <div role="alert" className="cv-panel-note">{error}<button type="button" className="cv-text-action" onClick={() => setRetry((count) => count + 1)}><RefreshCw size={14} />Thử lại</button></div> : <>
        <div className="cv-product-options">{products.map((product) => {
          const checked = ids.some((id) => String(id) === String(product.id))
          const image = imagesOf(product)[0] ?? ''
          return <label key={product.id} className="cv-product-option" data-selected={checked}><input type="checkbox" checked={checked} onChange={() => checked ? remove(product.id) : onChange([...ids, product.id])} />{image ? <img src={image} alt="" loading="lazy" /> : <span className="cv-product-placeholder"><Package size={18} /></span>}<span><strong>{product.name}</strong><small>{product.code || 'Chưa có mã'}</small></span></label>
        })}</div>
        {!products.length && <p className="cv-panel-note">Không có sản phẩm phù hợp. Thử từ khóa khác hoặc thêm sản phẩm vào cửa hàng.</p>}
        {pages > 1 && <div className="cv-product-pagination"><button type="button" disabled={page <= 1} onClick={() => setPage((number) => number - 1)}>Trước</button><span>Trang {page} / {pages}</span><button type="button" disabled={page >= pages} onClick={() => setPage((number) => number + 1)}>Sau</button></div>}
      </>}
      {!ids.length && <p className="cv-panel-note">Chưa chọn sản phẩm. Khối sẽ hiển thị danh sách rỗng.</p>}
    </> : <p className="cv-panel-note">Hiển thị sản phẩm đang bán theo danh mục, thương hiệu và cách sắp xếp bên dưới.</p>}
  </section>
}
