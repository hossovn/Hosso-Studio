# Hosso Studio

[Tiếng Việt](README.md) | **English**

An open-source website builder (Apache-2.0) that you install and run yourself, built on Payload CMS. One installation = one website.

## Try it

Requirements: Node ≥ 22.15 (24 LTS recommended), pnpm ≥ 10.

```bash
pnpm install
pnpm dev
```

The first run creates `apps/studio/.env` (random keys, admin account) and loads sample data.

- Site: http://localhost:3000
- Admin: http://localhost:3000/admin (the email and password are in `apps/studio/.env`)

Environment variables: see `.env.example`. Branding, themes and plugins are configured in `apps/studio/hosso.config.ts`.

The admin and the page builder are bilingual (Vietnamese / English); switch the language in your Payload account. The public site supports any number of content languages (Vietnamese and English are configured by default).

Documentation (English): [docs/en/INSTALL.md](docs/en/INSTALL.md) (installation, WIM, Docker, export/import), [docs/en/ADMIN-LOGIN.md](docs/en/ADMIN-LOGIN.md), [docs/en/ARCHITECTURE.md](docs/en/ARCHITECTURE.md), [docs/en/THEME-GUIDE.md](docs/en/THEME-GUIDE.md), [docs/en/PLUGIN-GUIDE.md](docs/en/PLUGIN-GUIDE.md), [docs/en/PLUGIN-WIM.md](docs/en/PLUGIN-WIM.md), [docs/LICENSES.md](docs/LICENSES.md).

## Plugins

Installed plugins are registered in `apps/studio/hosso.config.ts`; commercial plugins require a valid production license. Separately distributed private plugins are registered by `scripts/prepare-installed-plugins.mjs`. The public image excludes `plugin-cross-sell`. See [architecture](docs/en/ARCHITECTURE.md) and [commerce](docs/en/PLUGIN-COMMERCE.md).

## Landing pages, CMS and commerce

`seed/sites` contains five goal-specific landing kits and a 13-page commerce kit: **23 draft pages** across all six kits. Import them from the admin website-kit library, then supply business content, catalog and policies before publishing. Kits contain no fabricated products or testimonials.

Features include custom CMS binding/detail pages, lead inbox and delivery retries, consent/UTM and A/B, product galleries, account carts, checkout and returns. `/admin/readiness` lists missing operational configuration. See the [operations guide](docs/studio-platform-operations.md) and [verification record](docs/studio-platform-progress.md) (Vietnamese).

Run `pnpm typecheck`, `pnpm test:platform`, `pnpm test:platform-browser` and `pnpm test:platform-production`. Install Chromium with `pnpm exec playwright install chromium`. Tests use isolated databases; SMTP, GHN, SePay and WIM still need acceptance in the real integration environment.
