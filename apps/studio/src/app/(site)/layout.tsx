import { t } from '@hosso/studio-blocks'
import { Be_Vietnam_Pro } from 'next/font/google'
import React from 'react'

import { activeTheme, tokenCss } from '@/lib/site'

const font = Be_Vietnam_Pro({
  subsets: ['vietnamese', 'latin'],
  weight: ['400', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
})

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const theme = activeTheme()
  return (
    <html lang="vi" className={font.variable}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{tokenCss(theme) + theme.css}</style>
      </head>
      <body style={{ margin: 0 }}>
        <div className="hs-theme">
          <a className="hs-skip" href="#main">
            {t('nav.skip')}
          </a>
          <main id="main">{children}</main>
        </div>
      </body>
    </html>
  )
}
