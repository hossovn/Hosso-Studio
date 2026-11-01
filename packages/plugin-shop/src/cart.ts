'use client'
import { useSyncExternalStore } from 'react'

// Giỏ hàng nằm ở trình duyệt (localStorage); khách không cần tài khoản, đơn chỉ được lưu khi khách bấm đặt hàng.
export type CartLine = { productId: string; variantId?: string; name: string; price: number; quantity: number; image?: string }
/** Khóa một dòng giỏ: sản phẩm (và biến thể nếu có). */
export const lineKey = (l: Pick<CartLine, 'productId' | 'variantId'>) => `${l.productId}${l.variantId ? `:${l.variantId}` : ''}`
export type Cart = { id: string; lines: CartLine[] }

const KEY = 'hs_shop_cart'
const EVENT = 'hs-shop-cart-change'
const EMPTY: Cart = { id: '', lines: [] }

const newId = () => (globalThis.crypto?.randomUUID?.() ?? `c-${Date.now()}-${Math.random().toString(36).slice(2)}`)
const qty = (n: number) => Number.isFinite(n) ? Math.max(1, Math.min(99, Math.trunc(n))) : 1
export function validCartLine(line: unknown): line is CartLine {
  const l = line as CartLine | null
  return Boolean(l && typeof l.productId === 'string' && l.productId.length > 0 && l.productId.length <= 200 && (!l.variantId || typeof l.variantId === 'string') && typeof l.name === 'string' && Number.isSafeInteger(l.price) && l.price >= 0 && Number.isInteger(l.quantity) && l.quantity >= 1 && l.quantity <= 99)
}

let lastRaw: string | null = null
let lastCart: Cart = EMPTY
let storageUnavailable = false

function read(): Cart {
  if (typeof localStorage === 'undefined') return EMPTY
  if (storageUnavailable) return lastCart
  // Save the replacement first so a full storage quota cannot erase the old cart.
  let legacy: string | null = null
  try { legacy = localStorage.getItem('hs_cart') } catch { return lastCart }
  if (legacy) {
    try {
      const old = JSON.parse(legacy)
      const current = JSON.parse(localStorage.getItem(KEY) || 'null')
      if (old?.id && Array.isArray(old.lines)) {
        const lines: CartLine[] = Array.isArray(current?.lines) ? current.lines.filter(validCartLine) : []
        for (const line of old.lines) {
          const migrated = { ...line, productId: `wim:${line.productId}` }
          if (!validCartLine(migrated)) continue
          const i = lines.findIndex((l) => lineKey(l) === lineKey(migrated))
          if (i < 0) lines.push(migrated)
          else lines[i] = { ...lines[i], quantity: Math.min(99, lines[i].quantity + line.quantity) }
        }
        localStorage.setItem(KEY, JSON.stringify({ id: current?.id || old.id, lines }))
        localStorage.removeItem('hs_cart')
      }
    } catch { /* Keep the legacy cart when migration cannot finish. */ }
  }
  let raw: string | null
  try { raw = localStorage.getItem(KEY) } catch { return lastCart }
  if (raw === lastRaw) return lastCart
  lastRaw = raw
  try {
    const parsed = raw ? JSON.parse(raw) : null
    lastCart = typeof parsed?.id === 'string' && Array.isArray(parsed.lines) ? { id: parsed.id, lines: parsed.lines.filter(validCartLine).slice(0, 50) } : EMPTY
  } catch {
    lastCart = EMPTY
  }
  return lastCart
}

function write(cart: Cart) {
  const raw = JSON.stringify(cart)
  try { localStorage.setItem(KEY, raw) } catch { storageUnavailable = true }
  lastRaw = raw
  lastCart = cart
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
  quantity = qty(quantity)
  if (!validCartLine({ ...line, quantity })) return
  const cart = read()
  const lines = [...cart.lines]
  const i = lines.findIndex((l) => lineKey(l) === lineKey(line))
  if (i >= 0) lines[i] = { ...lines[i], ...line, quantity: qty(lines[i].quantity + quantity) }
  else if (lines.length < 50) lines.push({ ...line, quantity })
  write({ id: newId(), lines })
}

export function setQuantity(key: string, quantity: number) {
  const cart = read()
  const lines = cart.lines.map((l) => (lineKey(l) === key ? { ...l, quantity: qty(quantity) } : l))
  if (JSON.stringify(lines) !== JSON.stringify(cart.lines)) write({ id: newId(), lines })
}

export function removeFromCart(key: string) {
  const cart = read()
  const lines = cart.lines.filter((l) => lineKey(l) !== key)
  if (lines.length !== cart.lines.length) write({ id: newId(), lines })
}

/** Sau khi đặt thành công: xóa giỏ và đổi cartId để giỏ mới có Idempotency-Key mới. */
export function clearCart() {
  write({ id: newId(), lines: [] })
}

/** A delayed response from another tab must not erase a newer basket. */
export function consumeCart(expectedId: string) {
  if (read().id === expectedId) clearCart()
}

/** Stable for network retries and reloads, unique for a later purchase of the same items. */
export async function checkoutIdentity(cartId: string, input: Record<string, unknown>) {
  const bytes = new TextEncoder().encode(JSON.stringify({ cartId, ...input }))
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), (b) => b.toString(16).padStart(2, '0')).join('')
}

export function renewCart() { write({ ...read(), id: newId() }) }

/** Refresh only server-owned display metadata; never change quantities during a quote. */
export function refreshCart(lines: (CartLine & { source?: string; remoteId?: string })[]) {
  const cart = read()
  const next = cart.lines.map((line) => {
    const live = lines.find((l) => lineKey(l) === lineKey(line) || (l.source === 'wim' && line.productId === `wim:${l.remoteId}` && (line.variantId || '') === (l.variantId || '')))
    return live && validCartLine({ ...live, quantity: line.quantity }) ? { ...line, name: live.name, price: live.price, image: live.image } : line
  })
  if (JSON.stringify(next) !== JSON.stringify(cart.lines)) write({ ...cart, lines: next })
}

export const cartTotal = (cart: Cart) => cart.lines.reduce((sum, l) => sum + l.price * l.quantity, 0)
export const cartCount = (cart: Cart) => cart.lines.reduce((sum, l) => sum + l.quantity, 0)
