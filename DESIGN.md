---
name: Thanh Cuong Autoparts
description: Saved production storefront identity with a source-backed commerce block extension awaiting deployment.
colors:
  authored-amber: "#f5a31a"
  bg: "#ffffff"
  dark: "#0a0a0a"
  copyright-dark: "#050505"
  footer-copy: "#d1d5db"
  commerce-primary: "var(--hs-primary)"
  commerce-on-primary: "var(--hs-on-primary)"
  commerce-bg: "var(--hs-bg)"
  commerce-surface: "var(--hs-surface)"
  commerce-text: "var(--hs-text)"
  commerce-muted: "var(--hs-muted)"
  commerce-border: "var(--hs-border)"
typography:
  body:
    fontFamily: "Barlow, sans-serif"
  heading:
    fontFamily: "Chakra Petch, sans-serif"
  footer-body:
    fontSize: "15px"
  footer-label:
    fontSize: "16px"
  copyright:
    fontSize: "13px"
  commerce-heading:
    fontFamily: "var(--hs-font-heading)"
    fontSize: "1.75rem"
    letterSpacing: "0"
  commerce-title:
    fontFamily: "var(--hs-font-heading)"
    fontSize: "1.2rem"
  commerce-amount:
    fontSize: "1.4rem"
    fontWeight: 700
  commerce-policy:
    fontSize: ".9rem"
    lineHeight: 1.65
rounded:
  square: "0px"
  control: "4px"
  themed: "var(--hs-radius)"
spacing:
  compact: ".75rem"
  regular: "1rem"
  section: "1.5rem"
  columns: "2rem"
components:
  header-frame:
    backgroundColor: "{colors.dark}"
    textColor: "{colors.bg}"
    rounded: "{rounded.square}"
  footer-frame:
    backgroundColor: "{colors.dark}"
    textColor: "{colors.footer-copy}"
    typography: "{typography.footer-body}"
  footer-label:
    textColor: "{colors.authored-amber}"
    typography: "{typography.footer-label}"
  copyright-frame:
    backgroundColor: "{colors.copyright-dark}"
    typography: "{typography.copyright}"
  commerce-button:
    backgroundColor: "{colors.commerce-primary}"
    textColor: "{colors.commerce-on-primary}"
    rounded: "{rounded.themed}"
    padding: ".7rem 1.25rem"
  commerce-input:
    backgroundColor: "{colors.commerce-bg}"
    textColor: "{colors.commerce-text}"
    rounded: "{rounded.themed}"
    padding: ".65rem .75rem"
  commerce-summary:
    backgroundColor: "{colors.commerce-surface}"
    padding: "1.5rem"
  commerce-navigation-active:
    backgroundColor: "{colors.commerce-text}"
    textColor: "{colors.commerce-bg}"
    rounded: "{rounded.control}"
    padding: ".75rem"
---

# Design System: Thanh Cuong Autoparts

## Overview

**Creative North Star: "The Parts Counter"**

This name summarizes the user-selected conventional parts-shop direction. The real gear logo, dark shop chrome, warm orange accents and white catalog make the storefront immediately recognizable as an auto-parts retailer. Imagery and product names carry the merchandising.

This record describes the saved production frontend at `tcap-web.hosso.vn`, based on the final editor settings and fresh live desktop/phone captures from 2026-10-31. The production WIM catalog, original imagery and detailed About content remain in place. The earlier local database/export is a separate draft and is not the authority for this live site. Frontend completion does not imply transaction, affiliate or email verification.

The commerce extension below records the implemented Shop, Affiliate and Account blocks in the review branch on 2026-11-01. It extends the same identity with flat task surfaces, product thumbnails, explicit totals and compact account navigation. Its source and isolated local review are evidence for the new components only; they do not supersede the production observations above or establish a live deployment. Commerce colors resolve through the installed site's `--hs-*` theme tokens rather than copying local fixture colors into the storefront contract.

**Key Characteristics:**

- Recognizable commerce hierarchy and dense, image-led browsing.
- Dark header and footer framing a white catalog.
- Warm accents for category entry and actions.
- Editable native blocks and reusable site areas.
- Flat transaction layouts with clear totals, state feedback and deliberate confirmation.

## Colors

The live chrome pairs warm amber with black framing and a white catalog. The frontmatter records confirmed authored colors; inherited product/theme colors were not remeasured and are not redefined here.

