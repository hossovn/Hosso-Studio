---
name: Hosso Studio Editor
description: Compact tools around a website canvas, with deliberate panels and visual templates.
colors:
  brand: "#16704a"
  accent-soft: "#e8f3ed"
  surface: "#ffffff"
  soft: "#f4f6f8"
  border: "#dfe3e8"
  line: "#e9ecf0"
  ink: "#20242b"
  muted: "#626b76"
typography:
  title:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "18px"
    fontWeight: 650
    lineHeight: 1.35
    letterSpacing: "-0.02em"
  body:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1.5
  rail:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "10px"
    fontWeight: 500
    lineHeight: 1.3
rounded:
  compact: "4px"
  control: "10px"
  card: "14px"
  panel: "18px"
  dialog: "20px"
spacing:
  small: "8px"
  medium: "16px"
  large: "24px"
components:
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    typography: "{typography.body}"
    padding: "0 14px"
    height: "38px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    typography: "{typography.body}"
    padding: "0 14px"
    height: "38px"
  search:
    backgroundColor: "{colors.soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    typography: "{typography.body}"
    padding: "0 12px"
    height: "40px"
  navigation-selected:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.brand}"
    rounded: "{rounded.card}"
    typography: "{typography.rail}"
    padding: "7px 2px"
  selection-chip:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.compact}"
    typography: "{typography.label}"
    padding: "5px 7px"
  template-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
---

# Design System: Hosso Studio Editor

## Overview

**Creative North Star: "The Working Canvas"**

This is an extracted description of Studio's editor, scoped to this directory. The canvas carries the website; compact white controls surround it. The owner supplied Wix references and authorized implementation decisions directly. The familiar editor structure is retained with Hosso's green action color.

The interface supports repeated, precise work: choose a section or page template, edit content, preview devices and save through the existing publication flow. This record concerns editor controls. Website theme tokens, template artwork, and the Thanh Cuong storefront identity belong to their own surfaces.

**Key Characteristics:**

- Compact toolbars and a line-icon navigation rail.
- White controls separated by quiet gray rules.
- Visual libraries with real, settled content previews.
- Deliberate panel opening and persistent editing state.
- Green actions and selected states, with responsive tool access.

## Colors

The palette uses a restrained primary accent and neutral work surfaces. The frontmatter records the reusable editor tokens.

### Primary

- **Hosso green** (`brand`): primary actions, active tools and focus outlines.
- **Pale green** (`accent-soft`): selected rail tools and product-selection chips.

### Neutral

- **White work surface** (`surface`): toolbars, panels, inspector and menus.
- **Soft gray** (`soft`): search fields and quiet control groups.
- **Structural gray** (`border`): boundaries between work regions.
- **Divider gray** (`line`): separators within panels.
- **Dark ink** (`ink`): primary control text.
- **Muted slate** (`muted`): supporting text and inactive control labels.

**The Separate Surfaces Rule.** Website brand changes preview inside the canvas; they do not recolor editor controls.

## Typography

The editor uses a system sans-serif stack. Panel titles are modestly larger than body controls, while rail labels remain compact. The title, body, label and rail roles in the frontmatter describe the recurring scale; the website's display typography is independent.

Panel headers use a slightly stronger title treatment (14px, weight 650). Selected object headings are larger (16px, weight 650). Gallery and brand introductions share the frontmatter title role. Supporting notes use the body scale with a slightly looser line height in dense explanatory text (1.65).

**The Interface Type Rule.** Keep control typography stable when the customer's website font changes.

## Layout

The editor fills the viewport. Its top header is compact (58px). The workbar beneath it starts at 48px and sits within a 12px workspace gutter, wrapping when needed. The desktop tool rail has a 60px white surface within a 72px slot. The canvas fills the remaining space, and the contextual inspector is 304px wide with space around its outer edge.

Ordinary tool panels are overlays anchored beside the rail (360px wide), with a visible gap above and below. Section and page libraries expand to a bounded wide panel. Sections use two columns by default and three on viewports from 1500px. Page templates use three columns, two below 1000px, and one below 700px.

Below 1100px, the inspector becomes an overlay and opening one side panel closes the other. Below 700px, the rail narrows to a 52px surface within a 60px slot, gutters reduce to 8px, library categories wrap above their content, and file actions move into **Tác vụ**. At widths below 400px, section previews also use one column. The rail and panel bodies scroll independently.

**The Deliberate Panel Rule.** Open tools with a click. Moving the pointer away does not close the panel; the active tool, close control or Escape closes it.

## Elevation & Depth

The header stays flat. The workbar and selection bar read as white surfaces on a cool gray workspace; the rail and inspector have a light offset shadow. Overlay panels and menus use the shared offset shadow recorded in the sidecar. Template cards use a thin border. The template preview dialog has a stronger shadow and dimmed backdrop because it interrupts the canvas for a full-page preview.

Panel entrance motion is brief (160ms) and moves a few pixels into place. Reduced-motion preferences disable interface transitions and animations. Library thumbnails show a settled design without running content animations.

**The Overlay Depth Rule.** Use panel elevation to distinguish temporary tools from the persistent workspace.

## Shapes

The owner found the 1.5.1 editor too square. Controls now use visibly curved corners, cards are softer, and detached tool surfaces have the most generous radius. Segmented controls use smaller inner corners to fit their rounded container. The customer's website canvas and authored page geometry remain rectangular. The round plus affordance belongs to a section preview's insertion action; it is not the shape of every control.

## Components

### Buttons

File actions use compact text with an adjacent icon. Primary actions are solid green with white text; secondary actions are white with a light rule. Hover uses a quiet tone change, and keyboard focus has a visible green outline. Disabled actions reduce opacity and do not suggest clickability.

### Inputs / Fields

Search uses a soft background, leading search icon and a compact height. Brand fields pair a visible label with a select or color control. Invalid colors show an inline message and disable saving. Product searching provides loading, error, empty and retry states.

### Navigation

The rail stacks line icons over small labels. The active tool uses a pale-green field and green text. Separate hover tints remain for some existing tool categories. Rail buttons expose pressed and expanded states; they do not switch panels on focus or hover.

### Chips

Selected products appear as pale-green removable chips. Text truncates before the removal action. The selection persists when the search changes or the inspector is reopened.

### Cards / Containers

Section cards show real template content above a concise label and a plus affordance. Page cards show a larger stacked miniature, category and explicit preview/insert actions. The gallery does not replace existing page content when a template is inserted.

### Brand Panel

The brand panel groups a style sample, palette and typography controls. Changes preview live, retain their state across tools, and save as a settings draft. Explicit per-element website styles remain independent.

### Product Picker

Each row pairs selection, product photo or missing-image placeholder, product name and code. Photos follow the shop catalog's existing local/supplier image policy. Manual selection changes what the block shows without changing catalog-wide sale status.

## Do's and Don'ts

### Do:

- **Do** keep website content visually separate from editor controls.
- **Do** use real template previews and catalog photos when available.
- **Do** expose loading, empty, error and disabled states for data-dependent tools.
- **Do** retain pending brand edits when switching tools.
- **Do** preserve keyboard focus indicators and reduced-motion behavior.

### Don't:

- **Don't** reopen the old hover-to-open panel behavior.
- **Don't** start website animations inside template thumbnails.
- **Don't** treat an empty manual product selection as the full catalog.
- **Don't** apply a customer's storefront colors to Studio's editor chrome.
- **Don't** present a draft brand save as publication of the website.
