import React from 'react'
import { Gutter } from '@payloadcms/ui'
import type { AdminViewServerProps } from 'payload'
import { canEditPages } from '@/lib/access'
import { adminLang } from '@/lib/admin-i18n'
import { ReleasesClient } from './ReleasesClient'

export async function ReleasesView({ initPageResult, searchParams }: AdminViewServerProps) {
  const { req } = initPageResult
  if (!canEditPages(req.user)) return <Gutter><p>Forbidden</p></Gutter>
  return <Gutter><ReleasesClient lang={adminLang(req.i18n?.language)} initialKey={typeof searchParams?.select === 'string' ? searchParams.select : undefined} /></Gutter>
}
