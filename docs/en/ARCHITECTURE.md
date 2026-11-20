# Hosso Studio architecture

[Tiếng Việt](../ARCHITECTURE.md) | **English**

```
apps/studio            Payload (admin) + Next.js site runtime + hosso.config.ts
packages/blocks        Shared contract: Block/Theme/Plugin types, core block schemas, buildPuckConfig, vi/en strings
packages/theme-*       Themes: theme.json (tokens) + a renderer per block + CSS
packages/plugin-wim    WIM plugin (closed source): connection, commerce blocks, cache, webhook, ordering
tools/mock-wim         Mock WIM (NestJS 11) built from openapi.yaml
seed/                  Sample pages, mock WIM data, sample site packages
```

## Principles

- **The core does not depend on plugins.** `apps/studio/src`, `packages/blocks` and `packages/theme-*` never mention `plugin-wim` (checked by `pnpm check:boundaries`). The only place a plugin is registered is `hosso.config.ts`.
- **Schema is separate from renderer.** A block declares its fields and defaults (`BlockSchema`); a theme provides the renderer. `buildPuckConfig(schemas, theme)` builds the Puck configuration at runtime, so switching theme does not change the page JSON.
- **Data ownership.** Shop owns local products. WIM/supplier products retain authoritative prices and stock at their source. Studio keeps an aggregated catalog, orders and coordination state; checkout revalidates source data. A catalog cache is not authoritative inventory.
- **The browser never calls WIM.** Every WIM call goes through the site server (block loaders, `/api/plugins/wim/*` endpoints).

## Flows

- **Pages**: `pages.content` is Puck JSON (a Payload collection with drafts/publishing/versions). The public page is rendered with Puck's `Render` (RSC); for blocks with a loader the server runs the loader and passes the result in the `data` prop.
- **Catalog reads (B)**: loader → short TTL in-memory cache → WIM. The site is correct within the TTL; a webhook (C, optional) clears exactly the affected cache entry. Temporary errors use the stale cache (up to 10 minutes); if WIM is fully down the block shows a friendly error while the Studio content is still displayed.
- **Ordering**: shop quote/checkout verifies products, variants, prices, inventory and quote freshness. Idempotency protects repeated submissions. Transactions persist orders, local reservations and intents; workflow/recovery tracks interrupted provider operations. WIM connects through the commerce contract.
- **Order tracking**: Studio orders use an order number and private lookup token; authenticated customers can access orders assigned to their account. Four phone digits do not authorize access to Studio orders.
- **Webhook**: `POST /api/plugins/wim/webhook`; signature HMAC-SHA256(secret, `timestamp.body`) in `X-Hosso-Signature`; a `X-Hosso-Timestamp` more than 5 minutes off is rejected.
- **Secrets**: the API key and webhook secret are encrypted with AES-256-GCM (`HOSSO_ENCRYPTION_KEY`) when stored; the API/admin only return a masked form; the plugin code uses Web Crypto so no Node module is pulled into the browser bundle.

## Languages, roles and endpoints

- Content languages: `src/proxy.ts` reads the `/en` prefix and sets the `x-hosso-locale` header; `lib/locale.ts` and the per-request store of `@hosso/studio-blocks` (`i18n.ts`) provide the language to the server; clients use `LocaleProvider`/`useT`. Content fields use Payload `localization` (arrays are not localized; the labels inside are).
- Admin language: the admin and builder follow the Payload language (`payload-lng`). `lib/admin-i18n.ts` (`makeT`, Vietnamese text as the key, English in `lib/admin-en/*.ts`), `lib/use-admin-t.ts` (client hook), `packages/blocks/src/labels-en.ts` and `admin-lang.tsx` (block/field labels), `lib/translate-config.ts` (collection/field labels become `{vi, en}`), `lib/lang.ts` (`L`/`msg`/`both` for server and CLI messages). `scripts/check-i18n.mjs` checks coverage.
- Roles: `lib/access.ts` (admin, publisher, editor, author, moderator).
- Custom endpoints (`lib/endpoints.ts`): `/api/site/forms/:slug`, `/api/site/forms-export/:id`, `/api/site/comments`; rate limiting in `lib/ratelimit.ts`.
- Public routing is gathered in `app/(site)/[[...slug]]` + `views/` (pages, posts, categories/tags, search).
- Admin sidebar: `components/admin/Nav*.tsx` (replaces `admin.components.Nav`); plugin items through `HossoPlugin.adminNav`.

## Operations

- The site package (`lib/site-package.ts` exports, `lib/site-import.ts` imports) is shared by the CLI (`studio:export/import`), backups (`lib/backup.ts`, `studio:backup`) and the Tools page; admin endpoints: `/api/site/backup`, `/api/site/backups`, `/api/site/package-import`, `/api/site/template-install`.
- Shareable draft links: `lib/share.ts` (HMAC), endpoint `/api/site/share-link`; redirects: the `redirects` collection + `lib/redirects.ts` (consulted only when no content is found); notifications: `lib/notify.ts`; soft edit locks: the `edit-locks` collection + `/api/site/lock` (60-second TTL, renewed every 25 seconds).
- Security headers (nosniff, SAMEORIGIN, Referrer-Policy, Permissions-Policy) in `next.config.ts` and `csrf` from `HOSSO_PUBLIC_URL` in the Payload config.
- Upgrades: Postgres migrations include `poc_data_snapshot` / `poc_data_restore`, which keep the data of old PoC databases when content moves into the translation tables.

## Landing, CMS and commerce platform

- Browser plugin definitions are separate from server adapters. The public layout mounts each `runtimeSlot` once; cart synchronization does not depend on visible headers. The installer registers private packages separately.
- Entry repeaters filter/sort/page in the database. Custom field bindings and `/noi-dung/:kind/:slug` support published detail templates, metadata and sitemap entries.
- Lead submissions and delivery intents commit together. Outbox leases/backoff and `/admin/leads` support recovery. Analytics jobs persist separately so analytics failures cannot roll back leads.
- Analytics validates consent/DNT/GPC on the server. Experiments use stable assignments per revision; business conversions are confirmed on the server.
- Account carts use owner/revision/generation. Returns update eligible local stock and refund ledgers transactionally; evidence uses private storage and authorized endpoints.
- Responsive WebP/AVIF images use `@napi-rs/image`, processing limits and cache/ETag. Motion shares 600/1024px breakpoints and a scroll scheduler, honors reduced motion, and defers/pauses background video.
- Website kits import additively as drafts. Readiness and publish checks inspect actual breakpoints, content and integration configuration. See the [operations guide](../studio-platform-operations.md).

## Known limits

- Guest carts use localStorage; account carts synchronize with the server. Existing WIM caches remain per-process. Personal prices and account data must stay out of shared public caches.
- Forms/comments retain per-process rate limits. Commerce uses database buckets and transactions; configure an IP header only when a trusted proxy overwrites it.
- SMTP/GHN/SePay/WIM and backup restoration require deployment acceptance. Local lab samples do not prove field p75 Core Web Vitals.
- Puck is still 0.x.
