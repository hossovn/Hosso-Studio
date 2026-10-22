'use client'
import React, { useEffect, useState } from 'react'
import { useEditorPreview } from '@hosso/studio-blocks'

import { loadBlockData } from '@/app/(editor)/editor/[id]/actions'

/** Bọc renderer của block có loader: lấy dữ liệu thật qua server action rồi mới hiển thị (dùng cho trình dựng và xem trước widget). */
export function withLiveData(type: string, Render: React.ComponentType<any>, locale: string) {
  return function Live(props: Record<string, any>) {
    const preview = useEditorPreview()
    const [data, setData] = useState<{ key: string; value: unknown }>()
    const key = JSON.stringify({ props: { ...props, puck: undefined }, preview, locale })
    useEffect(() => {
      let on = true
      const t = setTimeout(() => {
        void loadBlockData(type, props, locale, preview ?? undefined)
          .then((value) => { if (on) setData({ key, value }) })
          .catch(() => { if (on) setData({ key, value: { status: 'error', kind: 'internal' } }) })
      }, 300)
      return () => {
        on = false
        clearTimeout(t)
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key, locale, preview])
    return <Render {...props} data={data?.key === key ? data.value : { status: 'loading' }} />
  }
}
