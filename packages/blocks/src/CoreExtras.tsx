import React from 'react'
import { FormView, type FormDef } from './FormView'
import { getDefaultLocale, getLocale, localizeHref, t } from './i18n'
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

/** Widget: ô tìm kiếm (gửi tới trang tìm kiếm của site theo ngôn ngữ hiện tại). */
export const SearchBox: BlockRenderer = ({ heading }) => (
  <section className="ss-widget">
    {heading && <h3>{heading}</h3>}
    <form className="ss-search" action={localizeHref('/tim-kiem', getLocale(), getDefaultLocale())} role="search">
      <input name="q" type="search" placeholder={t('search.placeholder')} aria-label={t('search.label')} />
      <button className="ss-btn" type="submit">
        {t('search.submit')}
      </button>
    </form>
  </section>
)

/** Widget: danh sách chuyên mục hoặc thẻ (dữ liệu từ loader của lõi). */
export const TermList: BlockRenderer = ({ heading, data }) => {
  const d = data as { status: string; items?: { name: string; href: string; count?: number }[] } | undefined
  return (
    <section className="ss-widget">
      {heading && <h3>{heading}</h3>}
      {!d || d.status === 'loading' ? (
        <p className="ss-muted">…</p>
      ) : (d.items ?? []).length === 0 ? (
        <p className="ss-muted">{t('post.empty')}</p>
      ) : (
        <ul className="ss-termlist">
          {d.items!.map((i) => (
            <li key={i.href}>
              <a href={i.href}>{i.name}</a>
              {i.count != null && <span className="ss-muted"> ({i.count})</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

type NavItem = { label: string; href: string; children?: NavItem[] }
const NavTree = ({ items }: { items: NavItem[] }) => (
  <ul className="ss-navmenu">
    {items.map((i, n) => (
      <li key={n}>
        <a href={i.href}>{i.label}</a>
        {!!i.children?.length && <NavTree items={i.children} />}
      </li>
    ))}
  </ul>
)

/** Widget: danh sách liên kết tự nhập, hoặc lấy lại menu đầu/chân trang của site (loader của lõi trả về menu đã dịch). */
export const NavMenu: BlockRenderer = ({ heading, source, links, data }) => {
  const custom = source === 'custom' || !source
  const d = data as { status: string; items?: NavItem[] } | undefined
  const items: NavItem[] | null = custom
    ? ((links ?? []) as NavItem[]).filter((l) => l.label).map((l) => ({ label: l.label, href: /^\//.test(l.href) ? localizeHref(l.href, getLocale(), getDefaultLocale()) : l.href || '#' }))
    : d?.status === 'ok'
      ? (d.items ?? [])
      : null
  return (
    <section className="ss-widget">
      {heading && <h3>{heading}</h3>}
      {items === null ? <p className="ss-muted">…</p> : items.length ? <nav aria-label={String(heading || '')}><NavTree items={items} /></nav> : <p className="ss-muted">{t('post.empty')}</p>}
    </section>
  )
}
