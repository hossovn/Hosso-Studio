'use client'
import React, { useRef, useState } from 'react'
import { useLocale } from '@hosso/studio-blocks'
import { ResponsiveImage } from '../../../blocks/src/ResponsiveImage'

export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const { locale } = useLocale(), en = locale === 'en'
  const [index, setIndex] = useState(0), dialog = useRef<HTMLDialogElement>(null), start = useRef<number | null>(null)
  const items = [...new Set(images.filter(Boolean))].slice(0, 30)
  const move = (delta: number) => setIndex((value) => (value + delta + items.length) % items.length)
  const keys = (event: React.KeyboardEvent) => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); move(event.key === 'ArrowLeft' ? -1 : 1) } }
  if (!items.length) return <div className="sp-gallery-empty" role="img" aria-label={name}>{en ? 'No product image' : 'Chưa có ảnh sản phẩm'}</div>
  return <div className="sp-gallery sp-detail-img" role="region" aria-label={en ? 'Product gallery' : 'Ảnh sản phẩm'} onKeyDown={keys}>
    <button type="button" className="sp-gallery-main" aria-haspopup="dialog" aria-label={en ? 'Enlarge product image' : 'Phóng to ảnh sản phẩm'} onClick={() => dialog.current?.showModal()} onTouchStart={(event) => { start.current = event.touches[0].clientX }} onTouchEnd={(event) => { const delta = event.changedTouches[0].clientX - (start.current ?? event.changedTouches[0].clientX); if (Math.abs(delta) > 50) move(delta > 0 ? -1 : 1); start.current = null }}>
      <ResponsiveImage src={items[index] || items[0]} alt={`${name} — ${index + 1}`} fetchPriority={index === 0 ? 'high' : 'auto'} sizes="(max-width: 600px) 100vw, 50vw" />
    </button>
    {items.length > 1 && <div className="sp-gallery-thumbs" aria-label={en ? 'Choose image' : 'Chọn ảnh'}>{items.map((src, i) => <button type="button" key={src} aria-label={`${en ? 'Image' : 'Ảnh'} ${i + 1}`} aria-pressed={index === i} onClick={() => setIndex(i)}><ResponsiveImage src={src} alt="" sizes="80px" /></button>)}</div>}
    <p className="sp-meta" aria-live="polite">{index + 1} / {items.length} · {en ? 'Select image to zoom' : 'Chọn ảnh để phóng to'}</p>
    <dialog ref={dialog} className="sp-gallery-dialog" aria-label={`${en ? 'Enlarged image' : 'Ảnh phóng to'}: ${name}`}>
      <div className="sp-gallery-tools"><button type="button" onClick={() => move(-1)} disabled={items.length < 2}>{en ? 'Previous' : 'Ảnh trước'}</button><span>{index + 1} / {items.length}</span><button type="button" onClick={() => move(1)} disabled={items.length < 2}>{en ? 'Next' : 'Ảnh sau'}</button><button type="button" onClick={() => dialog.current?.close()} autoFocus>{en ? 'Close' : 'Đóng'}</button></div>
      <img src={items[index] || items[0]} alt={`${name} — ${index + 1}`} decoding="async" />
    </dialog>
  </div>
}
