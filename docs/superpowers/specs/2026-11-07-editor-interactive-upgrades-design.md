# Hosso Studio Editor — Interactive & Visual Parity Upgrades (Phase 1 / Đợt 1)

- **Date:** 2026-11-07
- **Status:** Draft for User Review
- **Target Benchmark:** 100% no-code visual & interactive parity with `https://menumate.vn` inside Hosso Studio's Editor (Phase 1 covers all visual, motion, layout, and interactive canvas/form/header capabilities; Phase 2 covers dynamic multi-locale admin configuration and real-time/polling Staff Live Chat + Floating Contact Dock).

---

## 1. Problem Statement & Goals

Hosso Studio's FreeCanvas + Puck Editor already provides responsive absolute/auto-layout frames (`container`), element hover/focus/active states (`_states`), entrance/loop/scroll motion (`MotionEffects`, `MotionText`, `ScrollEffect`), popups (`#popup:<id>`), and custom forms (`Forms` + `FormView`).

However, building a modern interactive SaaS/product site like `menumate.vn` purely inside Studio's visual editor currently hits six concrete capability gaps:

1. **No runtime interactive frame state switching (`#state`) or anchored popovers (`#popover`):** `FrameVariant` (`_variants` on `container` in `packages/blocks/src/design-presets.ts`) only stamps presets at edit time; buttons/elements on the live site cannot switch a target frame between variants (needed for 3–7-tab device showcases, step switchers, and dual workflow tabs) or toggle an anchored dropdown/QR popover card (`#popover`).
2. **Missing/incomplete Canvas interactive & visual primitives:**
   - No `accordion` element (`<details>/<summary>` FAQ with rotating `+`/chevron icon).
   - `video` only supports native browser `<video controls>` or YouTube iframe, lacking a clean borderless `<video playsInline>` with a custom overlay play/pause bar (`"Xem phim"`).
   - `swiper` (`FreeSwiper.tsx`) is locked to 1 slide per view and lacks an accessible Prev / Play-Pause Autoplay / Next control bar.
   - `shape` lacks `radial-gradient` fill and Gaussian `blur` filter (needed for soft ambient auras behind mockups/mascots).
3. **Single-column, rigid `Form` rendering:** `FormView.tsx` stacks every field 100% wide with no half-width (`50%`) grid option, no submit button icon (`↗`), and no `data-hs-part` hooks for visual per-part styling in `WidgetPartsInspector`.
4. **Static `siteHeader` wrapper:** Custom `siteHeader` areas in `apps/studio/src/app/(site)/layout.tsx` render with `position: relative` only — lacking sticky positioning, frosted-glass `backdrop-filter` (with reduced-transparency fallback), a scroll-linked reading progress bar, and an option to hide hardcoded top-right `slots` when the user designs their own header actions on Canvas.
5. **Canvas-only section height & flat background overlay:** `FreeCanvasView` only sizes height by `cqw` design pixels and only supports single-color flat `bgOverlay`, missing viewport-height hero sizing (`calc(100svh - 82px)` with `min-height`) and 2-color directional gradient overlays.
6. **Missing fonts, icons, and starter interactive templates:** `Manrope`, `Inter`, `Plus Jakarta Sans`, and `Noto Sans KR` are missing from `FREE_FONTS` / site `FONTS`; several UI/device icons are missing from `FREE_ICONS`; and `SectionTemplates.ts` lacks ready-to-customize interactive `FreeElement[]` templates.

### Non-Goals (Deferred to Phase 2 / Đợt 2)
- Dynamic multi-locale management (`vi`, `ko`, `en`, etc.) in Admin without editing `hosso.config.ts`.
- Floating Contact Dock (`ContactFloat`) upgrades + real-time/polling visitor-to-staff Live Chat (`/api/chat` + Admin inbox).
- Schema-locked one-off "MenuMate blocks" — every visual element must remain 100% editable as native Canvas primitives.

---

## 2. Architecture & Data Contracts

