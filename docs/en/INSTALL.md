# Hosso Studio installation guide

[Tiếng Việt](../INSTALL.md) | **English**

One installation = one website. Requirements: Node ≥ 22.15 (24 LTS recommended), pnpm ≥ 10. Docker is only needed when you run in containers.

## 1. Run locally (one command)

```bash
pnpm install
pnpm dev
```

The first `pnpm dev` creates `apps/studio/.env` (random keys, admin account), the SQLite database `apps/studio/data/studio.db` and the sample pages.

- Site: http://localhost:3000
- Admin: http://localhost:3000/admin (email and password in `apps/studio/.env`: `HOSSO_ADMIN_EMAIL`, `HOSSO_ADMIN_PASSWORD`)
- Drag-and-drop builder: open a page in the admin and click "Open the drag-and-drop builder" (or `/editor/<id>`).
- Health check: http://localhost:3000/api/health

The admin and the builder are bilingual (Vietnamese / English): switch the language in your Payload account.

## 2. Build your site

1. **Pages**: Admin → Pages → create a page, save, open the builder, drag blocks in and edit their properties. Anyone allowed to edit can "Save draft"; only administrators and publishers can "Publish".
2. **Site frame** (Admin → Site appearance, tabs): Branding (name, logo, favicon, top announcement), Menu (header menu up to two levels with dropdowns, footer menu), Contact (phone, email, address, Zalo, social networks; the floating Zalo/Call buttons appear automatically when a number is set), Notifications, Comments, Appearance. The header and footer are drawn by the theme and shared by every page.
3. **Builder**: pick images from the Media library or upload them right in the property field; the top bar of the builder has the page list, "+ New page" and "Rename / change path".
4. **Theme**: the "Appearance" tab of the same screen → choose a theme and tune colors/fonts/corner radius (empty = the theme default). Switching theme does not change page content.
5. **Users**: roles `admin`, `publisher`, `editor`, `author` (own posts only), `moderator` (comments and forms).
6. **Branding, themes and plugins** are declared in one file: `apps/studio/hosso.config.ts`. To add a theme, add the theme package and one line in `themes`. To remove a plugin, delete its import and its entry in `plugins`; its blocks are skipped and the site keeps working (in dev, Payload asks you to confirm dropping the plugin's settings table at startup).

### Content and administration

- **Posts** (Admin → Posts): title, excerpt, featured image, date; the content is built with the same drag-and-drop builder (`/editor/<id>?c=posts`). Public address `/bai-viet/<slug>`. Use the "Post list" block to show posts on a page (with pagination).
- **Categories and tags** for posts (`/bai-viet/danh-muc/<slug>`, `/bai-viet/the/<slug>`); the Post list block can filter by category or tag.
- **Video**: the Video block accepts a YouTube/Vimeo link (embedded through youtube-nocookie, loaded on scroll) or an mp4/webm file uploaded to the Media library.
- **Shop blocks**: Category grid (with images), Trust bar, Hero banner with a background image.
- **Search** `/tim-kiem`: searches pages, posts and (with the WIM plugin) products; the header search box can be switched on or off in Site settings. The 404 page has a search box too.
- **SEO**: every page/post has an SEO group (Google title, share image, noindex); the site generates `/sitemap.xml` and `/robots.txt` (uses `HOSSO_PUBLIC_URL`).
- **Builder**: autosaves a draft 4 seconds after the last change, warns when you leave with unsaved changes, a "History" button opens the versions in the admin so you can restore one, phone / tablet / desktop preview switch.
- **Getting started** card on the admin dashboard until the steps are done (name and logo, menu, home page, at least 3 pages, WIM connection when the plugin is installed).
- **Themes**: "Light & Clean", "Technical dark" and "Parts shop" (two-row header with search, hotline, cart and an accent menu bar).

### Familiar WordPress-style features

- **Admin sidebar**: dark, with icons, menu groups and sub-items; live badges (pending comments, drafts, form submissions in the last 24 hours), a quick-create "+" button, a command search (press `/`), collapse to an icon rail (sub-menus open on hover), and only the items that fit the user's role. Plugins add items through `HossoPlugin.adminNav`.
- **Image editor** in the Media library (rotate, flip, crop, resize, brightness/contrast/saturation, black and white; save as a new image or replace the original).
- **Comments**: posted from the post page (`POST /api/site/comments`), with moderation, a honeypot and rate limiting; switch them on or off in Site settings and per post.
- **Forms** you design yourself (Admin → Forms), embedded with the Form block; submissions are listed under "Submissions" and can be exported as CSV (`/api/site/forms-export/<id>`).
- **Multiple languages**: declare `locales` in `hosso.config.ts` (default `vi`, plus `en`); URL prefix `/en`, per-language hreflang and sitemap, translated content per language in the builder.
- **Shared areas** (before/after the header and footer, and a sidebar next to posts) built by drag and drop, and **Reusable blocks** (the Reusable block inserted into many pages).
- **WordPress import**: export WXR from WordPress, then run

```bash
pnpm studio:import-wordpress export.xml --media --site-url https://old-site.com --locale vi   # add --dry-run to test
```

  Pages, posts, categories, tags, comments and featured images are imported; internal links are rewritten and YouTube videos become Video blocks.

### Operations, editing and SEO

- **Tools** (Admin → Tools, admins only): download the site package, back up on the server right now (keeps `HOSSO_BACKUP_KEEP` copies in `HOSSO_BACKUP_DIR`), restore from a zip, install a **site template** (the `*.hosso-site.zip` files in `HOSSO_TEMPLATES_DIR`, default `seed/sites`), see the version and get notified of a new release (set `HOSSO_UPDATE_URL`).
- **Automatic backup**: `pnpm studio:backup` (run it from cron) or the `backup` service in docker-compose (every 24 hours). The package holds content, settings and media, not accounts, comments or secrets; back up the database too with `pg_dump` (see the note in docker-compose.yml).
- **One-command update**: `pnpm studio:update` (git installs: backup, `git pull --ff-only`, install dependencies, migrate, build; it stops on an error or when there are uncommitted changes). Docker: `docker compose pull && docker compose up -d` (migrations run at startup). Themes and plugins are source code: add the package to `hosso.config.ts` and rebuild; they are deliberately not installable from the browser, so no unknown code runs on the server.
- **Notification emails** for new form submissions/comments (Site settings → Notifications; the default recipient is the contact email). Needs `HOSSO_SMTP_URL` (for example `smtp://user:pass@host:587`) and `HOSSO_MAIL_FROM`; without them the email is only written to the log. Emails are bilingual (Vietnamese / English).
- **Draft preview link**: on a page/post (admin) click "Shareable preview link" → a 7-day link signed with HMAC using `HOSSO_SECRET`, valid for that one document only, with noindex.
- **Redirects** (Admin → SEO → 301 redirects): old path → new path (HTTP 308 permanent or 307 temporary); included in the export/import package.
- **SEO**: JSON-LD (Organization + WebSite on the home page, Article + BreadcrumbList on posts, BreadcrumbList on pages), a visible breadcrumb on posts, per-language sitemap.
- **Live customizer** (Admin → Appearance → Live customizer): change colors, fonts and corner radius and see them on the real site (desktop/tablet/phone preview, choose the page), then Save.
- **Edit in place**: a toolbar appears on the site for signed-in users ("Edit this page", "Properties and SEO", "Customize appearance"); in the builder, the heading/description/button label of the Hero banner and the headings of Text and Feature grid are edited directly on the canvas.
- **Edit locks**: if two people open the same page/language in the builder, the second one is told who is editing and is blocked from saving (with a "Take over" button).
- **Widgets** (Admin → Appearance → Widgets): add and reorder widgets for the sidebar next to posts and the areas before/after the header and footer, with a live preview (forms in the preview validate like the real thing but never send or save anything). Widgets: Text, Image, Video, Search box, Category/tag list, Custom menu, Post list, Form, Reusable block.
- **Tree menu** (Site settings → Menu): drag and drop to reorder and create sub-items, quick-add from the page list; one menu per language.
- **Upgrading an old PoC database (Postgres)**: just run `pnpm migrate`; the old data (pages, posts, settings, menus) is kept and placed in the first language (vi). For dev SQLite: export a package with the old version, then `pnpm studio:import` into a new database.
- **Page cache**: Next returns `Cache-Control: private, no-store` for dynamic pages, so full-page caching belongs in a reverse proxy/CDN (for example nginx `proxy_cache` for 30–60 seconds, bypassed when the `payload-token` cookie is present). Homepage TTFB measured 30–60 ms (SQLite), so it is not required.
- **Bilingual admin (vi/en)**: the admin and builder follow the language the user chose in Payload (Account → Language): sidebar, Tools, Widgets, Customizer, tree menu, image editor, builder (buttons, status, block labels), collection and field names. To add a string, write the Vietnamese text in code (`T('…')` / `L('…')`) and add the English version to `apps/studio/src/lib/admin-en/*.ts` (block labels: `packages/blocks/src/labels-en.ts`; plugins: `HossoPlugin.adminEn`); `pnpm check:i18n` lists what is missing. Server and CLI messages follow `HOSSO_LANG` (`vi` | `en`, default from `LANG`).

## 3. Connect Hosso WIM (plugin, optional)

In the PoC you use the mock:

```bash
pnpm mock:wim            # http://localhost:4010, default API key: mock-wim-key
```

Admin → Hosso WIM connection: enter the API address, API key and webhook secret (mock: `mock-webhook-secret`) → Save → "Test connection". The key and secret are encrypted when saved with `HOSSO_ENCRYPTION_KEY` and always shown masked.

You can set everything with environment variables (they win over the admin values): `HOSSO_WIM_API_URL`, `HOSSO_WIM_API_KEY`, `HOSSO_WIM_WEBHOOK_SECRET`, `HOSSO_WIM_TIMEOUT_MS`, `HOSSO_WIM_CACHE_TTL`.

The commerce blocks (Vehicle selector, Search box, Product grid, Product detail, Cart, Checkout, Order status) appear in the builder when the plugin is installed. The Thanh Cuong Auto website template at `seed/sites/shop-template.hosso-site.zip` uses the Shop plugin, not WIM; select it from Dashboard → Choose a template.

Control the mock to try failures (no extra endpoint is opened):

```bash
pnpm --filter @hosso/mock-wim mock chaos slow|timeout|error|out_of_stock|no-compat|order-timeout|off
pnpm --filter @hosso/mock-wim mock price P001 700000
pnpm --filter @hosso/mock-wim mock stock P001 hn 0
pnpm --filter @hosso/mock-wim mock webhook product.updated P001 [--bad-signature|--old-timestamp]
```

Checks: `pnpm --filter @hosso/mock-wim test:contract` (API contract) and `pnpm check:order-flow` (the ordering flow through a running site).

## 4. Deploy with Docker + Postgres

```bash
cp .env.example .env     # fill in POSTGRES_PASSWORD, HOSSO_SECRET, HOSSO_ENCRYPTION_KEY, HOSSO_PUBLIC_URL, HOSSO_ADMIN_*
docker compose up --build
```

`HOSSO_DATABASE_URL` selects the database: `file:...` is SQLite, `postgres://...` is Postgres. The container runs the migrations (`payload migrate`) and then starts. Media lives in the `media` volume and backups in the `backups` volume. All sensitive configuration goes through environment variables; there are no hard-coded addresses or paths in the code.

Migration `20261030_130000_payload_job_stats` adds Payload's scheduler statistics table. For `relation "payload_jobs_stats" does not exist`, deploy an image containing this migration; the standard entrypoint applies it before starting. With a custom entrypoint, run `pnpm --filter @hosso/studio migrate` inside the new image before starting the app. Validate the schema and DDL with `pnpm test:job-stats-migration` (no database connection).

Migration `20261030_140000_cross_sell_tracking` adds the cross-sell timeline, tracking columns, document lock relationship (`cross_sell_events_id`), sync task enums and queue metadata. Deploy it with the tracking-enabled cross-sell plugin. With that plugin installed, run `pnpm test:cross-sell-migration` to compare schema and DDL without connecting to a database. The upgrade preserves existing data; rolling back removes the new tracking data and retains task enum values so remaining jobs stay valid.

The Postgres migrations are already generated in `apps/studio/src/migrations` for the full distribution (with the Shop, Affiliate, Shipping, Promotions, Payment, Notify, Analytics, Reports and Accounts plugins). If you add a plugin with its own tables: `HOSSO_DATABASE_URL=postgres://... pnpm --filter @hosso/studio payload migrate:create <name>`.

> Verified for real (17 Oct 2026, Docker Desktop 4.55): `docker compose up --build` builds the image, Postgres is healthy, the container runs the migrations by itself and reports healthy; importing a site package with `studio-tools` works; the mock WIM on the host is reached through `HOSSO_WIM_API_URL=http://host.docker.internal:4010`. Small note: the container still prints a Corepack message while downloading pnpm when you run `studio-tools`.

## 5. Export / import a site package

```bash
pnpm studio:export site.zip     # content, page structure, theme + tokens, plugin settings (no keys/secrets), media
pnpm studio:import site.zip     # on a clean, migrated install (SQLite: run pnpm dev once first to create the schema); pages/posts with the same slug are updated
```

The package contains no accounts, contact messages or orders (WIM owns those) and no API key/webhook secret: enter them again in the admin or set `HOSSO_WIM_*`. With Docker: `docker compose run --rm -v "$PWD:/pkg" studio-tools pnpm studio:import /pkg/site.zip`.

## 6. Main environment variables

See `.env.example`. Prefix `HOSSO_`: `DATABASE_URL`, `SECRET`, `ENCRYPTION_KEY`, `PUBLIC_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `SEED`, `MEDIA_DIR`, `SMTP_URL`, `MAIL_FROM`, `BACKUP_DIR`, `BACKUP_KEEP`, `TEMPLATES_DIR`, `UPDATE_URL`, `LANG`, `WIM_*`.
