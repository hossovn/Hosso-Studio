'use client'
import { usePathname } from 'next/navigation'
import { useLocale, useT } from '@hosso/studio-blocks'
import React from 'react'

/** Chuyển ngôn ngữ giữ nguyên trang đang xem (ngôn ngữ mặc định không có tiền tố). */
export function LanguageSwitcher({ locales }: { locales: { code: string; label: string }[] }) {
  const path = usePathname() || '/'
  const t = useT()
  const { locale, defaultLocale } = useLocale()
  if (locales.length < 2) return null
  const first = path.split('/')[1]
  const base = locales.some((l) => l.code === first && l.code !== defaultLocale) ? path.slice(first.length + 1) || '/' : path
  const target = (code: string) => (code === defaultLocale ? base : `/${code}${base === '/' ? '' : base}`)
  return (
    <ul className="ss-lang" aria-label={t('nav.language')}>
      {locales.map((l) => (
        <li key={l.code}>
          <a href={target(l.code)} lang={l.code} hrefLang={l.code} aria-current={l.code === locale ? 'true' : undefined}>
            {l.code.toUpperCase()}
          </a>
        </li>
      ))}
    </ul>
  )
}
