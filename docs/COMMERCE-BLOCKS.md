# Commerce Blocks Review

Status: implementation branch for review. No production deployment or content publication was performed for this release.

## Editor Controls

| Block | Controls and behavior |
| --- | --- |
| ShopCart / WimCart | One or two columns, product images, quantity steppers and manual input, removal with undo, sticky summary, heading and action copy, empty-state copy. |
| ShopCheckout / WimCheckout | Existing layout and content controls; recipient, pickup branch, COD/bank transfer, vouchers, authoritative price/stock checks, grouped delivery and fees. |
| AffiliatePortal | Sidebar or horizontal navigation, assisted ordering and withdrawal visibility, policy copy; overview, product links, orders, wallet and payout details. |
| AccountPortal | Sidebar or horizontal navigation, garage profile visibility; profile, addresses, private order history, garage application and consent for assisted orders. |
| Order status / ShippingTrack | Product images and frozen order totals; delivery groups and saved shipment state; authenticated lookup remains required. |

Repeated parts use stable names such as `@cart-line`, `@quantity`, `@cart-summary`, `@shipment-group` and `@assisted-line`. A named selector applies to all matching repeated items. Editor preview disables transaction controls and does not quote, place orders, withdraw money or log attribution clicks.

The blocks inherit `--hs-*` theme tokens. TCAP uses its incumbent amber, black and white identity. New icon controls use Lucide, visible focus and named accessible actions. Layouts were checked at 390, 820 and 1440 pixels. Public components retain existing locale support; Vietnamese is used for the new TCAP assisted-order flow. The production language selector was not changed.

## Pricing And Ordering

- Browser prices, totals and price-group IDs are not authoritative. Every checkout rechecks the installed source adapter and recipient pricing.
- Only an approved garage customer with an active group can use a Studio override. Explicit zero-value overrides are supported. Pending, rejected or suspended applications use normal retail pricing.
- A customer can issue a signed consent code for one approved affiliate, valid for 15 minutes. Assisted pricing follows that customer. Without a verified code it uses retail pricing, even if the creator has a separate customer session.
- Assisted orders show an authoritative price and commission estimate before confirmation. Recipient phone/email must match consent. The order is linked to the verified customer history, with one affiliate snapshot and one checkout identity.
- Product and category commission overrides precede individual/default percentage rates. Existing fixed policies remain supported. Default percentage is 15%; existing per-affiliate values and historical snapshots remain unchanged.
- Customer acceptance is required before removing/reducing unavailable cart items. The changed total must be reviewed before ordering again. Orders retain lookup tokens, immutable attribution and source snapshots.
- Mixed Shop/WIM/supplier orders preserve the existing reservation, retry, recovery and supplier reconciliation behavior.

## Delivery And Payouts

Delivery can be consolidated at the store or, for the supported adapter, sent directly by a partner. Each direct partner chooses a COD collector and fee. The checkout uses one whole-order fee or per-group fees. The one customer total is allocated exactly once, including discounts and whole-VND rounding. A supplier is never instructed to collect the whole mixed order. GHN creation is limited to store-delivered groups.

Commission is available after full payment, completed delivery/order and the configured hold (default 14 days). Cumulative per-line merchandise refunds reverse the affected rates. A reversal after payout creates a debt without changing paid history.

Payouts require PostgreSQL transactions. The minimum withdrawal is 100,000 VND, with off-cycle requests enabled by default. The month-end job prepares requests for administrative review; it does not transfer funds. The administrator verifies bank details, approves the request and records a completed external transfer with a unique reference and evidence. Requests, settlement and refunds serialize against one affiliate balance. SQLite supports browsing and local review but rejects financial settlement.

## Upgrade

The public Studio and private commercial plugin branches must be deployed together. Private source remains in `hosso-plugins`; local copies installed into Studio are compilation inputs and must not be newly published to the public repository.

