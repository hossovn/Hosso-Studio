# Hosso Studio Editor Interactive & Visual Parity Upgrades Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade Hosso Studio's Editor, FreeCanvas primitives, Form layout/styling, and `siteHeader` chrome so a modern interactive SaaS landing page 100% identical to `https://menumate.vn` can be built and customized purely inside Studio's visual editor (Phase 1 / Đợt 1).

**Architecture:** Extend existing Hosso Studio primitives (`link-actions`, `design-presets`, `content-editing`, `FreeCanvas`, `free-extra`, `FreeSwiper`, `free-style`, `form-rules`, `FormView`, `siteHeader` layout) without any SQLite schema migration by storing new options inside existing JSON columns (`pages.content`, `site-areas.siteHeader`, `forms.rules`). Provide a shared client runtime (`FreeInteractiveScope`) that powers `#state:<frameId>:<variantId>` tab switching and `#popover:<frameId>` portal popovers identically on both public pages and Editor Preview mode.

**Tech Stack:** TypeScript, React 19, Next.js App Router, Payload CMS 3, `@puckeditor/core`, Swiper, `node --experimental-strip-types` / `tsx` + `happy-dom` test runners.

## Global Constraints

- **Package boundary (`pnpm check:boundaries`):** `packages/blocks`, `packages/theme-*`, and `apps/studio/src` must NEVER import or reference `@hosso/plugin-wim`.
- **Zero destructive commands (`<RULE[user_global]>`):** Never run `rm`, `del`, `Remove-Item`, `git clean`, `git reset --hard`, `git checkout -- .`, `git restore .`, or destructive SQL. Stage only explicitly modified/created files per commit.
- **Zero DB schema migration:** Persist `FieldRule.width` inside existing `forms.rules` JSON and header sticky/glass/progress settings inside `siteHeader.root.props` JSON.
- **Security invariants:** `#state:` and `#popover:` IDs strictly match `/^[a-zA-Z0-9_-]{1,64}$/`; all dynamic CSS color inputs pass strict hex/rgba validation before entering inline styles or `<style>` tags; `contentOnlyPage` / `isContentOnlyChange` rejects structural/coordinate/variant tampering while allowing copy/image edits inside `_variants` and `accordion.items`.
- **Motion & UI Craft Floor:** Never use `transition: all`; never animate `width`, `height`, `top`, or `left`; use GPU `transform` + `opacity` (`160–180ms cubic-bezier(0.23, 1, 0.32, 1)`); press feedback `:active { transform: scale(0.97) }`; honor `@media (prefers-reduced-motion: reduce)` and `@media (prefers-reduced-transparency: reduce)`; Editor chrome follows `Operate` mode (`#2d7b57` accent, `#edf5ef` pale green chip, neutral `#ffffff`/`#f4f6f8` surfaces).

---

## File Structure Map

