'use client'
import { useSyncExternalStore } from 'react'

// Giỏ hàng nằm ở trình duyệt (localStorage); khách không cần tài khoản, Studio không lưu giỏ hay đơn.
export type CartLine = { productId: string; name: string; price: number; quantity: number }
export type Cart = { id: string; lines: CartLine[] }

const KEY = 'hs_cart'
const EVENT = 'hs-cart-change'
const EMPTY: Cart = { id: '', lines: [] }

const newId = () => (globalThis.crypto?.randomUUID?.() ?? `c-${Date.now()}-${Math.random().toString(36).slice(2)}`)

let lastRaw: string | null = null
let lastCart: Cart = EMPTY

function read(): Cart {
  if (typeof localStorage === 'undefined') return EMPTY
  const raw = localStorage.getItem(KEY)
  if (raw === lastRaw) return lastCart
  lastRaw = raw
  try {
    const parsed = raw ? JSON.parse(raw) : null
    lastCart = parsed?.id && Array.isArray(parsed.lines) ? parsed : EMPTY
  } catch {
    lastCart = EMPTY
  }
  return lastCart
}

function write(cart: Cart) {
  localStorage.setItem(KEY, JSON.stringify(cart))
  window.dispatchEvent(new Event(EVENT))
}

const subscribe = (cb: () => void) => {
  window.addEventListener(EVENT, cb)
  window.addEventListener('storage', cb)
  return () => {
    window.removeEventListener(EVENT, cb)
    window.removeEventListener('storage', cb)
  }
}

export const useCart = (): Cart => useSyncExternalStore(subscribe, read, () => EMPTY)

export function addToCart(line: Omit<CartLine, 'quantity'>, quantity = 1) {
  const cart = read()
  const lines = [...cart.lines]
  const i = lines.findIndex((l) => l.productId === line.productId)
  if (i >= 0) lines[i] = { ...lines[i], price: line.price, quantity: Math.min(99, lines[i].quantity + quantity) }
  else lines.push({ ...line, quantity })
  write({ id: cart.id || newId(), lines })
}

export function setQuantity(productId: string, quantity: number) {
  const cart = read()
  const lines = cart.lines.map((l) => (l.productId === productId ? { ...l, quantity: Math.max(1, Math.min(99, quantity)) } : l))
  write({ ...cart, lines })
}

export function removeFromCart(productId: string) {
  const cart = read()
  write({ ...cart, lines: cart.lines.filter((l) => l.productId !== productId) })
}

/** Sau khi đặt thành công: xóa giỏ và đổi cartId để giỏ mới có Idempotency-Key mới. */
export function clearCart() {
  write({ id: newId(), lines: [] })
}

export const cartTotal = (cart: Cart) => cart.lines.reduce((sum, l) => sum + l.price * l.quantity, 0)
export const cartCount = (cart: Cart) => cart.lines.reduce((sum, l) => sum + l.quantity, 0)
