# Hosso Studio Wix-like Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing Hosso freeform editor easy to use like Wix for Section, Text, Button, and Image while preserving legacy page data.

**Architecture:** Keep the current Canvas engine and page JSON. Add shared, validated helpers for component state and device overrides, then route all four first-slice components through those helpers. Refine the existing left panel, canvas stage, floating actions, and right inspector instead of creating a second editor.

**Tech Stack:** React 19, TypeScript 5.9, Next.js 16, Zustand 5, lucide-react, existing `@hosso/studio-blocks` utilities, Node assert-based tests.

**Spec:** `docs/superpowers/specs/2026-10-22-hosso-wix-like-editor-design.md`

## Global Constraints

- Preserve old page JSON and render/edit legacy content without a required migration.
- Reuse the existing Canvas, media picker, undo/redo, export/import, and style validation paths.
- Do not add a dependency for the first slice.
- Reject or ignore unsafe style values; never emit arbitrary CSS.
- Support editor canvas, preview, and public rendering with the same serialized state rules.
- Respect keyboard accessibility and `prefers-reduced-motion`.

## Review Focus

- Legacy pages without state fields render and remain editable: test through normalization and renderer fixtures in Task 1.
- Clearing tablet/mobile overrides falls back predictably: test cascade and deletion in Task 1.
- A pointer gesture creates one undo entry: test history coalescing in Task 2.
- A component never mutates a sibling or escapes its owner section: test placement and ownership in Task 2.
- Invalid shadow/transform/color values never reach CSS output: test rejection in Task 1.

### Task 1: Shared State and Style Contracts

**Files:**
- Create: `packages/blocks/src/element-states.ts`
- Modify: `packages/blocks/src/widget-parts.ts`
- Modify: `packages/blocks/src/index.ts`
- Test: `scripts/test-canvas.mjs`

**Interfaces:**
- `type ElementState = 'normal' | 'hover' | 'focus' | 'active'`
- `type ElementDevice = 'desktop' | 'tablet' | 'mobile'`
- `type ElementStateStyle = { color?: string; backgroundColor?: string; borderColor?: string; boxShadow?: string; opacity?: number; translateX?: number; translateY?: number; scale?: number; transitionMs?: number }`
- `readElementState(props: Record<string, unknown>, state: ElementState, device: ElementDevice): ElementStateStyle`
- `writeElementState(props: Record<string, unknown>, state: ElementState, device: ElementDevice, patch: Partial<ElementStateStyle>): Record<string, unknown>`
- `elementStateCss(scope: string, state: ElementState, device: ElementDevice, style: unknown): string`

- [x] Add the optional state representation and normalize missing values as empty style objects.
- [x] Define precedence as desktop/base, then tablet, then mobile; clear a device override by deleting only that override.
- [x] Validate hex colors, bounded opacity, bounded transform values, bounded transition duration, and a safe shadow grammar before CSS serialization.
- [x] Reuse existing `widget-parts.ts` path/scoping logic where possible; do not duplicate selector escaping.
- [x] Export only the shared public types/helpers from `packages/blocks/src/index.ts`.
- [x] Add assertions for legacy props, state round-trip, cascade, clear behavior, safe CSS output, and unsafe value rejection.
- [x] Run `node --experimental-strip-types scripts/test-canvas.mjs`; expect PASS.

### Task 2: Canvas Placement, Ownership, and History

**Files:**
- Modify: `apps/studio/src/app/(editor)/editor/[id]/canvas-model.ts`
- Modify: `apps/studio/src/app/(editor)/editor/[id]/CanvasApp.tsx`
- Modify: `apps/studio/src/app/(editor)/editor/[id]/CanvasStage.tsx`
- Modify: `apps/studio/src/app/(editor)/editor/[id]/canvas-events.ts`
- Test: `scripts/test-canvas.mjs`

**Interfaces:**
- `placeElement(data: PageData, ownerId: string, element: FreeElement, anchor?: { x: number; y: number }): PageData`
- `snapPosition(data: PageData, ownerId: string, element: FreeElement, position: { x: number; y: number }): { x: number; y: number; guides: { axis: 'x' | 'y'; value: number }[] }`
- `coalesceHistoryKey(action: 'drag' | 'resize' | 'style' | 'structure', elementId?: string): string`

