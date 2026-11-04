'use client'
import React, { useEffect, useRef, useState } from 'react'
import type { BlockRenderer } from './types'
import { popupNumber, popupTrigger, scrollPercent } from './popup-state'

const activePopups = new WeakMap<Document, symbol>()

export const PopupBlock: BlockRenderer = ({ id, title, body, image, ctaLabel, ctaHref, delay, every, trigger, triggerKey, scrollAt, device, enabled, _noFree, _motionEditing }: any) => {
  const dialog = useRef<HTMLDialogElement>(null)
  const owner = useRef(Symbol('popup'))
  const [open, setOpen] = useState(false)
  const editing = Boolean(_noFree || _motionEditing), mode = popupTrigger(trigger)
  const key = `hs-popup:${id}`, target = String(triggerKey || id)
  const release = () => { if (activePopups.get(document) === owner.current) { activePopups.delete(document); document.dispatchEvent(new Event('hs-popup-closed')) } }
  const store = () => every === 'once' ? localStorage : sessionStorage
  const canShow = () => {
    if (enabled === 'no') return false
    if (device === 'mobile' && !matchMedia('(max-width: 639px)').matches) return false
    if (device === 'desktop' && matchMedia('(max-width: 639px)').matches) return false
    return true
  }
  useEffect(() => {
    if (editing) return
    let fired = false
    let pending: boolean | null = null
    const show = (manual = false) => {
      if (!canShow() || (fired && !manual)) return
      try { if (!manual && ['session', 'once'].includes(every) && store().getItem(key)) return } catch {}
      if (activePopups.has(document) && activePopups.get(document) !== owner.current) { pending = manual; return }
      activePopups.set(document, owner.current); pending = null
      fired = true; setOpen(true)
      try { if (['session', 'once'].includes(every)) store().setItem(key, '1') } catch {}
    }
    const click = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const anchor = (event.target as Element)?.closest?.('a[href]')
      if (anchor?.getAttribute('href') !== `#popup:${target}`) return
      event.preventDefault(); show(true)
    }
    const scroll = () => { if (scrollPercent(window.scrollY, document.documentElement.scrollHeight, window.innerHeight) >= popupNumber(scrollAt, 50, 100)) show() }
    document.addEventListener('click', click)
    const resume = () => { if (pending !== null) show(pending) }
    document.addEventListener('hs-popup-closed', resume)
    let timer: ReturnType<typeof setTimeout> | undefined
    if (mode === 'delay') timer = setTimeout(() => show(), popupNumber(delay, 5, 3600) * 1000)
    if (mode === 'scroll') { window.addEventListener('scroll', scroll, { passive: true }); scroll() }
    return () => { clearTimeout(timer); document.removeEventListener('click', click); document.removeEventListener('hs-popup-closed', resume); window.removeEventListener('scroll', scroll); release() }
  }, [editing, key, target, mode, delay, scrollAt, every, enabled, device])
  useEffect(() => {
    const node = dialog.current
    if (!node || editing) return
    if (open && !node.open) node.showModal()
    if (!open && node.open) node.close()
    if (!open) return
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = overflow; release() }
  }, [open, editing])
  const href = typeof ctaHref === 'string' && /^(https?:\/\/|\/(?!\/)|#|mailto:|tel:)/i.test(ctaHref.trim()) ? ctaHref.trim() : '#'
  const card = <>
    {image && <img src={image} alt="" style={{ width: '100%', maxHeight: 240, objectFit: 'cover', display: 'block' }} />}
    <div style={{ padding: '24px', textAlign: 'center' }}>
      {title && <h3 style={{ margin: '0 0 8px', fontSize: 24 }}>{title}</h3>}
      {body && <p style={{ margin: '0 0 18px', color: '#4b5563', whiteSpace: 'pre-wrap' }}>{body}</p>}
      {ctaLabel && <a href={href} onClick={(event) => { if (editing) event.preventDefault(); else setOpen(false) }} style={{ display: 'inline-block', padding: '12px 24px', borderRadius: 8, background: '#2d7b57', color: '#fff', fontWeight: 600, textDecoration: 'none' }}>{ctaLabel}</a>}
    </div>
  </>
  const style: React.CSSProperties = { width: 'min(92vw, 460px)', maxHeight: '90dvh', padding: 0, border: 0, borderRadius: 16, background: '#fff', color: '#111827', font: '16px/1.5 system-ui,sans-serif', overflow: 'auto', boxShadow: '0 24px 60px #11182740' }
  if (editing) return <div style={{ padding: 28, background: '#f3f4f6', display: 'grid', justifyItems: 'center', gap: 12 }}><small>Popup · {mode === 'click' ? 'mở bằng nút bấm' : mode === 'scroll' ? `cuộn đến ${popupNumber(scrollAt, 50, 100)}%` : `hiện sau ${popupNumber(delay, 5, 3600)} giây`}</small><div style={style}>{card}</div></div>
  return <><style>{'.hs-popup::backdrop{background:#11182788}'}</style><dialog ref={dialog} className="hs-popup" style={style} aria-label={title || 'Popup'} onClose={() => setOpen(false)} onCancel={() => setOpen(false)} onClick={(event) => { const rect = event.currentTarget.getBoundingClientRect(); if (event.target === event.currentTarget && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) setOpen(false) }}><button type="button" aria-label="Đóng popup" onClick={() => setOpen(false)} style={{ position: 'absolute', top: 8, right: 8, width: 34, height: 34, border: 0, borderRadius: 8, background: '#111827cc', color: '#fff', cursor: 'pointer', fontSize: 22 }}>×</button>{card}</dialog></>
}
