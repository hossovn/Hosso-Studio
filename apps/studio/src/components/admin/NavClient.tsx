'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useEffect, useMemo, useRef, useState } from 'react'

export type NavChild = { label: string; href: string; exact?: boolean; badge?: number; external?: boolean }
export type NavItem = {
  id: string
  label: string
  href: string
  icon: keyof typeof ICONS
  exact?: boolean
  badge?: number
  badgeTitle?: string
  badgeTone?: 'alert'
  quick?: { href: string; label: string }
  children?: NavChild[]
}
export type NavSection = { title?: string; items: NavItem[] }

// Biểu tượng nét 24x24 vẽ riêng cho Hosso.
const P = (d: string) => <path d={d} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
const ICONS = {
  dashboard: <>{P('M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-4H4zM14 8h6V4h-6z')}</>,
  pin: <>{P('M9 4h6l-1 6 3 3v2H7v-2l3-3zM12 15v6')}</>,
  image: <>{P('M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4')}<circle cx="15.5" cy="9" r="1.4" fill="currentColor" /></>,
  file: <>{P('M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6')}</>,
  chat: <>{P('M4 5h16v11H9l-5 4z')}</>,
  form: <>{P('M5 4h14v16H5zM8 9h8M8 13h8M8 17h4')}</>,
  brush: <>{P('M14 4l6 6-8 8-6 1 1-6zM4 20c2 0 3-1 3-3')}</>,
  plug: <>{P('M9 3v5M15 3v5M6 8h12v3a6 6 0 0 1-12 0zM12 17v4')}</>,
  users: <>{P('M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c0-3.3 2.9-5.5 6.5-5.5s6.5 2.2 6.5 5.5M16 11a3 3 0 1 0-1-5.8M17.5 14.7c2.4.5 4 2.3 4 5.3')}</>,
  wrench: <>{P('M14 6a4 4 0 0 0 5 5l-9 9a2.1 2.1 0 0 1-3-3l9-9zM14 6l2-2')}</>,
  sliders: <>{P('M4 7h9M17 7h3M4 17h3M11 17h9M13 5v4M7 15v4')}</>,
  search: <>{P('M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-5-5')}</>,
  chevron: <>{P('M9 6l6 6-6 6')}</>,
  plus: <>{P('M12 5v14M5 12h14')}</>,
  external: <>{P('M14 4h6v6M20 4l-9 9M18 14v6H4V6h6')}</>,
  collapse: <>{P('M11 6l-6 6 6 6M19 6l-6 6 6 6')}</>,
}
const Icon = ({ name, size = 20 }: { name: keyof typeof ICONS; size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className="hn-icon">
    {ICONS[name]}
  </svg>
)

const KEY = 'hn-collapsed'

export function NavClient({
  sections,
  brand,
  user,
  logout,
}: {
  sections: NavSection[]
  brand: { name: string; mark: string }
  user: { email: string; role: string }
  logout: React.ReactNode
}) {
  const pathname = usePathname() || '/admin'
  const [collapsed, setCollapsed] = useState(false)
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [q, setQ] = useState('')
  const search = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const c = localStorage.getItem(KEY) === '1'
    setCollapsed(c)
    document.documentElement.dataset.hnCollapsed = c ? 'true' : 'false'
  }, [])
  useEffect(() => {
    document.documentElement.dataset.hnCollapsed = collapsed ? 'true' : 'false'
    localStorage.setItem(KEY, collapsed ? '1' : '0')
  }, [collapsed])

  // Phím "/" nhảy tới ô tìm lệnh (như thanh lệnh nhanh).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) && !el.isContentEditable) {
        e.preventDefault()
        setCollapsed(false)
        search.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const isActive = (href: string, exact?: boolean) => {
    const path = href.split('?')[0]
    return exact ? pathname === path : pathname === path || pathname.startsWith(path + '/')
  }
  const itemActive = (it: NavItem) => (it.children ?? []).some((c) => !c.external && isActive(c.href, c.exact) && !c.href.includes('?')) || isActive(it.href, it.exact)

  const flat = useMemo(
    () => sections.flatMap((s) => s.items.flatMap((i) => [{ label: i.label, href: i.href, icon: i.icon }, ...(i.children ?? []).map((c) => ({ label: `${i.label} › ${c.label}`, href: c.href, icon: i.icon }))])),
    [sections],
  )
  const matches = q.trim() ? flat.filter((f) => f.label.toLowerCase().includes(q.trim().toLowerCase())) : []

  return (
    <div className="hn" data-collapsed={collapsed}>
      <a className="hn-brand" href="/admin" title={brand.name}>
        <img src={brand.mark} alt="" width={30} height={30} />
        <span className="hn-label">
          <strong>{brand.name}</strong>
          <small>Quản trị</small>
        </span>
      </a>

      <label className="hn-search">
        <Icon name="search" size={16} />
        <span className="hn-sr">Tìm lệnh</span>
        <input
          ref={search}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setQ('')
            if (e.key === 'Enter' && matches[0]) window.location.href = matches[0].href
          }}
          placeholder="Tìm lệnh…  /"
          autoComplete="off"
        />
      </label>

      <div className="hn-scroll">
        {matches.length > 0 || q.trim() ? (
          <ul className="hn-list" aria-label="Kết quả tìm lệnh">
            {matches.length === 0 && <li className="hn-empty">Không có lệnh phù hợp</li>}
            {matches.map((m) => (
              <li key={m.href + m.label} className="hn-item">
                <Link className="hn-link" href={m.href} onClick={() => setQ('')}>
                  <Icon name={m.icon} />
                  <span className="hn-label">{m.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          sections.map((s, si) => (
            <div key={si} className="hn-section">
              {s.title && <div className="hn-heading">{s.title}</div>}
              <ul className="hn-list">
                {s.items.map((it) => {
                  const active = itemActive(it)
                  const expanded = open[it.id] ?? active
                  return (
                    <li key={it.id} className={`hn-item${active ? ' is-active' : ''}${expanded ? ' is-open' : ''}`}>
                      <div className="hn-row">
                        <Link className="hn-link" href={it.href} aria-current={active ? 'page' : undefined} title={collapsed ? it.label : undefined}>
                          <Icon name={it.icon} />
                          <span className="hn-label">{it.label}</span>
                          {it.badge ? (
                            <span className={`hn-badge${it.badgeTone === 'alert' ? ' is-alert' : ''}`} title={`${it.badge} ${it.badgeTitle ?? ''}`}>
                              {it.badge}
                            </span>
                          ) : null}
                        </Link>
                        {it.quick && (
                          <Link className="hn-quick" href={it.quick.href} title={it.quick.label} aria-label={it.quick.label}>
                            <Icon name="plus" size={14} />
                          </Link>
                        )}
                        {it.children && (
                          <button type="button" className="hn-toggle" aria-expanded={expanded} aria-label={`Mở mục con của ${it.label}`} onClick={() => setOpen({ ...open, [it.id]: !expanded })}>
                            <Icon name="chevron" size={14} />
                          </button>
                        )}
                      </div>
                      {it.children && (
                        <ul className="hn-sub">
                          <li className="hn-sub-title">{it.label}</li>
                          {it.children.map((c) => {
                            const cActive = !c.external && !c.href.includes('?') && isActive(c.href, c.exact)
                            return (
                              <li key={c.href + c.label}>
                                {c.external ? (
                                  <a href={c.href} target="_blank" rel="noreferrer">
                                    {c.label} <Icon name="external" size={12} />
                                  </a>
                                ) : (
                                  <Link href={c.href} className={cActive ? 'is-active' : undefined} aria-current={cActive ? 'page' : undefined}>
                                    {c.label}
                                    {c.badge ? <span className="hn-badge is-alert">{c.badge}</span> : null}
                                  </Link>
                                )}
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          ))
        )}
      </div>

      <div className="hn-foot">
        <a className="hn-site" href="/" target="_blank" rel="noreferrer" title="Xem website">
          <Icon name="external" size={16} />
          <span className="hn-label">Xem website</span>
        </a>
        <div className="hn-user" title={user.email}>
          <span className="hn-avatar" aria-hidden="true">
            {(user.email[0] ?? '?').toUpperCase()}
          </span>
          <span className="hn-label">
            <strong>{user.email}</strong>
            <small>{user.role}</small>
          </span>
          <span className="hn-logout">{logout}</span>
        </div>
        <button type="button" className="hn-collapse" onClick={() => setCollapsed(!collapsed)} aria-pressed={collapsed}>
          <Icon name="collapse" size={16} />
          <span className="hn-label">Thu gọn menu</span>
        </button>
      </div>
    </div>
  )
}
