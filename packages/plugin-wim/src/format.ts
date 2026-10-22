const vnd = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0, minimumFractionDigits: 0 })

/** Tiền VND, không thập phân: 858000 -> "858.000 ₫". */
export const formatVnd = (n: number) => vnd.format(n)
