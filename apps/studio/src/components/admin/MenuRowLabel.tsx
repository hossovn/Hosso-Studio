'use client'
import { useRowLabel } from '@payloadcms/ui'
import React from 'react'

/** Tiêu đề dòng menu: "Tên → /đường-dẫn (n mục con)" để kéo thả sắp xếp mà không cần mở từng dòng. */
export const MenuRowLabel = () => {
  const { data, rowNumber } = useRowLabel<{ label?: string; href?: string; children?: unknown[] }>()
  const kids = Array.isArray(data?.children) ? data.children.length : 0
  return (
    <span>
      {String((rowNumber ?? 0) + 1).padStart(2, '0')}. <strong>{data?.label || 'Mục mới'}</strong>
      {data?.href ? <span style={{ opacity: 0.6 }}> → {data.href}</span> : null}
      {kids ? <span style={{ opacity: 0.6 }}> · {kids} mục con</span> : null}
    </span>
  )
}