All upgrades extend existing Hosso Studio primitives **without requiring any SQLite schema migration** (leveraging existing JSON columns: `pages.content`, `reusable-blocks.content`, `site-areas.siteHeader`, and `forms.rules`) and strictly preserve the package boundary (`packages/blocks` and `apps/studio/src` never import `@hosso/plugin-wim`).

### 2.1 Interactive Frame Variants (`#state:<frameId>:<variantId>`) & Anchored Popovers (`#popover:<frameId>`)

#### Link Action Contract (`packages/blocks/src/link-actions.ts`)
- Extend `LinkAction`:
  ```ts
  export type LinkAction = 'none' | 'url' | 'popup' | 'section' | 'phone' | 'email' | 'state' | 'popover'
  ```
- Encoding format in `href` (allowed by `SAFE_HREF` `/^(https?:\/\/|\/|#|mailto:|tel:)/i` since both start with `#`):
  - `state`: `#state:<frameId>:<variantId>` where `frameId` and `variantId` match `/^[a-zA-Z0-9_-]+$/`.
    - `readLinkAction('#state:frame_1:tab_2')` → `{ type: 'state', value: 'frame_1:tab_2', frameId: 'frame_1', variantId: 'tab_2' }`.
  - `popover`: `#popover:<frameId>` where `frameId` matches `/^[a-zA-Z0-9_-]+$/`.
    - `readLinkAction('#popover:qr_zalo')` → `{ type: 'popover', value: 'qr_zalo', frameId: 'qr_zalo' }`.
- Security validation (`actions.ts` / `normalizeFormRules` / client runtime): IDs strictly match `/^[a-zA-Z0-9_-]{1,64}$/`; max `20` variants per container (already enforced by Editor UI, also guarded in runtime helpers).

