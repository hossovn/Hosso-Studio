'use client'
import { Gutter, useDocumentInfo, useTranslation } from '@payloadcms/ui'
import React, { useState } from 'react'

// Trang Nhập/xuất CSV sản phẩm trong admin (chỉ admin/publisher dùng được endpoint).
export const ImportView = () => {
  const en = /^en/i.test(useTranslation().i18n.language)
  const T = (vi: string, e: string) => (en ? e : vi)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ ok?: boolean; created?: number; updated?: number; errors?: string[]; message?: string } | null>(null)

  const upload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const file = (e.currentTarget.elements.namedItem('file') as HTMLInputElement).files?.[0]
    if (!file) return
    setBusy(true)
    try {
      const res = await fetch('/api/plugins/shop/import', { method: 'POST', headers: { 'Content-Type': 'text/csv' }, body: await file.text() })
      setResult(await res.json())
    } catch {
      setResult({ ok: false, message: T('Không gọi được máy chủ.', 'Could not reach the server.') })
    }
    setBusy(false)
  }

  return (
    <Gutter>
      <h1>{T('Nhập / xuất sản phẩm (CSV)', 'Import / export products (CSV)')}</h1>
      <p>
        {T('Cột: ', 'Columns: ')}<code>code, name, category, brand, price, salePrice, stock, makes, description, image, active</code>.{' '}
        {T('Cập nhật theo mã sản phẩm (code), chưa có thì tạo mới. Danh mục chưa có sẽ được tạo. Cột image là tên tệp đã có trong Media. Cột makes cách nhau bằng dấu ; (ví dụ toyota;kia).', 'Rows are matched by product code (code); new codes create products. Missing categories are created. The image column is a file name already in Media. Separate makes with ; (for example toyota;kia).')}
      </p>
      <p><a href="/api/plugins/shop/export">{T('Tải CSV sản phẩm hiện có', 'Download the current products CSV')}</a></p>
      <form onSubmit={upload} style={{ margin: '1rem 0' }}>
        <input type="file" name="file" accept=".csv,text/csv" required />{' '}
        <button type="submit" disabled={busy} style={{ background: 'var(--hosso-brand, #d71920)', color: '#fff', border: 0, borderRadius: 4, padding: '8px 16px', fontWeight: 600, cursor: 'pointer' }}>
          {busy ? T('Đang nhập…', 'Importing…') : T('Nhập CSV', 'Import CSV')}
        </button>
      </form>
      {result && (
        <div role="status">
          {result.ok ? <p>{T(`Đã tạo ${result.created}, cập nhật ${result.updated}.`, `Created ${result.created}, updated ${result.updated}.`)}</p> : <p style={{ color: 'var(--theme-error-500)' }}>{result.message ?? T('Lỗi.', 'Error.')}</p>}
          {!!result.errors?.length && <ul>{result.errors.map((x, i) => <li key={i}>{x}</li>)}</ul>}
        </div>
      )}
    </Gutter>
  )
}

/** Liên kết "In đơn và phiếu giao hàng" trong trang sửa đơn hàng. */
export const PrintLink = () => {
  const en = /^en/i.test(useTranslation().i18n.language)
  const { id } = useDocumentInfo()
  if (!id) return null
  return (
    <p style={{ marginBottom: 16 }}>
      <a href={`/api/plugins/shop/print?id=${id}`} target="_blank" rel="noopener noreferrer">{en ? 'Print order and delivery slip' : 'In đơn hàng và phiếu giao hàng'}</a>
    </p>
  )
}