- **Create:** `scripts/test-editor-interactive-upgrades.mjs` — TDD unit/integration suite for `#state`/`#popover` link actions, `switchFrameVariant` / `materializeFrameVariant`, `content-editing` variant & accordion safety, `normalizeFormRules` half-width fields, `fillCss` radial gradients, and safe CSS colors.
- **Create:** `packages/blocks/src/FreeInteractiveScope.tsx` — Client state & portal controller (`useInteractiveElements`, `InteractivePopoverPortal`, keyboard roving tablist & Escape/outside-click handling) shared by `FreeOverlay` and `CanvasStage` Preview.
- **Create:** `apps/studio/src/components/ReadingProgress.tsx` — GPU `scaleX` scroll reading progress bar for `siteHeader`.
- **Modify:** `packages/blocks/src/link-actions.ts` — Add `'state' | 'popover'` link action parsing, validation, and formatting.
- **Modify:** `packages/blocks/src/design-presets.ts` — Add `ensureDefaultFrameVariant`, `switchFrameVariant` (auto-saving active variant & preserving child IDs), and `materializeFrameVariant`.
- **Modify:** `packages/blocks/src/content-editing.ts` — Traverse `_variants[].elements` and `accordion` `items` (`question`/`answer`) safely under content-only lock.
- **Modify:** `packages/blocks/src/free-style.ts` — Add `Manrope`, `Inter`, `Plus Jakarta Sans`, `Noto Sans KR` to `FREE_FONTS`; add `radial-gradient` (`fillType === 'radial'`) and safe color helper to `fillCss`.
- **Modify:** `packages/blocks/src/icons-data.ts` — Ensure Lucide icons (`arrow-up-right`, `arrow-down`, `tablet`, `monitor`, `smartphone`, `wifi`, `signal`, `battery-full`, `phone-call`, `message-circle`, `plus`, `play`, `pause`, `qrcode`) exist in `ICON_BODY` & `ICON_CATS`.
- **Modify:** `packages/blocks/src/free-extra.tsx` — Add `FreeAccordion` (`<details>/<summary>`) and `FreeVideoPlayer` (`controlsMode: 'overlay'`).
- **Modify:** `packages/blocks/src/FreeSwiper.tsx` — Add `perView`, `gap`, `slideRadius`, and accessible `playToggle` control bar.
- **Modify:** `packages/blocks/src/FreeCanvas.tsx` — Add `'accordion'` to `FreeType`/`makeElement`, wire `FreeAccordion`, `FreeVideoPlayer`, `FreeSwiper` new props, `shape` `blur`, `FreeCanvasView` `heightMode: 'svh'` & directional `bgOverlayColor2`/`bgOverlayAngle`, and `FreeInteractiveScope` inside `FreeOverlay`.
- **Modify:** `packages/blocks/src/index.ts` — Export interactive scope/variant helpers needed by `@hosso/studio`.
- **Modify:** `packages/blocks/src/form-rules.ts`, `packages/blocks/src/FormView.tsx`, `packages/blocks/src/CoreExtras.tsx`, `packages/blocks/src/core-blocks.ts` — Add `FieldRule.width` (`'full' | 'half'`) 2-column responsive CSS grid, `submitIcon` (`'none' | 'arrow-up-right' | 'arrow-right'`), `submitFull`, and `data-hs-part` / `data-hs-part-label` hooks.
- **Modify:** `packages/blocks/src/types.ts` & `apps/studio/src/lib/fonts.ts` — Register `manrope`, `inter`, `plus-jakarta-sans`, `noto-sans-kr` site fonts (`preload: false`).
- **Modify:** `apps/studio/src/lib/site.tsx` & `apps/studio/src/components/Area.tsx` & `apps/studio/src/app/(site)/layout.tsx` — Traverse `_variants` in `attachBlockData`; render sticky/glass `siteHeader`, `hideAutoSlots`, `_float` in `Area`, and `<ReadingProgress />`.
- **Modify:** Editor UI (`apps/studio/src/app/(editor)/editor/[id]/`):
  - `ActionPanel.tsx` — Add `state` (Frame + Variant picker) and `popover` (Frame picker + auto-mark `_isPopover`).
  - `DesignPanel.tsx` — Upgrade Variants tab to use `ensureDefaultFrameVariant` + `switchFrameVariant` + `_isPopover` toggle.
  - `CanvasStage.tsx` — Wire `useInteractiveElements` in `Layer` when `preview === true` and hide `_isPopover` frames in preview until triggered; support `droppedElement` for `'accordion'`; pass template `extraProps` on section drop.
  - `CanvasInspector.tsx` — Add Inspector controls for `accordion`, `video` overlay, `swiper` (`perView`/`gap`/`playToggle`/`slideRadius`), `shape` (`fillType`/`blur`), `container` quick Variant Pill Bar, `FreeCanvas` `heightMode: 'svh'` + `bgOverlayColor2`/`bgOverlayAngle`, and `siteHeader` Sticky/Glass/ReadingProgress settings in `PageOverviewInspector`.
  - `FormRulesEditor.tsx` — Add `Độ rộng trường` (`100%` vs `50%`) selector per field.
  - `BlockPanels.tsx`, `CanvasLeft.tsx`, `SectionTemplates.ts`, `CanvasApp.tsx` — Add `accordion` to catalog/names and add 4 starter Interactive Section Templates (`SectionTemplate.extraProps` forwarded in `addSection`).
