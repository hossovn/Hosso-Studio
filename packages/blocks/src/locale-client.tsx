'use client'
import React, { createContext, useContext } from 'react'
import { DEFAULT_LOCALE, translate, type StringKey } from './i18n'

const LocaleContext = createContext<{ locale: string; defaultLocale: string; preview: boolean }>({ locale: DEFAULT_LOCALE, defaultLocale: DEFAULT_LOCALE, preview: false })

/** Cho component client biết ngôn ngữ hiện tại (đặt một lần ở layout). */
/** `preview`: khung xem trước trong admin; các thao tác gửi dữ liệu (biểu mẫu) chỉ mô phỏng, không ghi gì. */
export function LocaleProvider({ locale, defaultLocale, preview = false, children }: { locale: string; defaultLocale: string; preview?: boolean; children: React.ReactNode }) {
  return <LocaleContext.Provider value={{ locale, defaultLocale, preview }}>{children}</LocaleContext.Provider>
}

export const useLocale = () => useContext(LocaleContext)
export const useT = () => {
  const { locale } = useContext(LocaleContext)
  return (key: StringKey) => translate(key, locale)
}
