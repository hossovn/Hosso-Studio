'use client'
import React, { createContext, useContext } from 'react'
import { trLabel } from './labels-en'

const AdminLangContext = createContext<{ lang: string; extra?: Record<string, string> }>({ lang: 'vi' })

/** Cho các trường/trình sửa trong admin và trình dựng biết ngôn ngữ giao diện (vi | en); mặc định tiếng Việt. */
export function AdminLangProvider({ lang, extra, children }: { lang: string; extra?: Record<string, string>; children: React.ReactNode }) {
  return <AdminLangContext.Provider value={{ lang, extra }}>{children}</AdminLangContext.Provider>
}

/** Trả hàm dịch nhãn: L('Sửa ảnh') -> 'Edit image' khi ngôn ngữ là en. Hỗ trợ {tên} để chèn giá trị. */
export const useLabel = () => {
  const { lang, extra } = useContext(AdminLangContext)
  return (vi: string, vars?: Record<string, string | number>) => {
    const s = trLabel(lang, vi, extra)
    return vars ? s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? '')) : s
  }
}
