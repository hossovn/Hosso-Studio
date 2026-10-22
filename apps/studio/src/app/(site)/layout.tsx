import hosso from '@hosso-config'
import '@hosso/studio-blocks/swiper.css'
import { LocaleProvider, t } from '@hosso/studio-blocks'
import config from '@payload-config'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { getPayload } from 'payload'
import React from 'react'

import { Area, loadArea } from '@/components/Area'
import { ContactFloat } from '@/components/ContactFloat'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { isAdmin } from '@/lib/access'
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

const visitorIsAdmin = async () => {
  const h = await headers()
  if (!/payload-token=/.test(h.get('cookie') ?? '')) return false
  const { user } = await (await getPayload({ config })).auth({ headers: h })
  return isAdmin(user as { roles?: string[] } | null)
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const locale = await currentLocale()
  const { css, theme, chrome, maintenance } = await loadSite(locale)
  if (maintenance && !(await visitorIsAdmin())) {
    return (
      <html lang={locale}>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta name="robots" content="noindex" />
        </head>
        <body style={{ margin: 0, minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center', font: '16px/1.6 system-ui, sans-serif', color: '#111827' }}>
          <main>
            <h1 style={{ margin: '0 0 12px', fontSize: 28 }}>{chrome.siteName}</h1>
            <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{maintenance.message || (locale === 'vi' ? 'Website đang được bảo trì. Vui lòng quay lại sau.' : 'This site is under maintenance. Please check back soon.')}</p>
          </main>
        </body>
      </html>
    )
  }
  const Header = theme.layout?.Header
  const Footer = theme.layout?.Footer
  // Header/footer tự dựng trong editor (vùng siteHeader/siteFooter) thay cho của theme khi có nội dung.
  const [customHeader, customFooter] = await Promise.all([loadArea('siteHeader', locale), loadArea('siteFooter', locale)])
  const slots = [
    hosso.locales.length > 1 ? <LanguageSwitcher key="lang" locales={hosso.locales} /> : null,
    ...hosso.plugins.map((p, i) => (p.headerSlot ? React.createElement(p.headerSlot, { key: i }) : null)),
  ].filter(Boolean)
  return (
    <html lang={locale} className={fontClassNames}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{css}</style>
        {/* Chỉ trong khung xem trước của trang Tùy biến giao diện (admin cùng origin): nhận biến --hs-* để đổi màu/font tức thì. */}
        <script
          dangerouslySetInnerHTML={{
            __html: "if(window.parent!==window)addEventListener('message',function(e){var v=e.origin===location.origin&&e.data&&e.data.hossoVars;if(v)for(var k in v)if(k.indexOf('--hs-')===0)document.documentElement.style.setProperty(k,String(v[k]))})",
          }}
        />
      </head>
      <body style={{ margin: 0 }}>
        <LocaleProvider locale={locale} defaultLocale={defaultLocaleCode}>
          <div className="hs-theme">
            <a className="hs-skip" href="#main">
              {t('nav.skip')}
            </a>
            <Area name="beforeHeader" locale={locale} />
            {customHeader ? (
              <header className="site-chrome-header" style={{ position: 'relative', zIndex: 40 }}>
                <Area name="siteHeader" locale={locale} />
                {slots.length ? <div style={{ position: 'absolute', top: 12, right: 16, display: 'flex', gap: 12, alignItems: 'center', zIndex: 20 }}>{slots}</div> : null}
              </header>
            ) : (
              Header && <Header chrome={chrome} actions={slots.length ? slots : undefined} />
            )}
            <Area name="afterHeader" locale={locale} />
            <main id="main">{children}</main>
            <Area name="beforeFooter" locale={locale} />
            {customFooter ? (
              <>
                <footer className="site-chrome-footer"><Area name="siteFooter" locale={locale} /></footer>
                <ContactFloat contact={chrome.contact} />
              </>
            ) : Footer && <Footer chrome={chrome} />}
            <Area name="afterFooter" locale={locale} />
          </div>
        </LocaleProvider>
      </body>
    </html>
  )
}
