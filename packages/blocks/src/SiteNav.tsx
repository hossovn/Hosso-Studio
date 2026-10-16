'use client'
import React, { useId, useState } from 'react'
import type { MenuItem } from './types'
import { t } from './strings.vi'

/**
 * Menu đầu trang dùng chung cho mọi theme: nút bật/tắt trên di động, dropdown mở bằng hover hoặc bàn phím trên máy tính.
 * Theme tự tạo kiểu qua tiền tố class `cls` (ví dụ `hs-nav`, `hs-nav-toggle`, `hs-nav-list`, `hs-nav-sub`).
 */
export function SiteNav({ items, cls }: { items: MenuItem[]; cls: string }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  if (!items.length) return null
  return (
    <nav className={cls} aria-label={t('nav.main')}>
      <button type="button" className={`${cls}-toggle`} aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
        {t('nav.menu')}
      </button>
      <ul id={id} className={`${cls}-list${open ? ' is-open' : ''}`}>
        {items.map((item, i) => (
          <li key={i} className={item.children?.length ? 'has-sub' : undefined}>
            <a href={item.href}>{item.label}</a>
            {!!item.children?.length && (
              <ul className={`${cls}-sub`}>
                {item.children.map((c, j) => (
                  <li key={j}>
                    <a href={c.href}>{c.label}</a>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </nav>
  )
}
