'use client'
import { localizeHref, useLocale } from '@hosso/studio-blocks'
import React from 'react'
import { cartCount, useCart } from '../cart'
import { useTr } from './useTr'

/** Liên kết giỏ hàng trên header (số lượng lấy từ localStorage của trình duyệt). */
export function CartLink() {
  const n = cartCount(useCart())
  const tr = useTr()
  const { locale, defaultLocale } = useLocale()
  return (
    <a href={localizeHref('/gio-hang', locale, defaultLocale)} aria-label={`${tr('cart.link')} (${n})`}>
      {tr('cart.link')}
      {n > 0 ? ` (${n})` : ''}
    </a>
  )
}
