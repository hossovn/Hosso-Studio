'use client'
import { usePathname } from 'next/navigation'
import { useLocale, useT } from '@hosso/studio-blocks'
import React, { useEffect, useRef, useState } from 'react'

export type SwitcherLocale = {
  code: string
  label: string
  shortLabel?: string
}

export type SwitcherVariant = 'code' | 'pill-flag' | 'dropdown-flag'

/** Quốc kỳ vector sắc nét trên mọi hệ điều hành (Windows không hiển thị emoji cờ quốc gia mà hiện ký tự chữ). */
function FlagSvg({ code }: { code: string }) {
  const c = code.toLowerCase()
  if (c === 'vi') {
    return (
      <svg width="18" height="13" viewBox="0 0 18 13" aria-hidden="true" className="ss-flag-svg">
        <rect width="18" height="13" rx="2" fill="#da251d" />
        <polygon fill="#ffff00" points="9,2.6 10.1,5.7 13.4,5.7 10.7,7.6 11.7,10.7 9,8.8 6.3,10.7 7.3,7.6 4.6,5.7 7.9,5.7" />
      </svg>
    )
  }
  if (c === 'ko') {
    return (
      <svg width="18" height="13" viewBox="0 0 18 13" aria-hidden="true" className="ss-flag-svg">
        <rect x="0.25" y="0.25" width="17.5" height="12.5" rx="2" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.5" />
        <circle cx="9" cy="6.5" r="3" fill="#cd2e3a" />
        <path d="M6.4,5 A3,3 0 0,0 11.6,8 A1.5,1.5 0 0,1 9,6.5 A1.5,1.5 0 0,0 6.4,5 Z" fill="#0047a0" />
        <g stroke="#111827" strokeWidth="0.7" strokeLinecap="round">
          <line x1="3.2" y1="3.4" x2="4.8" y2="2.2" />
          <line x1="3.7" y1="4.1" x2="5.3" y2="2.9" />
          <line x1="13.2" y1="2.2" x2="14.8" y2="3.4" />
          <line x1="12.7" y1="2.9" x2="14.3" y2="4.1" />
          <line x1="3.2" y1="9.6" x2="4.8" y2="10.8" />
          <line x1="13.2" y1="10.8" x2="14.8" y2="9.6" />
        </g>
      </svg>
    )
  }
  if (c === 'en') {
    return (
      <svg width="18" height="13" viewBox="0 0 18 13" aria-hidden="true" className="ss-flag-svg">
        <rect width="18" height="13" rx="2" fill="#012169" />
        <path d="M0,0 L18,13 M18,0 L0,13" stroke="#ffffff" strokeWidth="2.2" />
        <path d="M0,0 L18,13 M18,0 L0,13" stroke="#c8102e" strokeWidth="1" />
        <path d="M9,0 V13 M0,6.5 H18" stroke="#ffffff" strokeWidth="3.6" />
        <path d="M9,0 V13 M0,6.5 H18" stroke="#c8102e" strokeWidth="2" />
      </svg>
    )
  }
  if (c === 'ja') {
    return (
      <svg width="18" height="13" viewBox="0 0 18 13" aria-hidden="true" className="ss-flag-svg">
        <rect x="0.25" y="0.25" width="17.5" height="12.5" rx="2" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.5" />
        <circle cx="9" cy="6.5" r="3.2" fill="#bc002d" />
      </svg>
    )
  }
  if (c === 'zh') {
    return (
      <svg width="18" height="13" viewBox="0 0 18 13" aria-hidden="true" className="ss-flag-svg">
        <rect width="18" height="13" rx="2" fill="#de2910" />
        <polygon fill="#ffde00" points="4.2,2.2 4.8,4 6.6,4 5.1,5.1 5.7,6.8 4.2,5.7 2.7,6.8 3.3,5.1 1.8,4 3.6,4" />
        <circle cx="8" cy="2.3" r="0.6" fill="#ffde00" />
        <circle cx="9.2" cy="3.6" r="0.6" fill="#ffde00" />
        <circle cx="9.2" cy="5.4" r="0.6" fill="#ffde00" />
        <circle cx="8" cy="6.7" r="0.6" fill="#ffde00" />
      </svg>
    )
  }
  if (c === 'fr') {
    return (
      <svg width="18" height="13" viewBox="0 0 18 13" aria-hidden="true" className="ss-flag-svg">
        <rect width="6" height="13" fill="#002395" />
        <rect x="6" width="6" height="13" fill="#ffffff" />
        <rect x="12" width="6" height="13" fill="#ed2939" />
      </svg>
    )
  }
  if (c === 'de') {
    return (
      <svg width="18" height="13" viewBox="0 0 18 13" aria-hidden="true" className="ss-flag-svg">
        <rect width="18" height="4.34" fill="#111827" />
        <rect y="4.33" width="18" height="4.34" fill="#dd0000" />
        <rect y="8.66" width="18" height="4.34" fill="#ffce00" />
      </svg>
    )
  }
  if (c === 'th') {
    return (
      <svg width="18" height="13" viewBox="0 0 18 13" aria-hidden="true" className="ss-flag-svg">
        <rect width="18" height="13" fill="#a51931" />
        <rect y="2.1" width="18" height="8.8" fill="#f8fafc" />
        <rect y="4.2" width="18" height="4.6" fill="#2d2a4a" />
      </svg>
    )
  }
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" className="ss-flag-svg">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </svg>
  )
}

