# Product Pool QA

Date: 2026-11-01
Environment: local Studio test server at `http://localhost:3001`, SQLite `studio-test.db`, disposable SQLite fixtures, HTTP mock WIM/NCC.

## Passed

- `pnpm test:product-pool`: shared catalog and mixed checkout passed, including Shop + WIM + two suppliers, authoritative pricing, supplier transfers, lost WIM response and safe retry, cancellation/restock, CSV, legacy WIM IDs, and missing adapter rejection.
- `pnpm test:order-reliability`: 12/12 regressions passed: transactions, stock rollback, payment creation, pending source orders, idempotency, event receipts and recovery, cancellation, private lookup, and concurrent supplier sync.
- Cross-sell: 46/46 product-pool tests and 7/7 acceptance tests passed.
- Mock WIM contract: 25 checks passed.
- Browser flow: catalog -> product -> cart -> COD checkout -> lookup passed; duplicate checkout produced one order; client price was ignored; last-stock race returned `200` and `409`; browser runtime errors were empty.
- Browser visual checks: product images decoded, desktop/mobile catalog and order lookup had no horizontal overflow at 1440px and 390px.
- `pnpm typecheck`, production `next build`, `check:boundaries`, migrations, i18n, manifests, and editor/runtime checks passed.

## Fixes found during QA

- Checkout redirect could point to a missing hardcoded status page. It now resolves a published Shop/WIM order-status page and falls back to the configured standalone path.
- Legacy `/api/plugins/wim/checkout` now maps upstream WIM IDs into the canonical Product pool and calls shared Shop checkout. It returns the private lookup token and supports shared idempotency and validation.
- Legacy WIM checkout UI now stores/uses the private lookup token instead of the old phone suffix.

## Evidence

- Browser results: `output/qa-browser-results.json`
- Browser screenshots: `output/qa-catalog-desktop.png`, `output/qa-catalog-mobile.png`, `output/qa-checkout-desktop.png`, `output/qa-order-390.png`, `output/qa-order-1440.png`
- Reliability log: `output/qa-reliability.log`
- Product-pool log: `output/qa-test-product-pool.log`
- Typecheck/build logs: `output/qa-typecheck.log`, `output/qa-build.log`

## Limits

- No live PostgreSQL server was available; PostgreSQL checks validate generated schema and migrations only.
- No real WIM, NCC, payment gateway, email provider, or production deployment was exercised. External delivery remains at-least-once across a process crash after send and before receipt persistence.
- The local cross-sell package is Git-ignored by repository configuration and needs its separate release/package handling.
