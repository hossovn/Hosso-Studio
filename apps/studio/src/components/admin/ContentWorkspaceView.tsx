import React from 'react'
import type { AdminViewServerProps } from 'payload'
import { Gutter } from '@payloadcms/ui'
import { hasRole } from '@/lib/access'
import { ContentWorkspace } from './ContentWorkspace'
export function ContentWorkspaceView({ initPageResult, searchParams }: AdminViewServerProps) {
 const user=initPageResult.req.user
 if(!hasRole(user,'admin','publisher','editor','author')) return <Gutter><h1>Không có quyền truy cập</h1></Gutter>
 const kind=String(searchParams?.kind||'pages'), initialKind=['pages','posts','media','workflow','content-entries'].includes(kind)?kind:'pages'
 return <Gutter className="ha-workspace"><ContentWorkspace canEditPages={hasRole(user,'admin','publisher','editor')} userId={String(user!.id)} initialKind={hasRole(user,'admin','publisher','editor')?initialKind:['media','workflow'].includes(initialKind)?initialKind:'posts'}/></Gutter>
}
