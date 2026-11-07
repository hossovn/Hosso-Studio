import React from 'react'
import type { AdminViewServerProps } from 'payload'
import { Gutter } from '@payloadcms/ui'
import { hasRole } from '@/lib/access'
import { getPayloadSiteLocales } from '@/lib/locale'
import { ContentImportClient } from './ContentImportClient'
import { ContentWorkspace } from './ContentWorkspace'

export async function ContentWorkspaceView({ initPageResult, searchParams }: AdminViewServerProps) {
  const user = initPageResult.req.user
  if (!hasRole(user, 'admin', 'publisher', 'editor', 'author')) return <Gutter><h1>Không có quyền truy cập</h1></Gutter>
  if (searchParams?.kind === 'import') {
    const { locales: activeLocales } = await getPayloadSiteLocales(initPageResult.req.payload, true)
    return <Gutter className="ha-workspace"><ContentImportClient locales={activeLocales.map((l) => ({ code: l.code, label: l.label }))} canEditPages={hasRole(user, 'admin', 'publisher', 'editor')} /></Gutter>
  }
  const kind = String(searchParams?.kind || 'pages')
  const initialKind = ['pages', 'posts', 'media', 'workflow', 'content-entries'].includes(kind) ? kind : 'pages'
  return <Gutter className="ha-workspace"><ContentWorkspace canEditPages={hasRole(user, 'admin', 'publisher', 'editor')} userId={String(user!.id)} initialKind={hasRole(user, 'admin', 'publisher', 'editor') ? initialKind : ['media', 'workflow'].includes(initialKind) ? initialKind : 'posts'} /></Gutter>
}
