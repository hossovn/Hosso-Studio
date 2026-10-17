import config from '@payload-config'
import { headers } from 'next/headers'
import { getPayload } from 'payload'
import React from 'react'

import { hasRole } from '@/lib/access'

const link: React.CSSProperties = { color: '#fff', textDecoration: 'none', padding: '0 10px', lineHeight: '32px', display: 'inline-block' }

/** Thanh quản trị trên site (như WordPress): chỉ hiện cho người đã đăng nhập có quyền sửa; khách ẩn danh không thấy gì. */
export async function AdminBar({ collection, id, locale }: { collection: 'pages' | 'posts'; id: string | number; locale: string }) {
  const h = await headers()
  if (!/payload-token=/.test(h.get('cookie') ?? '')) return null
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: h })
  if (!hasRole(user as { roles?: string[] } | null, 'admin', 'publisher', 'editor', 'author')) return null
  const q = new URLSearchParams({ locale })
  if (collection !== 'pages') q.set('c', collection)
  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 9999, background: '#1d2327', color: '#fff', font: '13px/32px Arial, sans-serif', display: 'flex', gap: 4, padding: '0 8px' }} role="navigation" aria-label="Thanh quản trị">
      <a style={link} href="/admin">
        Quản trị
      </a>
      <a style={{ ...link, background: 'var(--hs-primary, #d71920)' }} href={`/editor/${id}?${q}`}>
        Sửa trang này
      </a>
      <a style={link} href={`/admin/collections/${collection}/${id}`}>
        Thuộc tính và SEO
      </a>
      <a style={{ ...link, marginLeft: 'auto' }} href="/admin/customize">
        Tùy biến giao diện
      </a>
    </div>
  )
}
