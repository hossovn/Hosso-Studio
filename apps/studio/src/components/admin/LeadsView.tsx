import React from 'react'
import { Gutter } from '@payloadcms/ui'
import type { AdminViewServerProps } from 'payload'
import { canModerate } from '@/lib/access'
import { LeadsClient } from './LeadsClient'

export function LeadsView({ initPageResult }: AdminViewServerProps) {
  if (!canModerate(initPageResult.req.user)) return <Gutter><p>Bạn chưa có quyền xử lý lead.</p></Gutter>
  return <Gutter><LeadsClient /></Gutter>
}
