# Contributing to Hosso Studio

[Tiếng Việt](CONTRIBUTING.md) | **English**

Thank you for your interest. Every contribution is accepted and distributed under the project's **Apache-2.0** license (see [LICENSE](LICENSE)).

## 1. Set up your environment

Requirements: Node.js `>=22.15`, pnpm `>=10` (the project pins `pnpm@10.34.6` through Corepack).

```bash
git clone <repo> hosso-studio
cd hosso-studio
pnpm install
pnpm dev
```

The first run creates `apps/studio/.env`, a SQLite database at `apps/studio/data/studio.db` and the sample pages.

- Site: http://localhost:3000
- Admin: http://localhost:3000/admin. The email and password are in `apps/studio/.env`. See [docs/en/ADMIN-LOGIN.md](docs/en/ADMIN-LOGIN.md).
- Health check: http://localhost:3000/api/health

To try the WIM plugin without a real WIM, run the mock: `pnpm mock:wim`.

## 2. Repository layout

| Folder | Contents |
|---|---|
| `apps/studio` | Next.js + Payload app (admin, page builder, public site). Site configuration lives in `hosso.config.ts` |
| `packages/blocks` | Page-building blocks, types, UI strings (`strings.vi.ts`, `strings.en.ts`), block labels (`labels-en.ts`) |
| `packages/theme-*` | Themes (`default`, `alt`, `shop`) |
| `packages/plugin-wim` | Commercial plugin that connects to Hosso WIM (not part of the public repo) |
| `tools/mock-wim` | Fake WIM for development and testing |
| `scripts` | Checks and utilities (`check-boundaries`, `check-i18n`, `ensure-env`, `check-order-flow`) |
| `seed` | Packaged sample site (`.hosso-site.zip`) and seed pages |
| `docs` | Documentation: install, login, architecture, writing themes and plugins (`docs/en` is the English version) |

Read [docs/en/ARCHITECTURE.md](docs/en/ARCHITECTURE.md) before changing the core.

## 3. Workflow

1. **Open an issue first** for big changes (architecture, schema, new block, new plugin). Small changes such as bug or typo fixes can be sent directly.
2. Branch from `main` with a clear name, for example `fix/menu-dropdown`, `feat/block-faq`.
3. Keep changes small and focused. Readable PRs are reviewed faster.
4. Run the checks in section 5 before submitting.
5. Open a Pull Request against `main` explaining **why** you made the change, how to test it, and screenshots for UI changes.

### Commits

Write commit messages in English (Vietnamese is welcome too); the first line is short and says what was done (see `git log`). Example: `Fix the dropdown menu not closing when clicking outside`. One commit should do one thing.

## 4. Code rules

### Dependencies and licenses

- Do not add heavy libraries you do not need. Prefer the platform and what is already there.
- A new library must be **MIT, Apache-2.0, BSD or ISC**. No GPL, AGPL, LGPL or "source-available" licenses in the core. Record it in [docs/LICENSES.md](docs/LICENSES.md).
- Do not copy code of unknown license.

### Package boundaries

- `apps/studio` (core), `packages/blocks` and the themes **must not import from a plugin** (for example `@hosso/plugin-wim`). Plugins register through `hosso.config.ts`.
- The site must keep working when a plugin is removed from `hosso.config.ts`.
- Check with `pnpm check:boundaries`.

### Content and UI

- User-facing text goes in `strings.vi.ts` and `strings.en.ts`, never hard-coded in components.
- The admin and page builder are bilingual: write the Vietnamese text in code as `T('…')` (or `L('…')` in `packages/blocks`) and add the English version to `apps/studio/src/lib/admin-en/*.ts` (block labels: `packages/blocks/src/labels-en.ts`; plugin labels: `HossoPlugin.adminEn`). `pnpm check:i18n` lists strings that are missing.
- Server and CLI messages use `L('Tiếng Việt', 'English')` / `msg(req, …)` from `apps/studio/src/lib/lang.ts`.
- Themes only handle presentation. Switching theme must not change page content.
- New block: register it in `puck-config.ts`, add its type in `types.ts`, and make it work without any plugin.
- Keep the public pages light: avoid client-side JavaScript when CSS or a server component can do the job.

### Next.js

The Next.js version used here differs from the popular one. Read the guides in `node_modules/next/dist/docs/` before writing related code and watch for deprecation notices.

## 5. Checks before submitting

```bash
pnpm typecheck          # type-check the whole workspace
pnpm check:boundaries   # core / plugin boundary check
pnpm check:i18n         # admin translation coverage
```

If you change the commerce part (WIM plugin, cart, checkout), also run with the mock on:

```bash
pnpm mock:wim
pnpm check:order-flow
```

If you change the UI, open the site and the builder in a browser and look at it. Type checks do not replace looking with your own eyes.

### Schema changes

When you change a Payload collection or global:

- SQLite in development syncs by itself (push).
- Postgres needs a migration. Generate it and commit it with the change: `pnpm migrate` (see `apps/studio/src/migrations`).

### Site packages

If a change affects the export/import format (`studio:export`, `studio:import`), re-import `seed/sites/shop-template.hosso-site.zip` into a clean database to check.

## 6. Reporting bugs

A good issue has: reproduction steps, expected result, actual result, Node/pnpm versions, whether you ran `pnpm dev` or Docker, and logs if any. **Do not paste** the contents of `.env`, API keys or passwords into an issue.

Security vulnerabilities: do not open a public issue. Contact the project owner privately.

## 7. Trademark

The Hosso name and logo are protected separately, see [TRADEMARK.en.md](TRADEMARK.en.md). The Apache-2.0 license grants no trademark rights.

## 8. CLA / DCO

_Not required in the PoC. This is the place to add a CLA or DCO (for example requiring `Signed-off-by`) when the project owner decides._
