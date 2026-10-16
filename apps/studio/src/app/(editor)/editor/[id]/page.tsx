import config from '@payload-config'
import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { getPayload } from 'payload'
import React from 'react'

import { fontClassNames } from '@/lib/fonts'
import { loadSite } from '@/lib/site'
import { Editor } from './Editor'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Trình dựng trang' }

export default async function EditorPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ c?: string }> }) {
  const { id } = await params
  const collection = (await searchParams).c === 'posts' ? 'posts' : 'pages'
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) redirect('/admin/login?redirect=' + encodeURIComponent(`/editor/${id}${collection === 'posts' ? '?c=posts' : ''}`))

  const page = await payload
    .findByID({ collection, id, draft: true, user, overrideAccess: false })
    .catch(() => null)
  if (!page) notFound()

  const site = await loadSite()
  return (
    <Editor
      collection={collection}
      publicHref={collection === 'posts' ? `/bai-viet/${page.slug}` : page.slug === 'home' ? '/' : `/${page.slug}`}
      id={String(page.id)}
      title={page.title}
      slug={page.slug}
      status={page._status ?? 'draft'}
      data={(page.content as any) ?? { content: [], root: { props: {} } }}
      themeName={site.theme.manifest.name}
      css={site.css}
      chrome={site.chrome}
      fontClass={fontClassNames}
      canPublish={Boolean((user as { roles?: string[] }).roles?.includes('admin'))}
    />
  )
}
