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

type Args = { params: Promise<{ slug: string }>; searchParams: Promise<{ preview?: string; [k: string]: string | string[] | undefined }> }

async function getPost(slug: string, preview?: string) {
  const payload = await getPayload({ config })
  const { user } = preview ? await payload.auth({ headers: await headers() }) : { user: null }
  const { docs } = await payload.find({ collection: 'posts', where: { slug: { equals: slug } }, limit: 1, depth: 1, draft: Boolean(user), user, overrideAccess: false })
  return docs[0]
}

export async function generateMetadata({ params, searchParams }: Args): Promise<Metadata> {
  const post = await getPost((await params).slug, (await searchParams).preview as string | undefined)
  if (!post) return {}
  const seo = (post.seo ?? {}) as { title?: string; image?: unknown; noindex?: boolean }
  const image = mediaUrl(seo.image) ?? mediaUrl(post.cover)
  const title = seo.title || post.title
  return {
    title,
    description: post.excerpt ?? undefined,
    robots: seo.noindex ? { index: false, follow: false } : undefined,
    alternates: { canonical: `/bai-viet/${post.slug}` },
    openGraph: { title, description: post.excerpt ?? undefined, type: 'article', publishedTime: post.publishedAt ?? undefined, images: image ? [image] : undefined },
  }
}

export default async function PostPage({ params, searchParams }: Args) {
  const sp = await searchParams
  const post = await getPost((await params).slug, sp.preview as string | undefined)
  if (!post) notFound()
  const { theme } = await loadSite()
  const puckConfig = renderConfig(theme)
  const data = await attachBlockData(stripUnknown((post.content ?? { content: [] }) as unknown as PageData, puckConfig), sp)
  const cover = mediaUrl(post.cover)
  return (
    <article>
      <header className="ss-wrap ss-article-head">
        <h1>{post.title}</h1>
        {post.publishedAt && <time dateTime={post.publishedAt}>{new Date(post.publishedAt).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</time>}
        {cover && <img className="ss-cover" src={cover} alt="" />}
      </header>
      <Render config={puckConfig as any} data={data as any} />
    </article>
  )
}
