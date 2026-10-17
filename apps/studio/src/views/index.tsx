import config from '@payload-config'
import hosso from '@hosso-config'
import { getLocale, setLocale, stripUnknown, t, type PageData } from '@hosso/studio-blocks'
import { Render } from '@puckeditor/core/rsc'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import React from 'react'

import { CommentForm } from '@/components/CommentForm'
import { PostList } from '@hosso/studio-blocks'
import { publishedPostsWhere } from '@/lib/core-loaders'
import { attachBlockData, defaultLocale, expandReusable, href, loadSite, mediaUrl, renderConfig } from '@/lib/site'

export type SP = { [k: string]: string | string[] | undefined }
export type Route =
  | { kind: 'page'; slug: string }
  | { kind: 'post'; slug: string }
  | { kind: 'category' | 'tag'; slug: string }
  | { kind: 'search' }

/** Phân giải các đoạn đường dẫn (đã bỏ tiền tố ngôn ngữ) thành loại nội dung. */
export function resolveRoute(rest: string[]): Route | null {
  if (rest.length === 0) return { kind: 'page', slug: 'home' }
  if (rest.length === 1 && rest[0] === 'tim-kiem') return { kind: 'search' }
  if (rest[0] === 'bai-viet') {
    if (rest.length === 2) return { kind: 'post', slug: rest[1] }
    if (rest.length === 3 && rest[1] === 'danh-muc') return { kind: 'category', slug: rest[2] }
    if (rest.length === 3 && rest[1] === 'the') return { kind: 'tag', slug: rest[2] }
    return null
  }
  return { kind: 'page', slug: rest.join('/') }
}

const dateFmt = (iso: string, locale: string) => new Date(iso).toLocaleDateString(locale === 'vi' ? 'vi-VN' : locale, { timeZone: 'Asia/Ho_Chi_Minh' })

// path: đường dẫn không có tiền tố ngôn ngữ; trả canonical của ngôn ngữ hiện tại và liên kết hreflang của mọi ngôn ngữ.
const alternates = (path: string, locale: string) => ({
  canonical: href(path, locale),
  languages: Object.fromEntries(hosso.locales.map((l) => [l.code, href(path, l.code)])),
})

/** Nội dung Puck → trang: bỏ block không biết, thay khối dùng lại, chạy loader, rồi Render. */
async function Content({ content, locale, sp }: { content: unknown; locale: string; sp: SP }) {
  const { theme } = await loadSite(locale)
  const puckConfig = renderConfig(theme)
  let data = stripUnknown((content ?? { content: [] }) as PageData, puckConfig)
  data = await expandReusable(data, locale)
  data = await attachBlockData(data, sp, locale)
  return <Render config={puckConfig as any} data={data as any} />
}

const previewUser = async (preview: string | undefined) => {
  const payload = await getPayload({ config })
  const { user } = preview ? await payload.auth({ headers: await headers() }) : { user: null }
  return { payload, user }
}

// ---------- Trang ----------
async function getPage(slug: string, locale: string, preview?: string) {
  const { payload, user } = await previewUser(preview)
  const { docs } = await payload.find({ collection: 'pages', where: { slug: { equals: slug } }, limit: 1, depth: 1, locale: locale as any, draft: Boolean(user), user, overrideAccess: false })
  return docs[0]
}

export async function pageMeta(slug: string, locale: string, sp: SP): Promise<Metadata> {
  const page = await getPage(slug, locale, sp.preview as string | undefined)
  if (!page) return {}
  const seo = (page.seo ?? {}) as { title?: string; image?: unknown; noindex?: boolean }
  const image = mediaUrl(seo.image)
  const title = seo.title || page.title
  const path = slug === 'home' ? '/' : `/${slug}`
  return {
    title: slug === 'home' ? { absolute: seo.title || (await loadSite(locale)).chrome.siteName } : title,
    description: page.description ?? undefined,
    robots: seo.noindex ? { index: false, follow: false } : undefined,
    alternates: alternates(path, locale),
    openGraph: { title, description: page.description ?? undefined, type: 'website', images: image ? [image] : undefined, locale: locale === 'vi' ? 'vi_VN' : locale },
  }
}

