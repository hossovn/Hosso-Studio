import hosso from '@hosso-config'
import { NavHamburger, NavWrapper } from '@payloadcms/next/client'
import { Logout } from '@payloadcms/ui'
import type { Payload } from 'payload'
import React from 'react'

import { canModerate, canPublish, hasRole, isAdmin } from '@/lib/access'
import { adminLang, makeT, type AdminT } from '@/lib/admin-i18n'
import { pluginAdminLinks } from '@/lib/admin-plugins'
import { NavClient, type NavSection } from './NavClient'

type Props = { payload: Payload; user?: { id?: string | number; email?: string; roles?: string[] | null } | null; i18n?: { language?: string } }

const ROLE_LABEL: Record<string, string> = { admin: 'Quản trị viên', publisher: 'Người xuất bản', editor: 'Biên tập viên', author: 'Tác giả', moderator: 'Kiểm duyệt' }

// Dịch mọi nhãn của sidebar một lần ở đây (nhãn gốc là tiếng Việt).
const translateSections = (sections: NavSection[], T: AdminT): NavSection[] =>
  sections.map((s) => ({
    title: s.title && T(s.title),
    items: s.items.map((i) => ({
      ...i,
      label: T(i.label),
      badgeTitle: i.badgeTitle && T(i.badgeTitle),
      quick: i.quick && { ...i.quick, label: T(i.quick.label) },
      children: i.children?.map((c) => ({ ...c, label: T(c.label) })),
    })),
  }))

const count = async (payload: Payload, collection: any, where: any, user: Props['user']) => (await payload.count({ collection, where, user: user as any, overrideAccess: false }).catch(() => ({ totalDocs: 0 }))).totalDocs

/**
 * Sidebar admin kiểu WordPress (nền tối, biểu tượng, nhóm menu, mục con) với vài điểm riêng của Hosso:
 * huy hiệu số liệu thật (bình luận chờ duyệt, bản nháp, lượt gửi biểu mẫu hôm nay), nút "+" thêm nhanh, ô tìm lệnh (phím /),
 * thu gọn thành thanh biểu tượng có menu bung khi rê chuột, và chỉ hiện mục phù hợp với vai trò của người dùng.
 */