- **Modify:** `package.json` — Register `"test:editor-interactive": "node --experimental-strip-types scripts/test-editor-interactive-upgrades.mjs"`.

---

### Task 1: Core Data Contracts — `#state` & `#popover` Link Actions, Variant Switching, and Content-Only Safety

**Files:**
- Create: `scripts/test-editor-interactive-upgrades.mjs`
- Modify: `package.json`
- Modify: `packages/blocks/src/link-actions.ts`
- Modify: `packages/blocks/src/design-presets.ts`
- Modify: `packages/blocks/src/content-editing.ts`

**Interfaces:**
- Produces from `link-actions.ts`:
  - `LinkAction = 'none' | 'url' | 'popup' | 'section' | 'phone' | 'email' | 'state' | 'popover'`
  - `ParsedLinkAction = { type: LinkAction; value: string; frameId?: string; variantId?: string }`
  - `readLinkAction(href: unknown): ParsedLinkAction`
  - `actionHref(type: LinkAction, input: string): string`
- Produces from `design-presets.ts`:
  - `ensureDefaultFrameVariant(list: FreeElement[], rootId: string): FreeElement[]`
  - `switchFrameVariant(list: FreeElement[], rootId: string, variantId: string, newId?: () => string): FreeElement[]`
  - `materializeFrameVariant(list: FreeElement[], rootId: string, variantId: string): FreeElement[]`

- [ ] **Step 1: Write the failing unit tests in `scripts/test-editor-interactive-upgrades.mjs` and add script to `package.json`**
  - Test `readLinkAction` & `actionHref` round-trip for `#state:frame_1:tab_a` and `#popover:qr_zalo`, plus rejection of XSS/invalid IDs (`javascript:alert(1)`, `frame with spaces`, `#state:only_one_part`).
  - Test `ensureDefaultFrameVariant` & `switchFrameVariant`: editing child text on `default`, switching to `tab_2`, editing child text on `tab_2`, and switching back to `default` preserves BOTH edits AND keeps stable child `id`s!
  - Test `materializeFrameVariant`: projects `tab_2` elements to shifted `root.x, root.y` and mobile responsive offsets without mutating input.
  - Test `contentOnlyPage` & `isContentOnlyChange`: allows editing `text`/`src` inside `container.props._variants[].elements` and `question`/`answer` inside `accordion` `items`, while rejecting coordinate changes, variant count changes, or `defaultOpen` tampering.
- [ ] **Step 2: Run `pnpm test:editor-interactive` to verify RED**
  - Expected: FAIL (`ensureDefaultFrameVariant` / `switchFrameVariant` / `state` link action not implemented).
- [ ] **Step 3: Implement minimal code in `link-actions.ts`, `design-presets.ts`, and `content-editing.ts`**
- [ ] **Step 4: Run `pnpm test:editor-interactive` and `pnpm test:editor-design-workspace` to verify GREEN**
- [ ] **Step 5: Commit Task 1**

---

### Task 2: Fonts, Icons, Radial/Blur Shapes & Two-Column Stylable Forms

**Files:**
- Modify: `scripts/test-editor-interactive-upgrades.mjs`
- Modify: `packages/blocks/src/free-style.ts`
- Modify: `packages/blocks/src/icons-data.ts`
- Modify: `packages/blocks/src/types.ts`
- Modify: `apps/studio/src/lib/fonts.ts`
- Modify: `packages/blocks/src/form-rules.ts`
- Modify: `packages/blocks/src/FormView.tsx`
- Modify: `packages/blocks/src/CoreExtras.tsx`
- Modify: `packages/blocks/src/core-blocks.ts`

