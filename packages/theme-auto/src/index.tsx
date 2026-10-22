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
  // footerText dạng "© 2025 Tên. Thông tin pháp lý...": câu đầu là bản quyền, phần còn lại là thông tin công ty.
  const [head, ...rest] = (chrome.footerText ?? '').split(/(?<=\.)\s+/)
  const legal = head?.startsWith('©') ? rest.join(' ') : chrome.footerText
  const copyright = head?.startsWith('©') ? head : ''
  return (
    <footer className="ta-footer">
      <div className="ta-wrap ta-footer-grid">
        <div>
          <h2>{t('footer.about')}</h2>
          <strong className="ta-footer-name">{chrome.siteName}</strong>
          {legal && <p className="ta-legal">{legal}</p>}
        </div>
        {!!chrome.footerMenu.length && (
          <nav aria-label={t('nav.quick')}>
            <h2>{t('shop.quicklinks')}</h2>
            <ul className="ta-footer-links">
              {chrome.footerMenu.map((i, n) => (
                <li key={n}>
                  <a href={i.href}>{i.label}</a>
                </li>
              ))}
            </ul>
          </nav>
        )}
        <div>
          <h2>{t('footer.info')}</h2>
          <ul className="ta-footer-contact">
            {contact.address && (
              <li>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                <span>{contact.address}</span>
              </li>
            )}
            {contact.phone && (
              <li>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" /></svg>
                <a href={tel(contact.phone)}>{contact.phone}</a>
              </li>
            )}
            {contact.email && (
              <li>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
                <a href={`mailto:${contact.email}`}>{contact.email}</a>
              </li>
            )}
          </ul>
        </div>
        {!!chrome.social.length && (
          <div>
            <h2>{t('footer.follow')}</h2>
            <ul className="ta-footer-links">
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
      {copyright && (
        <div className="ta-wrap">
          <small className="ta-copy">{copyright}</small>
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
