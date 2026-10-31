'use client'
import { addToCart as addProduct, type CartLine } from '@hosso/plugin-shop/cart'
export { useCart, setQuantity, removeFromCart, clearCart, cartTotal, cartCount } from '@hosso/plugin-shop/cart'
export type { Cart, CartLine } from '@hosso/plugin-shop/cart'

// Old WIM callers carry upstream IDs; checkout resolves them to Product IDs.
export function addToCart(line: Omit<CartLine, 'quantity'>, quantity = 1) {
  addProduct({ ...line, productId: line.productId.startsWith('wim:') ? line.productId : 'wim:' + line.productId }, quantity)
}
