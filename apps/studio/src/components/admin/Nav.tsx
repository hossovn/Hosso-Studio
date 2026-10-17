import hosso from '@hosso-config'
import { NavHamburger, NavWrapper } from '@payloadcms/next/client'
import { Logout } from '@payloadcms/ui'
import type { Payload } from 'payload'
import React from 'react'

import { canModerate, canPublish, hasRole, isAdmin } from '@/lib/access'
import { NavClient, type NavSection } from './NavClient'

type Props = { payload: Payload; user?: { email?: string; roles?: string[] | null } | null }

const ROLE_LABEL: Record<string, string> = { admin: 'Quản trị viên', publisher: 'Người xuất bản', editor: 'Biên tập viên', author: 'Tác giả', moderator: 'Kiểm duyệt' }

const count = async (payload: Payload, collection: any, where: any) => (await payload.count({ collection, where, overrideAccess: true }).catch(() => ({ totalDocs: 0 }))).totalDocs

/**
 * Sidebar admin kiểu WordPress (nền tối, biểu tượng, nhóm menu, mục con) với vài điểm riêng của Hosso:
 * huy hiệu số liệu thật (bình luận chờ duyệt, bản nháp, lượt gửi biểu mẫu hôm nay), nút "+" thêm nhanh, ô tìm lệnh (phím /),
 * thu gọn thành thanh biểu tượng có menu bung khi rê chuột, và chỉ hiện mục phù hợp với vai trò của người dùng.
 */
