'use client'

import { useEffect, useRef, useState } from 'react'
import { activeStoryStep, storyCanPin, storyProgress, storyViewportMidpoint } from './scroll-story'

export type ScrollStoryStep = { image: string; alt: string; title: string; body: string }

const css = `
.hs-scroll-story{max-width:1200px;margin-inline:auto;padding:clamp(24px,5vw,72px)}
.hs-scroll-story__step{margin:0 0 48px}
.hs-scroll-story__step img{display:block;width:100%;height:auto;aspect-ratio:4/3;object-fit:cover;border-radius:12px}
.hs-scroll-story__step h2{font-size:clamp(28px,3vw,46px);line-height:1.16;margin:22px 0 12px}
.hs-scroll-story__step p{font-size:clamp(16px,1.5vw,20px);line-height:1.6;white-space:pre-line;margin:0}
.hs-scroll-story[data-hs-story-pin] .hs-scroll-story__layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:clamp(32px,5vw,80px)}
.hs-scroll-story__visual{position:sticky;top:calc(var(--hs-story-height, 100vh) * .08);height:calc(var(--hs-story-height, 100vh) * .84);align-self:start;overflow:hidden;border-radius:12px}
.hs-scroll-story__visual img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transform:scale(1.05);transition:opacity .55s ease,transform .9s ease}
.hs-scroll-story__visual img[data-active]{opacity:1;transform:scale(var(--hs-story-scale, 1.02))}
.hs-scroll-story[data-hs-story-pin] .hs-scroll-story__step{min-height:calc(var(--hs-story-height, 100vh) * .82);display:flex;flex-direction:column;justify-content:center;margin:0;opacity:.62;transform:translateY(8px);transition:opacity .45s ease,transform .6s ease}
.hs-scroll-story[data-hs-story-pin] .hs-scroll-story__step[data-active]{opacity:1;transform:translateY(var(--hs-story-shift, 0px))}
.hs-scroll-story[data-hs-story-pin] .hs-scroll-story__step img{display:none}
@media (max-width:768px),(max-height:560px),(prefers-reduced-motion:reduce){
  .hs-scroll-story[data-hs-story-pin] .hs-scroll-story__layout{display:block}
  .hs-scroll-story__visual{display:none}
  .hs-scroll-story[data-hs-story-pin] .hs-scroll-story__step{min-height:0;display:block;margin:0 0 48px;opacity:1;transform:none;transition:none}
  .hs-scroll-story[data-hs-story-pin] .hs-scroll-story__step img{display:block}
}`

export function ScrollStory({ steps, _motionEditing }: { steps?: ScrollStoryStep[]; _motionEditing?: boolean }) {
  const items = Array.isArray(steps) ? steps : []
  const root = useRef<HTMLElement>(null)
  const stepNodes = useRef<(HTMLElement | null)[]>([])
  const [pinned, setPinned] = useState(false)
  const [active, setActive] = useState(0)

  useEffect(() => {
    const anchor = root.current
    const doc = anchor?.ownerDocument
    const win = doc?.defaultView
    if (!anchor || !doc || !win?.matchMedia || !win.requestAnimationFrame) return
    const reduced = win.matchMedia('(prefers-reduced-motion: reduce)')
    let scrollRoot: HTMLElement | null = anchor.parentElement
    while (scrollRoot && (scrollRoot === doc.body || scrollRoot === doc.documentElement || scrollRoot.scrollHeight <= scrollRoot.clientHeight || !/(auto|scroll)/.test(win.getComputedStyle(scrollRoot).overflowY))) scrollRoot = scrollRoot.parentElement
    let frame = 0
    const update = () => {
      frame = 0
      const rects = stepNodes.current.slice(0, items.length).map((node) => node?.getBoundingClientRect() ?? { top: 0, bottom: 0 })
      const midpoint = storyViewportMidpoint(scrollRoot?.getBoundingClientRect() ?? null, win.innerHeight)
      const next = activeStoryStep(rects, midpoint)
      const progress = storyProgress(rects[next], midpoint)
      anchor.style.setProperty('--hs-story-scale', String(1.035 - progress * .035))
      anchor.style.setProperty('--hs-story-shift', `${Math.round((.5 - progress) * 16)}px`)
      setActive(next)
    }
    const schedule = () => { if (!frame) frame = win.requestAnimationFrame(update) }
    const resize = () => {
      const next = storyCanPin(Math.min(win.innerWidth, scrollRoot?.clientWidth ?? win.innerWidth), Math.min(win.innerHeight, scrollRoot?.clientHeight ?? win.innerHeight), reduced.matches, !!_motionEditing, items.length)
      setPinned(next)
      if (next) {
        anchor.style.setProperty('--hs-story-height', `${scrollRoot?.clientHeight ?? win.innerHeight}px`)
        schedule()
      }
    }
    resize()
    ;(scrollRoot ?? win).addEventListener('scroll', schedule, { passive: true })
    win.addEventListener('resize', resize)
    reduced.addEventListener?.('change', resize)
    return () => {
      ;(scrollRoot ?? win).removeEventListener('scroll', schedule)
      win.removeEventListener('resize', resize)
      reduced.removeEventListener?.('change', resize)
      if (frame) win.cancelAnimationFrame(frame)
      anchor.style.removeProperty('--hs-story-height')
      anchor.style.removeProperty('--hs-story-scale')
      anchor.style.removeProperty('--hs-story-shift')
    }
  }, [items.length, _motionEditing])

  if (!items.length) return _motionEditing ? <div role="note" style={{ padding: 24, textAlign: 'center' }}>Thêm bước để tạo câu chuyện cuộn.</div> : null

  return <section ref={root} className="hs-scroll-story" data-hs-story-pin={pinned ? 'true' : undefined}>
    <style>{css}</style>
    <div className="hs-scroll-story__layout">
      {pinned && <div className="hs-scroll-story__visual">
        {items.map((step, index) => step.image && <img key={index} src={step.image} alt={step.alt || ''} aria-hidden={index !== active} data-active={index === active ? 'true' : undefined} />)}
      </div>}
      <div>
        {items.map((step, index) => <article key={index} ref={(node) => { stepNodes.current[index] = node }} className="hs-scroll-story__step" data-active={pinned && index === active ? 'true' : undefined}>
          {step.image && <img src={step.image} alt={step.alt || ''} />}
          {step.title && <h2>{step.title}</h2>}
          {step.body && <p>{step.body}</p>}
        </article>)}
      </div>
    </div>
  </section>
}
