import { t, type BlockRenderer, type Theme, type ThemeManifest } from '@hosso/studio-blocks'
import manifest from '../theme.json'
import { css } from './styles'

// Bố cục khác hẳn theme sáng: hero nền lưới, tính năng dạng bảng đánh số, văn bản hai cột, form chia đôi.

const Hero: BlockRenderer = ({ title, subtitle, ctaLabel, ctaHref }) => (
  <section className="ha-hero">
    <div className="ha-wrap">
      <p className="ha-eyebrow">{t('hero.eyebrow')}</p>
      <h1>{title}</h1>
      <div className="ha-hero-row">
        {subtitle && <p className="ha-lead">{subtitle}</p>}
        {ctaLabel && (
          <a className="ha-btn" href={ctaHref || '#'}>
            {ctaLabel} <span aria-hidden="true">→</span>
          </a>
        )}
      </div>
    </div>
  </section>
)

const Text: BlockRenderer = ({ heading, body }) => (
  <section className="ha-section">
    <div className="ha-wrap ha-cols">
      <h2>{heading}</h2>
      <div>
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
    <figure className="ha-figure">
      <img src={src} alt={alt ?? ''} loading="lazy" />
      {caption && <figcaption className="ha-wrap">{caption}</figcaption>}
    </figure>
  ) : null

const Features: BlockRenderer = ({ heading, items }) => (
  <section className="ha-section">
    <div className="ha-wrap">
      {heading && <h2 className="ha-h2">{heading}</h2>}
      <ol className="ha-specs">
        {(items ?? []).map((it: { title: string; description: string }, i: number) => (
          <li key={i}>
            <span className="ha-num">{String(i + 1).padStart(2, '0')}</span>
            <h3>{it.title}</h3>
            <p>{it.description}</p>
          </li>
        ))}
      </ol>
    </div>
  </section>
)

const ContactForm: BlockRenderer = ({ id, heading, description, submitLabel }) => (
  <section className="ha-section ha-contact" id={`lien-he-${id}`}>
    <div className="ha-wrap ha-cols">
      <div>
        {heading && <h2>{heading}</h2>}
        {description && <p>{description}</p>}
        <p className="hs-sent" id="da-gui" role="status">
          {t('contact.sent')}
        </p>
      </div>
      <form className="ha-form" method="post" action="/api/contact">
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
        <button className="ha-btn" type="submit">
          {submitLabel || 'Gửi'}
        </button>
      </form>
    </div>
  </section>
)

const Footer: BlockRenderer = ({ text, links }) => (
  <footer className="ha-footer">
    <div className="ha-wrap ha-cols">
      <small>{text}</small>
      <ul>
        {(links ?? []).map((l: { label: string; href: string }, i: number) => (
          <li key={i}>
            <a href={l.href}>{l.label}</a>
          </li>
        ))}
      </ul>
    </div>
  </footer>
)

export const theme: Theme = {
  manifest: manifest as ThemeManifest,
  css,
  renderers: { Hero, Text, Image, Features, ContactForm, Footer },
}

export default theme
