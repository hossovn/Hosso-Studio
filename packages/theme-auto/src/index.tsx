import { SiteNav, hsRenderers, t, type MenuItem, type SiteChrome, type Theme, type ThemeManifest } from '@hosso/studio-blocks'
import type React from 'react'
import manifest from '../theme.json'
import { css } from './styles'

// Theme "Phụ tùng ô tô (đen cam)": thanh đầu nền đen (logo, menu giữa, tìm kiếm), thanh phụ màu nhấn có nút "Danh mục" và 4 cam kết,
// các nút liên hệ tròn nổi bên phải. Nội dung dùng bộ renderer hs-* dùng chung.

const zaloHref = (z: string) => (/^https?:/.test(z) ? z : `https://zalo.me/${z.replace(/\D/g, '')}`)
const tel = (p: string) => `tel:${p.replace(/\s/g, '')}`

// Danh mục thả xuống: các mục con của menu (nếu có), không thì chính các mục cấp 1.
const categories = (menu: MenuItem[]) => {
  const subs = menu.flatMap((i) => i.children ?? [])
  return subs.length ? subs : menu
}

const Header = ({ chrome, actions }: { chrome: SiteChrome; actions?: React.ReactNode }) => {
  const cats = categories(chrome.headerMenu)
  return (
    <header className="ta-header">
      {chrome.announcement && <div className="ta-announce">{chrome.announcement}</div>}
      <div className="ta-top">
        <div className="ta-wrap ta-top-row">
          <a className="ta-brand" href={chrome.homeHref}>
            {chrome.logoUrl ? <img src={chrome.logoUrl} alt={chrome.siteName} /> : chrome.siteName}
          </a>
          <SiteNav items={chrome.headerMenu} cls="ta-nav" />
          <div className="ta-tools">
            {actions && <div className="ta-actions">{actions}</div>}
            {chrome.search && (
              <details className="ta-search">
                <summary aria-label={t('search.label')}>
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-3.5-3.5" />
                  </svg>
                </summary>
                <form action={chrome.searchHref} role="search">
                  <input name="q" type="search" placeholder={t('search.placeholder')} aria-label={t('search.label')} />
                  <button type="submit">{t('search.submit')}</button>
                </form>
              </details>
            )}
          </div>
        </div>
      </div>
      <div className="ta-sub">
        <div className="ta-wrap ta-sub-row">
          {cats.length > 0 && (
            <details className="ta-cat">
              <summary>
                <span aria-hidden="true">☰</span> {t('auto.categories')}
              </summary>
              <ul>
                {cats.map((c, i) => (
                  <li key={i}>
                    <a href={c.href}>{c.label}</a>
                  </li>
                ))}
              </ul>
            </details>
          )}
          <ul className="ta-perks">
            {(['auto.b1', 'auto.b2', 'auto.b3', 'auto.b4'] as const).map((k) => (
              <li key={k}>{t(k)}</li>
            ))}
          </ul>
        </div>
      </div>
    </header>
  )
}

const Footer = ({ chrome }: { chrome: SiteChrome }) => {
  const { contact } = chrome
  return (
    <footer className="ta-footer">
      <div className="ta-wrap ta-footer-grid">
        <div>
          <strong className="ta-footer-name">{chrome.siteName}</strong>
          {contact.address && <p>{contact.address}</p>}
          {contact.phone && (
            <p>
              <a href={tel(contact.phone)}>{contact.phone}</a>
            </p>
          )}
          {contact.email && (
            <p>
              <a href={`mailto:${contact.email}`}>{contact.email}</a>
            </p>
          )}
        </div>
        {!!chrome.footerMenu.length && (
          <nav aria-label={t('nav.quick')}>
            <h2>{t('shop.quicklinks')}</h2>
            <ul>
              {chrome.footerMenu.map((i, n) => (
                <li key={n}>
                  <a href={i.href}>{i.label}</a>
                </li>
              ))}
            </ul>
          </nav>
        )}
        {!!chrome.social.length && (
          <div>
            <h2>{t('footer.follow')}</h2>
            <ul>
              {chrome.social.map((i, n) => (
                <li key={n}>
                  <a href={i.href} rel="noopener noreferrer">
                    {i.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {chrome.footerText && (
        <div className="ta-wrap">
          <small className="ta-copy">{chrome.footerText}</small>
        </div>
      )}
      {(contact.phone || contact.zalo || contact.email) && (
        <div className="ta-float">
          {contact.phone && (
            <a className="ta-float-call" href={tel(contact.phone)} aria-label={t('contact.call')}>
              ☎
            </a>
          )}
          {contact.zalo && (
            <a className="ta-float-zalo" href={zaloHref(contact.zalo)} rel="noopener noreferrer" aria-label={t('contact.zalo')}>
              Zalo
            </a>
          )}
          {contact.email && (
            <a className="ta-float-mail" href={`mailto:${contact.email}`} aria-label="Email">
              @
            </a>
          )}
        </div>
      )}
    </footer>
  )
}

export const theme: Theme = {
  manifest: manifest as ThemeManifest,
  css,
  renderers: hsRenderers,
  layout: { Header, Footer },
}

export default theme
