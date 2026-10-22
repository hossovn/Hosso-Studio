# Visual Editor

The existing page editor now supports cross-section dragging, container groups,
an on-canvas HUD, Swiper elements, and selectable video players.

## Demo

Run the existing studio dev command and open /editor/demo. The demo starts with
the Adventure headline selected. Changes in this demo are in memory only;
reloading resets the sample. Real pages retain the existing draft/save workflow.

## Starter Templates

Open Kho mau, then Mau trang. There are eight editable
starter pages, two in each category: business, shop, restaurant/cafe, and portfolio.
Category filtering and text search work together. Each template can be previewed
before insertion. Existing block patterns remain available under Mau khoi.

Inserting a template adds its three sections after the visible block without
replacing existing content. The entire insertion is one undo history entry.
The inserted sections use the existing FreeCanvas data contract and fresh element IDs.
Full-page templates are not offered while editing a shared header or footer.

These are layout starters, not configured stores or booking systems. Replace the
sample brand, photos, copy and hello@example.com before publishing. Category names
do not activate plugins, payments, inventory, reservations or authentication.
Device previews still scale one layout rather than generate independent breakpoints.

Template photos are bundled under public/editor-templates, downloaded from Unsplash:
workspace 1497366811353-6870744d04b2, watch 1523275335684-37898b6baf30,
cafe 1501339847302-ac426a4a7cbb, restaurant 1414235077428-338989a2e8c0.
Portfolio starters reuse the existing editor-demo mountain/trail photos.
Team and testimonial sample portraits use Unsplash photo IDs
1494790108377-be9c29b29330, 1500648767791-00dcc994a43e,
1534528741775-53994a69daeb and 1506794778202-cad84cf45f1d.
These photographs and sample names are illustrative.

## Data Contract

- Page content remains compatible with the existing Puck document format.
- Section elements remain in props._els; legacy elements arrays are still read.
- All element coordinates are section-relative design pixels on a 1200px canvas.
- Optional parentId records container membership, not a different coordinate system.
- Container transforms include descendants; copies remap their IDs and parent IDs.
- A cross-section drop commits removal and insertion as one history entry.
- DOM rectangles convert both position and dimensions between differently scaled layers.
- The editor uses explicit pixel rendering inside its iframe; published rendering
  retains the existing container-query scaling.

Edit mode intercepts website links, actions, and form submissions. Editor controls
and activated media widgets are exempt. Preview links to another page open in a
new tab; same-page anchors remain inside the preview. Preview forms do not submit.
This is interaction protection, not a security sandbox for untrusted scripts.

## Checks And Limits

Run pnpm test:canvas and the studio/blocks typechecks. Browser checks cover section
transfer, group transfer, undo/redo, eight resize directions, widget insertion,
text editing, media interaction, navigation protection, and device widths.

Device previews scale the existing design; this change does not introduce independent
breakpoint layouts, collaboration, or a replacement publishing system.

Demo photographs: Unsplash photo IDs 1464822759023-fed622ff2c3b and
1551632811-561732d1e306, downloaded to public/editor-demo. The sample video is the
MDN interactive-examples flower.mp4 fixture and requires network access.