const shortOf = (l: SwitcherLocale): string => {
  if (l.shortLabel?.trim()) return l.shortLabel.trim().toUpperCase()
  if (l.code === 'vi') return 'VN'
  if (l.code === 'ko') return 'KR'
  return l.code.toUpperCase()
}

/** Chuyển ngôn ngữ giữ nguyên trang đang xem (ngôn ngữ mặc định không có tiền tố). */
export function LanguageSwitcher({
  locales,
  variant = 'code',
}: {
  locales: SwitcherLocale[]
  variant?: SwitcherVariant
}) {
  const path = usePathname() || '/'
  const t = useT()
  const { locale, defaultLocale } = useLocale()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointer = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (locales.length < 2) return null

  const first = path.split('/')[1]
  const base = locales.some((l) => l.code === first && l.code !== defaultLocale) ? path.slice(first.length + 1) || '/' : path
  const target = (code: string) => (code === defaultLocale ? base : `/${code}${base === '/' ? '' : base}`)
  const activeItem = locales.find((l) => l.code === locale) ?? locales[0]

  if (variant === 'pill-flag') {
    return (
      <nav className="ss-lang-pills" aria-label={t('nav.language')} data-hs-lang-switcher="pill-flag">
        {locales.map((l) => {
          const active = l.code === locale
          return (
            <a
              key={l.code}
              href={target(l.code)}
              lang={l.code}
              hrefLang={l.code}
              aria-current={active ? 'true' : undefined}
              title={l.label}
              className={`ss-lang-pill${active ? ' is-active' : ''}`}
            >
              <FlagSvg code={l.code} />
              <span>{shortOf(l)}</span>
            </a>
          )
        })}
      </nav>
    )
  }

  if (variant === 'dropdown-flag') {
    return (
      <div className="ss-lang-drop" ref={wrapRef} data-hs-lang-switcher="dropdown-flag">
        <button
          type="button"
          className="ss-lang-trigger"
          aria-label={t('nav.language')}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <FlagSvg code={activeItem.code} />
          <span>{shortOf(activeItem)}</span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={`ss-lang-caret${open ? ' is-open' : ''}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        {open && (
          <div className="ss-lang-menu" role="menu" aria-label={t('nav.language')}>
            {locales.map((l) => {
              const active = l.code === locale
              return (
                <a
                  key={l.code}
                  role="menuitem"
                  href={target(l.code)}
                  lang={l.code}
                  hrefLang={l.code}
                  aria-current={active ? 'true' : undefined}
                  className={`ss-lang-option${active ? ' is-active' : ''}`}
                  onClick={() => setOpen(false)}
                >
                  <FlagSvg code={l.code} />
                  <span className="ss-lang-option-label">{l.label}</span>
                  <small className="ss-lang-option-code">{shortOf(l)}</small>
                </a>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <ul className="ss-lang" aria-label={t('nav.language')} data-hs-lang-switcher="code">
      {locales.map((l) => (
        <li key={l.code}>
          <a href={target(l.code)} lang={l.code} hrefLang={l.code} aria-current={l.code === locale ? 'true' : undefined}>
            {shortOf(l)}
          </a>
        </li>
      ))}
    </ul>
  )
}
