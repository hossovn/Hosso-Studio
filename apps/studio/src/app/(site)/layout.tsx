import hosso from '@hosso-config'
import { t } from '@hosso/studio-blocks'
import React from 'react'

import { fontClassNames } from '@/lib/fonts'
import { loadSite } from '@/lib/site'

export const dynamic = 'force-dynamic'

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const { css, theme, chrome, favicon } = await loadSite()
  const Header = theme.layout?.Header
  const Footer = theme.layout?.Footer
  const slots = hosso.plugins.map((p, i) => (p.headerSlot ? React.createElement(p.headerSlot, { key: i }) : null)).filter(Boolean)
  return (
    <html lang="vi" className={fontClassNames}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href={favicon} />
        <style>{css}</style>
      </head>
      <body style={{ margin: 0 }}>
        <div className="hs-theme">
          <a className="hs-skip" href="#main">
            {t('nav.skip')}
          </a>
          {Header && <Header chrome={chrome} actions={slots.length ? slots : undefined} />}
          <main id="main">{children}</main>
          {Footer && <Footer chrome={chrome} />}
        </div>
      </body>
    </html>
  )
}
