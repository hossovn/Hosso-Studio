'use client'

import React, { useState } from 'react'

/** Thư viện ảnh sản phẩm: ảnh lớn, mũi tên chuyển ảnh và dải ảnh nhỏ. */
export function Gallery({ images, alt, prev, next }: { images: string[]; alt: string; prev: string; next: string }) {
  const [i, setI] = useState(0)
  const n = images.length
  if (!n) return <span className="wp-noimg" aria-hidden="true" />
  const go = (d: number) => setI((i + d + n) % n)
  return (
    <div className="wp-gallery">
      <div className="wp-gallery-main">
        <img src={images[i]} alt={alt} decoding="async" />
        {n > 1 && (
          <>
            <button type="button" className="wp-gal-btn is-prev" aria-label={prev} onClick={() => go(-1)}>‹</button>
            <button type="button" className="wp-gal-btn is-next" aria-label={next} onClick={() => go(1)}>›</button>
          </>
        )}
      </div>
      {n > 1 && (
        <ul className="wp-thumbs">
          {images.map((src, k) => (
            <li key={src + k}>
              <button type="button" aria-label={`${alt} ${k + 1}`} aria-current={k === i} onClick={() => setI(k)}>
                <img src={src} alt="" loading="lazy" decoding="async" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Băng chuyền ngang cho sản phẩm tương tự (cuộn mượt, có mũi tên). */
export function Carousel({ children, prev, next }: { children: React.ReactNode; prev: string; next: string }) {
  const ref = React.useRef<HTMLUListElement>(null)
  const by = (d: number) => ref.current?.scrollBy({ left: d * (ref.current.clientWidth * 0.9), behavior: 'smooth' })
  return (
    <div className="wp-carousel">
      <button type="button" className="wp-gal-btn is-prev" aria-label={prev} onClick={() => by(-1)}>‹</button>
      <ul className="wp-carousel-track" ref={ref}>{children}</ul>
      <button type="button" className="wp-gal-btn is-next" aria-label={next} onClick={() => by(1)}>›</button>
    </div>
  )
}

/** Nút chia sẻ: Facebook, email, sao chép liên kết (dùng địa chỉ trang đang xem). */
export function Share({ name, label, copy, done }: { name: string; label: string; copy: string; done: string }) {
  const [ok, setOk] = useState(false)
  const url = () => (typeof window === 'undefined' ? '' : window.location.href)
  return (
    <div className="wp-share" aria-label={label}>
      <a className="wp-share-btn" aria-label="Facebook" href="#" rel="noopener noreferrer" onClick={(e) => { e.preventDefault(); window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url()), '_blank', 'noopener,noreferrer') }}>f</a>
      <a className="wp-share-btn" aria-label="Email" href="#" onClick={(e) => { e.preventDefault(); window.location.href = 'mailto:?subject=' + encodeURIComponent(name) + '&body=' + encodeURIComponent(url()) }}>@</a>
      <button
        type="button"
        className="wp-share-btn"
        aria-label={ok ? done : copy}
        title={ok ? done : copy}
        onClick={() => {
          void navigator.clipboard?.writeText(url())
          setOk(true)
          setTimeout(() => setOk(false), 2000)
        }}
      >
        {ok ? '✓' : '⧉'}
      </button>
    </div>
  )
}
