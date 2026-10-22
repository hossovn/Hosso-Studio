'use client'
import React, { useEffect, useRef, useState } from 'react'

type Slide = { image: string; href?: string; alt?: string }

/** Băng chuyền ảnh: cuộn ngang theo từng ảnh (scroll-snap), chấm điều hướng, tự chạy mỗi `seconds` giây (tắt khi 0 hoặc người dùng giảm chuyển động). */
export function SliderView({ slides, seconds }: { slides: Slide[]; seconds: number }) {
  const ref = useRef<HTMLUListElement>(null)
  const [i, setI] = useState(0)
  const go = (n: number) => {
    const el = ref.current
    if (!el) return
    const k = (n + slides.length) % slides.length
    el.scrollTo({ left: k * el.clientWidth, behavior: 'smooth' })
    setI(k)
  }
  useEffect(() => {
    if (!seconds || slides.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = setInterval(() => go(i + 1), seconds * 1000)
    return () => clearInterval(t)
  })
  return (
    <section className="ss-slider" aria-roledescription="carousel">
      <ul
        ref={ref}
        onScroll={(e) => {
          const el = e.currentTarget
          setI(Math.round(el.scrollLeft / el.clientWidth))
        }}
      >
        {slides.map((s, n) => (
          <li key={n} aria-label={`${n + 1} / ${slides.length}`}>
            {s.href ? (
              <a href={s.href}>
                <img src={s.image} alt={s.alt ?? ''} loading={n ? 'lazy' : 'eager'} />
              </a>
            ) : (
              <img src={s.image} alt={s.alt ?? ''} loading={n ? 'lazy' : 'eager'} />
            )}
          </li>
        ))}
      </ul>
      {slides.length > 1 && (
        <div className="ss-slider-dots">
          {slides.map((_, n) => (
            <button key={n} type="button" aria-label={`${n + 1}`} aria-current={n === i} onClick={() => go(n)} />
          ))}
        </div>
      )}
    </section>
  )
}
