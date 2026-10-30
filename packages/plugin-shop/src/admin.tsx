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
    <Gutter className="ha-workspace">
      <header className="ha-page-head"><div><h1>{T('Nhập / xuất sản phẩm', 'Import / export products')}</h1><p>{T('Cập nhật danh mục sản phẩm bằng tệp CSV.', 'Update your product catalog with a CSV file.')}</p></div><a className="ha-button" href="/admin/collections/shop-products">{T('Về danh sách sản phẩm', 'Back to products')}</a></header>
      <section className="ha-panel"><div className="ha-panel-head"><h2>{T('1. Chuẩn bị tệp CSV', '1. Prepare your CSV')}</h2></div><div className="ha-panel-body"><p>
        {T('Tải danh sách hiện có làm mẫu, chỉnh sửa rồi nhập lại. Sản phẩm có cùng mã sẽ được cập nhật; mã mới sẽ tạo sản phẩm mới.', 'Download your current catalog as a template, edit it and import it again. Existing product codes are updated; new codes create new products.')}
      </p><a className="ha-button" href="/api/plugins/shop/export">{T('Tải CSV sản phẩm hiện có', 'Download the current products CSV')}</a><details style={{ marginTop: 16 }}><summary>{T('Hướng dẫn các cột dữ liệu', 'CSV column reference')}</summary><p>
        {T('Cột: ', 'Columns: ')}<code>code, name, category, brand, price, salePrice, stock, makes, description, image, active</code>.{' '}
        {T('Cập nhật theo mã sản phẩm (code), chưa có thì tạo mới. Danh mục chưa có sẽ được tạo. Cột image là tên tệp đã có trong Media. Cột makes cách nhau bằng dấu ; (ví dụ toyota;kia).', 'Rows are matched by product code (code); new codes create products. Missing categories are created. The image column is a file name already in Media. Separate makes with ; (for example toyota;kia).')}
      </p></details></div></section>
      <section className="ha-panel" style={{ marginTop: 20 }}><div className="ha-panel-head"><h2>{T('2. Chọn tệp và nhập sản phẩm', '2. Select a file and import products')}</h2></div><div className="ha-panel-body">
      <form onSubmit={upload} className="ha-import-form" aria-busy={busy}>
        <label>{T('Tệp CSV', 'CSV file')}<input type="file" name="file" accept=".csv,text/csv" required disabled={busy} /></label>
        <button type="submit" disabled={busy} className="ha-button is-primary">
          {busy ? T('Đang nhập…', 'Importing…') : T('Nhập CSV', 'Import CSV')}
        </button>
      </form>
      {result && (
        <div role="status">
          {result.ok ? <p>{T(`Đã tạo ${result.created}, cập nhật ${result.updated}.`, `Created ${result.created}, updated ${result.updated}.`)}</p> : <p style={{ color: 'var(--theme-error-500)' }}>{result.message ?? T('Lỗi.', 'Error.')}</p>}
          {!!result.errors?.length && <ul>{result.errors.map((x, i) => <li key={i}>{x}</li>)}</ul>}
        </div>
      )}
      </div></section>
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
