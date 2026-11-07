import config from '@payload-config'
import hosso from '@hosso-config'
import { cookies, headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { canContent } from '@/lib/content-permissions'
import { createLocalReq, getPayload } from 'payload'
import React from 'react'

import { AREAS } from '@/globals/SiteAreas'
import { canPublish, canEditPages, isAdmin } from '@/lib/access'
import { adminLang, makeT } from '@/lib/admin-i18n'
import { fontClassNames } from '@/lib/fonts'
import { getPayloadSiteLocales, isLocale } from '@/lib/locale'
import { href, loadSite } from '@/lib/site'
import { Editor } from './Editor'

export const dynamic = 'force-dynamic'
export async function generateMetadata() {
  return {
    title: makeT(adminLang((await cookies()).get('payload-lng')?.value))('Trình dựng trang'),
    icons: { icon: hosso.brand.favicon },
  }
}

type Kind = 'pages' | 'posts' | 'reusable-blocks' | 'area'
const KINDS: Kind[] = ['posts', 'reusable-blocks', 'area']

export default async function EditorPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ c?: string; locale?: string; v?: string; from?: string; block?: string; element?: string; device?: string }> }) {
  const { id } = await params
  const sp = await searchParams
  const collection: Kind = KINDS.includes(sp.c as Kind) ? (sp.c as Kind) : 'pages'

  const payload = await getPayload({ config })
  const [{ locales: activeLocales, defaultLocale: activeDefault }, { user }] = await Promise.all([
    getPayloadSiteLocales(payload, true),
    payload.auth({ headers: await headers() }),
  ])
  const locale = isLocale(sp.locale, activeLocales) ? sp.locale : activeDefault
  const q = new URLSearchParams()
  if (collection !== 'pages') q.set('c', collection)
  if (locale !== activeDefault) q.set('locale', locale)
  if (!user) redirect('/admin/login?redirect=' + encodeURIComponent(`/editor/${id}${q.size ? `?${q}` : ''}`))

  const site = await loadSite(locale, true)
  const lang = adminLang((await cookies()).get('payload-lng')?.value)
  const common = {
    userKey: String(user.id),
    lang,
    themeName: site.theme.manifest.name,
    css: site.css,
    chrome: site.chrome,
    fontClass: fontClassNames,
    canPublish: canPublish(user as { roles?: string[] }),
    canEditBrand: isAdmin(user as { roles?: string[] }),
    brandTheme: { name: site.theme.manifest.name, title: site.theme.manifest.title, tokens: site.theme.manifest.tokens },
    locale,
    defaultLocale: site.defaultLocale,
    locales: site.locales,
    mode: (sp.v === 'puck' ? 'puck' : 'canvas') as 'canvas' | 'puck',
    // chỉ nhận đường dẫn nội bộ làm nơi quay lại
    from: sp.from && /^\/(?!\/)/.test(sp.from) ? sp.from : undefined,
    initialSelection: sp.block ? { block: sp.block, el: sp.element ?? '' } : undefined,
    initialDevice: (sp.device === 'tablet' || sp.device === 'mobile' ? sp.device : 'desktop') as 'desktop' | 'tablet' | 'mobile',
  }

  if (collection === 'area') {
    const area = AREAS.find((a) => a.name === id)
    if (!area || !canEditPages(user)) notFound()
    const doc = (await payload.findGlobal({ slug: 'site-areas', draft: true, locale: locale as any, depth: 0, user, overrideAccess: false })) as Record<string, any>
    return <Editor {...common} revision={doc.updatedAt} collection="area" id={id} title={area.label} slug="" status={doc._status ?? 'published'} data={doc[id] ?? { content: [], root: { props: {} } }} publicHref={href('/', locale, site.defaultLocale)} />
  }

  const sharedAreas = (await payload.findGlobal({ slug: 'site-areas', draft: true, locale: locale as any, depth: 0 }).catch(() => ({}))) as Record<string, any>
  const chromeAreas = { header: sharedAreas.siteHeader?.content?.length ? sharedAreas.siteHeader : null, footer: sharedAreas.siteFooter?.content?.length ? sharedAreas.siteFooter : null }
  const doc = await payload.findByID({ collection, id, draft: true, locale: locale as any, user, overrideAccess: false }).catch(() => null)
  if (!doc) notFound()
  if (collection === 'pages' || collection === 'posts') {
    const req = await createLocalReq({ user }, payload)
    if (!(await canContent(req, collection, 'edit', doc))) redirect(`/admin/collections/${collection}/${doc.id}`)
    common.canPublish = await canContent(req, collection, 'publish', doc)
  }
  const publicHref =
    collection === 'posts'
      ? href(`/bai-viet/${doc.slug}`, locale, site.defaultLocale)
      : collection === 'reusable-blocks'
        ? href('/', locale, site.defaultLocale)
        : href(doc.slug === 'home' ? '/' : `/${doc.slug}`, locale, site.defaultLocale)
  return (
    <Editor
      {...common}
      collection={collection}
      revision={doc.updatedAt}
      id={String(doc.id)}
      title={doc.title}
      slug={doc.slug}
      status={doc._status ?? 'draft'}
      data={(doc.content as any) ?? { content: [], root: { props: {} } }}
      metadata={{ title: doc.title, slug: doc.slug, description: (doc as any).description, excerpt: (doc as any).excerpt, seo: (doc as any).seo }}
      publicHref={publicHref}
      chromeAreas={chromeAreas}
    />
  )
}