The review branch's commerce primitives use the semantic theme values recorded as `commerce-*` references. Primary/on-primary form an action pair; background/surface separate content and summaries; text/muted/border distinguish hierarchy. Affiliate balances and order totals use text color for readability. Their values remain site configurable.

### Primary

- **Counter Amber** (`authored-amber`): service emphasis and footer labels.

### Neutral

- **Catalog White** (`bg`): catalog surface and header navigation copy.
- **Shop Black** (`dark`): authored header/footer framing; **Copyright Black** (`copyright-dark`) closes the footer.
- **Footer Copy** (`footer-copy`): footer paragraphs and links.

**The Catalog Clarity Rule.** Product names, codes and contact actions must stay legible over their actual surface; brand orange does not substitute for readable text contrast.

## Typography

**Display Font:** Chakra Petch with sans-serif fallback.
**Body Font:** Barlow with sans-serif fallback.

Barlow body and Chakra Petch headings remain the selected direction. The remote font files and computed font weights were not audited in this pass, so the frontmatter does not assert a new global size ramp. The measured authored footer sizes are recorded separately.

### Hierarchy

- **Heading:** existing uppercase catalog headings remain visually separate from body copy.
- **Body:** native reading and form content; a single global size is not asserted here.
- **Footer body / label:** light copy with larger amber strong labels.
- **Copyright:** smaller subdued copy on a darker closing strip.
- **Commerce heading / title:** compact section headings and task-group headings from the block source, separate from the storefront's larger display typography.
- **Commerce amount:** bold tabular numbers for summaries and affiliate balances; the affiliate phone layout reduces amounts to (1.2rem).
- **Commerce policy:** secondary explanatory copy with a maximum measure of (65ch).

**The Task Type Rule.** Commerce controls inherit the site's body font; task headings inherit its heading font. Amounts use tabular numerals, and compact commerce surfaces keep normal letter spacing.

## Layout

The saved production sequence keeps logo/navigation, service band, original slider, category grid, two existing WIM product grids, the detailed About content and footer. Original body assets and catalog composition were preserved.

Category browsing remains a six-column desktop/two-column phone pattern. Do not replace the production WIM grids with the local five-product sample catalog. Public checks found the same nine products across the two live grids.

The desktop header is an editable black canvas with the original gear logo and six parent navigation groups, including dropdown children. Phones and tablets use a native logo block and seven flat wrapping navigation links. The service TrustBar has four items and is hidden on phones. The footer uses three native Text paragraphs, arranged in three desktop columns, two tablet columns and one phone column, followed by a separate copyright block. Phone footer copy is constrained to 230px to leave room for floating contacts.

Footer inner-part styles change at maximum widths of 1024px and 600px (`packages/blocks/src/widget-parts.ts`). These differ from block visibility bands: phone below 640px, tablet from 640px through 1023px, desktop from 1024px (`packages/blocks/src/hs-content-css.ts`). Keep those mechanisms distinct when editing responsive content.

Viewport checks at 1280px and 391px found no horizontal overflow. Phone navigation is visible and underlined; it is not a collapsed hamburger. An approximately 32px blank utility row remains above the phone logo. Desktop canvas coordinates, the 13px desktop menu and that residual row are recorded implementation details, not recommended global spacing or sizing tokens.

The new cart uses a single fluid column, splitting at (64rem) into product rows and a summary track of (280px) to (340px) when the two-column option is selected. The checkout split option uses two flexible tracks from (56rem); its submit action follows the total and delivery groups in document order and remains associated with the recipient form. Summaries may stick at (1.5rem) from the top on wide screens. Commerce wrappers are constrained to (76rem); affiliate content uses (72rem), a (200px) navigation track and a flexible content track. Affiliate navigation wraps into rows and assisted ordering stacks below (800px). Financial tables scroll inside their own containers instead of squeezing columns into the viewport.

## Elevation & Depth

The live chrome uses flat black surfaces and color separation rather than decorative elevation. Existing catalog cards and floating contact controls retain their incumbent depth. Their remote shadow/motion values were not remeasured, so this pass does not establish new shadow or motion tokens.

The review branch's commerce tasks use flat lists, thin separators and a contrasting summary surface without decorative shadows. Affiliate overview values share an unframed grid bounded by horizontal rules.

**The Flat Task Rule.** Product rows and financial information stay flat; tonal surfaces identify summaries and quotes rather than wrapping every section in a card.

## Shapes

