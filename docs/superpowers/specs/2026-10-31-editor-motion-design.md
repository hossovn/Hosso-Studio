# Hosso Editor Motion Design

Approved 2026-10-31 in the current chat: preset-based editor motion and coordinated sections, not a timeline editor. The user requested all four groups and explicitly approved entrance + loop composition on one element. Looping supports both finite counts and infinite with pause; mobile storytelling stacks all steps vertically.

## Requirements

- Keep existing scroll effects. Independent layout -> scroll -> entrance -> loop -> styled content layers prevent transform collisions with rotation and hover/focus.
- Do not animate editing geometry; animate Preview and public rendering only. SSR/no-JS/unsupported APIs retain visible readable content.
- Entrance presets: none, fade, zoom, bounce, slide-up/down/left/right, rotate-in, pop, reveal-left/up, text-lines/words.
- Loop presets: none, float, pulse, sway, spin, orbit, ripple, slow-zoom, marquee.
- Explicit line breaks define text-lines; words preserve whitespace. Stagger 60ms capped at 2000ms. Text semantics must be available exactly once; decorative marquee copies are aria-hidden. Store plain text only.
- Entrance defaults 600ms, delay 0; duration 100..5000, delay 0..5000. Loop defaults 2000ms, delay 0, 3 iterations; duration 500..30000, delay 0..5000, integer iterations 1..20 or 'infinite'. Amount means px/radius, percentage scale or angle per preset, hidden for spin/marquee.
- Loop starts only after entrance completion, then its own delay. Pause retains time. Pause outside viewport/hidden document; resume only when eligible and not manually paused. Focus finishes entrance and pauses loops. Reduced motion/mobile disable reveals static content.
- One accessible pause/resume button per section containing loops, outside moving wrappers. Canvas overlays and page floating elements also have a scope.
- Persist optional _motion in existing FreeElement.props; leave _scroll data intact. Existing _scroll.mode='entrance' is a read-time fallback only if _motion.entrance is absent; explicit new 'none' overrides it. Invalid configuration produces no motion. No DB migration or new dependency.
- New settings work with duplicate, copy/paste style, undo/redo, reload and actual ZIP export/import.
- Add editable Hero floating image, staggered image gallery, and orbit/ripple section templates; use bundled assets and unique IDs; default loops finite.
- Add ScrollStory core block with steps {image,alt,title,body}. Desktop sticky image and scrolling steps select image at viewport midpoint, crossfade and subtly move/zoom layers. Reverse/fast scroll works. At width <=768px, height <=560px, or reduced motion, show image+text for every step in normal vertical flow. Editing is static. Empty, one-step and multi-step states are supported. Default three local images. Generic array form must add/delete/reorder steps.
- No timeline/keyframe editor, Lottie, WebGL, new graphics element type, container DOM reparenting or unrelated edits.

## Interfaces

```ts
type EntrancePreset = 'none'|'fade'|'zoom'|'bounce'|'slide-up'|'slide-down'|'slide-left'|'slide-right'|'rotate-in'|'pop'|'reveal-left'|'reveal-up'|'text-lines'|'text-words'
type LoopPreset = 'none'|'float'|'pulse'|'sway'|'spin'|'orbit'|'ripple'|'slow-zoom'|'marquee'
type MotionConfig = {
  entrance?: {preset: EntrancePreset; duration:number; delay:number}
  loop?: {preset:LoopPreset; duration:number; delay:number; iterations:number|'infinite'; amount:number}
  disableOnMobile?:boolean
}
normalizeMotionConfig(value:unknown):MotionConfig|null
resolveMotionConfig(props:Record<string,unknown>):MotionConfig|null
motionKeyframes(kind:'entrance'|'loop',preset:EntrancePreset|LoopPreset,amount?:number):Keyframe[]
splitMotionText(text:string,mode:'lines'|'words'):string[]
```

React components: MotionEffects({value:MotionConfig,children:ReactNode}); MotionScope({enabled:boolean,children:ReactNode}); MotionText retains original semantic text, renders animated units/decorative marquee copies. Internal optional props may be added when necessary for clipping/text integration. Runtime resolves the correct owner document and scroll viewport, including editor iframe. Do not install a library.

## Verification

Extend scripts/test-canvas.mjs, test-editor-preview.mjs and test-site-package.mjs. Assert validation, legacy precedence, independent layers, sequential start, finite/infinite timing, pause/visibility/focus/reduced cleanup, Unicode text, template copies, story forward/reverse/mobile/static rendering, ZIP preservation. Typecheck blocks and studio. Test actual editor Preview desktop/phone and keyboard pause. Run production build against an isolated snapshot, preserve unrelated working-tree changes.
