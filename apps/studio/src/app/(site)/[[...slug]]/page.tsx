import config from '@payload-config'
import { stripUnknown, type PageData } from '@hosso/studio-blocks'
import { Render } from '@puckeditor/core/rsc'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import React from 'react'

import { attachBlockData, loadSite, renderConfig } from '@/lib/site'

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
    overrideAccess: false,
  })
  return docs[0]
}

export async function generateMetadata({ params, searchParams }: Args): Promise<Metadata> {
  const page = await getPage((await params).slug, (await searchParams).preview as string | undefined)
  return page ? { title: page.title, description: page.description ?? undefined } : {}
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
