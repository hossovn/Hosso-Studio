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
Device layouts inherit the desktop layout until tablet or mobile overrides are saved.

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

Tablet and mobile now have independent element geometry/style and section spacing
overrides. Text, media, links, element membership and section order remain shared.
Use **Tự xếp dọc** on a FreeCanvas section for a one-step vertical layout suggestion,
then refine it by dragging or editing its properties. **Dùng bố cục gốc** removes
the selected device's overrides for the selected element or section.

The underlying coordinate system remains 1200 design pixels. Geometry and font-size
controls display pixels at the selected device width (1200, 768 or 390). Published
layouts use desktop above 1024px, tablet at 601–1024px, and mobile at 600px or below.
Sizes continue to scale within each range. Vertical stacking is an undoable layout
suggestion; it does not continuously reflow content after later edits.

See [Studio publishing](studio-publishing.md) for draft preview, pre-publish checks,
website releases, restoration, permissions and the database migration.

## Interactive detailing effects

Open `/editor/effects` to try the new elements in an in-memory editor without
changing the site's pages or settings. Enable Preview to interact; reload resets
the demo. Three editable sections are also available in the section library.

- **So sánh trước / sau**: add from the element library or quick-add panel. Choose
  both images, their alt text and labels in Content. Set left/right or top/bottom
  orientation and initial split; change the divider color, radius and image fit
  in Design. Visitors can use mouse, touch, arrow keys, Home and End.
- **Số liệu / đếm tăng**: enable **Số đếm tăng dần khi cuộn tới** in Content. Set
  the start, optional numeric target, duration, decimal places, number format and
  replay behavior. Without an explicit target, `Con số` is parsed using the chosen
  locale (Vietnamese by default: `1.500` means 1500, `98,5` means 98.5). Existing
  number elements remain literal until this option is enabled. Counters display
  their final value in edit mode, on the server and with reduced motion; animation
  pauses while offscreen or in a hidden tab. Screen readers receive the final value.
- Select **Di chuột** for an image, button or text element to apply a quick
  **Nâng nhẹ**, **Phóng nhẹ** or **Nổi bóng** preset. These use the existing device
  state overrides and retain reduced-motion behavior. Fine-tune them in the state
  design controls; remove them with **Xóa ghi đè**.

Comparison sources, labels and counter content stay shared across device layouts.
Layout and style can still be overridden per device. All effects remain ordinary
Canvas JSON and travel with the existing site package export/import.

Demo photographs: Unsplash photo IDs 1464822759023-fed622ff2c3b and
1551632811-561732d1e306, downloaded to public/editor-demo. The sample video is the
MDN interactive-examples flower.mp4 fixture and requires network access.
