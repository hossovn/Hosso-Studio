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

This public repository ships no commercial plugin. The Hosso WIM connector (`@hosso/plugin-wim`) is closed source and distributed separately; see [docs/en/ARCHITECTURE.md](docs/en/ARCHITECTURE.md) and [docs/en/PLUGIN-WIM.md](docs/en/PLUGIN-WIM.md) for the plugin mechanism (`HossoPlugin`) and how to add or remove one. Some scripts in the repo (`check:order-flow`, commerce sample pages) need that plugin to run fully.
