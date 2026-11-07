import type { AdminViewServerProps } from 'payload'
import React from 'react'

import { AREAS } from '@/globals/SiteAreas'
import { hasRole } from '@/lib/access'
import { adminLang, makeT } from '@/lib/admin-i18n'
import { fontClassNames } from '@/lib/fonts'
import { getPayloadSiteLocales, isLocale } from '@/lib/locale'
import { loadSite } from '@/lib/site'
import { WidgetsClient } from './WidgetsClient'

/** Màn Widget (như Giao diện → Widget của WordPress): thêm, sắp xếp bằng kéo thả và chỉnh widget trong từng vùng của site. */
export const WidgetsView = async ({ initPageResult, searchParams }: AdminViewServerProps) => {
  const { req } = initPageResult
  if (!hasRole(req.user as { roles?: string[] } | null, 'admin', 'publisher')) return <p style={{ padding: 24 }}>{makeT(adminLang(req.i18n?.language))('Chỉ quản trị viên và người xuất bản được sửa widget.')}</p>
  const { locales: activeLocales, defaultLocale: activeDefault } = await getPayloadSiteLocales(req.payload, true)
  const wanted = String(Array.isArray(searchParams?.locale) ? searchParams?.locale[0] : (searchParams?.locale ?? ''))
  const locale = isLocale(wanted, activeLocales) ? wanted : activeDefault
  const areas = (await req.payload.findGlobal({ slug: 'site-areas', locale: locale as any, depth: 0 })) as Record<string, any>
  const { css, theme } = await loadSite(locale)
  return (
    <WidgetsClient
      locale={locale}
      defaultLocale={activeDefault}
      themeName={theme.manifest.name}
      css={css}
      fontClass={fontClassNames}
      locales={activeLocales.map((l) => ({ code: l.code, label: l.label }))}
      areas={AREAS.map((a) => ({ name: a.name, label: a.label, content: (areas[a.name]?.content ?? []) as { type: string; props: Record<string, unknown> }[] }))}
    />
  )
}
