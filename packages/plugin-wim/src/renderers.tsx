import type { BlockRenderer } from '@hosso/studio-blocks'
import React from 'react'
import { AddToCart, CartView, CheckoutForm } from './client/Commerce'
import { VehicleSelectorClient } from './client/VehicleSelector'
import type { Availability, Branch, Product } from './client'
import { formatVnd } from './format'
import { tr, type Key } from './strings.vi'

// Renderer dự phòng: dùng khi theme không có renderer riêng cho block của plugin. Style theo biến --hs-* của theme.

type Data = { status: 'ok'; [k: string]: any } | { status: 'error'; kind: string } | { status: 'loading' } | undefined

const Notice = ({ data }: { data: Data }) =>
  !data || data.status === 'loading' ? (
    <p className="wp-note">{tr('loading')}</p>
  ) : data.status === 'error' ? (
    <p className="wp-note wp-note-error" role="status">
      {tr(`err.${data.kind}` as Key) ?? tr('err.internal')}
    </p>
  ) : null

const Section = ({ children, heading }: { children: React.ReactNode; heading?: string }) => (
  <section className="wp-section">
    <div className="wp-wrap">
      {heading && <h2>{heading}</h2>}
      {children}
    </div>
  </section>
)

export const VehicleSelector: BlockRenderer = ({ heading, targetPath, data }) => {
  const d = data as Data
  if (d?.status === 'ok' && d.unavailable) return null // WIM chưa có dữ liệu xe: ẩn bộ chọn
  return (
    <Section>
      {d?.status === 'ok' ? (
        <VehicleSelectorClient heading={heading} targetPath={targetPath || '/san-pham'} makes={d.makes} models={d.models} years={d.years} selected={d.selected} />
      ) : (
        <Notice data={d} />
      )}
    </Section>
  )
}

export const ProductSearch: BlockRenderer = ({ heading, targetPath }) => (
  <Section heading={heading}>
    <form className="wp-search" method="get" action={targetPath || '/san-pham'} role="search">
      <label className="wp-sr" htmlFor="wp-q">
        {tr('search.label')}
      </label>
      <input id="wp-q" name="q" type="search" placeholder={tr('search.placeholder')} />
      <button className="wp-btn" type="submit">
        {tr('search.submit')}
      </button>
    </form>
  </Section>
)

const Condition = ({ c }: { c: Product['condition'] }) => <span className={`wp-badge wp-badge-${c}`}>{tr(`cond.${c}` as Key)}</span>

const qs = (filters: Record<string, unknown>, page: number) => {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(filters)) if (v !== undefined && v !== '') p.set(k, String(v))
  p.set('page', String(page))
  return `?${p}`
}

export const ProductGrid: BlockRenderer = ({ heading, data }) => {
  const d = data as Data
  if (d?.status !== 'ok') {
    return (
      <Section heading={heading}>
        <Notice data={d} />
      </Section>
    )
  }
  const { items, total, page, pageSize, filters, vehicleLabel, detailPath, categoryNames } = d as any
  const pages = Math.max(1, Math.ceil(total / pageSize))
  return (
    <Section heading={heading}>
      {vehicleLabel && (
        <p className="wp-note">
          {tr('grid.filteringBy')} <strong>{vehicleLabel}</strong> · {total} {tr('grid.total')}
        </p>
      )}
      {items.length === 0 ? (
        <p className="wp-note">{tr('grid.empty')}</p>
      ) : (
        <ul className="wp-grid">
          {(items as Product[]).map((p) => (
            <li key={p.id} className="wp-card">
              <Condition c={p.condition} />
              <h3>
                <a href={`${detailPath}?p=${encodeURIComponent(p.id)}`}>{p.name}</a>
              </h3>
              <p className="wp-meta">
                {p.brand} · {tr('product.code')} {p.code}
                {p.categoryId && categoryNames?.[p.categoryId] ? ` · ${categoryNames[p.categoryId]}` : ''}
              </p>
              <p className="wp-price">{formatVnd(p.price)}</p>
            </li>
          ))}
        </ul>
      )}
      {pages > 1 && (
        <nav className="wp-pager" aria-label="Phân trang">
          {page > 1 && <a href={qs(filters, page - 1)}>{tr('grid.prev')}</a>}
          <span>
            {page} / {pages}
          </span>
          {page < pages && <a href={qs(filters, page + 1)}>{tr('grid.next')}</a>}
        </nav>
      )}
    </Section>
  )
}

