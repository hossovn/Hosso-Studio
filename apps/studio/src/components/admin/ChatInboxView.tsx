import React from 'react'
import { Gutter } from '@payloadcms/ui'
import type { AdminViewServerProps } from 'payload'
import { canModerate } from '@/lib/access'
import { adminLang, makeT } from '@/lib/admin-i18n'
import { ChatInboxClient } from './ChatInboxClient'

export async function ChatInboxView({ initPageResult, searchParams }: AdminViewServerProps) {
  const { req } = initPageResult
  const lang = adminLang(req.i18n?.language)
  const T = makeT(lang)
  if (!canModerate(req.user)) {
    return (
      <Gutter>
        <p>{T('Chỉ quản trị viên và kiểm duyệt viên được xem trò chuyện trực tuyến.')}</p>
      </Gutter>
    )
  }
  return (
    <Gutter>
      <ChatInboxClient
        lang={lang}
        initialSessionId={typeof searchParams?.session === 'string' ? searchParams.session : undefined}
      />
    </Gutter>
  )
}
