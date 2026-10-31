# Hosso Editor Motion Presets Implementation Plan

> For agentic workers: use superpowers:subagent-driven-development or superpowers:executing-plans. Track steps with checkboxes.

**Goal:** All four motion groups in the current editor with entrance + loop composition.
**Architecture:** Keep scroll layer; add independent entrance/loop layers and a shared pause scope. Reuse element types and block schema forms for responsive ScrollStory.
**Tech Stack:** React, TypeScript, Web Animations API, IntersectionObserver, CSS. No dependencies.
**Spec:** ../specs/2026-10-31-editor-motion-design.md (approved chat requirements).

## Global constraints

Follow the design's exact presets, timings, accessibility and compatibility rules. No animation in editing. Keep existing dirty changes. Use rtk shell commands. Root coordinates selective commits to avoid including unrelated changes; workers must not touch git index/branch state. No merge, push or publish.

## Tasks

- [x] Task 1: motion-effects.ts normalization/presets/text splitting and exports, assert tests in test-canvas.mjs. Test first (missing module -> FAIL), implement, rerun. Validate legacy fallback vs explicit none, numeric bounds, Unicode/whitespace, cycle endpoints. Commit: feat: define editor motion presets.
- [x] Task 2: MotionEffects.tsx and MotionScope.tsx runtime with mock lifecycle tests. First intersection creates entrance only, finish creates loop. Support loop-only, visibility pause retaining progress, user pause, focus, reduced/mobile settings, cleanup. Commit: feat: compose entrance and looping motion.
- [x] Task 3: integrate FreeCanvas.tsx and CanvasStage.tsx layers/scopes; add MotionControls to CanvasInspector; keep ScrollEffectControls for scroll only; include _motion in canvas-model STYLE_KEYS. SSR/editing/duplicate/paste/history checks. Commit: feat: expose motion controls in canvas editor.
- [x] Task 4: MotionText.tsx line/word reveal and marquee, semantic text once, 60ms stagger capped 2000ms, no innerHTML. Plain original text during editing. Real text/whitespace/mobile/reduced checks. Commit: feat: add text reveal and marquee presets.
- [x] Task 5: three editable templates in SectionTemplates.ts and demo example of entrance+loop. Test unique IDs/assets/configs and direct editing. Commit: feat: add editable motion section templates.
- [x] Task 6: ScrollStory.tsx and pure geometry tests, core schema/fallback/export/catalog registration, generic array reorder if missing. Desktop sticky image, midpoint step selection/crossfade/parallax; phone/short viewport/reduced static stack; editing static. Empty/one/many cases, default three local images. Commit: feat: add responsive scroll storytelling block.
- [x] Task 7: actual ZIP round-trip for _motion and ScrollStory; integration tests and both typechecks; desktop/phone Preview, keyboard pause, reverse scroll, reduced/no-JS/overflow checks; isolated production build. Add usage docs/screenshots. Commit: test: verify editor motion compatibility.

## Commands

```powershell
rtk proxy node --experimental-strip-types scripts/test-canvas.mjs
rtk proxy node --experimental-strip-types scripts/test-editor-preview.mjs
rtk proxy node scripts/test-site-package.mjs
rtk proxy pnpm --filter @hosso/studio-blocks typecheck
rtk proxy pnpm --filter @hosso/studio typecheck
rtk git diff --check
```

## Completion

All four groups editable and visible, composition works with scroll/hover, user pause retains time, responsive story works in iframe/public rendering, old saved content and ZIP settings survive, tests/typechecks/build pass. Real-device feel remains manual acceptance if no device is available.

## Verification completed (2026-11-01)

Canvas, preview (including focused motion/runtime/story tests), ZIP round-trip, blocks/studio typechecks, diff check and isolated production build passed. Browser Preview: desktop/390px, keyboard pause/resume, reverse story scroll, all three mobile images, no horizontal overflow. Reduced motion and no-API/no-JS fallback are covered by runtime/SSR tests. Actual device touch/motion feel remains manual acceptance.

Production build checkout required copying the existing ignored local cross-sell plugin used by site config; no plugin changes were added to motion commits.
