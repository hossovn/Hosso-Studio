import { SiteNav, hsRenderers, t, type SiteChrome, type Theme, type ThemeManifest } from '@hosso/studio-blocks'
import type React from 'react'
import manifest from '../theme.json'
import { css } from './styles'

// Theme "Cửa hàng phụ tùng": header hai tầng (logo + tìm kiếm + hotline + giỏ hàng, rồi thanh menu màu nhấn), footer tối.
// Nội dung dùng bộ renderer hs-* dùng chung.

const zaloHref = (z: string) => (/^https?:/.test(z) ? z : `https://zalo.me/${z.replace(/\D/g, '')}`)
const tel = (p: string) => `tel:${p.replace(/\s/g, '')}`

const Header = ({ chrome, actions }: { chrome: SiteChrome; actions?: React.ReactNode }) => (
  <header className="sh-header">
    {chrome.announcement && <div className="sh-announce">{chrome.announcement}</div>}
    <div className="sh-main">
      <div className="sh-wrap sh-main-row">
        <a className="sh-brand" href="/">
          {chrome.logoUrl ? <img src={chrome.logoUrl} alt={chrome.siteName} /> : chrome.siteName}
        </a>
        {chrome.search && (
          <form className="sh-search" action="/tim-kiem" role="search">
            <label className="sh-sr" htmlFor="sh-q">
              {t('search.label')}
            </label>
            <input id="sh-q" name="q" type="search" placeholder={t('search.placeholder')} />
            <button type="submit">{t('search.submit')}</button>
          </form>
        )}
        <div className="sh-tools">
          {chrome.contact.phone && (
            <a className="sh-hotline" href={tel(chrome.contact.phone)}>
              <small>{t('shop.hotline')}</small>
              <strong>{chrome.contact.phone}</strong>
            </a>
          )}
          {actions && <div className="sh-actions">{actions}</div>}
        </div>
      </div>
    </div>
    {chrome.headerMenu.length > 0 && (
      <div className="sh-bar">
        <div className="sh-wrap">
          <SiteNav items={chrome.headerMenu} cls="sh-nav" />
        </div>
      </div>
    )}
  </header>
)

const Footer = ({ chrome }: { chrome: SiteChrome }) => {
  const { contact } = chrome
  return (
    <footer className="sh-footer">
      <div className="sh-wrap sh-footer-grid">
        <div>
          <strong className="sh-footer-name">{chrome.siteName}</strong>
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
          <nav aria-label="Liên kết nhanh">
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
        <div className="sh-wrap">
          <small className="sh-copy">{chrome.footerText}</small>
        </div>
      )}
      {(contact.phone || contact.zalo) && (
        <div className="sh-float">
          {contact.zalo && (
            <a href={zaloHref(contact.zalo)} rel="noopener noreferrer">
              {t('contact.zalo')}
            </a>
          )}
          {contact.phone && <a href={tel(contact.phone)}>{t('contact.call')}</a>}
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
