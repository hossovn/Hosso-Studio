import hosso from '@hosso-config'
import { checkLicense } from '@hosso/studio-blocks'
import { Gutter } from '@payloadcms/ui'
import type { AdminViewServerProps } from 'payload'
import React from 'react'

import { hasRole } from '@/lib/access'
import { adminLang, makeT } from '@/lib/admin-i18n'

/** Trang Plugin: các plugin đã cài, đang bật hay tắt, phiên bản và liên kết tới trang cài đặt. Chỉ admin. */
export const PluginsView = async ({ initPageResult }: AdminViewServerProps) => {
  const user = initPageResult.req.user as { roles?: string[] } | null
  const lang = adminLang(initPageResult.req.i18n?.language)
  const T = makeT(lang)
  if (!hasRole(user, 'admin'))
    return (
      <Gutter>
        <h1>{T('Quản lý plugin')}</h1>
        <p>{T('Chỉ quản trị viên được dùng trang này.')}</p>
      </Gutter>
    )
  const enabled = new Set(hosso.plugins.map((p) => p.id))
  // Plugin thương mại: hiện tình trạng giấy phép (HOSSO_LICENSE_KEY).
  const licenses = Object.fromEntries(await Promise.all(hosso.installedPlugins.filter((p) => p.manifest?.commercial).map(async (p) => [p.id, await checkLicense(p.id)] as const)))
  return (
    <Gutter>
      <h1>{T('Quản lý plugin')}</h1>
      <p>{T('Chọn plugin bật bằng biến NEXT_PUBLIC_HOSSO_PLUGINS (id cách nhau bằng dấu phẩy, để trống là bật tất cả). Thêm hoặc đổi plugin cần dựng lại (build) và triển khai lại.')}</p>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {['Plugin', 'Mô tả', 'Phiên bản', 'Trạng thái'].map((h) => (
              <th key={h} style={{ textAlign: 'left', padding: '.5rem', borderBottom: '1px solid var(--theme-elevation-150)' }}>{T(h)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {hosso.installedPlugins.map((p) => {
            const m = p.manifest
            const on = enabled.has(p.id)
            return (
              <tr key={p.id} style={{ verticalAlign: 'top' }}>
                <td style={{ padding: '.5rem' }}><strong>{m?.name[lang] ?? p.id}</strong><br /><code>{p.id}</code></td>
                <td style={{ padding: '.5rem' }}>{m?.description[lang]}</td>
                <td style={{ padding: '.5rem' }}>{m?.version}</td>
                <td style={{ padding: '.5rem' }}>
                  {on ? T('Đang bật') : T('Đã tắt')}
                  {licenses[p.id] && (<><br />{licenses[p.id].ok ? `${T('Giấy phép hợp lệ')}${licenses[p.id].exp ? ` (${new Date(licenses[p.id].exp! * 1000).toISOString().slice(0, 10)})` : ''}` : T('Chưa có giấy phép hợp lệ (dev dùng thử được, production cần HOSSO_LICENSE_KEY)')}</>)}
                  {on && m?.settings && (<><br /><a href={m.settings}>{T('Mở trang quản lý')}</a></>)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </Gutter>
  )
}
