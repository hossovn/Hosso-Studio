# Thanh Cuong Autoparts

Vietnamese retail auto-parts storefront for vehicle owners and garages. Visitors find parts by brand, function, name or part code, inspect real product imagery, and contact the shop for price and compatibility advice.

## Product commitments

- Keep the recognizable parts-shop identity: the real gear logo, orange and black branding, conventional commerce navigation, white catalog and dark footer.
- Source the requested names and imagery from thanhcuongauto.com; do not invent prices. Present contact pricing where a price is unavailable.
- Make page layouts, header and footer maintainable in Hosso Studio. Reuse the editor's native blocks and shared site areas.
- Preserve the production WIM connection and its products. The local sample catalog is not authority for the live catalog.
- Preserve the existing detailed **Về chúng tôi** content, including **Giới thiệu**, **Tầm nhìn**, **Cam kết** and **Giá trị cốt lõi**.

## Current environments

**Local draft:** authored in `apps/studio/data/studio-test.db`. Its saved export at `output/thanh-cuong-autoparts/thanh-cuong-autoparts.hosso-site.zip` contains 12 pages, two reusable blocks, 29 media items and five sample products. Prices are hidden and payment secrets were excluded from that inspected export. The export predates the latest local header-button adjustment; it is not a production backup or a current live-site snapshot.

**Production:** https://tcap-web.hosso.vn/admin. The storefront header and footer were edited directly through Studio and saved to their site areas. The desktop header uses an editable logo/navigation canvas; phones and tablets use native logo and wrapping navigation blocks. The footer uses native Text blocks and responsive columns. The existing native About section was preserved, including all four detailed subsections. Public checks found the same nine products across the two WIM grids; the WIM connection, settings and catalog were not modified. No local package was imported.

Server backups were created through the UI before and after the changes: `hosso-backup-2026-10-31T14-19-35-157Z.zip` and `hosso-backup-2026-10-31T14-51-14-037Z.zip` (each shown as 71.3 MB). Two attempts to download the remote ZIP timed out after 60 seconds. The remote backups have not been compared byte-for-byte or restore-tested.

## Verification and remaining limits

Frontend checks at viewport widths 1280px and 391px found no horizontal overflow. Fresh live screenshots are `output/thanh-cuong-autoparts/live-desktop.jpg`, `live-mobile.jpg`, `live-desktop-footer.jpg` and `live-mobile-footer.jpg`. The phone menu is a visible wrapping list of underlined links, not a collapsed hamburger. A small blank utility row remains above the phone logo; keyboard behavior, additional device widths and real-device touch use were not comprehensively tested.

`output/thanh-cuong-autoparts/live-verification.json` records the final public checks: both nine-item WIM grids match their pre-change lists, all five About headings remain in their original final-section position, and the affiliate registration/login form is visible. A read-only source-product check also confirmed an existing WIM product's price and stock; this was not an order or inventory mutation. Preserve valid source prices and use contact pricing only where appropriate.

The local reusable-block device-visibility check passed, but that local application fix was not deployed to production. Live content uses native responsive blocks instead. The frontend update does not establish transaction readiness: production purchase/refund flows, affiliate commissions, email delivery and source-outage behavior remain untested. Six requested WIM scenarios are documented in `output/thanh-cuong-autoparts/kiem-thu-sau-trien-khai.md` for follow-up execution.

Older `desktop*.jpg`/`mobile*.jpg` files and the local ZIP remain draft evidence. Blank regions in an older full-page capture can result from lazy `content-visibility` rendering and do not establish missing content.
