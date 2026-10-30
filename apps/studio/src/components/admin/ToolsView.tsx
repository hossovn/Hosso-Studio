import { Gutter } from '@payloadcms/ui'
import type { AdminViewServerProps } from 'payload'
import React from 'react'

import { hasRole } from '@/lib/access'
import { adminLang, makeT } from '@/lib/admin-i18n'
import { listBackups } from '@/lib/backup'
import pkg from '../../../package.json'
import { ToolsClient } from './ToolsClient'

async function latestVersion(): Promise<{ version: string; url?: string } | null> {
  const url = process.env.HOSSO_UPDATE_URL
  if (!url) return null
  try {
    const j = await (await fetch(url, { signal: AbortSignal.timeout(3000), headers: { Accept: 'application/json' }, cache: 'no-store' })).json()
    const v = String(j.version ?? j.tag_name ?? '').replace(/^v/, '')
    return v ? { version: v, url: j.url ?? j.html_url } : null
  } catch {
    return null
  }
}

const newer = (a: string, b: string) => {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) > (pb[i] ?? 0)
  return false
}

/** Trang Công cụ: sao lưu, khôi phục, mẫu site, phiên bản và cập nhật. Chỉ admin. */
export const ToolsView = async ({ initPageResult }: AdminViewServerProps) => {
  const user = initPageResult.req.user as { roles?: string[] } | null
  const T = makeT(adminLang(initPageResult.req.i18n?.language))
  if (!hasRole(user, 'admin'))
    return (
      <Gutter>
        <h1>{T('Công cụ')}</h1>
        <p>{T('Chỉ quản trị viên được dùng trang này.')}</p>
      </Gutter>
    )
  const latest = await latestVersion()
  return (
    <Gutter className="ha-workspace">
      <header className="ha-page-head"><h1>{T('Công cụ')}</h1></header>
      <ToolsClient
        version={pkg.version}
        latest={latest && newer(latest.version, pkg.version) ? latest : null}
        updateConfigured={Boolean(process.env.HOSSO_UPDATE_URL)}
        backups={listBackups()}
      />
    </Gutter>
  )
}
