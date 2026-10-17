import { t } from '@hosso/studio-blocks'

import { currentLocale } from '@/lib/locale'
import { href } from '@/lib/site'
import React from 'react'

export default async function NotFound() {
  const locale = await currentLocale()
  return (
    <section className="ss-section ss-notfound">
      <div className="ss-wrap">
        <h1>404</h1>
        <h2>{t('notfound.title')}</h2>
        <p className="ss-muted">{t('notfound.text')}</p>
        <form className="ss-search" action={href('/tim-kiem', locale)} role="search">
          <input name="q" type="search" aria-label={t('search.label')} placeholder={t('search.placeholder')} />
          <button className="ss-btn" type="submit">
            {t('search.submit')}
          </button>
        </form>
        <a className="ss-btn" href={href('/', locale)}>
          {t('notfound.home')}
        </a>
      </div>
    </section>
  )
}