- [x] Implement click-to-add placement using selected section, selected component, last visible section, then page fallback in that order.
- [x] Keep section ownership explicit; moving a section moves its children as one unit, while child movement affects only that child.
- [x] Add snap guides for canvas center, sibling edges/centers, and equal spacing without changing persisted data until drop/commit.
- [x] Make pointer drag/resize history coalesce into one undo entry and keep duplicate/delete as single commands.
- [x] Add focused assertions for placement order, non-overlap offset, section ownership, snap output, and history keys.
- [x] Run the canvas test; expect the existing assertions plus the new placement/history assertions to PASS.

### Task 3: Element Panel and Insertion UX

**Files:**
- Modify: `apps/studio/src/app/(editor)/editor/[id]/BlockPanels.tsx`
- Modify: `apps/studio/src/app/(editor)/editor/[id]/CanvasLeft.tsx`
- Modify: `apps/studio/src/app/(editor)/editor.css`
- Test: `scripts/test-canvas.mjs` (pure catalog/placement assertions only)

**Interfaces:**
- `type ElementCatalogItem = { type: FreeType; label: string; category: string; preview: React.ReactNode; create: () => FreeElement }`
- `ELEMENT_CATALOG: readonly ElementCatalogItem[]`

- [x] Group the first-slice elements under clear categories with search and visual previews.
- [x] Wire click insertion to `placeElement` and drag insertion to the canvas drop target.
- [x] Keep existing section/template insertion and plugin block insertion working.
- [ ] Add accessible labels, keyboard activation, and disabled/busy feedback for insertion controls.
- [x] Add CSS for stable thumbnails, drop targets, and responsive panel widths without nested decorative cards.
- [x] Verify catalog types and click placement through focused tests; manually verify drag placement in the browser during Task 6.

### Task 4: Floating Toolbar and Layer Context

**Files:**
- Modify: `apps/studio/src/app/(editor)/editor/[id]/CanvasStage.tsx`
- Modify: `apps/studio/src/app/(editor)/editor/[id]/CanvasApp.tsx`
- Modify: `apps/studio/src/app/(editor)/editor.css`
- Test: `scripts/test-canvas.mjs`

**Interfaces:**
- `type SelectionAction = 'duplicate' | 'delete' | 'lock' | 'hide' | 'align' | 'forward' | 'backward' | 'copy-style' | 'paste-style' | 'inspect' | 'states'`
- `runSelectionAction(action: SelectionAction, selection: Sel, data: PageData): PageData | { data: PageData; mode: 'inspect' | 'states' }`

- [x] Render the toolbar adjacent to the selected element with icon buttons, tooltips, and keyboard focus states.
- [x] Implement duplicate, delete, lock, hide, align, layer ordering, and style copy/paste using existing pure canvas helpers.
- [x] Keep low-frequency actions behind an overflow menu.
- [x] Add a compact breadcrumb/layer context showing page -> section -> element ownership.
- [x] Ensure toolbar controls do not intercept normal canvas drag events or change selection unexpectedly.
- [x] Add pure action assertions and run the canvas test.

### Task 5: Context Inspector for the First Slice

**Files:**
- Modify: `apps/studio/src/app/(editor)/editor/[id]/CanvasInspector.tsx`
- Modify: `apps/studio/src/app/(editor)/editor/[id]/WidgetPartsInspector.tsx`
- Modify: `apps/studio/src/app/(editor)/editor/[id]/FreeCanvasEditor.tsx`
- Modify: `packages/blocks/src/FreeCanvas.tsx`
- Modify: `packages/blocks/src/puck-config.ts`
- Test: `scripts/test-canvas.mjs`

