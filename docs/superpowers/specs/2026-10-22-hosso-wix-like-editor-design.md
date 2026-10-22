# Hosso Studio Wix-like Editor

## Intent

Hosso Studio already has a freeform canvas, reusable sections, templates, responsive device modes, and block/widget inspectors. The main problem is usability: components are not perceived as independent objects, visual states are difficult to discover, and common actions are scattered or hard to use.

This project reshapes the existing editor into a Wix-like visual builder without replacing its current canvas engine or breaking existing site data.

## User Outcome

A new user can build a simple landing page with a section, text, button, and image by either dragging an element from the left panel or clicking it. They can select any component independently, see its ownership and hierarchy, edit normal and hover states in an obvious place, preview desktop/tablet/mobile behavior, and use common actions from a nearby toolbar.

## Goals

- Keep the current freeform Canvas as the editing engine.
- Make Section, Text, Button, and Image the first complete component set.
- Use a stable three-column editor layout: element panel left, canvas center, inspector right.
- Support both drag-to-canvas and click-to-add placement.
- Make each component independently selectable, movable, resizable, styled, and responsive.
- Add a floating toolbar for frequent actions.
- Add explicit normal, hover, focus, and active state editing where the component supports it.
- Add snap/alignment guides and predictable placement rules.
- Preserve old content JSON and render old pages without migration.
- Respect reduced-motion preferences and preserve keyboard accessibility.

## Non-goals

- Rebuilding Kiln or moving tenant, billing, domain, or infrastructure management into Studio.
- Replacing the current Puck editor in this project phase.
- Implementing every Wix component before the first slice is validated.
- Adding an AI site generator, marketplace, or billing flow.
- Copying Wix source code, branding, or proprietary visual assets.
- Rewriting all existing page JSON in one migration.

## Anti-goals

- Do not make component styles global by default.
- Do not let editing one component mutate a sibling or parent unintentionally.
- Do not hide hover/responsive settings behind unexplained controls.
- Do not add a second editor engine for the same content format.
- Do not solve missing UX with more buttons in the main toolbar.

## Agreed UX

### Editor shell

The editor uses three primary areas:

```text
Element panel | Canvas | Context inspector
```

The left panel contains searchable element categories and visual previews. The center canvas remains freeform. The right inspector is context-sensitive and keeps a stable tab structure:

- Content
- Design
- Layout
- Effects
- Responsive
- Advanced

### Adding elements

Both methods are supported:

- Drag an element from the left panel into the canvas.
- Click an element to place it using deterministic context-aware placement.

Placement rules:

1. A selected section receives the new element.
2. A selected component places the new element beside it.
3. With no selection, the last visible section receives it.
4. Dragging shows a clear drop target and alignment guides.
5. Automatic placement avoids overlap unless the user intentionally drops on an occupied area.

### Selection and hierarchy

Every selected element shows its own boundary and a nearby floating toolbar. A layer/breadcrumb view identifies the owning page, section, and component so users can see what they are editing.

The floating toolbar contains:

- Duplicate
- Delete
- Lock/unlock
- Hide/show
- Align
- Move forward/backward
- Copy/paste style
- Open inspector
- Open state editor

Low-frequency actions belong in an overflow menu.

### Responsive editing

Desktop, tablet, and mobile remain explicit editing modes. Base styles cascade down; device-specific overrides are stored only when changed. The same component can have device-specific layout and state values.

### Visual states

The inspector exposes a clear state switcher:

- Normal
- Hover
- Focus
- Active

The first slice must support hover values for background, text color, border, shadow, opacity, transform offset/scale, and transition duration. Unsupported states are not shown for components that cannot use them.

## Data and compatibility

Backward compatibility is mandatory. Existing page data must continue to render and remain editable.

The implementation may add optional fields, but must not require a migration for existing pages. The renderer must accept old and new representations. New state data may initially use an optional structure such as:

