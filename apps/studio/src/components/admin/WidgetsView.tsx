import hosso from '@hosso-config'
import type { AdminViewServerProps } from 'payload'
import React from 'react'

import { AREAS } from '@/globals/SiteAreas'
import { hasRole } from '@/lib/access'
import { WidgetsClient } from './WidgetsClient'

/** Màn Widget (như Giao diện → Widget của WordPress): thêm, sắp xếp bằng kéo thả và chỉnh widget trong từng vùng của site. */
export const WidgetsView = async ({ initPageResult, searchParams }: AdminViewServerProps) => {
  const { req } = initPageResult
  if (!hasRole(req.user as { roles?: string[] } | null, 'admin', 'publisher')) return <p style={{ padding: 24 }}>Chỉ quản trị viên và người xuất bản được sửa widget.</p>
  const wanted = String(Array.isArray(searchParams?.locale) ? searchParams?.locale[0] : (searchParams?.locale ?? ''))
  const locale = hosso.locales.some((l) => l.code === wanted) ? wanted : hosso.locales[0].code
  const areas = (await req.payload.findGlobal({ slug: 'site-areas', locale: locale as any, depth: 0 })) as Record<string, any>
  return (
    <WidgetsClient
      locale={locale}
      locales={hosso.locales.map((l) => ({ code: l.code, label: l.label }))}
      areas={AREAS.map((a) => ({ name: a.name, label: a.label, content: (areas[a.name]?.content ?? []) as { type: string; props: Record<string, unknown> }[] }))}
    />
  )
}