**Interfaces:**
- Produces from `free-style.ts`: `fillCss(p)` supporting `p.fillType === 'radial'`, `safeCssColor(v)` allowing `#rgb`, `#rrggbb`, `#rrggbbaa`, `transparent`, and `rgba(r, g, b, a)`.
- Produces from `form-rules.ts`: `FieldRule.width?: 'full' | 'half'` validated by `normalizeFormRules`.
- Produces from `FormView.tsx` & `core-blocks.ts`: `Form` props `submitIcon?: 'none' | 'arrow-up-right' | 'arrow-right'`, `submitFull?: boolean`, plus `data-hs-part="form" | "field" | "input" | "checkbox" | "submit"` and 2-column responsive CSS grid.

- [ ] **Step 1: Append failing tests to `scripts/test-editor-interactive-upgrades.mjs`**
  - Test `FREE_FONTS` & `FONTS` include `Manrope`, `Inter`, `Plus Jakarta Sans`, `Noto Sans KR`.
  - Test `ICON_BODY` includes `arrow-up-right`, `arrow-down`, `tablet`, `monitor`, `smartphone`, `wifi`, `signal`, `battery-full`, `phone-call`, `message-circle`, `plus`, `play`, `pause`, `qrcode`.
  - Test `fillCss({ bg: '#facc15', bg2: 'transparent', fillType: 'radial' })` and `safeCssColor` rejecting CSS injection strings (`red;background:url(x)`).
  - Test `normalizeFormRules` accepts `width: 'half'` / `'full'`, preserves `fields` rules when `width: 'half'` is the only rule set, and rejects `width: 'invalid'`.
- [ ] **Step 2: Run `pnpm test:editor-interactive` to verify RED**
- [ ] **Step 3: Implement changes across `free-style.ts`, `icons-data.ts`, `types.ts`, `fonts.ts`, `form-rules.ts`, `FormView.tsx`, `CoreExtras.tsx`, and `core-blocks.ts`**
- [ ] **Step 4: Run `pnpm test:editor-interactive` and `pnpm test:form-delivery` to verify GREEN**
- [ ] **Step 5: Commit Task 2**

---

### Task 3: Canvas Primitives (`accordion`, `video` overlay, `swiper` multi-card/play-toggle, `shape` blur, `svh` Hero & Gradient Overlay)

**Files:**
- Modify: `scripts/test-editor-interactive-upgrades.mjs`
- Modify: `packages/blocks/src/free-extra.tsx`
- Modify: `packages/blocks/src/FreeSwiper.tsx`
- Modify: `packages/blocks/src/FreeCanvas.tsx`
- Modify: `packages/blocks/src/index.ts`

**Interfaces:**
- Produces `FreeType` including `'accordion'` and `makeElement('accordion')`.
- Produces `FreeAccordion` (`items`, `exclusive`, `iconStyle`, GPU `+`/chevron rotation, `<details>/<summary>`) and `FreeVideoPlayer` (`controlsMode: 'overlay'`, `playLabel`, `pauseLabel`, `poster`, `loop`, `muted`, `fit`, `radius`).
- Produces `FreeSwiper` props `perView?: number`, `gap?: number`, `slideRadius?: number`, `playToggle?: boolean`, `playToggleLabel?: string`.
- Produces `FreeCanvasView` props `heightMode?: 'canvas' | 'svh'`, `svh?: number`, `svhOffset?: number`, `minHeightPx?: number`, `bgOverlayColor2?: string`, `bgOverlayAngle?: number`.

