import hosso from '@hosso-config'
import { FONTS } from '@hosso/studio-blocks'
import type { AdminViewServerProps } from 'payload'
import React from 'react'

import { hasRole } from '@/lib/access'
import { CustomizeClient } from './CustomizeClient'

/** Tùy biến giao diện (như Customizer của WordPress): chỉnh màu/font/bo góc và thấy ngay trên site thật, rồi lưu. Chỉ admin. */
export const CustomizeView = async ({ initPageResult }: AdminViewServerProps) => {
  const { req } = initPageResult
  if (!hasRole(req.user as { roles?: string[] } | null, 'admin')) return <p style={{ padding: 24 }}>Chỉ quản trị viên được tùy biến giao diện.</p>
  const settings = (await req.payload.findGlobal({ slug: 'site-settings', depth: 0 })) as Record<string, any>
  const themes = hosso.themes.map((t) => ({
    name: t.manifest.name,
    title: t.manifest.title,
    colors: t.manifest.tokens.colors as Record<string, string>,
    fonts: t.manifest.tokens.fonts as { body: string; heading: string },
    radius: t.manifest.tokens.radius,
    spacing: t.manifest.tokens.spacing,
  }))
  const overrides = Object.fromEntries(hosso.themes.map((t) => [t.manifest.name, settings[`tokens_${t.manifest.name}`] ?? {}]))
  return <CustomizeClient themes={themes} current={settings.theme || themes[0].name} overrides={overrides} fonts={FONTS} />
}