export const ProductDetail: BlockRenderer = ({ backPath, cartPath, data }) => {
  const d = data as Data
  if (d?.status !== 'ok') {
    return (
      <Section>
        <Notice data={d} />
      </Section>
    )
  }
  if (d.missing) {
    return (
      <Section>
        <p className="wp-note">{tr(d.missing === 'pick' ? 'product.pick' : 'product.notFound')}</p>
        <a href={backPath || '/san-pham'}>{tr('product.back')}</a>
      </Section>
    )
  }
  const { product: p, availability, branches, categoryName } = d as unknown as { product: Product; availability: Availability; branches: Branch[]; categoryName?: string }
  const branchName = Object.fromEntries(branches.map((b) => [b.id, b.name]))
  return (
    <Section>
      <a className="wp-back" href={backPath || '/san-pham'}>
        ← {tr('product.back')}
      </a>
      <article className="wp-detail">
        <Condition c={p.condition} />
        <h1>{p.name}</h1>
        <p className="wp-price wp-price-lg">{formatVnd(availability.price)}</p>
        <AddToCart
          product={{ id: p.id, name: p.name, price: availability.price }}
          cartPath={cartPath || '/gio-hang'}
          inStock={availability.branches.some((b) => b.available > 0)}
        />
        <dl className="wp-spec">
          <dt>{tr('product.brand')}</dt>
          <dd>{p.brand}</dd>
          <dt>{tr('product.code')}</dt>
          <dd>{p.code}</dd>
          {categoryName && (
            <>
              <dt>Danh mục</dt>
              <dd>{categoryName}</dd>
            </>
          )}
          {!!p.oemCodes?.length && (
            <>
              <dt>{tr('product.oem')}</dt>
              <dd>{p.oemCodes.join(', ')}</dd>
            </>
          )}
          {!!p.altCodes?.length && (
            <>
              <dt>{tr('product.alt')}</dt>
              <dd>{p.altCodes.join(', ')}</dd>
            </>
          )}
          <dt>{tr('product.warranty')}</dt>
          <dd>{p.warrantyMonths ? `${p.warrantyMonths} ${tr('product.months')}` : tr('product.noWarranty')}</dd>
        </dl>

        {!!p.compatibility?.length && (
          <>
            <h2>{tr('product.compat')}</h2>
            <ul className="wp-compat">
              {p.compatibility.map((c, i) => (
                <li key={i}>
                  {c.make.toUpperCase()} {c.model.replace(`${c.make}-`, '').toUpperCase()} · {c.yearFrom}–{c.yearTo}
                  {c.engine ? ` · ${c.engine}` : ''}
                </li>
              ))}
            </ul>
          </>
        )}

        <h2>{tr('product.stock')}</h2>
        <ul className="wp-stock">
          {availability.branches.map((b) => (
            <li key={b.branchId} className={b.available > 0 ? 'wp-in' : 'wp-out'}>
              <span>{branchName[b.branchId] ?? b.branchId}</span>
              <strong>
                {b.available > 0 ? (b.available <= 3 ? `${tr('product.lowStock')} (${b.available})` : `${tr('product.inStock')} (${b.available})`) : tr('product.outOfStock')}
              </strong>
            </li>
          ))}
        </ul>
      </article>
    </Section>
  )
}

export const Cart: BlockRenderer = ({ heading, checkoutPath, shopPath }) => (
  <CartView heading={heading} checkoutPath={checkoutPath || '/thanh-toan'} shopPath={shopPath || '/san-pham'} />
)

export const Checkout: BlockRenderer = ({ heading, statusPath, cartPath, data }) => {
  const d = data as Data
  if (d?.status !== 'ok') {
    return (
      <Section heading={heading}>
        <Notice data={d} />
      </Section>
    )
  }
  return <CheckoutForm heading={heading} branches={d.branches} statusPath={statusPath || '/trang-thai-don'} cartPath={cartPath || '/gio-hang'} />
}

type OrderView = {
  id: string
  status: string
  total: number
  items: { name?: string; productId: string; quantity: number; unitPrice?: number }[]
  fulfillment: { type: string }
  createdAt: string
}

export const OrderStatus: BlockRenderer = ({ heading, data }) => {
  const d = data as Data
  if (d?.status !== 'ok') {
    return (
      <Section heading={heading}>
        <Notice data={d} />
      </Section>
    )
  }
  const o = d.order as OrderView | undefined
  return (
    <Section heading={heading}>
      {d.notFound && (
        <p className="wp-note wp-note-error" role="alert">
          {tr('order.notFound')}
        </p>
      )}
      {o ? (
        <article className="wp-detail">
          <p className="wp-note">{tr('order.thanks')}</p>
          <dl className="wp-spec">
            <dt>{tr('order.id')}</dt>
            <dd>{o.id}</dd>
            <dt>{tr('order.status')}</dt>
            <dd>
              <strong>{tr(`status.${o.status}` as Key)}</strong>
            </dd>
            <dt>{tr('order.fulfillment')}</dt>
            <dd>{o.fulfillment.type === 'pickup' ? `${tr('checkout.pickup').split(' (')[0]}: ${d.branchName ?? ''}` : tr('checkout.delivery').split(' (')[0]}</dd>
            <dt>{tr('order.created')}</dt>
            <dd>{new Date(o.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</dd>
          </dl>
          <h2>{tr('order.items')}</h2>
          <ul className="wp-cart wp-cart-summary">
            {o.items.map((l, i) => (
              <li key={i}>
                <span>
                  {l.name ?? l.productId} × {l.quantity}
                </span>
                <strong>{formatVnd((l.unitPrice ?? 0) * l.quantity)}</strong>
              </li>
            ))}
          </ul>
          <p className="wp-total">
            {tr('order.total')}: <strong>{formatVnd(o.total)}</strong>
          </p>
        </article>
      ) : (
        <form className="wp-form" method="get">
          <h3>{tr('order.lookup')}</h3>
          <label>
            {tr('order.id')}
            <input name="id" required defaultValue={(d.id as string) ?? ''} />
          </label>
          <label>
            {tr('order.phone4')}
            <input name="phone" required inputMode="numeric" pattern="[0-9]{4}" maxLength={4} />
          </label>
          <button className="wp-btn" type="submit">
            {tr('order.find')}
          </button>
        </form>
      )}
    </Section>
  )
}

export const fallbackRenderers: Record<string, BlockRenderer> = {
  WimVehicleSelector: VehicleSelector,
  WimProductSearch: ProductSearch,
  WimProductGrid: ProductGrid,
  WimProductDetail: ProductDetail,
  WimCart: Cart,
  WimCheckout: Checkout,
  WimOrderStatus: OrderStatus,
}
