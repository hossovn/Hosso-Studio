'use client'
import React, { useEffect, useState } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { A11y, Autoplay, Keyboard, Navigation, Pagination } from 'swiper/modules'

export type FreeSlide = { image: string; alt?: string; text?: string }
export function FreeSwiper({ slides, seconds = 0, editing = false }: { slides: FreeSlide[]; seconds?: number; editing?: boolean }) {
  const [motion, setMotion] = useState(false)
  useEffect(() => {
    const q = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setMotion(!q.matches)
    update()
    q.addEventListener('change', update)
    return () => q.removeEventListener('change', update)
  }, [])
  if (!slides.length) return <div style={{ height: '100%', display: 'grid', placeItems: 'center', background: '#e5e7eb', color: '#374151' }}>Swiper</div>
  return <Swiper key={String(editing) + String(motion) + seconds} modules={[A11y, Autoplay, Keyboard, Navigation, Pagination]} navigation={!editing && slides.length > 1} pagination={!editing && slides.length > 1 ? { clickable: true } : false} keyboard={{ enabled: !editing, onlyInViewport: true }} allowTouchMove={!editing} autoplay={!editing && motion && seconds > 0 ? { delay: Math.max(1, seconds) * 1000, disableOnInteraction: true } : false} resizeObserver style={{ width: '100%', height: '100%', minWidth: 0 }}>
    {slides.map((slide, i) => <SwiperSlide key={i} style={{ position: 'relative' }}><img src={slide.image} alt={slide.alt || ''} style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }} />{slide.text && <p style={{ position: 'absolute', bottom: 16, left: 20, right: 20, margin: 0, color: '#fff', textShadow: '0 1px 4px #000' }}>{slide.text}</p>}</SwiperSlide>)}
  </Swiper>
}