**Interfaces:**
- `StatePicker({ value, onChange, supported }: { value: ElementState; onChange: (state: ElementState) => void; supported: ElementState[] }): JSX.Element`
- `DevicePicker({ value, onChange }: { value: ElementDevice; onChange: (device: ElementDevice) => void }): JSX.Element`
- `StateStyleEditor({ style, onChange, readOnly }: { style: ElementStateStyle; onChange: (patch: Partial<ElementStateStyle>) => void; readOnly?: boolean }): JSX.Element`

- [x] Normalize the right inspector into Content, Design, Layout, Effects, Responsive, and Advanced tabs.
- [x] Add state and device pickers without hiding the current component-specific controls.
- [x] Implement independent controls for Section, Text, Button, and Image using shared state/style helpers.
- [x] Add button hover controls for background, text, border, shadow, opacity, translate/scale, and transition duration.
- [x] Add text-link and image hover controls only where the renderer supports the state.
- [x] Ensure every field commit uses the existing `commit` history path and preserves legacy props.
- [x] Add assertions for state patching and style validation; run canvas tests and package typecheck.

### Task 6: Renderer, Preview, and Browser Verification

**Files:**
- Modify: `packages/blocks/src/FreeCanvas.tsx`
- Modify: `packages/blocks/src/hs-content-css.ts`
- Modify: `packages/blocks/src/widget-parts.ts`
- Modify: `apps/studio/src/app/(editor)/editor/[id]/CanvasStage.tsx`
- Test: `scripts/test-canvas.mjs`
- Test: browser/editor verification fixture to be selected from existing test setup

- [x] Apply the shared state CSS to editor canvas, editor preview, and public rendering with scoped selectors.
- [x] Keep legacy preset hover classes (`hs-hv-lift`, `hs-hv-grow`) working during the transition.
- [x] Add reduced-motion handling for new state transitions and animations.
- [x] Verify export/import round-trip preserves the new optional state fields.
- [x] Run `node --experimental-strip-types scripts/test-canvas.mjs`.
- [x] Run `pnpm --filter @hosso/studio typecheck`.
- [x] Run the relevant build and browser checks at desktop, tablet, and mobile widths; expect no console errors, no selection overlap, and visible button hover changes in preview/public rendering.

### Task 7: Final Review and Documentation

**Files:**
- Modify: `docs/superpowers/specs/2026-10-22-hosso-wix-like-editor-design.md` only if implementation decisions changed
- Modify: `docs/superpowers/plans/2026-10-22-hosso-wix-like-editor.md` to mark completed steps
- Test: all commands from Tasks 1-6

- [x] Review the diff for unrelated changes and preserve existing user changes.
- [x] Run `git diff --check`.
- [x] Run the focused canvas test, typecheck, and relevant build/browser verification.
- [x] Confirm no new dependency was added and no legacy migration is required.
- [x] Record any remaining limitations, especially DOM-position selector stability for dynamic children.

## Execution Record (2026-10-22)

- Continued the existing uncommitted state implementation; retained the unrelated page-copy changes and existing archives/logs.
- Added shared state/device controls in `StateStyleEditor.tsx`. State data uses optional `props._states[state][device]`; canvas state-preview markers are transient.
- Task 1: canvas regressions first rejected the old shadow grammar (RGB values above 255); validation, cascade/reset, stable scopes, safe serialization, reduced motion and renderer round-trips now pass.
- Tasks 2-4: shared placement, selection actions, equal-spacing snapping, explicit reparenting, accessible insertion, and editor-scoped style clipboard are implemented. Browser checks cover click/drag insertion, single-step undo, lock/hide, and cross-section style pasting without replacing content.
- Task 5: all first-slice inspectors use six tabs. Text links, button icons, image border/shadow and validated state controls reuse the existing rendering, media and icon paths.
- Task 6: renderer fixtures exercise actual public components, common section ownership and legacy opacity. The site-package test preserves section/element states through the real ZIP export/import pipeline.
- Final review identified and fixed five issues: section effect ownership, preview device visibility, compounded legacy opacity, keyboard/inspector lock bypass, and clipboard lifetime.

### Rulings