- [ ] **Step 1: Append failing SSR/DOM render tests in `scripts/test-editor-interactive-upgrades.mjs`**
  - Verify `makeElement('accordion')` + `renderToStaticMarkup(<FreeElementView el={accordionEl} />)` outputs semantic `<details>` / `<summary>` with questions, answers, and `name` attribute when `exclusive: true`.
  - Verify `FreeElementView` for `shape` with `blur: 25` and `fillType: 'radial'` outputs `filter:blur(...)` and `radial-gradient(...)`.
  - Verify `FreeCanvasView` with `heightMode: 'svh'`, `svh: 100`, `svhOffset: 82`, `minHeightPx: 610` and `bgOverlayColor2: 'transparent'`, `bgOverlayAngle: 90` outputs `calc(100svh - 82px)` min-height and `linear-gradient(90deg, ...)` overlay on public render while keeping normal canvas height when `_noFree: true`.
- [ ] **Step 2: Run `pnpm test:editor-interactive` to verify RED**
- [ ] **Step 3: Implement `FreeAccordion`, `FreeVideoPlayer`, `FreeSwiper` upgrades, and `FreeCanvas` updates**
- [ ] **Step 4: Run `pnpm test:editor-interactive` and `pnpm test:canvas` to verify GREEN**
- [ ] **Step 5: Commit Task 3**

---

### Task 4: Interactive Runtime Scope (`#state` & `#popover`) + Sticky Glass `siteHeader` & `ReadingProgress`

**Files:**
- Create: `packages/blocks/src/FreeInteractiveScope.tsx`
- Create: `apps/studio/src/components/ReadingProgress.tsx`
- Modify: `packages/blocks/src/FreeCanvas.tsx`
- Modify: `packages/blocks/src/index.ts`
- Modify: `apps/studio/src/lib/site.tsx`
- Modify: `apps/studio/src/components/Area.tsx`
- Modify: `apps/studio/src/app/(site)/layout.tsx`
- Modify: `scripts/test-editor-interactive-upgrades.mjs`

**Interfaces:**
- Produces from `FreeInteractiveScope.tsx`:
  - `projectInteractiveList(list: FreeElement[], activeVariants: Record<string, string>, hidePopovers: boolean): FreeElement[]`
  - `useInteractiveElements(list: FreeElement[], enabled: boolean)`
  - `InteractiveTrigger` / click & keyboard handler (`role="tab"`, `aria-selected`, `data-hs-state="active"`, Left/Right/Up/Down roving focus; `aria-expanded`, `Escape` & outside-click close for `#popover`)
  - `InteractivePopoverPortal` (`createPortal` to `ownerDocument.body`, fixed clamping within `8px` viewport margin)

- [ ] **Step 1: Append failing tests in `scripts/test-editor-interactive-upgrades.mjs`**
  - Test `projectInteractiveList`: hides `_isPopover` frames and their children on live flow while keeping normal frames projected to their active variant in `activeVariants`; sets active state detection for triggers matching `#state:<frameId>:<activeVariantId>`.
- [ ] **Step 2: Run `pnpm test:editor-interactive` to verify RED**
- [ ] **Step 3: Implement `FreeInteractiveScope.tsx`, wire into `FreeOverlay` & `FreeElementBody` (`FreeCanvas.tsx`), implement `ReadingProgress.tsx`, update `site.tsx` (`attachBlockData` traversing `_variants`), `Area.tsx` (`_float` support), and `layout.tsx` (sticky, `backdropBlur` with reduced-transparency fallback, `headerBg`, `borderBottom`, `hideAutoSlots`, `ReadingProgress`)**
- [ ] **Step 4: Run `pnpm test:editor-interactive` and `pnpm typecheck` to verify GREEN**
- [ ] **Step 5: Commit Task 4**

---

### Task 5: Studio Editor UI Upgrades (`ActionPanel`, `DesignPanel`, `CanvasStage`, `CanvasInspector`, `FormRulesEditor`, `SectionTemplates`)