export const Nav = async ({ payload, user }: Props) => {
  const u = user ?? null
  const today = new Date(Date.now() - 24 * 3600_000).toISOString()
  const [pendingComments, draftPages, draftPosts, formsToday] = await Promise.all([
    canModerate(u) ? count(payload, 'comments', { status: { equals: 'pending' } }) : 0,
    count(payload, 'pages', { _status: { equals: 'draft' } }),
    count(payload, 'posts', { _status: { equals: 'draft' } }),
    canModerate(u) ? count(payload, 'form-submissions', { createdAt: { greater_than: today } }) : 0,
  ])

  const pluginItems = hosso.plugins.flatMap((p) => p.adminNav ?? []).filter((i) => !i.roles || i.roles.some((r) => hasRole(u, r as any)))

  const content: NavSection['items'] = []
  const editor = hasRole(u, 'admin', 'publisher', 'editor')
  const writer = hasRole(u, 'admin', 'publisher', 'editor', 'author')

  content.push({ id: 'dash', label: 'Bảng điều khiển', href: '/admin', icon: 'dashboard', exact: true })
  if (writer)
    content.push({
      id: 'posts',
      label: 'Bài viết',
      href: '/admin/collections/posts',
      icon: 'pin',
      badge: draftPosts || undefined,
      badgeTitle: 'bản nháp',
      quick: { href: '/admin/collections/posts/create', label: 'Thêm bài viết' },
      children: [
        { label: 'Tất cả bài viết', href: '/admin/collections/posts', exact: true },
        { label: 'Thêm mới', href: '/admin/collections/posts/create' },
        ...(editor ? [{ label: 'Chuyên mục', href: '/admin/collections/post-categories' }, { label: 'Thẻ', href: '/admin/collections/post-tags' }] : []),
      ],
    })
  if (writer)
    content.push({
      id: 'media',
      label: 'Thư viện media',
      href: '/admin/collections/media',
      icon: 'image',
      quick: { href: '/admin/collections/media/create', label: 'Tải lên' },
      children: [
        { label: 'Thư viện', href: '/admin/collections/media', exact: true },
        { label: 'Tải lên (và sửa ảnh)', href: '/admin/collections/media/create' },
      ],
    })
  if (editor)
    content.push({
      id: 'pages',
      label: 'Trang',
      href: '/admin/collections/pages',
      icon: 'file',
      badge: draftPages || undefined,
      badgeTitle: 'bản nháp',
      quick: { href: '/admin/collections/pages/create', label: 'Thêm trang' },
      children: [
        { label: 'Tất cả trang', href: '/admin/collections/pages', exact: true },
        { label: 'Thêm mới', href: '/admin/collections/pages/create' },
        { label: 'Khối dùng lại', href: '/admin/collections/reusable-blocks' },
      ],
    })
  if (canModerate(u))
    content.push({
      id: 'comments',
      label: 'Bình luận',
      href: '/admin/collections/comments',
      icon: 'chat',
      badge: pendingComments || undefined,
      badgeTitle: 'chờ duyệt',
      badgeTone: 'alert',
      children: [
        { label: 'Tất cả', href: '/admin/collections/comments', exact: true },
        { label: 'Chờ duyệt', href: '/admin/collections/comments?where[status][equals]=pending', badge: pendingComments || undefined },
      ],
    })
  if (canModerate(u))
    content.push({
      id: 'forms',
      label: 'Biểu mẫu',
      href: '/admin/collections/forms',
      icon: 'form',
      badge: formsToday || undefined,
      badgeTitle: 'lượt gửi 24 giờ qua',
      badgeTone: 'alert',
      children: [
        ...(canPublish(u) ? [{ label: 'Các biểu mẫu', href: '/admin/collections/forms', exact: true }] : []),
        { label: 'Đã gửi', href: '/admin/collections/form-submissions' },
        { label: 'Tin nhắn liên hệ', href: '/admin/collections/contact-messages' },
      ],
    })

  const look: NavSection['items'] = []
  if (isAdmin(u)) look.push({ id: 'theme', label: 'Giao diện', href: '/admin/globals/site-settings', icon: 'brush', children: [{ label: 'Theme, màu và font', href: '/admin/globals/site-settings' }, ...(canPublish(u) ? [{ label: 'Header và footer (kéo thả)', href: '/admin/globals/site-areas' }] : [])] })
  else if (canPublish(u)) look.push({ id: 'theme', label: 'Giao diện', href: '/admin/globals/site-areas', icon: 'brush', children: [{ label: 'Header và footer (kéo thả)', href: '/admin/globals/site-areas' }] })
  if (canPublish(u)) look.push({ id: 'seo', label: 'SEO', href: '/admin/collections/redirects', icon: 'sliders', children: [{ label: 'Chuyển hướng 301', href: '/admin/collections/redirects' }, { label: 'Sitemap', href: '/sitemap.xml', external: true }] })
  if (pluginItems.length)
    look.push({ id: 'plugins', label: 'Plugin', href: pluginItems[0].href, icon: 'plug', children: pluginItems.map((i) => ({ label: i.label, href: i.href })) })

  const admin: NavSection['items'] = []
  admin.push({ id: 'users', label: 'Người dùng', href: isAdmin(u) ? '/admin/collections/users' : '/admin/account', icon: 'users', quick: isAdmin(u) ? { href: '/admin/collections/users/create', label: 'Thêm người dùng' } : undefined, children: isAdmin(u) ? [{ label: 'Tất cả người dùng', href: '/admin/collections/users', exact: true }, { label: 'Thêm mới', href: '/admin/collections/users/create' }, { label: 'Hồ sơ của tôi', href: '/admin/account' }] : [{ label: 'Hồ sơ của tôi', href: '/admin/account' }] })
  if (isAdmin(u))
    admin.push({ id: 'settings', label: 'Cài đặt', href: '/admin/globals/site-settings', icon: 'sliders', children: [{ label: 'Site, menu và liên hệ', href: '/admin/globals/site-settings' }, { label: 'Công cụ: sao lưu, mẫu site, cập nhật', href: '/admin/tools' }, { label: 'Sức khỏe hệ thống', href: '/api/health', external: true }] })

  if (isAdmin(u)) admin.push({ id: 'tools', label: 'Công cụ', href: '/admin/tools', icon: 'wrench' })

  const sections: NavSection[] = [
    { items: content },
    ...(look.length ? [{ title: 'Giao diện', items: look }] : []),
    { title: 'Quản trị', items: admin },
  ]

  return (
    <NavWrapper baseClass="nav">
      <nav className="nav__wrap hn-wrap" aria-label="Menu quản trị">
        <NavClient
          sections={sections}
          brand={{ name: hosso.brand.name, mark: hosso.brand.mark }}
          user={{ email: u?.email ?? '', role: ROLE_LABEL[(u?.roles ?? [])[0] ?? ''] ?? '' }}
          logout={<Logout />}
        />
      </nav>
      <div className="nav__header">
        <div className="nav__header-content">
          <NavHamburger baseClass="nav" />
        </div>
      </div>
    </NavWrapper>
  )
}
