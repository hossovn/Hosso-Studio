# Shop plugin (`@hosso/plugin-shop`)
[Tiếng Việt](../PLUGIN-SHOP.md) | **English**

A standalone online store that does not need WIM. Use it when the customer wants to manage products inside Studio. It can be enabled together with WIM but you normally pick one (both plugins add a cart link to the header).

## Data (Admin → Shop)

- **Product categories**: name, slug (generated), parent, image, sort order.
- **Products**: name, SKU, price, sale price, stock, brand, compatible car makes (`makes`, lowercase without accents), images, description, on sale.
- **Orders**: created only through checkout; admins view them and change the status (New, Confirmed, Shipping, Completed, Cancelled). Cancelling restores stock once.
- **Shop settings**: bank transfer details (leave empty for COD only).
- **CSV import/export** (`/admin/shop-import`): columns `code, name, category, brand, price, salePrice, stock, makes, description, image, active`. Rows are matched by `code`, new codes create products; missing categories are created; `image` is a file name already in Media; separate `makes` with `;`.

## Blocks (page builder)

`ShopProductGrid` (filters `?q=`, `?category=`, `?make=`, `?brand=`, pagination when "Show pagination and URL filters" is on), `ShopProductDetail` (`?p=<product slug>`), `ShopCategories` (automatic from categories), `ShopCart`, `ShopCheckout`, `ShopOrderStatus`. Sample pages: `/san-pham`, `/chi-tiet`, `/gio-hang`, `/thanh-toan`, `/trang-thai-don`.

## Ordering

The cart lives in the browser. The server reads prices and checks stock at checkout (it never trusts browser prices), decrements stock, creates order `SO-000001`, then emits the `onOrderPlaced` event so the Affiliate and Shipping plugins work right away. Retrying the same cart does not create a second order.

Limits: stock is not updated inside a single DB transaction (two simultaneous orders for the last item may both pass); no shipping fee, discount codes or online payment yet.

Postgres: after adding the plugin, generate a migration: `HOSSO_DATABASE_URL=postgres://... pnpm --filter @hosso/studio payload migrate:create shop`.