export async function PageView({ slug, locale, sp }: { slug: string; locale: string; sp: SP }) {
  const page = await getPage(slug, locale, sp.preview as string | undefined)
  if (!page) notFound()
  return <Content content={page.content} locale={locale} sp={sp} />
}

// ---------- Bài viết ----------
async function getPost(slug: string, locale: string, preview?: string) {
  const { payload, user } = await previewUser(preview)
  const { docs } = await payload.find({ collection: 'posts', where: { slug: { equals: slug } }, limit: 1, depth: 1, locale: locale as any, draft: Boolean(user), user, overrideAccess: false })
  return docs[0]
}

export async function postMeta(slug: string, locale: string, sp: SP): Promise<Metadata> {
  const post = await getPost(slug, locale, sp.preview as string | undefined)
  if (!post) return {}
  const seo = (post.seo ?? {}) as { title?: string; image?: unknown; noindex?: boolean }
  const image = mediaUrl(seo.image) ?? mediaUrl(post.cover)
  const title = seo.title || post.title
  return {
    title,
    description: post.excerpt ?? undefined,
    robots: seo.noindex ? { index: false, follow: false } : undefined,
    alternates: alternates(`/bai-viet/${post.slug}`, locale),
    openGraph: { title, description: post.excerpt ?? undefined, type: 'article', publishedTime: post.publishedAt ?? undefined, images: image ? [image] : undefined },
  }
}

export async function PostView({ slug, locale, sp }: { slug: string; locale: string; sp: SP }) {
  const post = await getPost(slug, locale, sp.preview as string | undefined)
  if (!post) notFound()
  const payload = await getPayload({ config })
  const settings = (await payload.findGlobal({ slug: 'site-settings', depth: 0 })) as Record<string, any>
  const commentsOn = settings.commentsEnabled !== false && post.commentsEnabled !== false
  const comments = commentsOn
    ? (await payload.find({ collection: 'comments', where: { and: [{ post: { equals: post.id } }, { status: { equals: 'approved' } }] }, sort: 'createdAt', limit: 100, depth: 0, overrideAccess: true })).docs
    : []
  const cover = mediaUrl(post.cover)
  const terms = (list: unknown, kind: 'danh-muc' | 'the') =>
    ((list ?? []) as { name?: string; slug?: string }[]).filter((x) => typeof x === 'object' && x?.slug).map((x) => ({ name: x.name ?? x.slug!, href: href(`/bai-viet/${kind}/${x.slug}`, locale) }))
  const cats = terms(post.categories, 'danh-muc')
  const tags = terms(post.tags, 'the')

  return (
    <article>
      <header className="ss-wrap ss-article-head">
        <h1>{post.title}</h1>
        {post.publishedAt && <time dateTime={post.publishedAt}>{dateFmt(post.publishedAt, locale)}</time>}
        {!!cats.length && (
          <ul className="ss-chips" aria-label={t('post.categories')}>
            {cats.map((c) => (
              <li key={c.href}>
                <a href={c.href}>{c.name}</a>
              </li>
            ))}
          </ul>
        )}
        {cover && <img className="ss-cover" src={cover} alt="" />}
      </header>
      <Content content={post.content} locale={locale} sp={sp} />
      {!!tags.length && (
        <div className="ss-wrap">
          <ul className="ss-chips" aria-label={t('post.tags')}>
            {tags.map((c) => (
              <li key={c.href}>
                <a href={c.href}>#{c.name}</a>
              </li>
            ))}
          </ul>
        </div>
      )}
      {commentsOn && (
        <section className="ss-wrap ss-comments" id="comments" aria-label={t('comments.title')}>
          <h2>
            {t('comments.title')} ({comments.length})
          </h2>
          {comments.length === 0 && <p className="ss-muted">{t('comments.none')}</p>}
          {comments.map((c) => (
            <div key={c.id} className="ss-comment">
              <strong>{c.authorName}</strong> <time dateTime={c.createdAt}>{dateFmt(c.createdAt, locale)}</time>
              <p>{c.content}</p>
            </div>
          ))}
          <h3>{t('comments.leave')}</h3>
          <CommentForm postId={String(post.id)} />
        </section>
      )}
    </article>
  )
}

