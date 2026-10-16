import config from '@payload-config'
import { stripUnknown, type PageData } from '@hosso/studio-blocks'
import { Render } from '@puckeditor/core/rsc'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import React from 'react'

import { attachBlockData, loadSite, mediaUrl, renderConfig } from '@/lib/site'

export const dynamic = 'force-dynamic'

type Args = {
  params: Promise<{ slug?: string[] }>
  searchParams: Promise<{ preview?: string; [k: string]: string | string[] | undefined }>
}

async function getPage(slug?: string[], preview?: string) {
  const payload = await getPayload({ config })
  // ?preview=1: người đã đăng nhập xem bản nháp mới nhất; khách luôn chỉ thấy bản đã xuất bản.
  const { user } = preview ? await payload.auth({ headers: await headers() }) : { user: null }
  const { docs } = await payload.find({
    collection: 'pages',
    where: { slug: { equals: slug?.join('/') || 'home' } },
    limit: 1,
    draft: Boolean(user),
    user,
    depth: 1,
    overrideAccess: false,
  })
  return docs[0]
}

export async function generateMetadata({ params, searchParams }: Args): Promise<Metadata> {
  const page = await getPage((await params).slug, (await searchParams).preview as string | undefined)
  if (!page) return {}
  const seo = (page.seo ?? {}) as { title?: string; image?: unknown; noindex?: boolean }
  const image = mediaUrl(seo.image)
  const title = seo.title || page.title
  return {
    title: page.slug === 'home' ? { absolute: seo.title || (await loadSite()).chrome.siteName } : title,
    description: page.description ?? undefined,
    robots: seo.noindex ? { index: false, follow: false } : undefined,
    alternates: { canonical: page.slug === 'home' ? '/' : `/${page.slug}` },
    openGraph: { title, description: page.description ?? undefined, type: 'website', images: image ? [image] : undefined },
  }
}

export default async function Page({ params, searchParams }: Args) {
  const page = await getPage((await params).slug, (await searchParams).preview as string | undefined)
  if (!page) notFound()
  const { theme } = await loadSite()
  const puckConfig = renderConfig(theme)
  const data = await attachBlockData(
    stripUnknown((page.content ?? { content: [] }) as unknown as PageData, puckConfig),
    await searchParams,
  )
  return <Render config={puckConfig as any} data={data as any} />
}
