'use client'
import { useEffect } from 'react'

type W = Window & { dataLayer?: unknown[]; gtag?: (...a: unknown[]) => void; fbq?: (...a: unknown[]) => void; _fbq?: unknown }
type Item = { id: string | number; name: string; price: number; quantity?: number }

/** Không vẽ gì: nạp GA4 và Meta Pixel theo mã trong admin, rồi chuyển các sự kiện hs:* của plugin Cửa hàng thành sự kiện đo lường. */
export function Tracker() {
  useEffect(() => {
    const w = window as W
    // Không theo dõi trong admin/trình dựng hoặc khi trình duyệt bật Do Not Track.
    if (/^\/(admin|editor)/.test(location.pathname) || navigator.doNotTrack === '1') return
    let off = () => {}
    let dead = false
    fetch('/api/plugins/analytics/config')
      .then((r) => r.json())
      .then((c: { ga4Id?: string; fbPixelId?: string }) => {
        if (dead) return
        const { ga4Id, fbPixelId } = c
        if (ga4Id && /^[\w-]+$/.test(ga4Id)) {
          const s = document.createElement('script')
          s.async = true
          s.src = `https://www.googletagmanager.com/gtag/js?id=${ga4Id}`
          document.head.appendChild(s)
          w.dataLayer = w.dataLayer || []
          w.gtag = function () {
            // eslint-disable-next-line prefer-rest-params
            w.dataLayer!.push(arguments)
          }
          w.gtag('js', new Date())
          w.gtag('config', ga4Id)
        }
        if (fbPixelId && /^\d+$/.test(fbPixelId)) {
          if (!w.fbq) {
            const q: unknown[][] = []
            const f = function (...a: unknown[]) {
              q.push(a)
            } as unknown as W['fbq'] & { queue: unknown[][]; loaded: boolean; version: string }
            f.queue = q
            f.loaded = true
            f.version = '2.0'
            w.fbq = f
            w._fbq = f
            const s = document.createElement('script')
            s.async = true
            s.src = 'https://connect.facebook.net/en_US/fbevents.js'
            document.head.appendChild(s)
          }
          w.fbq!('init', fbPixelId)
          w.fbq!('track', 'PageView')
        }
        const ga = (name: string, params: object) => w.gtag?.('event', name, params)
        const fb = (name: string, params: object) => w.fbq?.('track', name, params)
        const gaItems = (l: Item[]) => l.map((i) => ({ item_id: String(i.id), item_name: i.name, price: i.price, quantity: i.quantity ?? 1 }))
        const one = (e: Event) => (e as CustomEvent<Item>).detail
        const onView = (e: Event) => {
          const d = one(e)
          ga('view_item', { currency: 'VND', value: d.price, items: gaItems([d]) })
          fb('ViewContent', { content_ids: [String(d.id)], content_name: d.name, value: d.price, currency: 'VND' })
        }
        const onAdd = (e: Event) => {
          const d = one(e)
          ga('add_to_cart', { currency: 'VND', value: d.price, items: gaItems([d]) })
          fb('AddToCart', { content_ids: [String(d.id)], content_name: d.name, value: d.price, currency: 'VND' })
        }
        const onBuy = (e: Event) => {
          const d = (e as CustomEvent<{ id: string; total: number; items: { productId: string; name: string; price: number; quantity: number }[] }>).detail
          ga('purchase', { transaction_id: d.id, currency: 'VND', value: d.total, items: gaItems(d.items.map((i) => ({ id: i.productId, name: i.name, price: i.price, quantity: i.quantity }))) })
          fb('Purchase', { value: d.total, currency: 'VND', content_ids: d.items.map((i) => i.productId) })
        }
        window.addEventListener('hs:view_item', onView)
        window.addEventListener('hs:add_to_cart', onAdd)
        window.addEventListener('hs:purchase', onBuy)
        off = () => {
          window.removeEventListener('hs:view_item', onView)
          window.removeEventListener('hs:add_to_cart', onAdd)
          window.removeEventListener('hs:purchase', onBuy)
        }
      })
      .catch(() => undefined)
    return () => {
      dead = true
      off()
    }
  }, [])
  return null
}
