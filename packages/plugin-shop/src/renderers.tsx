import { getLocale, localizeHref, type BlockRenderer } from '@hosso/studio-blocks'
import React from 'react'
import { Carousel } from './client/Carousel'
import { WishlistButton, WishlistView } from './client/Wishlist'
import { AddToCart, CartView, CheckoutForm, OrderLookup, ReviewForm } from './client/Shop'
import type { Card, Review, ReviewItem } from './loaders'
import { vnd } from './util'

// Renderer dự phòng của plugin (dùng khi theme không có renderer riêng). Style theo biến --hs-* qua class sp-*.
const T = {
  vi: { empty: 'Không có sản phẩm phù hợp.', loading: 'Đang tải…', soldOut: 'Hết hàng', inStock: 'Còn hàng', sku: 'Mã', brand: 'Thương hiệu', category: 'Danh mục', back: '← Danh sách sản phẩm', notFound: 'Không tìm thấy sản phẩm.', prev: '‹ Trước', next: 'Sau ›', page: 'Trang', desc: 'Mô tả', info: 'Thông tin bổ sung', weight: 'Trọng lượng', size: 'Kích thước', search: 'Tìm theo tên hoặc mã', all: 'Tất cả', priceFrom: 'Giá từ', priceTo: 'đến', sort: 'Sắp xếp', newest: 'Mới nhất', asc: 'Giá tăng dần', desc2: 'Giá giảm dần', filter: 'Lọc', reviews: 'Đánh giá', noReviews: 'Chưa có đánh giá nào.', related: 'Sản phẩm liên quan', results: 'sản phẩm', from: 'Từ' },
  en: { empty: 'No matching products.', loading: 'Loading…', soldOut: 'Out of stock', inStock: 'In stock', sku: 'SKU', brand: 'Brand', category: 'Category', back: '← Product list', notFound: 'Product not found.', prev: '‹ Prev', next: 'Next ›', page: 'Page', desc: 'Description', info: 'Additional information', weight: 'Weight', size: 'Dimensions', search: 'Search by name or code', all: 'All', priceFrom: 'Price from', priceTo: 'to', sort: 'Sort', newest: 'Newest', asc: 'Price low to high', desc2: 'Price high to low', filter: 'Filter', reviews: 'Reviews', noReviews: 'No reviews yet.', related: 'Related products', results: 'products', from: 'From' },
}
const tt = () => T[getLocale() === 'en' ? 'en' : 'vi']
const lh = (p: string) => localizeHref(p)

type Data = { status: string; [k: string]: any } | undefined

const Price = ({ c, big }: { c: Pick<Card, 'price' | 'salePrice' | 'variants' | 'hidePrice' | 'priceLabel'>; big?: boolean }) =>
  c.hidePrice ? (
    <p className={`sp-price sp-price-contact${big ? ' sp-price-lg' : ''}`}>{c.priceLabel}</p>
  ) : (
  <p className={`sp-price${big ? ' sp-price-lg' : ''}`}>
    {c.variants?.length ? `${tt().from} ${vnd(Math.min(...c.variants.map((v) => v.price)))}` : c.salePrice ? (<><span>{vnd(c.salePrice)}</span> <del>{vnd(c.price)}</del></>) : vnd(c.price)}
  </p>
  )

type CardOpts = { style?: string; ratio?: string; showCode?: string; showBrand?: string }

// Bố cục thẻ do block quyết định (prop cardStyle/imageRatio...), không đổi DOM mặc định khi để trống.
const CardView = ({ c, detailPath, o = {} }: { c: Card; detailPath: string; o?: CardOpts }) => (
  <li className={`sp-card${o.style === 'horizontal' ? ' sp-card-h' : ''}${o.style === 'plain' ? ' sp-card-plain' : ''}`}>
    <a href={`${lh(detailPath)}?p=${encodeURIComponent(c.slug)}`} className={`sp-card-img${o.ratio ? ` sp-r-${o.ratio}` : ''}`}>
      {c.image ? <img src={c.image} alt="" loading="lazy" /> : <span aria-hidden="true" />}
    </a>
    <div className="sp-card-body">
      <h3><a href={`${lh(detailPath)}?p=${encodeURIComponent(c.slug)}`}>{c.name}</a></h3>
      {o.showCode !== 'no' && c.code && <p className="sp-meta">{c.code}</p>}
      {o.showBrand === 'yes' && c.brand && <p className="sp-meta">{c.brand}</p>}
      <Price c={c} />
      {c.stock <= 0 && <span className="sp-badge">{tt().soldOut}</span>}
    </div>
  </li>
)

