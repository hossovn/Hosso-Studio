'use client'
import { useListQuery } from '@payloadcms/ui'
import React from 'react'

import { useAdminT } from '@/lib/use-admin-t'

export const ContentTabs = () => {
  const T = useAdminT()
  const { query, handleWhereChange } = useListQuery()
  const status = query.where?._status
  const active = status && typeof status === 'object' && 'equals' in status ? status.equals : ''
  return <div className="ha-filters ha-content-tabs" role="group" aria-label={T('Lọc trạng thái nội dung')}>
    {(['', 'published', 'draft'] as const).map((value, index) => <button type="button" key={value} aria-pressed={active === value} onClick={() => {
      const where = { ...query.where }
      delete where._status
      if (value) where._status = { equals: value }
      void handleWhereChange?.(where)
    }}>{[T('Tất cả'), T('Đã xuất bản'), T('Bản nháp')][index]}</button>)}
  </div>
}
