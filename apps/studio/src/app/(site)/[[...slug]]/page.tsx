import { setLocale } from '@hosso/studio-blocks'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { defaultLocaleCode, splitLocale } from '@/lib/locale'
import { PageView, PostView, SearchView, TermView, pageMeta, postMeta, resolveRoute, searchMeta, termMeta, type SP } from '@/views'

export const dynamic = 'force-dynamic'

type Args = { params: Promise<{ slug?: string[] }>; searchParams: Promise<SP> }

async function parse(params: Args['params']) {
  const { locale, rest } = splitLocale((await params).slug ?? [])
  setLocale(locale, defaultLocaleCode)
  const route = resolveRoute(rest)
  if (!route) notFound()
  return { locale, route }
}

export async function generateMetadata({ params, searchParams }: Args): Promise<Metadata> {
  const { locale, route } = await parse(params)
  const sp = await searchParams
  switch (route.kind) {
    case 'page':
      return pageMeta(route.slug, locale, sp)
    case 'post':
      return postMeta(route.slug, locale, sp)
    case 'category':
    case 'tag':
      return termMeta(route.kind, route.slug, locale)
    case 'search':
      return searchMeta
  }
}

export default async function Page({ params, searchParams }: Args) {
  const { locale, route } = await parse(params)
  const sp = await searchParams
  switch (route.kind) {
    case 'page':
      return <PageView slug={route.slug} locale={locale} sp={sp} />
    case 'post':
      return <PostView slug={route.slug} locale={locale} sp={sp} />
    case 'category':
    case 'tag':
      return <TermView kind={route.kind} slug={route.slug} locale={locale} sp={sp} />
    case 'search':
      return <SearchView locale={locale} sp={sp} />
  }
}
