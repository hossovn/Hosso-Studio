// CSV tối thiểu theo RFC 4180: dấu phẩy, nháy kép, xuống dòng trong ô được nháy kép. Bỏ BOM đầu tệp.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  const src = text.replace(/^﻿/, '')
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          cell += '"'
          i++
        } else quoted = false
      } else cell += c
    } else if (c === '"') quoted = true
    else if (c === ',') {
      row.push(cell)
      cell = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++
      row.push(cell)
      cell = ''
      if (row.some((x) => x.trim() !== '')) rows.push(row)
      row = []
    } else cell += c
  }
  row.push(cell)
  if (row.some((x) => x.trim() !== '')) rows.push(row)
  return rows
}

export const toCsv = (rows: (string | number | null | undefined)[][]) =>
  '﻿' + rows.map((r) => r.map((v) => (/[",\n\r]/.test(String(v ?? '')) ? `"${String(v).replace(/"/g, '""')}"` : String(v ?? ''))).join(',')).join('\r\n')

/** Cột CSV của sản phẩm (hàng đầu là tiêu đề). */
export const COLUMNS = ['code', 'name', 'category', 'brand', 'price', 'salePrice', 'stock', 'makes', 'description', 'image', 'active'] as const
