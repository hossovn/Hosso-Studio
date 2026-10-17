'use client'
import React, { useEffect, useState } from 'react'

import { loadBlockData } from '@/app/(editor)/editor/[id]/actions'

/** Bọc renderer của block có loader: lấy dữ liệu thật qua server action rồi mới hiển thị (dùng cho trình dựng và xem trước widget). */
export function withLiveData(type: string, Render: React.ComponentType<any>, locale: string) {
  return function Live(props: Record<string, any>) {
    const [data, setData] = useState<unknown>(undefined)
    const key = JSON.stringify({ ...props, puck: undefined })
    useEffect(() => {
      let on = true
      const t = setTimeout(() => loadBlockData(type, props, locale).then((d) => on && setData(d)), 300)
      return () => {
        on = false
        clearTimeout(t)
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key])
    return <Render {...props} data={data ?? { status: 'loading' }} />
  }
}
