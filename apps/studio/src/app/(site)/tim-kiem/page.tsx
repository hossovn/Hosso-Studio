import config from '@payload-config'
import hosso from '@hosso-config'
import { t } from '@hosso/studio-blocks'
import type { Metadata } from 'next'
import { getPayload } from 'payload'
import React from 'react'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Tìm kiếm', robots: { index: false } }

type Result = { title: string; href: string; description?: string }

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? '').trim().slice(0, 100)
  const payload = await getPayload({ config })

  let pages: Result[] = []
  let posts: Result[] = []
  const plugins: { id: string; results: Result[] }[] = []
  if (q) {
    const published = { _status: { equals: 'published' } }
    const [p, b] = await Promise.all([
      payload.find({ collection: 'pages', where: { and: [published, { or: [{ title: { like: q } }, { description: { like: q } }] }] }, limit: 10, depth: 0, overrideAccess: true }),
      payload.find({ collection: 'posts', where: { and: [published, { or: [{ title: { like: q } }, { excerpt: { like: q } }] }] }, limit: 10, depth: 0, overrideAccess: true }),
    ])
    pages = p.docs.map((d) => ({ title: d.title, href: d.slug === 'home' ? '/' : `/${d.slug}`, description: d.description ?? undefined }))
    posts = b.docs.map((d) => ({ title: d.title, href: `/bai-viet/${d.slug}`, description: d.excerpt ?? undefined }))
    for (const plugin of hosso.plugins) {
      if (plugin.search) plugins.push({ id: plugin.id, results: await plugin.search(q, payload).catch(() => []) })
    }
  }
  const total = pages.length + posts.length + plugins.reduce((n, p) => n + p.results.length, 0)

  const List = ({ title, items }: { title: string; items: Result[] }) =>
    items.length ? (
      <>
        <h2>{title}</h2>
        <ul className="ss-results">
          {items.map((r, i) => (
            <li key={i}>
              <a href={r.href}>{r.title}</a>
              {r.description && <p>{r.description}</p>}
            </li>
          ))}
        </ul>
      </>
    ) : null

  return (
    <section className="ss-section">
      <div className="ss-wrap">
        <h1>{t('search.title')}</h1>
        <form className="ss-search" action="/tim-kiem" role="search">
          <label className="sr-only" htmlFor="ss-q" style={{ position: 'absolute', left: -999 }}>
            {t('search.label')}
          </label>
          <input id="ss-q" name="q" type="search" defaultValue={q} placeholder={t('search.placeholder')} />
          <button className="ss-btn" type="submit">
            {t('search.submit')}
          </button>
        </form>
        {q && total === 0 && <p className="ss-muted">{t('search.empty')}</p>}
        <List title={t('search.pages')} items={pages} />
        <List title={t('search.posts')} items={posts} />
        {plugins.map((p) => (
          <List key={p.id} title={t('search.products')} items={p.results} />
        ))}
      </div>
    </section>
  )
}
