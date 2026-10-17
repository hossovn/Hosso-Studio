import hosso from '@hosso-config'
import { LocaleProvider, t } from '@hosso/studio-blocks'
import type { Metadata } from 'next'
import React from 'react'

import { Area } from '@/components/Area'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { fontClassNames } from '@/lib/fonts'
import { currentLocale, defaultLocaleCode } from '@/lib/locale'
import { loadSite } from '@/lib/site'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await currentLocale()
  const { chrome, favicon } = await loadSite(locale)
  const base = process.env.HOSSO_PUBLIC_URL
  return {
    metadataBase: base ? new URL(base) : undefined,
    title: { default: chrome.siteName, template: `%s | ${chrome.siteName}` },
    icons: { icon: favicon },
    openGraph: { siteName: chrome.siteName, locale: locale === 'vi' ? 'vi_VN' : locale },
  }
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const locale = await currentLocale()
  const { css, theme, chrome } = await loadSite(locale)
  const Header = theme.layout?.Header
  const Footer = theme.layout?.Footer
  const slots = [
    hosso.locales.length > 1 ? <LanguageSwitcher key="lang" locales={hosso.locales} /> : null,
    ...hosso.plugins.map((p, i) => (p.headerSlot ? React.createElement(p.headerSlot, { key: i }) : null)),
  ].filter(Boolean)
  return (
    <html lang={locale} className={fontClassNames}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{css}</style>
      </head>
      <body style={{ margin: 0 }}>
        <LocaleProvider locale={locale} defaultLocale={defaultLocaleCode}>
          <div className="hs-theme">
            <a className="hs-skip" href="#main">
              {t('nav.skip')}
            </a>
            <Area name="beforeHeader" locale={locale} />
            {Header && <Header chrome={chrome} actions={slots.length ? slots : undefined} />}
            <Area name="afterHeader" locale={locale} />
            <main id="main">{children}</main>
            <Area name="beforeFooter" locale={locale} />
            {Footer && <Footer chrome={chrome} />}
            <Area name="afterFooter" locale={locale} />
          </div>
        </LocaleProvider>
      </body>
    </html>
  )
}
