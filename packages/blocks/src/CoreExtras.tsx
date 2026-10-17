import React from 'react'
import { FormView, type FormDef } from './FormView'
import { t } from './i18n'
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

/** Biểu mẫu tùy chỉnh (định nghĩa trong admin → Biểu mẫu); dữ liệu form lấy qua loader của lõi. */
export const FormBlock: BlockRenderer = ({ heading, data }) => {
  const d = data as { status: string; form?: FormDef } | undefined
  return (
    <section className="ss-section">
      <div className="ss-wrap ss-form-wrap">
        {heading && <h2>{heading}</h2>}
        {!d || d.status === 'loading' ? <p className="ss-muted">…</p> : d.status === 'ok' && d.form ? <FormView form={d.form} /> : null}
      </div>
    </section>
  )
}

/** Chỉ hiện trong trình dựng; trang công khai thay bằng nội dung thật của khối. */
export const ReusablePlaceholder: BlockRenderer = ({ slug }) => (
  <div className="hs-missing" role="note">
    ↻ {slug ? `${slug}` : t('reusable.missing')}
  </div>
)
