import hosso from '@hosso-config'
import { Gutter } from '@payloadcms/ui'
import type { AdminViewServerProps, Payload, PayloadRequest, Where } from 'payload'
import React from 'react'

import { canEditPages, canModerate, canPublish, hasRole, isAdmin } from '@/lib/access'
import { adminLang, makeT } from '@/lib/admin-i18n'
import { GettingStarted } from './GettingStarted'

type Props = { payload: Payload; req?: PayloadRequest; i18n?: { language?: string }; user?: { id?: string | number; roles?: string[] | null } | null }
type Draft = { id: string | number; title?: string; updatedAt?: string; collection: 'pages' | 'posts' }

export const DashboardHome = async ({ payload, req, i18n, user }: Props) => {
  const T = makeT(adminLang(i18n?.language))
  const writer = hasRole(user, 'admin', 'publisher', 'editor', 'author')
  const pageEditor = canEditPages(user)
  const moderator = canModerate(user)
  const shop = canPublish(user) && Boolean(payload.collections['shop-orders'])
  const since = new Date(Date.now() - 24 * 3600_000).toISOString()
  const count = async (collection: string, where?: Where) => {
    try {
      return (await payload.count({ collection: collection as any, where, req, overrideAccess: false })).totalDocs
    } catch {
      return null
    }
  }
  const recent = async (collection: 'pages' | 'posts'): Promise<Draft[] | null> => {
    try {
      const where: Where = { _status: { equals: 'draft' } }
      if (collection === 'posts' && !pageEditor) where.createdBy = { equals: user?.id }
      const result = await payload.find({ collection, where, draft: true, sort: '-updatedAt', limit: 4, depth: 0, req, overrideAccess: false })
      return result.docs.map((doc) => ({ id: doc.id, title: doc.title, updatedAt: doc.updatedAt, collection }))
    } catch {
      return null
    }
  }
  const [orders, comments, bookings, forms, pages, posts, media, pageDrafts, postDrafts] = await Promise.all([
    shop ? count('shop-orders', { status: { equals: 'new' } }) : null,
    moderator ? count('comments', { status: { equals: 'pending' } }) : null,
    moderator ? count('bookings', { status: { equals: 'new' } }) : null,
    moderator ? count('form-submissions', { createdAt: { greater_than: since } }) : null,
    pageEditor ? count('pages', { _status: { equals: 'published' } }) : null,
    writer ? count('posts', { _status: { equals: 'published' } }) : null,
    writer ? count('media') : null,
    pageEditor ? recent('pages') : [],
    writer ? recent('posts') : [],
  ])
  const tasks = [
    ...(shop ? [{ label: T('Đơn hàng mới'), value: orders, href: '/admin/collections/shop-orders?where[status][equals]=new' }] : []),
    ...(moderator ? [
      { label: T('Bình luận chờ duyệt'), value: comments, href: '/admin/collections/comments?where[status][equals]=pending' },
      { label: T('Lịch hẹn mới'), value: bookings, href: '/admin/collections/bookings?where[status][equals]=new' },
      { label: T('Biểu mẫu trong 24 giờ qua'), value: forms, href: '/admin/collections/form-submissions?where[createdAt][greater_than]=' + encodeURIComponent(since) },
    ] : []),
  ]
  const drafts = [...(pageDrafts ?? []), ...(postDrafts ?? [])].sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '')).slice(0, 6)
  const actions = [
    ...(writer ? [{ label: T('Thêm bài viết'), href: '/admin/collections/posts/create' }] : []),
    ...(pageEditor ? [{ label: T('Thêm trang'), href: '/admin/collections/pages/create' }] : []),
    ...(shop ? [{ label: T('Thêm sản phẩm'), href: '/admin/collections/shop-products/create' }] : []),
    ...(writer ? [{ label: T('Tải lên'), href: '/admin/collections/media/create' }] : []),
  ]
  const stats = [
    ...(pageEditor ? [{ label: T('Trang đã xuất bản'), value: pages, href: '/admin/collections/pages' }] : []),
    ...(writer ? [{ label: T('Bài viết đã xuất bản'), value: posts, href: '/admin/collections/posts' }, { label: T('Thư viện media'), value: media, href: '/admin/collections/media' }] : []),
  ]

  return <div className="ha-dashboard">
    <header className="ha-page-head"><div><h1>{T('Tổng quan')}</h1><p>{T('Theo dõi công việc và tiếp tục quản lý website của bạn.')}</p></div><a className="ha-button" href={process.env.HOSSO_PUBLIC_URL || '/'} target="_blank" rel="noreferrer">{T('Xem website')} ↗</a></header>
    {actions.length > 0 && <section className="ha-welcome"><div><h2>{T('Bạn muốn làm gì hôm nay?')}</h2><p>{T('Tạo nội dung mới hoặc tiếp tục công việc đang làm.')}</p></div><div className="ha-actions">{actions.map((action, index) => <a className={`ha-button${index === 0 ? ' is-primary' : ''}`} key={action.href} href={action.href}>{action.label}</a>)}</div></section>}
    {tasks.length > 0 && <section aria-labelledby="ha-tasks-title"><div className="ha-section-head"><h2 id="ha-tasks-title">{T('Cần xử lý')}</h2><span>{T('Bấm vào từng mục để xem danh sách.')}</span></div><div className="ha-tasks">{tasks.map((task) => <a className="ha-task" href={task.href} key={task.href}><strong className={task.value ? 'has-items' : undefined}>{task.value ?? '—'}</strong><span>{task.label}</span><span className="ha-task-arrow" aria-hidden="true">→</span></a>)}</div>{tasks.some((task) => task.value === null) && <p className="ha-muted" role="status">{T('Một số số liệu chưa tải được. Bạn vẫn có thể mở danh sách để kiểm tra.')}</p>}</section>}
    <div className="ha-dashboard-grid">
      {(writer || pageEditor) && <section className="ha-panel"><div className="ha-panel-head"><h2>{T('Tiếp tục biên tập')}</h2><span className="ha-muted">{T('Bản nháp gần đây')}</span></div>
        {drafts.length ? <ul className="ha-drafts">{drafts.map((draft) => <li key={`${draft.collection}-${draft.id}`}><a href={`/admin/collections/${draft.collection}/${draft.id}`}><strong>{draft.title || T('Chưa có tiêu đề')}</strong><small>{draft.collection === 'pages' ? T('Trang') : T('Bài viết')}</small></a><span className="ha-status">{T('Bản nháp')}</span></li>)}</ul> : <p className="ha-empty">{pageDrafts === null || postDrafts === null ? T('Chưa tải được bản nháp. Mở danh sách nội dung để kiểm tra.') : T('Chưa có bản nháp. Bắt đầu bằng một bài viết hoặc trang mới.')}</p>}
      </section>}
      <section className="ha-panel"><div className="ha-panel-head"><h2>{T('Website của bạn')}</h2></div><div className="ha-panel-body">
        {stats.length > 0 && <ul className="ha-summary">{stats.map((stat) => <li key={stat.href}><a href={stat.href}>{stat.label}<strong>{stat.value ?? '—'}</strong></a></li>)}</ul>}
        <div className="ha-shortcuts">
          {moderator && <a href="/admin/collections/contact-messages">{T('Tin nhắn liên hệ')} →</a>}
          {isAdmin(user) && <><a href="/admin/templates">{T('Kho giao diện')} →</a><a href="/admin/customize">{T('Tùy biến giao diện')} →</a><a href="/admin/plugins">{T('Tiện ích')} <span>{hosso.plugins.length}</span> →</a><a href="/admin/globals/site-settings">{T('Cài đặt')} →</a></>}
          <a href="/admin/account">{T('Hồ sơ của tôi')} →</a>
        </div>
      </div></section>
    </div>
    {isAdmin(user) && <details className="ha-setup"><summary>{T('Thiết lập website')}</summary><GettingStarted payload={payload} i18n={i18n} /></details>}
  </div>
}

export const DashboardView = ({ initPageResult }: AdminViewServerProps) => {
  const { req } = initPageResult
  return <Gutter className="ha-workspace"><DashboardHome payload={req.payload} req={req} user={req.user} i18n={req.i18n} /></Gutter>
}