/** Lưới hoặc băng chuyền có mũi tên; `cols` là số cột trên máy tính (điện thoại 2, máy tính bảng tối đa 3). */
const CardList = ({ items, detailPath, layout, cols, o, label }: { items: Card[]; detailPath: string; layout?: string; cols?: number | string; o?: CardOpts; label?: string }) => {
  const cards = items.map((c) => <CardView key={c.id} c={c} detailPath={detailPath} o={o} />)
  const n = Math.min(6, Math.max(2, Number(cols) || 5))
  return layout === 'carousel' ? (
    <div className={`sp-c${n}`}><Carousel label={label}>{cards}</Carousel></div>
  ) : (
    <ul className={`sp-grid sp-c${n}`}>{cards}</ul>
  )
}

const Section = ({ heading, children }: { heading?: string; children: React.ReactNode }) => (
  <section className="sp-section"><div className="sp-wrap">{heading && <h2>{heading}</h2>}{children}</div></section>
)

const Stars = ({ n }: { n: number }) => <span className="sp-stars" aria-label={`${n}/5`}>{'★'.repeat(Math.round(n))}{'☆'.repeat(5 - Math.round(n))}</span>

type Filters = { brands: string[]; categories: { name: string; slug: string }[]; current: { q: string; category: string; brand: string; min: number | string; max: number | string; sort: string } }

