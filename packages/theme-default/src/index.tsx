import { SiteNav, hsRenderers, t, type SiteChrome, type Theme, type ThemeManifest } from '@hosso/studio-blocks'
import type React from 'react'
import manifest from '../theme.json'
import { css } from './styles'

const zaloHref = (z: string) => (/^https?:/.test(z) ? z : `https://zalo.me/${z.replace(/\D/g, '')}`)

const Header = ({ chrome, actions }: { chrome: SiteChrome; actions?: React.ReactNode }) => (
  <header className="hs-header">
    {chrome.announcement && <div className="hs-announce">{chrome.announcement}</div>}
    <div className="hs-wrap hs-header-row">
      <a className="hs-brand" href={chrome.homeHref}>
        {chrome.logoUrl ? <img src={chrome.logoUrl} alt={chrome.siteName} height={40} /> : chrome.siteName}
      </a>
      <SiteNav items={chrome.headerMenu} cls="hs-nav" />
      {chrome.search && (
        <form className="hs-search" action={chrome.searchHref} role="search">
          <label className="hs-sr" htmlFor="hs-q">{t('search.label')}</label>
          <input id="hs-q" name="q" type="search" placeholder={t('search.placeholder')} />
        </form>
      )}
      
      {actions && <div className="hs-header-actions">{actions}</div>}
    </div>
  </header>
)

const Footer = ({ chrome }: { chrome: SiteChrome }) => {
  const { contact } = chrome
  return (
    <footer className="hs-sitefooter">
      <div className="hs-wrap hs-footer-grid">
        <div>
          <strong>{chrome.siteName}</strong>
          {contact.address && <p>{contact.address}</p>}
        </div>
        {(contact.phone || contact.email) && (
          <div>
            <h2>{t('footer.contact')}</h2>
            {contact.phone && (
              <p>
                <a href={`tel:${contact.phone.replace(/\s/g, '')}`}>{contact.phone}</a>
              </p>
            )}
            {contact.email && (
              <p>
                <a href={`mailto:${contact.email}`}>{contact.email}</a>
              </p>
            )}
          </div>
        )}
        {!!chrome.footerMenu.length && (
          <nav aria-label={t('footer.contact')}>
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
        <div className="hs-wrap">
          <small>{chrome.footerText}</small>
        </div>
      )}
      {(contact.phone || contact.zalo) && (
        <div className="hs-float">
          {contact.zalo && (
            <a href={zaloHref(contact.zalo)} rel="noopener noreferrer">
              {t('contact.zalo')}
            </a>
          )}
          {contact.phone && <a href={`tel:${contact.phone.replace(/\s/g, '')}`}>{t('contact.call')}</a>}
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
