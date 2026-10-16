import { t } from '@hosso/studio-blocks'
import React from 'react'

export default function NotFound() {
  return (
    <section className="ss-section ss-notfound">
      <div className="ss-wrap">
        <h1>404</h1>
        <h2>{t('notfound.title')}</h2>
        <p className="ss-muted">{t('notfound.text')}</p>
        <form className="ss-search" action="/tim-kiem" role="search">
          <input name="q" type="search" aria-label={t('search.label')} placeholder={t('search.placeholder')} />
          <button className="ss-btn" type="submit">
            {t('search.submit')}
          </button>
        </form>
        <a className="ss-btn" href="/">
          {t('notfound.home')}
        </a>
      </div>
    </section>
  )
}
