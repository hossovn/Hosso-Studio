'use client'
import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useLocale, useEditorPreview } from '@hosso/studio-blocks'
import { cartSnapshot, lineKey, replaceCart, useCart, type CartLine } from '../cart'

type Remote = { owner: string; revision: number; generation: string; lines: CartLine[] }
const META = 'hs_saved_cart_meta'
const sessionMarker = () => { try { return localStorage.getItem('hs_account_session') } catch { return null } }
type Status = { message: string; conflict: boolean; count: number; canMerge: boolean; resolve?: (choice: string) => void; retry?: () => void }
const EMPTY: Status = { message: '', conflict: false, count: 0, canMerge: false }
let status = EMPTY
const listeners = new Set<() => void>()
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
const publish = (next: Status) => { status = next; listeners.forEach((listener) => listener()) }
const same = (a: CartLine[], b: CartLine[]) => JSON.stringify(a.map((line) => [lineKey(line), line.quantity]).sort()) === JSON.stringify(b.map((line) => [lineKey(line), line.quantity]).sort())
export function SavedCartRuntime() {
  const { locale } = useLocale()
  const preview = useEditorPreview()
  return preview ? null : <SavedCartSync en={locale === 'en'} />
}
export function SavedCartSync({ en }: { en: boolean }) {
  const cart = useCart(), [remote, setRemote] = useState<Remote | null>(null), [conflict, setConflict] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [retry, setRetry] = useState(0)
  const lifecycle = useRef(0), pending = useRef<AbortController | null>(null)
  useEffect(() => {
    const refresh = () => { lifecycle.current++; pending.current?.abort(); setRemote(null); setBusy(false); setRetry((n) => n + 1) }
    const logout = () => { refresh(); replaceCart([]); try { localStorage.removeItem(META) } catch {} }
    const visible = () => { if (document.visibilityState === 'visible') refresh() }
    const storage = (event: StorageEvent) => { if (event.key === 'hs_account_session') refresh() }
    window.addEventListener('hs:account-change', refresh)
    window.addEventListener('hs:account-logout', logout)
    window.addEventListener('focus', refresh)
    window.addEventListener('storage', storage)
    document.addEventListener('visibilitychange', visible)
    const timer = setInterval(visible, 60_000)
    return () => {
      lifecycle.current++; pending.current?.abort(); publish(EMPTY)
      window.removeEventListener('hs:account-change', refresh)
      window.removeEventListener('hs:account-logout', logout)
      window.removeEventListener('focus', refresh)
      window.removeEventListener('storage', storage)
      document.removeEventListener('visibilitychange', visible)
      clearInterval(timer)
    }
  }, [])
  useEffect(() => {
    const generation = ++lifecycle.current, controller = new AbortController(), session = sessionMarker()
    pending.current?.abort(); pending.current = controller
    setRemote(null); setBusy(false); setMessage(''); setConflict(false)
    const current = () => !controller.signal.aborted && generation === lifecycle.current && session === sessionMarker()
    void fetch('/api/plugins/shop/saved-cart', { cache: 'no-store', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]) }).then(async (res) => {
      if (res.status === 401) {
        if (current()) try {
          if (JSON.parse(localStorage.getItem(META) || 'null')?.owner) replaceCart([])
          localStorage.removeItem(META)
        } catch {}
        return null
      }
      if (!res.ok) throw new Error('unavailable')
      return res.json()
    }).then((data) => {
      if (!current() || !data?.ok) return
      const local = cartSnapshot()
      let previous: any
      try { previous = JSON.parse(localStorage.getItem(META) || 'null') } catch {}
      if ((previous?.owner && previous.owner !== data.owner) || (!local.lines.length && data.lines.length && (!previous?.owner || previous.generation === local.id))) replaceCart(data.lines, data.generation)
      else if (same(local.lines, data.lines) && data.generation && local.id !== data.generation) replaceCart(data.lines, data.generation)
      else if (local.lines.length && data.lines.length && !same(local.lines, data.lines) && previous?.generation !== local.id) setConflict(true)
      else if (previous?.owner === data.owner && previous.revision !== data.revision && !same(local.lines, data.lines)) setConflict(true)
      setRemote(data)
      // Remember ownership before saving, including an unchanged or empty basket.
      try { localStorage.setItem(META, JSON.stringify({ owner: data.owner, revision: data.revision, generation: same(cartSnapshot().lines, data.lines) ? cartSnapshot().id : previous?.owner === data.owner ? previous.generation : '' })) } catch {}
    }).catch(() => { if (current()) setMessage(en ? 'Saved cart unavailable. Your local cart is kept.' : 'Chưa tải được giỏ đã lưu. Giỏ trên máy này vẫn được giữ.') })
    return () => { controller.abort() }
  }, [retry, en])
  useEffect(() => {
    if (!remote || conflict || busy || remote.generation === cart.id || !cart.id || (!remote.generation && !cart.lines.length)) return
    const generation = lifecycle.current
    const timer = setTimeout(() => {
      const local = cartSnapshot()
      const controller = new AbortController(), session = sessionMarker()
      pending.current = controller
      const current = () => !controller.signal.aborted && generation === lifecycle.current && session === sessionMarker()
      setBusy(true)
      void fetch('/api/plugins/shop/saved-cart', { method: 'POST', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]), headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ owner: remote.owner, revision: remote.revision, generation: local.id, lines: local.lines }) }).then(async (res) => {
        if (!current()) return
        if ([400, 401, 409].includes(res.status)) { setRemote(null); setRetry((n) => n + 1); return }
        if (!res.ok) throw new Error('save_failed')
        const result = await res.json()
        if (!current()) return
        const next = { ...remote, revision: result.revision, generation: local.id, lines: local.lines }
        try { localStorage.setItem(META, JSON.stringify({ owner: next.owner, revision: next.revision, generation: next.generation })) } catch {}
        setRemote(next); setMessage(en ? 'Cart saved to your account.' : 'Đã lưu giỏ vào tài khoản.')
      }).catch(() => { if (current()) { setRemote(null); setMessage(en ? 'Unable to sync. Your local cart is kept.' : 'Chưa đồng bộ được. Giỏ trên máy này vẫn được giữ.') } }).finally(() => { if (current()) setBusy(false) })
    }, 600)
    return () => clearTimeout(timer)
  }, [cart.id, remote, conflict, busy, en])
  const resolve = (choice: string) => {
    if (!remote) return
    if (choice === 'remote') {
      replaceCart(remote.lines, remote.generation)
      try { localStorage.setItem(META, JSON.stringify({ owner: remote.owner, revision: remote.revision, generation: cartSnapshot().id })) } catch {}
    }
    if (choice === 'merge') {
      const lines = cartSnapshot().lines.map((line) => ({ ...line }))
      for (const line of remote.lines) { const prior = lines.find((item) => lineKey(item) === lineKey(line)); if (prior) prior.quantity = Math.max(prior.quantity, line.quantity); else lines.push(line) }
      replaceCart(lines)
    }
    if (choice === 'local') replaceCart(cartSnapshot().lines)
    setConflict(false)
  }
  useEffect(() => { publish({ message, conflict: conflict && !!remote, count: remote?.lines.length || 0, canMerge: new Set([...cart.lines, ...(remote?.lines || [])].map(lineKey)).size <= 50, resolve, retry: !remote ? () => setRetry((n) => n + 1) : undefined }) })
  return null
}

export function SavedCart({ en }: { en: boolean }) {
  const state = useSyncExternalStore(subscribe, () => status, () => EMPTY)
  if (state.conflict) return <div className="sp-note" role="status"><p>{en ? 'Your account has a different saved cart. Choose which items to keep.' : 'Tài khoản có giỏ khác trên máy chủ. Chọn giỏ bạn muốn giữ.'}</p><div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}><button type="button" className="sp-btn" onClick={() => state.resolve?.('remote')}>{en ? 'Restore saved cart' : 'Khôi phục giỏ đã lưu'} ({state.count})</button><button type="button" className="sp-link" onClick={() => state.resolve?.('local')}>{en ? 'Keep this cart' : 'Giữ giỏ trên máy này'}</button><button type="button" className="sp-link" disabled={!state.canMerge} onClick={() => state.resolve?.('merge')}>{en ? 'Combine carts' : 'Gộp hai giỏ'}</button></div></div>
  return state.message ? <p className="sp-meta" role="status">{state.message} {state.retry && <button type="button" className="sp-link" onClick={state.retry}>{en ? 'Retry' : 'Thử lại'}</button>}</p> : null
}