```ts
states?: {
  hover?: {
    color?: string
    backgroundColor?: string
    borderColor?: string
    boxShadow?: string
    opacity?: number
    translateX?: number
    translateY?: number
    scale?: number
    transitionMs?: number
  }
}
```

The exact storage shape is a builder decision as long as it remains bounded, validated, serializable, and compatible with existing `props` data.

Existing widget-part and responsive mechanisms should be reused where they fit. The builder must avoid duplicating style serialization logic across Button, Text, Image, and Section.

## First-slice components

### Section

- Independent selection and resizing
- Background, border, radius, shadow, spacing
- Alignment guides and child ownership
- Responsive visibility/layout controls

### Text

- Inline text editing
- Typography and color
- Link support where already available
- Hover/focus styling for linked text
- Responsive typography/layout

### Button

- Label, link, icon
- Normal/hover/focus/active states
- Background, text, border, radius, shadow
- Hover transform and transition
- Responsive sizing and visibility

### Image

- Media selection and alt text
- Fit/crop, radius, border, shadow
- Hover opacity/scale/overlay where supported
- Responsive sizing and visibility

## Constraints

- Reuse React, Zustand, lucide-react, existing Canvas files, and existing block package utilities.
- Do not add a dependency for the first slice.
- Preserve current export/import behavior.
- Preserve reduced-motion behavior.
- Keep validation at style and path boundaries to prevent CSS injection.
- Add focused tests for style/state serialization, placement, and backward compatibility.

## Existing code touchpoints

- `apps/studio/src/app/(editor)/editor/[id]/CanvasApp.tsx`
- `apps/studio/src/app/(editor)/editor/[id]/CanvasStage.tsx`
- `apps/studio/src/app/(editor)/editor/[id]/CanvasInspector.tsx`
- `apps/studio/src/app/(editor)/editor/[id]/CanvasLeft.tsx`
- `apps/studio/src/app/(editor)/editor/[id]/WidgetPartsInspector.tsx`
- `apps/studio/src/app/(editor)/editor/[id]/canvas-model.ts`
- `packages/blocks/src/FreeCanvas.tsx`
- `packages/blocks/src/widget-parts.ts`
- `packages/blocks/src/puck-config.ts`
- `scripts/test-canvas.mjs`

The builder should confirm exact additional callers, renderers, exports, and fixtures before editing.

## Builder calls

- Persist new state and device data in the existing page JSON through optional `props` fields, with adapters in shared canvas/style helpers.
- Existing pages must be independently selectable and editable where their element representation supports it; pages without new fields must render unchanged.
- Responsive values cascade from base/desktop to tablet to mobile. Clearing an override falls back to the nearest lower-precedence value.
- A section owns its children. Moving a section moves the section and its children as one unit; moving a child does not move siblings. Snap guides may cross section boundaries, but drop operations must preserve ownership unless the user explicitly reparents.
- New visual states must work in the editor canvas, editor preview, and public renderer through shared serialization/CSS generation.
- One drag/resize gesture, one field commit, one state edit, and one structural command are single undo/redo operations. Continuous pointer movement is coalesced.
- The Image component reuses the existing media picker and media reference format.
- Invalid or unsafe style values are rejected or ignored at the validation boundary and never emitted as CSS. No round-trip preservation is required for invalid values.

The exact field names, layer-tree timing, and bilingual labels remain builder decisions as long as these calls and the user workflow stay intact.

## Acceptance criteria

- A legacy page with no new state fields renders unchanged.
- A user can add Section, Text, Button, and Image by drag and click.
- A selected component can be moved/resized without changing sibling data.
- The floating toolbar performs duplicate, delete, lock, hide, align, and layer actions.
- Button hover styles can be edited and are visible in preview/public rendering.
- Desktop/tablet/mobile overrides do not leak into other devices.
- Invalid style values cannot inject arbitrary CSS.
- Keyboard focus and reduced-motion behavior remain accessible.
- Existing canvas and editor tests pass, plus focused tests cover new state/placement logic.
