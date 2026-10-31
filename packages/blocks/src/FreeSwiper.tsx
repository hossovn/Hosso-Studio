'use client'
import React, { useEffect, useRef, useState } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { A11y, Autoplay, EffectFade, Keyboard, Navigation, Pagination } from 'swiper/modules'
import type { Swiper as SwiperInstance } from 'swiper'

export type FreeSlide = { image: string; alt?: string; text?: string }
export function FreeSwiper({ slides, seconds = 0, editing = false, effect = 'slide', thumbnails = false }: { slides: FreeSlide[]; seconds?: number; editing?: boolean; effect?: 'slide' | 'fade'; thumbnails?: boolean }) {
  const [motion, setMotion] = useState(false)
  const [active, setActive] = useState(0)
  const swiper = useRef<SwiperInstance | null>(null)
  useEffect(() => {
    const q = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setMotion(!q.matches)
    update()
    q.addEventListener('change', update)
    return () => q.removeEventListener('change', update)
  }, [])
  if (!slides.length) return <div style={{ height: '100%', display: 'grid', placeItems: 'center', background: '#e5e7eb', color: '#374151' }}>Swiper</div>
  return <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
    <Swiper key={String(editing) + String(motion) + seconds + effect} modules={[A11y, Autoplay, EffectFade, Keyboard, Navigation, Pagination]} effect={effect} fadeEffect={{ crossFade: true }} speed={motion ? effect === 'fade' ? 400 : 300 : 0} onSwiper={(instance) => { swiper.current = instance; setActive(instance.activeIndex) }} onSlideChange={(instance) => setActive(instance.activeIndex)} navigation={!editing && slides.length > 1} pagination={!editing && slides.length > 1 ? { clickable: true } : false} keyboard={{ enabled: !editing, onlyInViewport: true }} allowTouchMove={!editing} autoplay={!editing && motion && seconds > 0 ? { delay: Math.max(1, seconds) * 1000, disableOnInteraction: true } : false} resizeObserver style={{ width: '100%', height: '100%', flex: 1, minHeight: 0, minWidth: 0 }}>
    {slides.map((slide, i) => <SwiperSlide key={i} style={{ position: 'relative' }}><img src={slide.image} alt={slide.alt || ''} style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }} />{slide.text && <p style={{ position: 'absolute', bottom: 16, left: 20, right: 20, margin: 0, color: '#fff', textShadow: '0 1px 4px #000' }}>{slide.text}</p>}</SwiperSlide>)}
    </Swiper>
    {thumbnails && slides.length > 1 && <div className="hs-swiper-thumbs" role="group" aria-label="Slides">
      {slides.map((slide, i) => <button key={i} type="button" disabled={editing} aria-label={`Slide ${i + 1}${slide.alt ? ': ' + slide.alt : ''}`} aria-current={active === i ? 'true' : undefined} onClick={() => { swiper.current?.autoplay?.stop(); swiper.current?.slideTo(i) }}><img src={slide.image} alt="" /></button>)}
    </div>}
  </div>
}