Authored chrome uses square framing. Product/category cards retain their incumbent lightly softened corners, and floating contact controls remain circular. No global corner reset was applied to the existing catalog.

New quantity controls, thumbnail frames, icon actions and account navigation use lightly softened (4px) corners. Form fields and primary buttons follow the site's radius token. These local controls do not alter the square header/footer or circular contact actions.

## Components

### Buttons

Existing catalog actions remain native. The local draft's category/search buttons were not imported. Do not derive live button colors or dimensions from that stale export.

New commerce primary commands use theme primary/on-primary, inherited body type and semibold weight (600). Quantity, removal, copy and search actions use Lucide symbols with accessible names; unfamiliar icon buttons carry titles. Focus uses a text-color outline (2px) offset by (3px). Disabled commands are visibly subdued and prevent duplicate or invalid submissions. Coarse pointers expand quantity and icon actions to (44px). Active affiliate commands move down (1px); the short color transitions (120ms) and content reveal (180ms) run only when reduced motion is not requested.

### Cards / Containers

The existing WIM cards and source imagery remain in place. The update changes storefront framing, not catalog records, product counts or source connectivity. Preserve readable names, codes and contact pricing when modifying these components later.

New cart rows retain real source thumbnails with contained fitting, use a fallback when unavailable, and keep quantity, line total and removal grouped with each product. Checkout thumbnails are (56px); cart thumbnails are (80px), reduced to (56px) at narrow widths. Summary surfaces use the theme's surface color and regular interior spacing.

### Inputs / Fields

Existing native fields and validation were preserved. No new field styling or production submission behavior was verified in this frontend pass.

New commerce fields use persistent labels, themed background/text/border and the site's radius. Native radio, select and number inputs preserve expected form behavior. Quantity steppers expose bounds; voucher actions retain a single-line label. Loading, empty and error states appear at the affected task. Checkout keeps recipient fields before the summary and final submit; a successful order is shown before a collapsed alternative lookup form.

### Navigation

Desktop uses six parent groups in the editor canvas, including nested links. Phone/tablet navigation uses the native NavMenu with seven flat visible links and wrapping/automatic height. These variants use device visibility instead of relying on the local reusable-block fix, which was not deployed. Keyboard operation and additional real-device checks remain follow-up work.

New Affiliate and Account blocks offer sidebar or wrapping horizontal navigation. The active section uses text/background inversion, a semibold label and `aria-current`; minimum command height is (44px). Hidden sections do not occupy space.

### Commission and quote review

The new assisted-order quote separates item prices, adjustments, customer total, expected commission and delivery/COD groups before confirmation. Wallets identify available balance, withdrawal threshold, next scheduled date and the reason a withdrawal is unavailable; empty withdrawal and payout histories have explicit states. Negative adjustments remain visible in balances. Administrative tables translate approval states and retain readable columns within horizontal scrolling containers. These are implemented UI patterns, not evidence of live payment or source acceptance.

### Contact and About

The native footer contains company information, policy/support links, and contact/partner links. Copy and links are light grey; strong labels are amber. The email action reads “Gửi email tư vấn” and retains its mailto destination. The footer's phone copy width leaves room for the existing phone/Zalo/email floats; copyright uses a separate darker strip with 1px root top padding to avoid a white seam. The original native About ImageSections block and its Giới thiệu, Tầm nhìn, Cam kết and Giá trị cốt lõi sections were preserved.

## Do's and Don'ts

### Do:

- **Do** preserve the real logo, source merchandising images and recognizable parts-shop hierarchy.
- **Do** use native editor blocks and shared site areas for editable storefront content.
- **Do** confirm readable names, keyboard focus and reachable contact actions on phones.
- **Do** preserve production WIM products and the detailed About content during future changes.
- **Do** inherit semantic commerce colors from the active site theme and keep totals readable in text color.
- **Do** place final transaction confirmation after the total, preserve native form validation and explain unavailable actions.
- **Do** provide keyboard focus, bounded quantities, explicit empty states and reduced-motion behavior in reusable commerce blocks.

### Don't:

- **Don't** invent product prices or substitute local sample products for the production catalog.
- **Don't** replace the conventional commerce direction with an unrelated editorial composition.
- **Don't** treat frontend verification as proof of payments, refunds, commissions, email delivery or source-outage handling.
- **Don't** promote local illustrative products, fixture colors or isolated browser tests into production merchandising or deployment evidence.
