'use client'
import React from 'react'
import { cartCount, useCart } from '../cart'

/** Liên kết giỏ hàng trên header (số lượng lấy từ localStorage của trình duyệt). */
export function CartLink() {
  const n = cartCount(useCart())
  return (
    <a href="/gio-hang" aria-label={`Giỏ hàng, ${n} sản phẩm`}>
      Giỏ hàng{n > 0 ? ` (${n})` : ''}
    </a>
  )
}
