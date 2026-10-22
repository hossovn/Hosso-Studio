import { Gutter } from '@payloadcms/ui'
import type { AdminViewServerProps } from 'payload'
import React from 'react'

import { hasRole } from '@/lib/access'
import { adminLang, makeT } from '@/lib/admin-i18n'
import { listTemplates } from '@/lib/backup'
import { SiteTemplates } from './SiteTemplates'

export const TemplatesView = async ({ initPageResult }: AdminViewServerProps) => {
  const { req } = initPageResult
  const T = makeT(adminLang(req.i18n?.language))
  if (!hasRole(req.user as { roles?: string[] } | null, 'admin')) return <Gutter><h1>{T('Chọn giao diện')}</h1><p>{T('Chỉ quản trị viên được dùng trang này.')}</p></Gutter>
  return <Gutter>
    <div className="ht-fullscreen">
    <div className="ht-page-head">
      <a className="ht-back" href="/admin">{T('Bảng điều khiển')}</a>
      <div>
        <p className="ht-kicker">{T('Kho giao diện')}</p>
        <h1>{T('Chọn giao diện')}</h1>
        <p className="ht-lede">{T('Chọn một mẫu website để bắt đầu nhanh hơn. Bạn có thể thay nội dung, hình ảnh và màu sắc sau khi áp dụng.')}</p>
      </div>
    </div>
    <SiteTemplates templates={listTemplates()} siteURL={process.env.HOSSO_PUBLIC_URL || '/'} />
    </div>
  </Gutter>
}
