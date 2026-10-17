import config from '@payload-config'
import hosso from '@hosso-config'
import { cookies, headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { getPayload } from 'payload'
import React from 'react'

import { AREAS } from '@/globals/SiteAreas'
import { canPublish, hasRole } from '@/lib/access'
import { adminLang, makeT } from '@/lib/admin-i18n'
import { fontClassNames } from '@/lib/fonts'
import { defaultLocaleCode, isLocale } from '@/lib/locale'
import { href, loadSite } from '@/lib/site'
import { Editor } from './Editor'

export const dynamic = 'force-dynamic'
export async function generateMetadata() {
  return { title: makeT(adminLang((await cookies()).get('payload-lng')?.value))('Trình dựng trang') }
}

type Kind = 'pages' | 'posts' | 'reusable-blocks' | 'area'
const KINDS: Kind[] = ['posts', 'reusable-blocks', 'area']

export default async function EditorPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ c?: string; locale?: string }> }) {
  const { id } = await params
  const sp = await searchParams
  const collection: Kind = KINDS.includes(sp.c as Kind) ? (sp.c as Kind) : 'pages'
  const locale = isLocale(sp.locale) ? sp.locale : defaultLocaleCode

  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  const q = new URLSearchParams()
  if (collection !== 'pages') q.set('c', collection)
  if (locale !== defaultLocaleCode) q.set('locale', locale)
  if (!user) redirect('/admin/login?redirect=' + encodeURIComponent(`/editor/${id}${q.size ? `?${q}` : ''}`))

  const site = await loadSite(locale)
  const lang = adminLang((await cookies()).get('payload-lng')?.value)
  const common = {
    lang,
    themeName: site.theme.manifest.name,
    css: site.css,
    chrome: site.chrome,
    fontClass: fontClassNames,
    canPublish: canPublish(user as { roles?: string[] }),
    locale,
    defaultLocale: defaultLocaleCode,
    locales: hosso.locales,
  }

  if (collection === 'area') {
    const area = AREAS.find((a) => a.name === id)
    if (!area || !hasRole(user as { roles?: string[] }, 'admin', 'publisher')) notFound()
    const doc = (await payload.findGlobal({ slug: 'site-areas', locale: locale as any, depth: 0 })) as Record<string, any>
    return <Editor {...common} collection="area" id={id} title={area.label} slug="" status="published" data={doc[id] ?? { content: [], root: { props: {} } }} publicHref={href('/', locale)} />
  }

  const doc = await payload.findByID({ collection, id, draft: true, locale: locale as any, user, overrideAccess: false }).catch(() => null)
  if (!doc) notFound()
  const publicHref =
    collection === 'posts' ? href(`/bai-viet/${doc.slug}`, locale) : collection === 'reusable-blocks' ? href('/', locale) : href(doc.slug === 'home' ? '/' : `/${doc.slug}`, locale)
  return (
    <Editor
      {...common}
      collection={collection}
      id={String(doc.id)}
      title={doc.title}
      slug={doc.slug}
      status={doc._status ?? 'draft'}
      data={(doc.content as any) ?? { content: [], root: { props: {} } }}
      publicHref={publicHref}
    />
  )
}