- Ruling: use Alt-drag for explicit cross-section reparenting; ordinary dragging preserves ownership. This follows the spec's explicit-reparent requirement. Cost if wrong: users accustomed to implicit cross-section drops need to change the gesture.
- Ruling: reuse existing section/template catalogs and thumbnails; do not create another catalog engine. Only Text/Button/Image need the new first-slice catalog contract. Cost if wrong: a later complete catalog redesign must also account for sections/templates.
- Ruling: enable TypeScript-extension imports with the existing no-emit configuration, so pure helpers can run directly under the planned Node strip-types test command. Cost if wrong: any future emitting TypeScript build must revisit import rewriting.

### Remaining Scope And Limits

- Insertion is synchronous and keyboard-activatable; asynchronous busy feedback has not been added.
- Device-specific state styles, reset/inheritance and visibility are supported. Independent device geometry/font-size overrides are not introduced in this slice; geometry and typography keep the existing scaling model.
- Widget-part DOM-position selectors retain their existing stability limit: reselect after theme changes or dynamic child reordering. No stable-identity migration is attempted.
- Browser verification uses the existing demo fixture pointed at current editor source, without changing saved site content. Production data, authenticated publishing, and every third-party widget are outside these browser checks.
- No dependency added; no content migration required.

### Final Verification

- PASS: `node --experimental-strip-types scripts/test-canvas.mjs`.
- PASS: `node --experimental-strip-types scripts/test-editor-preview.mjs`.
- PASS: `node scripts/test-site-package.mjs`, including actual state/device ZIP round-trip.
- PASS: `pnpm --filter @hosso/studio-blocks typecheck` and `pnpm --filter @hosso/studio typecheck`.
- PASS: `pnpm --filter @hosso/studio build` (compile, TypeScript, page collection/static generation).
- PASS: `git diff --check`.
- PASS: Chromium editor checks at 1440/900/390px with desktop/tablet/mobile frame modes, bounded toolbars, distinct device hover colors, no page errors and no console errors. Screenshots: `.tmp/wix-final-1440.png`, `.tmp/wix-final-900.png`, `.tmp/wix-final-390.png`.
- PASS: actual public SSR markup in Chromium at 1200/768/390px, real hover color cascade, legacy opacity overridden to 1, and reduced-motion transform suppression. Screenshot: `.tmp/wix-public-mobile.png`.
- PASS: browser insertion/undo, keyboard lock, cross-section style clipboard, section-owner opacity, mobile visibility and inspector keyboard navigation. Unrelated page-copy changes remain untouched.

### Scroll Effects Addendum (2026-10-22)

- Element inspector: Effects -> When scrolling offers Off, Parallax, Pin within section, and Scroll progress. Each element has one active scroll mode.
- Optional element `props._scroll` stores a validated mode, parallax distance, top pin offset, start/end percentages, progress X/Y/scale/opacity endpoints, and mobile opt-out. No schema migration or dependency is needed.
- Progress percentages cover the element travelling from below the scroll viewport to above it. Scrolling backwards reverses the same interpolation.
- Scroll motion uses a separate wrapper so existing element rotation and hover/focus styles remain intact. Layout geometry stays unchanged while editing; motion runs in preview and on public pages.
- Pinning stops at the owning section boundary. Elements taller than the available viewport remain unpinned. Effects stop under reduced motion, and keyboard-focused content is restored to its readable base state.
- This slice targets individual canvas elements, not whole sections or logical container families. Container children retain their own independent settings.
- Data tests cover validation, bounds, reverse progress, pin limits, nested viewport geometry, style clipboard, duplication, undo/redo, SSR and actual ZIP export/import.
- Chromium checks use the actual renderer, runtime and inspector controls in an isolated local fixture; they cover document/nested/iframe scrolling, mobile opt-out, keyboard focus, media-preference changes and listener cleanup. They do not publish or mutate saved content.
- The real editor demo on port 3000 also passes effect selection, changed parallax transforms while scrolling its preview iframe, stable editing geometry, single-step coalesced undo/redo, and pin/progress previews with no JavaScript page errors.
- Production build and authenticated publishing have not been rerun for this addendum; the earlier build results above belong to the original editor work.
