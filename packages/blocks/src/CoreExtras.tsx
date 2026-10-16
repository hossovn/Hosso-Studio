import React from 'react'
import type { BlockRenderer } from './types'

/** Thanh cam kết (hỗ trợ, giao hàng, chính hãng…). */
export const TrustBar: BlockRenderer = ({ items }) =>
  (items ?? []).length ? (
    <section className="ss-trust" aria-label="Cam kết">
      <ul className="ss-wrap">
        {(items as { text: string }[]).map((i, n) => (
          <li key={n}>{i.text}</li>
        ))}
      </ul>
    </section>
  ) : null

/** Lưới danh mục có ảnh. */
export const CategoryGrid: BlockRenderer = ({ heading, items }) => (
  <section className="ss-section">
    <div className="ss-wrap">
      {heading && <h2 className="ss-center">{heading}</h2>}
      <ul className="ss-cats">
        {((items ?? []) as { label: string; href: string; image: string }[]).map((c, n) => (
          <li key={n}>
            <a href={c.href || '#'}>
              {c.image ? <img src={c.image} alt="" loading="lazy" /> : <span className="ss-cat-ph" aria-hidden="true" />}
              <span>{c.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  </section>
)
