'use client'
import React, { useEffect, useState } from 'react'
import { CONSENT_KEY, currentAttribution, currentExperiments, privacySignal, readConsent, type Consent } from '../../blocks/src/attribution'

type W = Window & { dataLayer?: unknown[]; gtag?: (...args: any[]) => void; fbq?: any; _fbq?: any; [key: `ga-disable-${string}`]: boolean }
const NAMES = ['page_view', 'cta_click', 'form_start', 'form_submit', 'view_item', 'add_to_cart', 'begin_checkout', 'order_placed', 'purchase', 'experiment_view']
const FB: Record<string, string> = { page_view: 'PageView', view_item: 'ViewContent', add_to_cart: 'AddToCart', begin_checkout: 'InitiateCheckout', form_submit: 'Lead', purchase: 'Purchase' }

export function Tracker() {
  const [consent, setConsent] = useState<Consent | null>(null), [open, setOpen] = useState(false), [ready, setReady] = useState(false)
  useEffect(() => {
    const sync = () => { setConsent(readConsent()); setOpen(!readConsent()) }
    sync(); setReady(!/^\/(admin|editor)(\/|$)/.test(location.pathname))
    const storage = (event: StorageEvent) => { if (!event.key || event.key === CONSENT_KEY) sync() }
    window.addEventListener('storage', storage)
    return () => window.removeEventListener('storage', storage)
  }, [])
  const choose = (value: Consent) => {
    try { localStorage.setItem(CONSENT_KEY, JSON.stringify(value)) } catch {}
    document.cookie = `hosso_consent=${value.analytics ? 'analytics' : 'essential'}; Path=/; SameSite=Lax; Max-Age=15552000${location.protocol === 'https:' ? '; Secure' : ''}`
    if (!value.analytics) { try {
      sessionStorage.removeItem('hosso-attribution'); sessionStorage.removeItem('hosso-analytics-session'); sessionStorage.removeItem('hosso-experiments')
      Object.keys(localStorage).filter((key) => key.startsWith('hosso-ab:') || key.startsWith('hosso-event:')).forEach((key) => localStorage.removeItem(key))
    } catch {} }
    setConsent(value); setOpen(false); window.dispatchEvent(new CustomEvent('hs:consent', { detail: value }))
  }
  useEffect(() => {
    if (!ready || privacySignal()) return
    const w = window as unknown as W
    let dead = false, gaId = '', scripts: HTMLScriptElement[] = [], config: { ga4Id?: string; fbPixelId?: string } = {}, queue: { name: string; detail: any }[] = []
    let configured = false
    const allowed = () => !dead && (consent?.analytics || consent?.marketing)
    const script = (src: string, key: string) => {
      if (document.querySelector(`script[data-hosso-tracker="${key}"]`)) return
      const node = document.createElement('script'); node.async = true; node.src = src; node.dataset.hossoTracker = key; scripts.push(node); document.head.append(node)
    }
    const send = (name: string, detail: any) => {
      if (!allowed()) return
      if (!configured) { if (queue.length < 30) queue.push({ name, detail }); return }
      const attribution = currentAttribution(), eventId = crypto.randomUUID()
      if (['purchase', 'order_placed', 'form_submit'].includes(name) && detail.id) {
        const key = `hosso-event:${name}:${detail.id}`
        try { if (localStorage.getItem(key)) return; localStorage.setItem(key, '1') } catch {}
      }
      const items = Array.isArray(detail.items) ? detail.items.slice(0, 100).map((item: any) => ({ item_id: String(item.productId || item.id || ''), item_name: String(item.name || '').slice(0, 160), price: Number(item.price) || 0, quantity: Number(item.quantity) || 1 })) : detail.id && detail.name ? [{ item_id: String(detail.id), item_name: String(detail.name).slice(0, 160), price: Number(detail.price) || 0, quantity: 1 }] : undefined
      const params = { currency: 'VND', value: Number(detail.total ?? detail.price) || undefined, transaction_id: name === 'purchase' ? String(detail.id) : undefined, form_id: typeof detail.form === 'string' ? detail.form.slice(0, 100) : undefined, items, page_location: location.origin + location.pathname, ...attribution }
      if (consent?.analytics) {
        w.gtag?.('event', name, params)
        if (!['purchase', 'order_placed', 'form_submit'].includes(name)) {
          let session = ''
          try { session = sessionStorage.getItem('hosso-analytics-session') || crypto.randomUUID(); sessionStorage.setItem('hosso-analytics-session', session) } catch { session = crypto.randomUUID() }
          const assignments = currentExperiments()
          const experiments = name === 'experiment_view' ? { ...(assignments[detail.experiment] ? { [detail.experiment]: assignments[detail.experiment] } : {}) } : assignments
          void fetch('/api/plugins/analytics/events', { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: eventId, event: name, session, consent: true, attribution, experiments }) }).catch(() => {})
        }
      }
      if (consent?.marketing && FB[name]) w.fbq?.('track', FB[name], { currency: 'VND', value: params.value, content_ids: items?.map((item: any) => item.item_id) }, { eventID: detail.id ? `${name}:${detail.id}` : eventId })
    }
    const events = NAMES.map((name) => { const listener = (event: Event) => send(name, (event as CustomEvent).detail || {}); window.addEventListener(`hs:${name}`, listener); return { name, listener } })
    const click = (event: MouseEvent) => { if ((event.target as Element)?.closest?.('a[href],button[data-hs-part="submit"],[data-hs-cta]')) send('cta_click', {}) }
    document.addEventListener('click', click)
    if (consent?.analytics || consent?.marketing) void fetch('/api/plugins/analytics/config').then((response) => response.json()).then((settings) => {
      if (!allowed()) return
      config = settings
      if (consent.analytics && /^G-[A-Z0-9]+$/i.test(config.ga4Id || '')) {
        gaId = config.ga4Id!; w[`ga-disable-${gaId}`] = false; w.dataLayer ||= []
        w.gtag ||= function () { w.dataLayer!.push(arguments) }
        w.gtag('consent', 'update', { analytics_storage: 'granted', ad_storage: consent.marketing ? 'granted' : 'denied', ad_user_data: 'denied', ad_personalization: 'denied' })
        script(`https://www.googletagmanager.com/gtag/js?id=${gaId}`, 'ga4')
        w.gtag('js', new Date()); w.gtag('config', gaId, { send_page_view: false, allow_google_signals: false })
      }
      if (consent.marketing && /^\d+$/.test(config.fbPixelId || '')) {
        if (!w.fbq) { const f: any = function (...args: any[]) { if (f.callMethod) f.callMethod(...args); else f.queue.push(args) }; f.queue = []; f.loaded = true; f.version = '2.0'; w.fbq = f; w._fbq = f }
        w.fbq('consent', 'grant'); w.fbq('init', config.fbPixelId); script('https://connect.facebook.net/en_US/fbevents.js', 'meta')
      }
      configured = true; send('page_view', {}); queue.forEach((item) => send(item.name, item.detail)); queue = []
    }).catch(() => { configured = true; queue.forEach((item) => send(item.name, item.detail)); queue = [] })
    return () => {
      dead = true; queue = []
      events.forEach(({ name, listener }) => window.removeEventListener(`hs:${name}`, listener)); document.removeEventListener('click', click)
      if (gaId) { w[`ga-disable-${gaId}`] = true; w.gtag?.('consent', 'update', { analytics_storage: 'denied', ad_storage: 'denied' }) }
      w.fbq?.('consent', 'revoke'); scripts.forEach((node) => node.remove())
    }
  }, [consent, ready])
  if (!ready) return null
  return <div style={{ position: 'fixed', bottom: 12, left: 12, zIndex: 9990, font: '14px/1.5 system-ui', color: '#17251e', maxWidth: 'calc(100vw - 24px)' }}>
    {open ? <section role="region" aria-label="Tùy chọn quyền riêng tư" style={{ background: '#fff', border: '1px solid #ccd8d0', borderRadius: 10, padding: 20, maxWidth: 420, boxShadow: '0 4px 24px #0002' }}><strong>Tùy chọn quyền riêng tư</strong><p>Cho phép đo lường để cải thiện website và quảng cáo phù hợp. Bạn có thể thay đổi lựa chọn bất kỳ lúc nào.</p><div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}><button type="button" style={{ padding: 10 }} onClick={() => choose({ analytics: false, marketing: false })}>Chỉ cần thiết</button><button type="button" style={{ padding: 10 }} onClick={() => choose({ analytics: true, marketing: false })}>Cho phép đo lường</button><button type="button" style={{ padding: 10 }} onClick={() => choose({ analytics: true, marketing: true })}>Cho phép tất cả</button></div></section> : <button type="button" onClick={() => setOpen(true)} style={{ background: '#fff', color: '#17251e', border: '1px solid #ccd8d0', borderRadius: 6, padding: '8px 12px', minHeight: 44 }}>Quyền riêng tư</button>}
  </div>
}
