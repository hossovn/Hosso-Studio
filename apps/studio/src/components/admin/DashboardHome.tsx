import hosso from '@hosso-config'
import type { Payload } from 'payload'
import React from 'react'

import { hasRole } from '@/lib/access'
import { adminLang, makeT } from '@/lib/admin-i18n'
import { listTemplates } from '@/lib/backup'
import { SiteTemplates } from './SiteTemplates'

type Props = { payload: Payload; i18n?: { language?: string }; user?: { roles?: string[] | null } | null }

const count = async (payload: Payload, collection: any, where?: any) =>
  (await payload.count({ collection, where, overrideAccess: true }).catch(() => ({ totalDocs: 0 }))).totalDocs

/** Đầu dashboard: thẻ site (Thiết kế / Xem trước), số liệu chính và lối tắt, theo kiểu trang chủ của Webcake. */
export const DashboardHome = async ({ payload, i18n, user }: Props) => {
  const T = makeT(adminLang(i18n?.language))
  const settings = (await payload.findGlobal({ slug: 'site-settings', depth: 0 }).catch(() => ({}))) as Record<string, any>
  const home = await payload.find({ collection: 'pages', where: { slug: { equals: 'home' } }, limit: 1, depth: 0, overrideAccess: true }).catch(() => null)
  const [pages, drafts, posts, forms, media] = await Promise.all([
    count(payload, 'pages', { _status: { equals: 'published' } }),
    count(payload, 'pages', { _status: { equals: 'draft' } }),
    count(payload, 'posts', { _status: { equals: 'published' } }),
    count(payload, 'form-submissions', { createdAt: { greater_than: new Date(Date.now() - 24 * 3600_000).toISOString() } }),
    count(payload, 'media'),
  ])

  const homeId = home?.docs?.[0]?.id
  const site = process.env.HOSSO_PUBLIC_URL || '/'
  const stats = [
    { label: 'Trang đã xuất bản', value: pages, href: '/admin/collections/pages' },
    { label: 'Bản nháp', value: drafts, href: '/admin/collections/pages?where[_status][equals]=draft' },
    { label: 'Bài viết', value: posts, href: '/admin/collections/posts' },
    { label: 'Biểu mẫu hôm nay', value: forms, href: '/admin/collections/form-submissions' },
    { label: 'Media', value: media, href: '/admin/collections/media' },
  ]
  const quick = [
    { t: 'Trang', d: 'Dựng và xuất bản trang', href: '/admin/collections/pages' },
    { t: 'Bài viết', d: 'Blog và tin tức', href: '/admin/collections/posts' },
    { t: 'Thư viện media', d: 'Ảnh, video, tài liệu', href: '/admin/collections/media' },
    { t: 'Giao diện', d: 'Màu, font, theme', href: '/admin/customize' },
    { t: 'Header và footer', d: 'Dựng vùng giao diện', href: '/admin/globals/site-areas' },
    { t: 'SEO', d: 'Chuyển hướng, sitemap', href: '/admin/collections/redirects' },
    { t: 'Biểu mẫu', d: 'Liên hệ và đăng ký', href: '/admin/collections/forms' },
    { t: 'Plugin', d: 'Mở rộng tính năng', href: '/admin/plugins' },
    { t: 'Cài đặt', d: 'Site, menu, liên hệ', href: '/admin/globals/site-settings' },
  ]
  const templates = hasRole(user, 'admin') ? listTemplates() : []

  return (
    <div className="hd">
      <section className="hd-card hd-site">
        <div>
          <span className="hd-live">{T('Đang hoạt động')}</span>
          <h2>{settings.siteName || hosso.brand.name}</h2>
          <a href={site} target="_blank" rel="noreferrer">{site}</a>
        </div>
        <div className="hd-actions" style={{ flexWrap: 'wrap' }}>
          <a className="hd-btn is-primary" href={homeId ? `/editor/${homeId}` : '/admin/collections/pages'}>{T('Thiết kế')}</a>
          {hasRole(user, 'admin') && <a className="hd-btn" href="#website-templates">{T('Chọn giao diện')}</a>}
          <a className="hd-btn" href={site} target="_blank" rel="noreferrer">{T('Xem trước')}</a>
        </div>
      </section>
      <div className="hd-stats">
        {stats.map((s) => (
          <a key={s.label} className="hd-card hd-stat" href={s.href}>
            <small>{T(s.label)}</small>
            <strong>{s.value}</strong>
          </a>
        ))}
      </div>
      <h3 className="hd-title">{T('Truy cập nhanh')}</h3>
      <div className="hd-quick">
        {quick.map((q) => (
          <a key={q.t} className="hd-card hd-q" href={q.href}>
            <strong>{T(q.t)}</strong>
            <small>{T(q.d)}</small>
            <span aria-hidden="true">›</span>
          </a>
        ))}
      </div>
      {hasRole(user, 'admin') && <section id="website-templates" className="ht-dashboard" aria-label={T('Kho giao diện')}>
        <div className="ht-dashboard-head"><div><p className="ht-kicker">{T('Kho giao diện')}</p><h3>{T('Chọn giao diện cho website')}</h3></div><span>{templates.length} {T('giao diện')}</span></div>
        <SiteTemplates templates={templates} siteURL={site} />
      </section>}
    </div>
  )
}
