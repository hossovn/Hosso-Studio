# Commerce plugin suite
[Tiếng Việt](../PLUGIN-COMMERCE.md) | **English**

A standalone online store (no WIM needed) built from small plugins. **`shop` and `affiliate` are open plugins** (this repo). **The others are commercial, closed-source plugins sold under a license** (see section 5); this repo only contains the core they plug into. Each plugin does one thing and they talk to each other through **core events** (see section 3), so you can enable or disable each as needed. Choose enabled plugins with `NEXT_PUBLIC_HOSSO_PLUGINS` (comma-separated ids, at build time) or edit `plugins` in `apps/studio/hosso.config.ts`.

## 1. Plugins

| Id | License | What it does | More |
|---|---|---|---|
| `shop` | Open | Products, categories, variants, stock, cart, checkout, orders, reviews, CSV, order printing | [PLUGIN-SHOP.md](PLUGIN-SHOP.md) |
| `promotions` | Commercial | Discount codes (percentage, fixed amount, free shipping) with minimum order, validity and usage limit | Admin → Promotions |
| `shipping` | Commercial | Shipping fee at checkout (flat, free over X, or GHN), shipments, GHN order creation, shipment tracking | Admin → Shipping |
| `payment` | Commercial | VietQR code and automatic confirmation when the money arrives through the SePay webhook (or manual confirmation) | Admin → Payments |
| `notify` | Commercial | Emails the owner about new orders and the customer about placement, status changes and payment | Admin → Notifications |
| `affiliate` | Open | Partners sign up, referral links, per-order commission | Admin → Affiliate marketing |
| `analytics` | Commercial | Google Analytics 4 and Meta Pixel (view product, add to cart, purchase) | Admin → Marketing |
| `reports` | Commercial | Reports page: revenue per day, best sellers, order statuses, low stock | `/admin/shop-reports` |
| `accounts` | Commercial | Customer accounts: login, order history, saved addresses, checkout prefill | "Customer accounts" block |

**Order in `plugins` matters.** The `beforeOrder` hook runs in this order: put `shipping` BEFORE `promotions` so a free-shipping code can see the shipping fee. Current order: `shop, affiliate, shipping, promotions, payment, notify, analytics, reports, accounts`.

## 2. Environment variables

| Variable | Plugin | Meaning |
|---|---|---|
| `HOSSO_GHN_TOKEN`, `HOSSO_GHN_WEBHOOK_KEY` | shipping | GHN API token; key for the status webhook |
| `HOSSO_SEPAY_KEY` | payment | SePay webhook API key (`Authorization: Apikey <key>`). Register `https://<site>/api/plugins/payment/sepay/webhook` with SePay |
| `HOSSO_SMTP_URL`, `HOSSO_MAIL_FROM` | notify | Send email (otherwise emails are only written to the log) |

## 3. Core events (for plugin authors)

Plugins declare them under `hooks` on the plugin object (see `packages/blocks/src/types.ts`):

- `beforeOrder({ draft })`: adjust the order being prepared by pushing to `draft.adjustments` (positive = fee, negative = discount); may reject with `{ reject: { code, message } }`. `draft.meta` carries raw browser data (for example `meta.voucher`, `meta.locale`).
- `onOrderPlaced(event)`: the order is saved. May return `{ redirectUrl }` to send the customer to a payment gateway.
- `onOrderStatusChanged(event)`: the order status changed.
- `onOrderPaid(event)`: a payment plugin reports money received; the sales plugin marks the order paid.
- `describeOrder(event)`: adds display info for the customer when tracking an order (bank transfer QR code).
- `sitemap(payload)`: paths to add to `sitemap.xml`.

An error in one hook is only logged and never breaks the order (except a deliberate `reject`). Sales plugins emit events with `emitBeforeOrder`, `emitOrderPlaced`, `emitOrderStatusChanged`, `emitOrderPaid` from `@hosso/studio-blocks`. Separate customer logins (partners, customer accounts) use the core `sessionOf(cookie-name)`, kept apart from admin users.

Implicit contract between `accounts` and `shop`: `accounts` stores customer details in `localStorage` key `hs_customer` so `shop` prefills checkout; `shop` fires the browser events `hs:view_item`, `hs:add_to_cart`, `hs:purchase` for `analytics`.

## 5. Licensing for commercial plugins

Commercial plugins (`promotions`, `shipping`, `payment`, `notify`, `analytics`, `reports`, `accounts`) are installed into each customer's own build together with a **license key** set in the `HOSSO_LICENSE_KEY` environment variable.

- The key is an Ed25519-signed string `HLK1.<payload>.<signature>`, verified offline with the public key in `packages/blocks/src/license.ts`. The payload holds the customer (`tenant`), the plugin list (or `*`), the expiry date and (optionally) hostnames.
- In production (or with `HOSSO_LICENSE_ENFORCE=1`) without a valid key, the plugin's hooks, endpoints (they return 402) and loaders are disabled; the site and the open plugins keep working. In dev they run as a trial.
- Optional `HOSSO_LICENSE_SERVER=<license server>`: Studio asks online (result cached for 5 minutes) whether the key was revoked; if the server does not answer it keeps running.
- Admin → Manage plugins shows the license status; the dashboard has a "Plugin license ..." step.
- To buy a license or plugins, contact Hosso. Authors of commercial plugins wrap them with `withLicense(plugin)` from `@hosso/studio-blocks`.

## 4. Known limits

- Stock, voucher usage counts and the review rate limit are not inside a DB transaction/lock (see the `ponytail:` notes in the code).
- No redirect-based payment gateway yet (VNPay, MoMo); `payment` supports automatic bank-transfer confirmation through SePay.
- The GHN fee relies on matching a hand-typed address against GHN's province/district/ward lists; when not recognized the flat fee is used.
- CSV does not support variants yet.
- Not tried with the real GHN and SePay (mock/simulated only).