**Files:**
- Modify: `apps/studio/src/app/(editor)/editor/[id]/ActionPanel.tsx`
- Modify: `apps/studio/src/app/(editor)/editor/[id]/DesignPanel.tsx`
- Modify: `apps/studio/src/app/(editor)/editor/[id]/CanvasStage.tsx`
- Modify: `apps/studio/src/app/(editor)/editor/[id]/CanvasInspector.tsx`
- Modify: `apps/studio/src/app/(editor)/editor/[id]/FormRulesEditor.tsx`
- Modify: `apps/studio/src/app/(editor)/editor/[id]/BlockPanels.tsx`
- Modify: `apps/studio/src/app/(editor)/editor/[id]/CanvasLeft.tsx`
- Modify: `apps/studio/src/app/(editor)/editor/[id]/SectionTemplates.ts`
- Modify: `apps/studio/src/app/(editor)/editor/[id]/CanvasApp.tsx`
- Modify: `scripts/test-editor-interactive-upgrades.mjs`

**Interfaces:**
- `SectionTemplate` extended with optional `extraProps?: Record<string, unknown>` forwarded by `CanvasApp.ops.addSection` and `CanvasStage.droppedSection`.
- `CanvasInspector` accepts optional `areaKind?: 'header' | 'footer' | ''` from `CanvasApp` so `PageOverviewInspector` shows Sticky Glass Header + Reading Progress controls when `areaKind === 'header'`.

- [ ] **Step 1: Append failing tests in `scripts/test-editor-interactive-upgrades.mjs`**
  - Verify `SECTION_TEMPLATES` contains the 4 new interactive templates (`interactive-tabs`, `interactive-steps`, `faq-accordion`, `hero-svh`), each producing valid `FreeElement[]` with unique IDs, valid `#state:` links matching target container `_variants`, `'accordion'` items, and `heightMode: 'svh'`.
- [ ] **Step 2: Run `pnpm test:editor-interactive` to verify RED**
- [ ] **Step 3: Implement Editor UI controls (`ActionPanel`, `DesignPanel`, `CanvasStage`, `CanvasInspector`, `FormRulesEditor`, `BlockPanels`, `CanvasLeft`, `SectionTemplates`, `CanvasApp`) strictly adhering to `apps/studio/src/app/(editor)/DESIGN.md` (`Operate` surface)**
- [ ] **Step 4: Run `pnpm test:editor-interactive`, `pnpm typecheck`, `pnpm check:boundaries`, and `pnpm check:i18n` to verify GREEN**
- [ ] **Step 5: Commit Task 5**

---

### Task 6: Full Regression Suite, Impeccable Anti-Pattern Gate & Browser E2E Verification

**Files:**
- Modify (only if findings arise): touched files from Tasks 1–5

- [ ] **Step 1: Run all automated test & static check suites**
  - `pnpm test:editor-interactive`
  - `pnpm test:editor-frames`
  - `pnpm test:editor-design-workspace`
  - `pnpm test:editor-design-tools`
  - `pnpm test:editor-canvas-upgrades`
  - `pnpm test:canvas`
  - `pnpm test:form-delivery`
  - `pnpm typecheck`
  - `pnpm check:boundaries`
  - `pnpm check:i18n`
- [ ] **Step 2: Run Impeccable anti-pattern detector (`detect.mjs --json`) on modified UI files**
  - Confirm **0 P0 findings**; fix any P0/high-signal findings immediately if reported.
- [ ] **Step 3: Run live Playwright browser verification at `1440px`, `768px`, and `375px`**
  - Start isolated test server (or verify against dev/test instance) and exercise Editor + rendered page with Sticky Glass Header + Reading Progress + `#popover` + `100svh` Hero + `#state` tabs + `overlay` video + multi-card `swiper` + radial-blur `shape` + `accordion` FAQ + 2-column `Form`, checking keyboard a11y, zero horizontal overflow, and zero console errors.
- [ ] **Step 4: Commit any polish fixes with clean verification evidence**
