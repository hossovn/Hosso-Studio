'use client'
import React, { useEffect, useRef, useState } from 'react'

/** Băng chuyền thẻ có mũi tên trái/phải: cuộn ngang theo scroll-snap (vuốt được trên điện thoại), mũi tên mờ đi khi hết chỗ cuộn. */
export function Carousel({ children, label }: { children: React.ReactNode; label?: string }) {
  const ref = useRef<HTMLUListElement>(null)
  const [edge, setEdge] = useState({ start: true, end: true })
  const sync = () => {
    const el = ref.current
    if (el) setEdge({ start: el.scrollLeft < 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 })
  }
  useEffect(() => {
    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [])
  const go = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.85, behavior: 'smooth' })
  return (
    <div className="sp-carousel" role="group" aria-roledescription="carousel" aria-label={label}>
      <ul className="sp-grid sp-car" ref={ref} onScroll={sync}>
        {children}
      </ul>
      <button type="button" className="sp-car-btn is-prev" aria-label="‹" disabled={edge.start} onClick={() => go(-1)}>
        ‹
      </button>
      <button type="button" className="sp-car-btn is-next" aria-label="›" disabled={edge.end} onClick={() => go(1)}>
        ›
      </button>
    </div>
  )
}
