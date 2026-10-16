import hosso from '@hosso-config'
import { t } from '@hosso/studio-blocks'
import React from 'react'

import { fontClassNames } from '@/lib/fonts'
import { loadSite } from '@/lib/site'

export const dynamic = 'force-dynamic'

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const { css } = await loadSite()
  return (
    <html lang="vi" className={fontClassNames}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/svg+xml" href={hosso.brand.favicon} />
        <style>{css}</style>
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
