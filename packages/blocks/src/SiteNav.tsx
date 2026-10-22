'use client'
import React, { useId, useState } from 'react'
import type { MenuItem } from './types'
import { useT } from './locale-client'

// Đệ quy: mỗi cấp con là một <ul class="{cls}-sub"> (cấp 3 trở lên thêm class `{cls}-sub-n`); mục có ảnh hiện thumbnail cạnh tên.
const Items = ({ items, cls, depth }: { items: MenuItem[]; cls: string; depth: number }) => (
  <>
    {items.map((item, i) => (
      <li key={i} className={item.children?.length ? 'has-sub' : undefined}>
        <a href={item.href}>
          {item.image && <img className={`${cls}-img`} src={item.image} alt="" loading="lazy" />}
          <span>{item.label}</span>
        </a>
        {!!item.children?.length && (
          <ul className={`${cls}-sub${depth > 1 ? ` ${cls}-sub-n` : ''}`}>
            <Items items={item.children} cls={cls} depth={depth + 1} />
          </ul>
        )}
      </li>
    ))}
  </>
)

/**
 * Menu đầu trang dùng chung cho mọi theme: nút bật/tắt trên di động, dropdown mở bằng hover hoặc bàn phím trên máy tính.
 * Menu nhiều cấp, mỗi mục có thể có ảnh. `mega`: chỉ một nút (mặc định "Danh mục") mở danh sách dọc, cấp con bung sang bên (kiểu menu danh mục của cửa hàng).
 * Theme tự tạo kiểu qua tiền tố class `cls` (ví dụ `hs-nav`, `hs-nav-toggle`, `hs-nav-list`, `hs-nav-sub`).
 */
export function SiteNav({ items, cls, mega, label }: { items: MenuItem[]; cls: string; mega?: boolean; label?: string }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const id = useId()
  if (!items.length) return null
  return (
    <nav className={`${cls}${mega ? ` ${cls}-mega` : ''}`} aria-label={mega ? (label ?? t('nav.categories')) : t('nav.main')}>
      <button type="button" className={`${cls}-toggle`} aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
        {label ?? (mega ? t('nav.categories') : t('nav.menu'))}
      </button>
      <ul id={id} className={`${cls}-list${open ? ' is-open' : ''}`}>
        <Items items={items} cls={cls} depth={1} />
      </ul>
    </nav>
  )
}
