import config from '@payload-config'
import type { PageData } from '@hosso/studio-blocks'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import React from 'react'

import { RenderPage, activeTheme } from '@/lib/site'

export const dynamic = 'force-dynamic'

type Args = { params: Promise<{ slug?: string[] }> }

async function getPage(slug?: string[]) {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'pages',
    where: { slug: { equals: slug?.join('/') || 'home' } },
    limit: 1,
    overrideAccess: false, // khách chỉ thấy bản đã xuất bản
  })
  return docs[0]
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const page = await getPage((await params).slug)
  return page ? { title: page.title, description: page.description ?? undefined } : {}
}

export default async function Page({ params }: Args) {
  const page = await getPage((await params).slug)
  if (!page) notFound()
  return <RenderPage data={page.content as unknown as PageData} theme={activeTheme()} />
}
