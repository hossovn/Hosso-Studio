'use client'
import React, { useEffect, useRef, useState } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { A11y, Autoplay, EffectFade, Keyboard, Navigation, Pagination } from 'swiper/modules'
import type { Swiper as SwiperInstance } from 'swiper'

export type FreeSlide = { image: string; alt?: string; text?: string }

const SWIPER_CTRL_CSS = `
.hs-swiper-ctrl{display:flex;align-items:center;justify-content:center;gap:8px;padding-top:10px}
.hs-swiper-ctrl button{width:34px;height:34px;border-radius:999px;border:1px solid #d1d5db;background:#fff;color:#111827;display:inline-grid;place-items:center;cursor:pointer}
.hs-swiper-ctrl button:focus-visible{outline:2px solid #111827;outline-offset:2px}
@media(prefers-reduced-motion:no-preference){
  .hs-swiper-ctrl button{transition:transform 160ms cubic-bezier(.23,1,.32,1),background-color 160ms cubic-bezier(.23,1,.32,1)}
  .hs-swiper-ctrl button:active{transform:scale(.96)}
}
`

export function FreeSwiper({
  slides,
  seconds = 0,
  editing = false,
  effect = 'slide',
  thumbnails = false,
  perView = 1,
  gap = 0,
  slideRadius = 0,
  playToggle = false,
  playToggleLabel = 'Điều khiển băng chuyền',
}: {
  slides: FreeSlide[]
  seconds?: number
  editing?: boolean
  effect?: 'slide' | 'fade'
  thumbnails?: boolean
  perView?: number
  gap?: number
  slideRadius?: number
  playToggle?: boolean
  playToggleLabel?: string
}) {
  const [motion, setMotion] = useState(false)
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const swiper = useRef<SwiperInstance | null>(null)
  useEffect(() => {
    const q = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setMotion(!q.matches)
    update()
    q.addEventListener('change', update)
    return () => q.removeEventListener('change', update)
  }, [])
  if (!slides.length) return <div style={{ height: '100%', display: 'grid', placeItems: 'center', background: '#e5e7eb', color: '#374151' }}>Swiper</div>
  const cards = effect === 'fade' ? 1 : Math.min(4, Math.max(1, Number(perView) || 1))
  const space = Math.min(64, Math.max(0, Number(gap) || (cards > 1 ? 16 : 0)))
  const rad = Math.min(48, Math.max(0, Number(slideRadius) || 0))
  const auto = !editing && motion && !paused && seconds > 0
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <Swiper
        key={`${editing}-${motion}-${seconds}-${effect}-${cards}-${space}`}
        modules={[A11y, Autoplay, EffectFade, Keyboard, Navigation, Pagination]}
        effect={effect}
        fadeEffect={{ crossFade: true }}
        slidesPerView={editing ? cards : 1}
        spaceBetween={space}
        breakpoints={
          !editing && cards > 1
            ? {
                640: { slidesPerView: Math.min(2, cards), spaceBetween: space },
                960: { slidesPerView: cards, spaceBetween: space },
              }
            : undefined
        }
        speed={motion ? (effect === 'fade' ? 400 : 300) : 0}
        onSwiper={(instance) => {
          swiper.current = instance
          setActive(instance.activeIndex)
        }}
        onSlideChange={(instance) => setActive(instance.activeIndex)}
        navigation={!editing && !playToggle && slides.length > 1}
        pagination={!editing && slides.length > 1 ? { clickable: true } : false}
        keyboard={{ enabled: !editing, onlyInViewport: true }}
        allowTouchMove={!editing}
        autoplay={auto ? { delay: Math.max(1, seconds) * 1000, disableOnInteraction: true } : false}
        resizeObserver
        style={{ width: '100%', height: '100%', flex: 1, minHeight: 0, minWidth: 0 }}
      >
        {slides.map((slide, i) => (
          <SwiperSlide key={i} style={{ position: 'relative', borderRadius: rad ? `${rad}px` : undefined, overflow: rad ? 'hidden' : undefined }}>
            <img src={slide.image} alt={slide.alt || ''} style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }} />
            {slide.text && <p style={{ position: 'absolute', bottom: 16, left: 20, right: 20, margin: 0, color: '#fff', textShadow: '0 1px 4px #000' }}>{slide.text}</p>}
          </SwiperSlide>
        ))}
      </Swiper>
      {thumbnails && slides.length > 1 && (
        <div className="hs-swiper-thumbs" role="group" aria-label="Slides">
          {slides.map((slide, i) => (
            <button
              key={i}
              type="button"
              disabled={editing}
              aria-label={`Slide ${i + 1}${slide.alt ? ': ' + slide.alt : ''}`}
              aria-current={active === i ? 'true' : undefined}
              onClick={() => {
                swiper.current?.autoplay?.stop()
                swiper.current?.slideTo(i)
              }}
            >
              <img src={slide.image} alt="" />
            </button>
          ))}
        </div>
      )}
      {playToggle && slides.length > 1 && (
        <div className="hs-swiper-ctrl" role="group" aria-label={playToggleLabel}>
          <style>{SWIPER_CTRL_CSS}</style>
          <button type="button" disabled={editing} aria-label="Slide trước" onClick={() => swiper.current?.slidePrev()}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          {seconds > 0 && (
            <button
              type="button"
              disabled={editing}
              aria-pressed={paused}
              aria-label={paused ? 'Tiếp tục tự chạy' : 'Tạm dừng tự chạy'}
              onClick={() => {
                const next = !paused
                setPaused(next)
                if (next) swiper.current?.autoplay?.stop()
                else swiper.current?.autoplay?.start()
              }}
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {paused ? <polygon points="6 3 20 12 6 21 6 3" /> : <><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></>}
              </svg>
            </button>
          )}
          <span style={{ fontSize: 13, fontWeight: 600, color: '#4b5563', fontVariantNumeric: 'tabular-nums', minWidth: 42, textAlign: 'center' }}>
            {active + 1} / {slides.length}
          </span>
          <button type="button" disabled={editing} aria-label="Slide tiếp theo" onClick={() => swiper.current?.slideNext()}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
