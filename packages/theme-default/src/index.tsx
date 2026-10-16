import { SiteNav, t, type BlockRenderer, type SiteChrome, type Theme, type ThemeManifest } from '@hosso/studio-blocks'
import type React from 'react'
import manifest from '../theme.json'
import { css } from './styles'

const Hero: BlockRenderer = ({ title, subtitle, ctaLabel, ctaHref }) => (
  <section className="hs-hero">
    <div className="hs-wrap">
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
      {ctaLabel && (
        <a className="hs-btn" href={ctaHref || '#'}>
          {ctaLabel}
        </a>
      )}
    </div>
  </section>
)

const Text: BlockRenderer = ({ heading, body }) => (
  <section className="hs-section">
    <div className="hs-wrap">
      <div className="hs-text">
        {heading && <h2>{heading}</h2>}
        {String(body ?? '')
          .split(/\n\s*\n/)
          .filter(Boolean)
          .map((p, i) => (
            <p key={i}>{p}</p>
          ))}
      </div>
    </div>
  </section>
)

const Image: BlockRenderer = ({ src, alt, caption }) =>
  src ? (
    <section className="hs-section">
      <figure className="hs-wrap hs-figure">
        <img src={src} alt={alt ?? ''} loading="lazy" />
        {caption && <figcaption>{caption}</figcaption>}
      </figure>
    </section>
  ) : null

const Features: BlockRenderer = ({ heading, items }) => (
  <section className="hs-section">
    <div className="hs-wrap">
      {heading && <h2>{heading}</h2>}
      <div className="hs-grid">
        {(items ?? []).map((it: { title: string; description: string }, i: number) => (
          <div className="hs-card" key={i}>
            <h3>{it.title}</h3>
            <p>{it.description}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
)

const ContactForm: BlockRenderer = ({ id, heading, description, submitLabel }) => (
  <section className="hs-section" id={`lien-he-${id}`}>
    <div className="hs-wrap">
      {heading && <h2>{heading}</h2>}
      {description && <p>{description}</p>}
      <p className="hs-sent" id="da-gui" role="status">
        {t('contact.sent')}
      </p>
      <form className="hs-form" method="post" action="/api/contact">
        <label>
          {t('contact.name')}
          <input name="name" required maxLength={120} autoComplete="name" />
        </label>
        <label>
          {t('contact.phone')}
          <input name="phone" type="tel" required maxLength={20} autoComplete="tel" />
        </label>
        <label>
          {t('contact.message')}
          <textarea name="message" rows={4} required maxLength={2000} />
        </label>
        <input className="hs-hp" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
        <button className="hs-btn" type="submit">
          {submitLabel || 'Gửi'}
        </button>
      </form>
    </div>
  </section>
)

const FooterBlock: BlockRenderer = ({ text, links }) => (
  <footer className="hs-footer">
    <div className="hs-wrap">
      <ul>
        {(links ?? []).map((l: { label: string; href: string }, i: number) => (
          <li key={i}>
            <a href={l.href}>{l.label}</a>
          </li>
        ))}
      </ul>
      <small>{text}</small>
    </div>
  </footer>
)

const zaloHref = (z: string) => (/^https?:/.test(z) ? z : `https://zalo.me/${z.replace(/\D/g, '')}`)

const Header = ({ chrome, actions }: { chrome: SiteChrome; actions?: React.ReactNode }) => (
  <header className="hs-header">
    {chrome.announcement && <div className="hs-announce">{chrome.announcement}</div>}
    <div className="hs-wrap hs-header-row">
      <a className="hs-brand" href="/">
        {chrome.logoUrl ? <img src={chrome.logoUrl} alt={chrome.siteName} height={40} /> : chrome.siteName}
      </a>
      <SiteNav items={chrome.headerMenu} cls="hs-nav" />
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
  renderers: { Hero, Text, Image, Features, ContactForm, Footer: FooterBlock },
  layout: { Header, Footer },
}

export default theme