export const Nav = async ({ payload, user, i18n }: Props) => {
  const T = makeT(adminLang(i18n?.language))
  const u = user ?? null
  const today = new Date(Date.now() - 24 * 3600_000).toISOString()
  const [pendingComments, draftPages, draftPosts, formsToday] = await Promise.all([
    canModerate(u) ? count(payload, 'comments', { status: { equals: 'pending' } }, u) : 0,
    hasRole(u, 'admin', 'publisher', 'editor') ? count(payload, 'pages', { _status: { equals: 'draft' } }, u) : 0,
    hasRole(u, 'admin', 'publisher', 'editor', 'author') ? count(payload, 'posts', { _status: { equals: 'draft' }, ...(!hasRole(u, 'admin', 'publisher', 'editor') ? { createdBy: { equals: u?.id } } : {}) }, u) : 0,
    canModerate(u) ? count(payload, 'form-submissions', { createdAt: { greater_than: today } }, u) : 0,
  ])

  // Cửa hàng (plugin shop): gom Đơn hàng, Sản phẩm, Thống kê thành nhóm riêng như Webcake; các mục này không lặp lại trong menu Plugin.
  const shopOn = Boolean((payload.collections as Record<string, unknown>)['shop-orders']) && canPublish(u)
  const SHOP_HREFS = ['/admin/collections/shop-products', '/admin/collections/shop-categories', '/admin/collections/shop-orders', '/admin/collections/shop-reviews', '/admin/shop-import', '/admin/shop-reports']
  const allPluginItems = hosso.plugins.flatMap((plugin) => pluginAdminLinks(plugin, u))
  const newOrders = shopOn ? await count(payload, 'shop-orders', { status: { equals: 'new' } }, u) : 0
  const hasReports = allPluginItems.some((i) => i.href === '/admin/shop-reports')
  const shop: NavSection['items'] = shopOn
    ? [
        { id: 'orders', label: 'Đơn hàng', href: '/admin/collections/shop-orders', icon: 'cart', badge: newOrders || undefined, badgeTitle: 'đơn mới', badgeTone: 'alert' },
        {
          id: 'products',
          label: 'Sản phẩm',
          href: '/admin/collections/shop-products',
          icon: 'box',
          quick: { href: '/admin/collections/shop-products/create', label: 'Thêm sản phẩm' },
          children: [
            { label: 'Tất cả sản phẩm', href: '/admin/collections/shop-products', exact: true },
            { label: 'Thêm mới', href: '/admin/collections/shop-products/create' },
            { label: 'Danh mục sản phẩm', href: '/admin/collections/shop-categories' },
            { label: 'Đánh giá sản phẩm', href: '/admin/collections/shop-reviews' },
            { label: 'Nhập/xuất CSV', href: '/admin/shop-import' },
          ],
        },
        ...(hasReports ? [{ id: 'reports', label: 'Thống kê', href: '/admin/shop-reports', icon: 'chart' as const }] : []),
      ]
    : []

  const content: NavSection['items'] = []
  const editor = hasRole(u, 'admin', 'publisher', 'editor')
  const writer = hasRole(u, 'admin', 'publisher', 'editor', 'author')

  content.push({ id: 'dash', label: 'Tổng quan', href: '/admin', icon: 'dashboard', exact: true })
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
      label: 'Liên hệ & lịch hẹn',
      href: '/admin/collections/contact-messages',
      icon: 'form',
      badge: formsToday || undefined,
      badgeTitle: 'lượt gửi 24 giờ qua',
      badgeTone: 'alert',
      children: [
        ...(canPublish(u) ? [{ label: 'Các biểu mẫu', href: '/admin/collections/forms', exact: true }] : []),
        { label: 'Đã gửi', href: '/admin/collections/form-submissions' },
        { label: 'Tin nhắn liên hệ', href: '/admin/collections/contact-messages' },
        { label: 'Lịch hẹn', href: '/admin/collections/bookings' },
      ],
    })

  const look: NavSection['items'] = []
  if (isAdmin(u)) look.push({ id: 'theme', label: 'Giao diện', href: '/admin/templates', icon: 'brush', children: [{ label: 'Kho giao diện', href: '/admin/templates' }, { label: 'Tùy biến giao diện', href: '/admin/customize' }, ...(canPublish(u) ? [{ label: 'Widget', href: '/admin/widgets' }, { label: 'Header và footer', href: '/admin/globals/site-areas' }] : [])] })
  else if (canPublish(u)) look.push({ id: 'theme', label: 'Giao diện', href: '/admin/globals/site-areas', icon: 'brush', children: [{ label: 'Widget (kéo thả)', href: '/admin/widgets' }, { label: 'Header và footer (trình dựng)', href: '/admin/globals/site-areas' }] })
  if (canPublish(u)) look.push({ id: 'seo', label: 'SEO', href: '/admin/collections/redirects', icon: 'sliders', children: [{ label: 'Chuyển hướng 301', href: '/admin/collections/redirects' }, { label: 'Sitemap', href: '/sitemap.xml', external: true }] })
  const marketing: NavSection['items'] = []
  const integrations: NavSection['items'] = []
  const extensions: NavSection['items'] = []
  for (const plugin of hosso.plugins) {
    const links = pluginAdminLinks(plugin, u).filter((link) => !shopOn || !SHOP_HREFS.includes(link.href))
    if (!links.length) continue
    const items = ['shop', 'shipping', 'payment', 'promotions', 'accounts', 'cross-sell', 'reports'].includes(plugin.id) ? shop
      : ['affiliate', 'analytics'].includes(plugin.id) ? marketing
      : ['wim', 'notify'].includes(plugin.id) ? integrations : extensions
    items.push({
      id: `plugin-${plugin.id}`,
      label: links.length === 1 ? links[0].label : plugin.manifest?.name.vi ?? plugin.id,
      href: links[0].href,
      icon: 'plug',
      children: links.length > 1 ? links.map((link) => ({ label: link.label, href: link.href })) : undefined,
    })
  }

  const admin: NavSection['items'] = []
  admin.push({ id: 'users', label: 'Người dùng', href: isAdmin(u) ? '/admin/collections/users' : '/admin/account', icon: 'users', quick: isAdmin(u) ? { href: '/admin/collections/users/create', label: 'Thêm người dùng' } : undefined, children: isAdmin(u) ? [{ label: 'Tất cả người dùng', href: '/admin/collections/users', exact: true }, { label: 'Thêm mới', href: '/admin/collections/users/create' }, { label: 'Hồ sơ của tôi', href: '/admin/account' }] : [{ label: 'Hồ sơ của tôi', href: '/admin/account' }] })
  if (isAdmin(u))
    admin.push({ id: 'settings', label: 'Cài đặt', href: '/admin/globals/site-settings', icon: 'sliders', children: [{ label: 'Site, menu và liên hệ', href: '/admin/globals/site-settings' }, { label: 'Sức khỏe hệ thống', href: '/api/health', external: true }] })

  if (isAdmin(u)) admin.push({ id: 'tools', label: 'Công cụ', href: '/admin/tools', icon: 'wrench' })
  if (isAdmin(u)) admin.unshift({ id: 'plugin-list', label: 'Tiện ích', href: '/admin/plugins', icon: 'plug' })

  const sections = translateSections(
    [{ items: content }, ...(shop.length ? [{ title: 'Bán hàng', items: shop }] : []), ...(marketing.length ? [{ title: 'Tiếp thị', items: marketing }] : []), ...(integrations.length ? [{ title: 'Kết nối & thông báo', items: integrations }] : []), ...(extensions.length ? [{ title: 'Mở rộng', items: extensions }] : []), ...(look.length ? [{ items: look }] : []), { title: 'Quản trị', items: admin }],
    T,
  )

  return (
    <NavWrapper baseClass="nav">
      <nav className="nav__wrap hn-wrap" aria-label={T('Menu quản trị')}>
        <NavClient
          sections={sections}
          brand={{ name: hosso.brand.name, mark: hosso.brand.mark }}
          user={{ email: u?.email ?? '', role: T(ROLE_LABEL[(u?.roles ?? [])[0] ?? ''] ?? '') }}
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
