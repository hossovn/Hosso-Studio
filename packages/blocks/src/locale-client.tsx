'use client'
import React, { createContext, useContext } from 'react'
import { DEFAULT_LOCALE, translate, type StringKey } from './i18n'

const LocaleContext = createContext<{ locale: string; defaultLocale: string }>({ locale: DEFAULT_LOCALE, defaultLocale: DEFAULT_LOCALE })

/** Cho component client biết ngôn ngữ hiện tại (đặt một lần ở layout). */
export function LocaleProvider({ locale, defaultLocale, children }: { locale: string; defaultLocale: string; children: React.ReactNode }) {
  return <LocaleContext.Provider value={{ locale, defaultLocale }}>{children}</LocaleContext.Provider>
}

export const useLocale = () => useContext(LocaleContext)
export const useT = () => {
  const { locale } = useContext(LocaleContext)
  return (key: StringKey) => translate(key, locale)
}
