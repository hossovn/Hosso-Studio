'use client'
import { useLabel } from './admin-lang'
import React, { useEffect, useState } from 'react'

type Doc = { id: string | number; title?: string; slug?: string }

/** Trường chọn một bản ghi (biểu mẫu, khối dùng lại…) theo `slug`, lấy danh sách từ REST của admin. */
export function RefField({ value, onChange, collection, readOnly }: { value?: string; onChange: (v: string) => void; collection: string; readOnly?: boolean }) {
  const L = useLabel()
  const [docs, setDocs] = useState<Doc[] | null>(null)
  useEffect(() => {
    let on = true
    fetch(`/api/${collection}?limit=100&depth=0&sort=title&select[title]=true&select[slug]=true`)
      .then((r) => r.json())
      .then((j) => on && setDocs(j.docs ?? []))
      .catch(() => on && setDocs([]))
    return () => {
      on = false
    }
  }, [collection])
  return (
    <select
      value={value ?? ''}
      disabled={readOnly || docs === null}
      onChange={(e) => onChange(e.target.value)}
      style={{ padding: 8, border: '1px solid #c9ccd1', borderRadius: 4, font: 'inherit', width: '100%' }}
    >
      <option value="">{docs === null ? L('Đang tải…') : L('— Chọn —')}</option>
      {(docs ?? []).map((d) => (
        <option key={d.id} value={d.slug}>
          {d.title ?? d.slug}
        </option>
      ))}
      {value && docs && !docs.some((d) => d.slug === value) && <option value={value}>{value}</option>}
    </select>
  )
}
