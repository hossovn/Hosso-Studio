import hosso from '@hosso-config'
import { checkLicense } from '@hosso/studio-blocks'
import { Gutter } from '@payloadcms/ui'
import type { AdminViewServerProps } from 'payload'
import React from 'react'

import { hasRole } from '@/lib/access'
import { adminLang, makeT } from '@/lib/admin-i18n'
import { pluginAdminLinks } from '@/lib/admin-plugins'
import { PluginsClient } from './PluginsClient'

/** Trang Plugin: các plugin đã cài, đang bật hay tắt, phiên bản và liên kết tới trang cài đặt. Chỉ admin. */
export const PluginsView = async ({ initPageResult }: AdminViewServerProps) => {
  const user = initPageResult.req.user as { roles?: string[] } | null
  const lang = adminLang(initPageResult.req.i18n?.language)
  const T = makeT(lang)
  if (!hasRole(user, 'admin'))
    return (
      <Gutter>
        <h1>{T('Tiện ích')}</h1>
        <p>{T('Chỉ quản trị viên được dùng trang này.')}</p>
      </Gutter>
    )
  const enabled = new Set(hosso.plugins.map((p) => p.id))
  // Plugin thương mại: hiện tình trạng giấy phép (HOSSO_LICENSE_KEY).
  const licenses = Object.fromEntries(await Promise.all(hosso.installedPlugins.filter((p) => p.manifest?.commercial).map(async (p) => [p.id, await checkLicense(p.id)] as const)))
  const plugins = hosso.installedPlugins.map((plugin) => {
    const license = licenses[plugin.id]
    return {
      id: plugin.id,
      name: plugin.manifest?.name[lang] ?? plugin.id,
      description: plugin.manifest?.description[lang] ?? '',
      version: plugin.manifest?.version,
      enabled: enabled.has(plugin.id),
      license: license ? { ok: license.ok, expires: license.exp ? new Date(license.exp * 1000).toISOString().slice(0, 10) : undefined } : undefined,
      links: pluginAdminLinks(plugin, user).map((link) => ({ href: link.href, label: T(link.label) })),
    }
  })
  return <Gutter className="ha-workspace">
    <header className="ha-page-head"><div><h1>{T('Tiện ích')}</h1><p>{T('Quản lý các chức năng mở rộng của website và mở nhanh cấu hình từng tiện ích.')}</p></div><a className="ha-button" href="/admin">{T('Về tổng quan')}</a></header>
    <PluginsClient plugins={plugins} />
  </Gutter>
}