// ---------- Chuyên mục / thẻ ----------
async function getTerm(kind: 'category' | 'tag', slug: string, locale: string) {
  const payload = await getPayload({ config })
  const res = await payload.find({ collection: kind === 'category' ? 'post-categories' : 'post-tags', where: { slug: { equals: slug } }, limit: 1, depth: 0, locale: locale as any, overrideAccess: true })
  return res.docs[0]
}

export async function termMeta(kind: 'category' | 'tag', slug: string, locale: string): Promise<Metadata> {
  const term = await getTerm(kind, slug, locale)
  return term ? { title: term.name, description: term.description ?? undefined, alternates: alternates(`/bai-viet/${kind === 'category' ? 'danh-muc' : 'the'}/${slug}`, locale) } : {}
}

export async function TermView({ kind, slug, locale, sp }: { kind: 'category' | 'tag'; slug: string; locale: string; sp: SP }) {
  const term = await getTerm(kind, slug, locale)
  if (!term) notFound()
  const payload = await getPayload({ config })
  const page = Math.max(1, Number(Array.isArray(sp.page) ? sp.page[0] : sp.page) || 1)
  const where = await publishedPostsWhere(payload, kind === 'category' ? { category: slug } : { tag: slug })
  const res = where ? await payload.find({ collection: 'posts', where, sort: '-publishedAt', limit: 9, page, depth: 1, locale: locale as any, overrideAccess: true }) : null
  const data = {
    status: 'ok' as const,
    page: res?.page ?? 1,
    pages: res?.totalPages ?? 1,
    items: (res?.docs ?? []).map((p) => ({ title: p.title, slug: p.slug, href: href(`/bai-viet/${p.slug}`, locale), excerpt: p.excerpt ?? undefined, cover: mediaUrl(p.cover), publishedAt: p.publishedAt ?? undefined })),
  }
  const Block = PostList as React.ComponentType<any>
  return (
    <>
      <header className="ss-wrap ss-article-head">
        <p className="ss-muted">{kind === 'category' ? t('post.byCategory') : t('post.byTag')}</p>
        <h1>{term.name}</h1>
        {term.description && <p className="ss-muted">{term.description}</p>}
      </header>
      <Block id="term" heading="" data={data} />
    </>
  )
}

// ---------- Tìm kiếm ----------
type Result = { title: string; href: string; description?: string }

export const searchMeta: Metadata = { robots: { index: false } }

export async function SearchView({ locale, sp }: { locale: string; sp: SP }) {
  const q = String(Array.isArray(sp.q) ? sp.q[0] : (sp.q ?? '')).trim().slice(0, 100)
  const payload = await getPayload({ config })
  let pages: Result[] = []
  let posts: Result[] = []
  const extra: { id: string; results: Result[] }[] = []
  if (q) {
    const published = { _status: { equals: 'published' } }
    const [p, b] = await Promise.all([
      payload.find({ collection: 'pages', where: { and: [published, { or: [{ title: { like: q } }, { description: { like: q } }] }] }, limit: 10, depth: 0, locale: locale as any, overrideAccess: true }),
      payload.find({ collection: 'posts', where: { and: [published, { or: [{ title: { like: q } }, { excerpt: { like: q } }] }] }, limit: 10, depth: 0, locale: locale as any, overrideAccess: true }),
    ])
    pages = p.docs.map((d) => ({ title: d.title, href: href(d.slug === 'home' ? '/' : `/${d.slug}`, locale), description: d.description ?? undefined }))
    posts = b.docs.map((d) => ({ title: d.title, href: href(`/bai-viet/${d.slug}`, locale), description: d.excerpt ?? undefined }))
    for (const plugin of hosso.plugins) {
      if (plugin.search) extra.push({ id: plugin.id, results: (await plugin.search(q, payload).catch(() => [])).map((r) => ({ ...r, href: href(r.href, locale) })) })
    }
  }
  const total = pages.length + posts.length + extra.reduce((n, p) => n + p.results.length, 0)
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
        <form className="ss-search" action={href('/tim-kiem', locale)} role="search">
          <label htmlFor="ss-q" style={{ position: 'absolute', left: -999 }}>
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
        {extra.map((p) => (
          <List key={p.id} title={t('search.products')} items={p.results} />
        ))}
      </div>
    </section>
  )
}

export { defaultLocale, getLocale, setLocale }
