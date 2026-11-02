# Studio editor workbench

Implemented on 2026-11-02 after the owner chose to prioritize Studio, use the supplied Wix screenshots as references, and let the implementer resolve details directly.

## Scope and architecture

The existing Next/React canvas, page JSON, responsive projections, history and publication flow remain the foundation. The work concerns Studio's editor, independently of the customer storefront design and Kiln's future management dashboard.

- Compact white editor chrome with Hosso green actions, a line-icon rail and a wider canvas.
- Tool panels open by clicking and stay open while the pointer leaves. Clicking the active tool or pressing Escape closes the panel.
- Categorized section gallery with real content thumbnails, search, click insertion and existing drag payloads. Thumbnails show the settled design, without starting animation controls.
- Page template library with eight existing templates, category filtering and full-page preview. Insertion appends template sections after the visible section without replacing existing content; one undo reverses the entire insertion.
- Mobile file actions live under **Tác vụ**, while device, scope, undo and inspector controls remain directly accessible.

## Brand editing

Administrators can edit the current theme's colors and heading/body fonts directly from **Thương hiệu**. The server supplies only the theme manifest's public metadata and a permission flag. Existing Payload access controls enforce read/write permissions for site settings.

- The panel reads the current settings draft and edits known color/font tokens.
- Valid changes preview through isolated iframe CSS; they do not recolor the editor itself.
- Switching tools retains pending changes. Leaving the document with unsaved brand edits triggers the browser's normal warning.
- **Lưu thương hiệu** uses the existing site-settings draft endpoint and publication lock. Saving an ordinary page does not publish brand settings; the website release process publishes them.
- Elements with explicit local colors or fonts retain those overrides. This panel edits theme tokens, not every element's individual style.

## Product curation

The `ShopProductGrid` content inspector supports two sources:

1. **Tự động theo bộ lọc**: the existing catalog/filter behavior. `productIds` is absent or `null`.
2. **Chọn sản phẩm cụ thể**: an explicit `productIds` array. Search and pagination let the owner choose active catalog products, while existing selections remain visible across searches and reloads.

An empty manual array means no products. The loader returns an empty result before catalog synchronization/querying, preventing accidental exposure of the full catalog. Category, brand and sort settings still apply to the chosen subset. This is curation for one block; it does not change catalog-wide publication, pricing or purchase permissions. WIM/WooCommerce products already unified in the shop catalog use the same picker. Legacy standalone source-specific grids retain their own controls.

## Verification

Run from the repository root:

```powershell
pnpm --filter @hosso/studio typecheck
pnpm test:canvas
pnpm test:studio-layout
pnpm check:boundaries
pnpm test:studio-workbench
```

The browser suite uses a newly created temporary SQLite database, a test account, generated products and port 3111. It does not use the user's test/storefront database. Set `HOSSO_PLAYWRIGHT_MODULE` if Playwright is supplied by an external runtime.

The suite checks panel behavior, section insertion, page template insertion and undo, live brand CSS, invalid colors, retry after a failed save, draft isolation, retained brand edits, mobile actions and a 375px gallery, manual product selection/reload, real loader filtering, empty selection, restoration of automatic mode and browser/hydration errors.

Screenshots and the latest result are written to `output/studio-workbench-2026-11-02/`. The fixtures and displayed product prices are synthetic. The editor remains light themed; this change does not introduce a dark theme. Production deployment, Kiln management migration and blocking hosted `/admin` are separate work.
