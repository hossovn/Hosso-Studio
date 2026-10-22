'use client'
import React from 'react'

import { useAdminT } from '@/lib/use-admin-t'

const AREAS = [
  ['siteHeader', 'Header của site (thay header của theme)'],
  ['siteFooter', 'Footer của site (thay footer của theme)'],
  ['beforeHeader', 'Trên đầu trang (trước header)'],
  ['afterHeader', 'Dưới header (trước nội dung)'],
  ['beforeFooter', 'Trước chân trang (widget, đăng ký nhận tin, liên hệ…)'],
  ['afterFooter', 'Sau chân trang'],
  ['postSidebar', 'Cột bên cạnh bài viết (widget)'],
]

/** Mở trình dựng kéo thả cho từng vùng giao diện. */
export const AreaLinks = () => {
  const T = useAdminT()
  return (
  <div style={{ marginBottom: 24 }}>
    <p>{T('Chọn một vùng để kéo thả khối nội dung vào. Nội dung hiện ở mọi trang của site (theo từng ngôn ngữ).')}</p>
    <ul style={{ display: 'grid', gap: 8, padding: 0, listStyle: 'none' }}>
      {AREAS.map(([name, label]) => (
        <li key={name}>
          <a
            href={`/editor/${name}?c=area`}
            style={{ background: 'var(--hosso-brand)', color: '#fff', padding: '8px 14px', borderRadius: 4, display: 'inline-block', textDecoration: 'none', fontWeight: 600 }}
          >
            {T('Sửa:')} {T(label)}
          </a>
        </li>
      ))}
    </ul>
  </div>
  )
}
