import React from 'react'
import type { AdminViewServerProps } from 'payload'
import { AnalyticsClient } from './AnalyticsClient'

export function AnalyticsView({ initPageResult }: AdminViewServerProps) {
  if (!initPageResult.req.user?.roles?.some((role: string) => ['admin', 'publisher'].includes(role))) return <p>Bạn chưa có quyền xem báo cáo.</p>
  return <div className="gutter--left gutter--right"><AnalyticsClient /></div>
}