/** Bộ lọc dạng biểu mẫu GET (không cần JavaScript): từ khóa, danh mục, thương hiệu, khoảng giá, sắp xếp. */
const FilterBar = ({ f }: { f: Filters }) => {
  const t = tt()
  return (
    <form className="sp-filters" method="get">
      <label>{t.search}<input name="q" defaultValue={f.current.q} /></label>
      <label>{t.category}<select name="category" defaultValue={f.current.category}><option value="">{t.all}</option>{f.categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></label>
      {f.brands.length > 0 && <label>{t.brand}<select name="brand" defaultValue={f.current.brand}><option value="">{t.all}</option>{f.brands.map((b) => <option key={b} value={b}>{b}</option>)}</select></label>}
      <label>{t.priceFrom}<input name="min" type="number" min={0} step={1000} defaultValue={f.current.min} /></label>
      <label>{t.priceTo}<input name="max" type="number" min={0} step={1000} defaultValue={f.current.max} /></label>
      <label>{t.sort}<select name="sort" defaultValue={f.current.sort}><option value="new">{t.newest}</option><option value="priceAsc">{t.asc}</option><option value="priceDesc">{t.desc2}</option></select></label>
      <button className="sp-btn" type="submit">{t.filter}</button>
    </form>
  )
}

const ProductGrid: BlockRenderer = ({ heading, detailPath, pager, layout, columns, cardStyle, imageRatio, showCode, showBrand, data }) => {
  const d = data as Data
  if (!d || d.status !== 'ok') return <Section heading={heading}><p className="sp-note">{tt().loading}</p></Section>
  const items = d.items as Card[]
  const qs = (page: number) => `?${d.query ? `${d.query}&` : ''}page=${page}`
  return (
    <Section heading={heading}>
      {d.filters && <FilterBar f={d.filters as Filters} />}
      {pager === 'yes' && <p className="sp-meta">{d.total} {tt().results}</p>}
      {items.length === 0 ? <p className="sp-note">{tt().empty}</p> : <CardList items={items} detailPath={detailPath || '/chi-tiet'} layout={layout} cols={columns} o={{ style: cardStyle, ratio: imageRatio, showCode, showBrand }} label={heading} />}
      {pager === 'yes' && d.pages > 1 && (
        <nav className="sp-pager" aria-label="pagination">
          {d.page > 1 && <a href={qs(d.page - 1)}>{tt().prev}</a>}
          <span>{tt().page} {d.page}/{d.pages}</span>
          {d.page < d.pages && <a href={qs(d.page + 1)}>{tt().next}</a>}
        </nav>
      )}
    </Section>
  )
}

const ProductDetail: BlockRenderer = ({ backPath, cartPath, layout, imageSize, showReviews, showRelated, relatedLayout, showTabs, data }) => {
  const d = data as Data
  if (!d) return <Section><p className="sp-note">{tt().loading}</p></Section>
  if (d.status !== 'ok') return <Section><p className="sp-note">{tt().notFound}</p><a className="sp-back" href={lh(backPath || '/san-pham')}>{tt().back}</a></Section>
  const c = d.product as Card
  const reviews = (d.reviews ?? []) as Review[]
  const related = (d.related ?? []) as Card[]
  const abs = (u: string) => (u.startsWith('http') ? u : `${d.baseUrl ?? ''}${u}`)
  // Dữ liệu cấu trúc schema.org/Product để Google hiện giá, tồn kho và số sao.
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: c.name,
    ...(c.image && { image: abs(c.image) }),
    ...(c.description && { description: c.description }),
    ...(c.code && { sku: c.code }),
    ...(c.brand && { brand: { '@type': 'Brand', name: c.brand } }),
    offers: { '@type': 'Offer', priceCurrency: 'VND', price: c.salePrice ?? c.price, availability: c.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock' },
    ...(d.reviewCount > 0 && { aggregateRating: { '@type': 'AggregateRating', ratingValue: d.rating, reviewCount: d.reviewCount } }),
  }
  return (
    <Section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, '\\u003c') }} />
      <a className="sp-back" href={lh(backPath || '/san-pham')}>{tt().back}</a>
      <div className={`sp-detail${layout === 'right' ? ' sp-d-right' : ''}${layout === 'stack' ? ' sp-d-stack' : ''}${imageSize ? ` sp-img-${imageSize}` : ''}`}>
        <div className="sp-detail-img">{c.image && <img src={c.image} alt={c.name} />}</div>
        <div>
          <h1>{c.name}</h1>
          {d.reviewCount > 0 && <p className="sp-meta"><Stars n={d.rating} /> {d.rating} ({d.reviewCount})</p>}
          <Price c={c} big />
          <dl className="sp-spec">
            {c.code && (<><dt>{tt().sku}</dt><dd>{c.code}</dd></>)}
            {c.brand && (<><dt>{tt().brand}</dt><dd>{c.brand}</dd></>)}
            {c.category && (<><dt>{tt().category}</dt><dd><a href={`${lh(backPath || '/san-pham')}?category=${c.category.slug}`}>{c.category.name}</a></dd></>)}
            <dt>·</dt><dd>{c.stock > 0 ? tt().inStock : tt().soldOut}</dd>
          </dl>
          {!c.hidePrice && <AddToCart product={{ id: c.id, name: c.name, price: c.salePrice ?? c.price, image: c.image }} cartPath={cartPath || '/gio-hang'} inStock={c.stock > 0} variants={c.variants} />}
        </div>
      </div>
      {showTabs !== 'no' && (c.description || c.weight || c.size) && (
        <div className="sp-tabset">
          {c.description && <input type="radio" name="sp-tab" id="sp-tab-desc" defaultChecked />}
          {c.description && <label htmlFor="sp-tab-desc">{tt().desc}</label>}
          {(c.weight || c.size) && <input type="radio" name="sp-tab" id="sp-tab-info" defaultChecked={!c.description} />}
          {(c.weight || c.size) && <label htmlFor="sp-tab-info">{tt().info}</label>}
          {c.description && <div className="sp-panel sp-panel-desc"><p style={{ whiteSpace: 'pre-line' }}>{c.description}</p></div>}
          {(c.weight || c.size) && (
            <div className="sp-panel sp-panel-info">
              <table className="sp-info">
                <tbody>
                  {c.weight && <tr><th>{tt().weight}</th><td>{c.weight >= 1000 ? `${c.weight / 1000} kg` : `${c.weight} g`}</td></tr>}
                  {c.size && <tr><th>{tt().size}</th><td>{c.size}</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {showReviews !== 'no' && (<>
      <h2>{tt().reviews}</h2>
      {reviews.length === 0 ? <p className="sp-note">{tt().noReviews}</p> : (
        <ul className="sp-reviews">
          {reviews.map((r, n) => (<li key={n}><Stars n={r.rating} /> <strong>{r.name}</strong>{r.comment && <p>{r.comment}</p>}</li>))}
        </ul>
      )}
      <ReviewForm productId={c.id} />
      </>)}
      {showRelated !== 'no' && related.length > 0 && (<><h2>{tt().related}</h2><CardList items={related} detailPath="/chi-tiet" layout={relatedLayout} cols={4} label={tt().related} /></>)}
    </Section>
  )
}

const Categories: BlockRenderer = ({ heading, listPath, data }) => {
  const d = data as Data
  if (!d || d.status !== 'ok') return null
  return (
    <Section heading={heading}>
      <ul className="sp-cats">
        {(d.items as { name: string; slug: string; image: string }[]).map((c) => (
          <li key={c.slug}>
            <a href={`${lh(listPath || '/san-pham')}?category=${c.slug}`}>
              {c.image ? <img src={c.image} alt="" loading="lazy" /> : <span className="sp-cat-ph" aria-hidden="true" />}
              <span>{c.name}</span>
            </a>
          </li>
        ))}
      </ul>
    </Section>
  )
}

const Cart: BlockRenderer = ({ heading, checkoutPath, shopPath, width }) => <div className={width ? `sp-w-${width}` : undefined}><CartView heading={heading} checkoutPath={checkoutPath || '/thanh-toan'} shopPath={shopPath || '/san-pham'} /></div>
const Checkout: BlockRenderer = ({ heading, statusPath, cartPath, width, layout, data }) => (
  <div className={`${width ? `sp-w-${width}` : ''}${layout === 'split' ? ' sp-split' : ''}`.trim() || undefined}><CheckoutForm heading={heading} bankInfo={(data as Data)?.bankInfo} statusPath={statusPath || '/trang-thai-don'} cartPath={cartPath || '/gio-hang'} /></div>
)
const OrderStatus: BlockRenderer = ({ heading }) => <OrderLookup heading={heading} />

const ReviewList: BlockRenderer = ({ heading, data }) => {
  const d = data as Data
  const items = (d?.items ?? []) as ReviewItem[]
  if (d?.status === "ok" && items.length === 0) return null
  return (
    <Section heading={heading}>
      <ul className="sp-reviews">
        {items.map((r, n) => (<li key={n}><Stars n={r.rating} /> <strong>{r.name}</strong>{r.product && <span className="sp-meta"> · {r.product}</span>}{r.comment && <p>{r.comment}</p>}</li>))}
      </ul>
    </Section>
  )
}
const WishBtn: BlockRenderer = ({ productId, label, data, _noFree }: any) => <WishlistButton productId={productId || (data as Data)?.productId} label={label} preview={Boolean(_noFree)} />
const Wish: BlockRenderer = ({ heading, detailPath, _noFree }: any) => <WishlistView heading={heading} detailPath={detailPath} preview={Boolean(_noFree)} />

export const fallbackRenderers: Record<string, BlockRenderer> = {
  ShopReviewList: ReviewList,
  ShopWishlistButton: WishBtn,
  ShopWishlist: Wish,
  ShopProductGrid: ProductGrid,
  ShopProductDetail: ProductDetail,
  ShopCategories: Categories,
  ShopCart: Cart,
  ShopCheckout: Checkout,
  ShopOrderStatus: OrderStatus,
}