#### Frame Variant Switching & Stable Child IDs (`packages/blocks/src/design-presets.ts`)
- Keep `FrameVariant = { id: string; name: string; elements: FreeElement[] }` on `container.props._variants` and active variant ID on `container.props._variant`.
- Add `ensureDefaultFrameVariant(list: FreeElement[], rootId: string): FreeElement[]`: when a user converts a Frame into an interactive switcher or adds its first variant, captures the current frame family as `{ id: 'default', name: 'Mặc định', elements: ... }` and sets `_variant: 'default'`.
- Add `switchFrameVariant(list: FreeElement[], rootId: string, nextVariantId: string, newId: () => string): FreeElement[]`:
  1. Snapshots the currently mounted child tree of `rootId` back into its matching entry in `root.props._variants` (auto-saving edits made on the current tab in the Editor before switching!).
  2. Applies `nextVariantId`'s `elements` to `rootId`, **preserving each stored child's `el.id`** (only calling `newId()` if an `id` collides with an element outside `rootId`'s family).
  3. Updates `root.props._variant = nextVariantId`.
- Add `materializeFrameVariant(list: FreeElement[], rootId: string, variantId: string): FreeElement[]` (pure read-only projection for public/preview runtime): returns `list` with `rootId`'s subtree replaced by `variantId`'s elements translated to `root.x, root.y` (plus device responsive offsets) without minting random IDs.

#### Public & Preview Runtime Controller (`packages/blocks/src/FreeInteractiveScope.tsx` + `FreeCanvas.tsx`)
- Wrap `FreeOverlay` (and `FreeFloatLayer` for page/header floating elements) in a lightweight client component `FreeInteractiveScope`:
  - **State Map:** `activeVariants: Record<frameId, variantId>` initialized from each container's `el.props._variant || el.props._variants?.[0]?.id`.
  - **Popover State:** `openPopover: { frameId: string; triggerEl: HTMLElement } | null`.
  - **Trigger Interception & Accessibility Enhancement:**
    - Any clickable element (`button`, `image`, `shape`, `icon`, `text`, `container` link) whose `href` parses as `state` or `popover` renders as `<button type="button">` (or intercepts click on `<a>` with `e.preventDefault()`) when not in `editing` mode:
      - For `#state:<frameId>:<variantId>`: sets `role="tab"`, `aria-selected={isActive}`, `aria-controls={frameDomId}`, `data-hs-state={isActive ? 'active' : undefined}`, and supports Left/Right/Up/Down arrow roving between sibling triggers targeting the same `frameId`! Setting `data-hs-state="active"` automatically activates the designer's configured `Active` state styling from `packages/blocks/src/element-states.ts` (`${scope}[data-hs-state=active]`).
      - Target container renders `role="tabpanel"` and transitions variant content using GPU-only `opacity` (`0 → 1`) + `transform: translateY(4px → 0)` over `180ms cubic-bezier(0.23, 1, 0.32, 1)` (instant under `prefers-reduced-motion: reduce`).
      - For `#popover:<frameId>`: container marked `_isPopover: true` (or targeted by `#popover:`) is hidden on the normal flow canvas on the live site (`display: none` in flow; visible when selected in Editor!) and rendered via `createPortal(..., document.body)` when open:
        - Positioned with `position: fixed` anchored below/aligned to `triggerEl.getBoundingClientRect()`, clamped within `[8px, window.innerWidth - width - 8px]` and `[8px, window.innerHeight - height - 8px]`, updated on passive `scroll`/`resize`.
        - Trigger carries `aria-expanded={isOpen}`, `aria-controls`, `aria-haspopup="dialog"`, and `data-hs-state={isOpen ? 'active' : undefined}`.
        - Dismisses on outside `pointerdown` or `Escape` (returning focus to `triggerEl`), animating in with `opacity: 0 → 1` and `transform: scale(0.96) translateY(-4px) → scale(1) translateY(0)` (`160ms cubic-bezier(0.23, 1, 0.32, 1)`, `transform-origin` matching anchor side).

#### Editor UX (`ActionPanel.tsx`, `DesignPanel.tsx`, `FreeCanvasEditor.tsx`)
- Follows `apps/studio/src/app/(editor)/DESIGN.md` (`Operate` mode: `#2d7b57` accent, `#edf5ef` pale green active chip, neutral `#ffffff`/`#f4f6f8` chrome, 11–13px `system-ui`, no unsolicited popups):
  - `ActionPanel.tsx`: Add `'Trạng thái khung (Tab)'` (`state`) with Frame selector + Variant selector, and `'Hộp nổi neo nút (Popover)'` (`popover`) with Frame selector + toggle to mark target Frame `_isPopover = true`.
  - `DesignPanel.tsx` & `FreeCanvasEditor.tsx`: When selecting a `container` that has `_variants` (or `_isPopover`), show a compact horizontal Variant Pill Bar (`+ Trạng thái`, click pill to call `switchFrameVariant`, rename/reorder/remove variant) both in the right panel and as a subtle top toolbar above the selected frame on Canvas.

#### Content-Only Lock & Embedded Loader Safety (`content-editing.ts`, `site.tsx`)
- Update `packages/blocks/src/content-editing.ts`:
  - Recursively preserve and merge content keys inside `el.props._variants[].elements` (matched by variant `id` and element `id`) so `contentOnlyPage` and `isContentOnlyChange` allow content editors to translate/edit copy and images inside every tab variant without unlocking geometry.
- Update `apps/studio/src/lib/site.tsx` (`attachBlockData`):
  - Traverse `_variants[].elements` in addition to `_els` and `_float` when discovering and loading embedded `widget` blocks (such as `Form`).

---

### 2.2 Canvas Interactive & Visual Primitives

1. **`accordion` (`FreeType` addition)**
   - Files: `packages/blocks/src/FreeCanvas.tsx`, `packages/blocks/src/free-extra.tsx` (`FreeAccordion`), `packages/blocks/src/content-editing.ts`, `apps/studio/src/app/(editor)/editor/[id]/CanvasInspector.tsx`, `apps/studio/src/app/(editor)/editor/[id]/CanvasLeft.tsx`.
   - Props on `el.props`:
     - `items: { question: string; answer: string; defaultOpen?: boolean }[]` (default 3 sample FAQ items; max 40 items).
     - `exclusive?: boolean` (when `true`, passes a shared `name` attribute to `<details>` so opening one closes siblings natively).
     - `iconStyle?: 'plus' | 'chevron'` (default `'plus'`: `+` rotates `45deg` into `×` when `[open]`; `'chevron'` rotates `180deg`).
     - Styling props (scaled via `u()`): `size` (question px, default `18`), `answerSize` (default `15`), `weight` (default `700`), `color` (`#111827`), `answerColor` (`#4b5563`), `accent` (`#111827`), `bg` (`#ffffff`), `borderColor` (`#e5e7eb`), `borderW` (`1`), `radius` (`14`), `gap` (`12`), `padX` (`20`), `padY` (`18`), `font`.
   - Accessibility & Motion: Native `<details>` / `<summary>` with `list-style: none` (`::-webkit-details-marker { display: none }`), clear `:focus-visible` ring, GPU `transform` icon rotation (`180ms cubic-bezier(0.23, 1, 0.32, 1)`), and subtle answer `opacity` fade (`150ms`), disabled under `prefers-reduced-motion: reduce`. In `editing` mode, clicking `<summary>` toggles preview open/close without hijacking drag unless double-clicked/clicked cleanly.
   - `content-editing.ts`: Allow editing `items[i].question` and `items[i].answer` strings when array length and `defaultOpen` booleans are unchanged.

2. **`video` Custom Overlay Controls**
   - Files: `packages/blocks/src/FreeCanvas.tsx`, `packages/blocks/src/free-extra.tsx` (`FreeVideoPlayer`), `apps/studio/src/app/(editor)/editor/[id]/CanvasInspector.tsx`.
   - New optional props on `video` element:
     - `controlsMode?: 'native' | 'overlay'` (default `'native'` for backward compatibility).
     - `poster?: string`, `loop?: boolean` (default `true` in overlay mode), `muted?: boolean` (default `true` in overlay mode), `autoplay?: boolean` (default `false`), `fit?: 'cover' | 'contain'` (default `'cover'`), `radius?: number`.
     - `playLabel?: string` (default `'Xem phim'`), `pauseLabel?: string` (default `'Tạm dừng'`), `overlayAlign?: 'bottom-left' | 'bottom-center' | 'center'` (default `'bottom-left'`).
   - Behavior: Direct video files in `'overlay'` mode render `<video playsInline preload="metadata">` with `object-fit` + `border-radius`, accompanied by an accessible `<button type="button" aria-label={playing ? pauseLabel : playLabel}>` pill (`backdrop-filter: blur(10px)` with solid fallback, play/pause SVG icon + label, `:active { transform: scale(0.97) }`).

3. **`swiper` Multi-Card & Autoplay Toggle (`FreeSwiper.tsx`)**
   - Files: `packages/blocks/src/FreeSwiper.tsx`, `packages/blocks/src/FreeCanvas.tsx`, `apps/studio/src/app/(editor)/editor/[id]/CanvasInspector.tsx`.
   - New optional props:
     - `perView?: number` (`1` to `4`, supports `1.2`, `1.5`, `2.5`, `3`, etc.; responsive `breakpoints` on Swiper: `< 640px` → `1`, `640..1023px` → `Math.min(2, perView)`, `>= 1024px` → `perView`).
     - `gap?: number` (spaceBetween in `px`, default `16` when `perView > 1`, `0` when `1`).
     - `slideRadius?: number` (border-radius per slide card, default `0`).
     - `playToggle?: boolean` + `playToggleLabel?: string` (default `'Tự động chuyển ảnh'`): renders a clean control bar below/over the slider with Previous button, Autoplay Play/Pause toggle button (`aria-pressed={autoplaying}`), and Next button.

4. **`shape` Radial Gradient & Blur (`free-style.ts` + `FreeCanvas.tsx`)**
   - Files: `packages/blocks/src/free-style.ts`, `packages/blocks/src/FreeCanvas.tsx`, `apps/studio/src/app/(editor)/editor/[id]/CanvasInspector.tsx`.
   - Extend `fillCss(p)`:
     - `p.fillType === 'radial' && p.bg && p.bg2` → `radial-gradient(circle at 50% 50%, ${p.bg}, ${p.bg2})` (supporting `'transparent'` as `p.bg2` so radial glows fade cleanly without hard edges!).
     - Keep existing linear gradient (`p.bg2 && p.bg`) as default when `fillType !== 'radial'`.
   - Add `blur?: number` (`0..40`, clamped `Math.min(40, Math.max(0, Number(p.blur) || 0))`) on `shape` applying `filter: blur(${u(blur)})` for GPU-safe ambient glows (`.mascot-aura`).

---

### 2.3 Two-Column & Part-Stylable `Form`

- Files: `packages/blocks/src/form-rules.ts`, `packages/blocks/src/FormView.tsx`, `packages/blocks/src/CoreExtras.tsx`, `packages/blocks/src/core-blocks.ts`, `packages/blocks/src/widget-parts.ts`, `apps/studio/src/app/(editor)/editor/[id]/FormBuilderPanel.tsx`.
- **2-Column Field Grid (`form-rules.ts` + `FormBuilderPanel.tsx` + `FormView.tsx`):**
  - Extend `FieldRule` in `form-rules.ts`:
    ```ts
    export type FieldRule = {
      step?: number
      width?: 'full' | 'half'
      when?: { field: string; operator: 'equals' | 'notEquals' | 'filled' | 'checked'; value?: string }
      minLength?: number; maxLength?: number; min?: number; max?: number
    }
    ```
  - Validate `source.width === 'half' || source.width === 'full'` in `normalizeFormRules` (persisted in `forms.rules` JSON — zero DB schema change).
  - Add a compact `Độ rộng: 1 cột (100%) | Nửa hàng (50%)` toggle per field in `FormBuilderPanel.tsx`.
  - Render `.ss-form` fields container with CSS Grid `grid-template-columns: repeat(2, minmax(0, 1fr))` (`gap: var(--hs-form-gap, 14px)`), where `width === 'half'` uses `grid-column: span 1` on `@media (min-width: 600px)` and `1 / -1` below `600px`; default `'full'` spans `1 / -1`.
- **Submit Button & Widget Part Styling (`FormView.tsx` + `CoreExtras.tsx` + `widget-parts.ts`):**
  - Add optional visual props on `Form` block schema (`core-blocks.ts`) & `FormView`:
    - `submitIcon?: 'none' | 'arrow-up-right' | 'arrow-right'` (renders crisp inline SVG icon after submit label, e.g. `↗`).
    - `submitFull?: boolean` (full-width CTA button option).
  - Add `data-hs-part` attributes in `FormView.tsx`:
    - `data-hs-part="form"` on `<form className="ss-form">`
    - `data-hs-part="field"` on `<label>`
    - `data-hs-part="input"` on `<input>` / `<textarea>` / `<select>`
    - `data-hs-part="checkbox"` on checkbox row
    - `data-hs-part="submit"` on submit `<button>`
  - Register `Form` parts in `WIDGET_PARTS` (`packages/blocks/src/widget-parts.ts`) so `WidgetPartsInspector` can style form container background/border/radius, input fill/border/radius, label typography, and yellow/brand submit button directly in the Editor (both standalone and when embedded as a `widget` inside `FreeCanvas`).

---

### 2.4 Sticky Glass `siteHeader`, Reading Progress & Viewport-Height Hero

1. **Sticky Glass Header & Scroll Reading Progress**
   - Files: `apps/studio/src/app/(site)/layout.tsx`, `apps/studio/src/components/ReadingProgress.tsx` (new small client component), `apps/studio/src/app/(editor)/editor/[id]/SitePanels.tsx` (or header root settings in `DesignPanel.tsx`).
   - Stored in `siteHeader.root.props` (JSON inside `site-areas` global):
     - `sticky?: boolean` → `position: sticky; top: 0; z-index: 40` on `<header className="site-chrome-header">`.
     - `headerBg?: string` (supports `#hex` or `rgba(...)`, validated by safe CSS color helper), `backdropBlur?: number` (`0..24`), `borderBottom?: string` (`#hex` or `rgba(...)`).
     - `@media (prefers-reduced-transparency: reduce)`: disables `backdrop-filter` and forces opaque fallback color.
     - `hideAutoSlots?: boolean`: omits the absolute-positioned top-right `{slots}` wrapper in `layout.tsx` when the designer builds custom header CTAs/switchers on Canvas.
     - `readingProgress?: boolean`, `progressColor?: string` (default `'#111827'`), `progressHeight?: number` (`1..6`, default `2`): renders `<ReadingProgress color={...} height={...} />` pinned to `bottom: 0; left: 0; right: 0` of `<header>`, updating `transform: scaleX(progress)` (`transform-origin: 0 50%`) inside `requestAnimationFrame` on passive `scroll` + `resize`.

2. **Viewport-Height (`svh`) Sections & Directional Gradient Overlay (`FreeCanvas.tsx`)**
   - Files: `packages/blocks/src/FreeCanvas.tsx`, `packages/blocks/src/core-blocks.ts`, `apps/studio/src/app/(editor)/editor/[id]/DesignPanel.tsx`.
   - New optional props on `FreeCanvas`:
     - `heightMode?: 'canvas' | 'svh'` (default `'canvas'`).
     - `svh?: number` (`50..100`, default `100`), `svhOffset?: number` (`0..200`, default `82` px), `minHeightPx?: number` (`0..1200`, default `610` px).
     - On live/preview render (`!_noFree`), when `heightMode === 'svh'`, applies `minHeight: max(${minHeightPx}px, calc(${svh}svh - ${svhOffset}px))` to `.hs-free` and vertically stretches the background/overlay wrapper while aligning the `FreeOverlay` cleanly; in Editor canvas (`_noFree`), keeps deterministic design pixel editing so drag coordinates never jump.
     - Directional `bgOverlay`: add `bgOverlayColor2?: string` (`''` = solid, `'transparent'` = fade to clear, or `#hex`) and `bgOverlayAngle?: number` (`0..360`, default `90`). When `bgOverlayColor2` is set, renders `linear-gradient(${angle}deg, ${color1WithAlpha}, ${color2WithAlpha})` instead of flat solid opacity.
     - Replace `overflow: 'hidden'` horizontal clipping risk with `overflowX: 'clip', overflowY: 'hidden'` cleanly.

---

### 2.5 Fonts, Icons & Starter Interactive Section Templates

1. **Fonts (`packages/blocks/src/free-style.ts`, `packages/blocks/src/types.ts`, `apps/studio/src/lib/fonts.ts`):**
   - Add `Manrope` (`300;400;500;600;700;800`), `Inter` (`300;400;500;600;700;800`), `Plus Jakarta Sans` (`400;500;600;700;800`), and `Noto Sans KR` (`400;500;700`) to `FREE_FONTS`.
   - Add `Manrope`, `Inter`, `Plus_Jakarta_Sans` (`preload: false`, `display: 'swap'`, `subsets: ['vietnamese', 'latin']`) and `Noto_Sans_KR` (`preload: false`, `display: 'swap'`, `subsets: ['latin']`) to `apps/studio/src/lib/fonts.ts` and `FONTS` in `packages/blocks/src/types.ts` (plus any theme token font select options).
2. **Icons (`packages/blocks/src/icons-data.ts` / `FreeCanvas.tsx`):**
   - Ensure crisp 24x24 stroke icons exist in `ICON_BODY` / `FREE_ICONS`: `arrow-up-right`, `arrow-down`, `arrow-right`, `tablet`, `monitor`, `smartphone`, `wifi`, `signal`, `battery-full`, `phone-call`, `message-circle`, `plus`, `play`, `pause`, `qrcode`.
3. **Interactive Section Templates (`apps/studio/src/app/(editor)/editor/[id]/SectionTemplates.ts`):**
   - Add 4 starter `FreeElement[]` templates wired with real `#state` variants, `accordion`, and `svh` hero settings (using neutral Hosso starter copy/colors, 100% editable on Canvas):
     1. **Trình chiếu màn hình theo Tab (`#state` Screen Switcher)** — horizontal tab buttons wired via `#state:<frameId>:<variantId>` to a multi-variant device frame.
     2. **Quy trình từng bước 1–2–3 (`#state` Step Showcase)** — numbered vertical step cards switching an adjacent phone/tablet preview frame.
     3. **Câu hỏi thường gặp 2 cột (`accordion` FAQ)** — left sticky-style intro + CTA button, right `accordion` element with `+` rotation.
     4. **Hero toàn màn hình phủ Gradient (`100svh` Hero)** — `heightMode: 'svh'`, directional dark shade overlay, `text-lines` masked heading, primary CTA + scroll-to-section button.

---

## 3. Security, Performance & Design Craft Invariants

- **Security (`/senior-security`):**
  - Zero raw HTML or arbitrary URL schemes: `#state:` and `#popover:` validate `/^[a-zA-Z0-9_-]{1,64}$/` strictly; `SAFE_HREF` blocks `javascript:`, `data:`, `vbscript:`.
  - CSS injection prevention: every color (`headerBg`, `borderBottom`, `bgOverlayColor2`, `progressColor`, `accordion` colors) passes strict hex/rgba validator before entering `<style>` or inline styles.
  - Content-lock enforcement: `isContentOnlyChange` in `packages/blocks/src/content-editing.ts` rejects any structural/variant addition, coordinate mutation, or action link tampering by content-only users, while permitting authorized copy/image edits inside `_variants` and `accordion.items`.
- **Animation & UI Craft Floor (`/improve-animations`, `/apple-design`, `/hallmark`, `/impeccable`):**
  - Never use `transition: all`; transition explicit properties (`opacity`, `transform`, `color`, `background-color`, `border-color`) only.
  - Never animate `height`, `width`, `top`, or `left`; `#state` cross-switches, `#popover` reveals, `accordion` icons, and `ReadingProgress` use GPU `transform` + `opacity` exclusively.
  - Press feedback `:active { transform: scale(0.97) }` (`120ms`) on interactive triggers (`#state`, `#popover`, video overlay button, swiper play toggle).
  - Full `@media (prefers-reduced-motion: reduce)` and `@media (prefers-reduced-transparency: reduce)` compliance.
  - Editor UI strictly follows `Operate` mode (`apps/studio/src/app/(editor)/DESIGN.md`): Hosso green `#2d7b57`, neutral chrome, separate surfaces from customer theme tokens, deliberate click-to-open panels.

---

## 4. Verification & QA Plan

1. **Automated Unit & Integration Tests (TDD — write failing tests first):**
   - `apps/studio/tests/editor-interactive-states.test.ts`:
     - `readLinkAction` / `actionHref` round-trip and malicious input rejection for `state` & `popover`.
     - `switchFrameVariant` auto-saves edits to previous variant, switches active variant, and preserves stable child IDs.
     - `materializeFrameVariant` projects coordinates & responsive patches accurately.
     - `contentOnlyPage` / `isContentOnlyChange` permits copy edits inside `_variants` and `accordion.items` while rejecting geometry/variant mutations.
     - `normalizeFormRules` validates `width: 'half' | 'full'` and rejects invalid widths.
   - Existing suites must stay 100% green: `pnpm test:editor-frames`, `pnpm test:editor-design-workspace`, `pnpm test:form-delivery`, `pnpm typecheck`, `pnpm check:boundaries`, `pnpm check:i18n`.
2. **Browser E2E & Responsive Verification (`1440px`, `768px`, `375px`):**
   - Build a test page exercising sticky glass `siteHeader` + reading progress + `#popover` dropdown + `100svh` directional-gradient Hero + `#state` multi-tab frame switcher + `overlay` video + multi-card `swiper` with autoplay toggle + radial-blur `shape` + `accordion` FAQ + 2-column styled `Form`.
   - Verify keyboard navigation (`Tab`, Arrow keys on `#state` tabs, `Escape` on `#popover`, `Enter`/`Space` on `accordion`), zero horizontal overflow (`documentElement.scrollWidth <= innerWidth`), and zero console errors.
3. **Impeccable Anti-Pattern Gate:**
   - Run `node "C:\Users\kaing\.agents\skills\impeccable\scripts\detect.mjs" --json` on modified UI files and ensure **zero P0 findings**.