1. Review both branches and back up the database, uploads, site export and environment configuration. Verify the backup can be restored in staging.
2. Check out the matching Studio and private plugin revisions in a staging checkout. From the private repository, run `node tools/install.mjs ../Hosso-Studio accounts,shipping,wim,cross-sell` with the actual checkout path.
3. Run `pnpm install --frozen-lockfile` in Studio. Keep existing secrets and commercial licenses in environment configuration.
4. Stop order writes for the schema upgrade. Run `pnpm migrate`. The new migration is `20261101_060000_commerce_blocks`; all prior migrations remain required.
5. Run `pnpm build`, restart the application, then smoke-test account login, cart images/quantity, authoritative quotes, assisted ordering, source retries and private lookup with staging fixtures.
6. Review garage groups, overrides, partner delivery/COD settings and affiliate policy. Keep imported WIM/supplier prices and stock authoritative. Configure actual banking, fees and source credentials explicitly.
7. After approval, repeat the backed-up upgrade for production and publish the relevant Studio pages using the existing editor workflow.

The migration preserves old commissions and policies, marks existing customers as retail, converts old shipment IDs into `orderNo:store` keys and permits multiple shipments per order. It does not rewrite old product prices or affiliate rates. The migration's `down` intentionally refuses to delete financial history; rollback requires the pre-upgrade database backup and matching application version. Do not use automatic schema push as a substitute for this migration.

## Verification

The following commands were run successfully against local/disposable fixtures, never production:

```text
pnpm -r typecheck
pnpm build
node scripts/check-boundaries.mjs
node scripts/check-i18n.mjs
pnpm --filter @hosso/plugin-affiliate test
pnpm --filter @hosso/plugin-cross-sell test
node scripts/test-commerce-fulfillment.mjs
node scripts/test-product-pool.mjs
node scripts/test-affiliate-postgres.mjs
node scripts/test-commerce-workflows.mjs
node scripts/test-commerce-migration.mjs
```

The last three require `AFFILIATE_TEST_DATABASE_URL` pointing to disposable PostgreSQL. The migration test additionally needs CREATE DATABASE permission. Never point these tests at production. The workflow tests cover garage access, consent isolation/expiry, assisted attribution and history, grouped COD/fees, private lookup, concurrent withdrawals/settlement, and concurrent per-line refunds. The migration test executes the DDL on PostgreSQL and checks preserved legacy rows and new indexes. Cross-sell includes direct WooCommerce delivery/COD preservation tests.

Local browser review: `node scripts/preview-commerce.mjs`, then `http://127.0.0.1:4187/`. It bundles the actual components and uses a fresh SQLite database with labeled illustrative data. No live WIM, WooCommerce or banking credentials are loaded. Reusable fixture sources are under `scripts/fixtures/commerce-review` and use existing seed assets. Generated files, screenshots and browser results are written under `output/commerce-prototype` and remain local review artifacts rather than production data.

The final focused browser check verified checkout form validation and summary-before-submit order, successful order before the collapsed lookup form, non-wrapping voucher actions, translated admin approvals, and wallet empty/blocked states at 390 and 1440 pixels. Wallet checks included negative refund balances, missing bank details and an active withdrawal request. Earlier checks also covered 820 pixels.

## Remaining Integration Limits

- The checked-in WIM API contract exposes a common selling price but no verified garage price-list contract. A differing Studio override for WIM is rejected. `wimPriceListId` records intended mapping only; adapter support and source-side confirmation are still required before it can price an order.
- Direct partner-to-customer delivery currently requires WooCommerce. Hosso/WIM suppliers retain consolidated delivery until their adapters can confirm recipient and COD instructions. WooCommerce extensions must preserve the supplied recipient and `_hosso_delivery` metadata; otherwise the transfer requires reconciliation.
- Order lookup shows saved shipment status. GHN-specific refresh/webhook behavior remains source dependent. This test run did not place a real carrier order or transfer money.
- Existing accounts login/registration do not yet have a durable brute-force limiter. New recipient consent requires authenticated sessions and is affiliate bound; it is not a replacement for a future authentication rate-limit rollout.
- The preview is not a live Studio edit or deployment acceptance test. Existing TCAP published pages have not been switched to this build. Review the configured layouts and connections in staging before production publication.

These limits are not presented as completed source integrations.
