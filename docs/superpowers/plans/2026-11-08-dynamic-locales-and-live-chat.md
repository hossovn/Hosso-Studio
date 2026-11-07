# Dynamic Multi-Locale Management & Floating Live Chat — Implementation Plan (Đợt 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` + `superpowers:test-driven-development` + `superpowers:verification-before-completion`. Every task starts with failing tests (`scripts/test-locales-and-live-chat.mjs`), implements minimal clean production code, passes `pnpm check:i18n` + `pnpm check:boundaries` + `pnpm typecheck`, and commits cleanly.

**Goal:** Enable 100% no-code multi-language sites (including Korean `ko` / `VN | KR` SVG flag switcher) and Floating Contact Dock + real-time Staff Live Chat (`/api/site/chat/*` + `/admin/chat`).

**Spec:** `docs/superpowers/specs/2026-11-08-dynamic-locales-and-live-chat-design.md`

---

### Task 1: Storefront Korean i18n (`strings.ko.ts`) + Dynamic Locale Catalog & Pure Resolvers (TDD)

**Files:**
- Create: `packages/blocks/src/strings.ko.ts`
- Modify: `packages/blocks/src/strings.vi.ts` (add `chat.*` storefront UI keys)
- Modify: `packages/blocks/src/strings.en.ts` (add `chat.*` storefront UI keys)
- Modify: `packages/blocks/src/i18n.ts` (register `ko` dictionary)
- Create: `apps/studio/src/lib/locales-catalog.ts` (`SUPPORTED_CONTENT_LOCALES`, `SUPPORTED_LOCALE_CODES`, `getPayloadLocalizationLocales`, `resolveSiteLocales`, `resolveSwitcherStyle`)
- Create: `scripts/test-locales-and-live-chat.mjs` + register `"test:locales-chat": "tsx scripts/test-locales-and-live-chat.mjs"` in root `package.json`

**Verification:**
- Run `pnpm test:locales-chat` — verifies key parity across `vi`, `en`, `ko`, `translate(key, 'ko')`, `localizeHref` with dynamic default locales, `resolveSiteLocales` deduplication/fallback/ordering, and `getPayloadLocalizationLocales`.

---

### Task 2: Live Chat Collection, Cryptographic Token Core & Hardened Endpoints (TDD)

**Files:**
- Create: `apps/studio/src/collections/ChatSessions.ts`
- Create: `apps/studio/src/lib/live-chat.ts` (pure token mint/hash/timingSafeEqual helpers, text/visitor sanitizers, and Payload endpoints `chatStart`, `chatSend`, `chatPoll`, `chatInbox`, `chatReply`, `chatStatus`)
- Modify: `scripts/test-locales-and-live-chat.mjs` (unit + integration tests with mocked `req.payload` covering start, poll, send, IDOR wrong-token 403 rejection, disabled chat 403, honeypot drop, control-char stripping, rate-limit rejection, staff RBAC 403 for unauthenticated/author, and staff reply/status updates)

**Verification:**
- Run `pnpm test:locales-chat` — all unit & endpoint security assertions pass (`exit 0`).

---

### Task 3: Wire Dynamic Locales & Live Chat into `SiteSettings`, `payload.config.ts`, Routing, Editor & CMS APIs

**Files:**
- Modify: `apps/studio/src/globals/SiteSettings.ts` (add `Ngôn ngữ` fields + `Hỗ trợ nổi & Live Chat` fields)
- Modify: `apps/studio/src/payload.config.ts` (register `ChatSessions`, `getPayloadLocalizationLocales`, `chat*` endpoints, and `views.chat`)
- Modify: `apps/studio/src/proxy.ts` (`SUPPORTED_LOCALE_CODES` header forwarding)
- Modify: `apps/studio/src/lib/locale.ts` (`getSiteLocaleConfig`, `getPayloadSiteLocales`, dynamic `currentLocale`, dynamic-capable `splitLocale`)
- Modify: `apps/studio/src/lib/site.tsx` (`loadSite` returns `locales`, `defaultLocale`, `localeSwitcherStyle`, `floatingSupport`; `href` honors active `defaultLocale`)
- Modify: `apps/studio/src/app/(site)/[[...slug]]/page.tsx`, `apps/studio/src/views/index.tsx`, `apps/studio/src/app/sitemap.ts`
- Modify: `apps/studio/src/app/(editor)/editor/[id]/page.tsx`, `apps/studio/src/app/(editor)/editor/[id]/CanvasApp.tsx`, `apps/studio/src/app/(editor)/editor/[id]/SitePanels.tsx`, `apps/studio/src/app/(editor)/editor/[id]/PublishPanel.tsx`
- Modify: `apps/studio/src/components/admin/WidgetsView.tsx`, `apps/studio/src/components/admin/ContentWorkspaceView.tsx`, `apps/studio/src/components/admin/ArticleOutline.tsx`
- Modify: `apps/studio/src/lib/cms-api.ts`, `apps/studio/src/lib/content-import.ts`, `apps/studio/src/lib/endpoints.ts`, `apps/studio/src/lib/kiln.ts`, `apps/studio/src/lib/site-releases.ts`, `apps/studio/src/lib/site-package.ts`, `apps/studio/src/lib/site-import.ts`

**Verification:**
- Run `pnpm test:locales-chat` and `pnpm typecheck`.

---

### Task 4: Frontend `LanguageSwitcher` (SVG Flags + Pill/Dropdown) & `ContactFloat` + Live Chat Drawer + Admin `/admin/chat` Inbox

**Files:**
- Modify: `apps/studio/src/components/LanguageSwitcher.tsx` (crisp inline SVG flags for `vi`, `ko`, `en`, `ja`, `zh`, `fr`, `de`, `th` + `'code' | 'pill-flag' | 'dropdown-flag'` variants, Escape/outside-click/ARIA)
- Modify: `packages/blocks/src/base-css.ts` (add `.ss-lang-pill`, `.ss-lang-drop`, `.hs-theme.has-contact-dock` legacy float suppression, GPU-only motion + reduced-motion rules)
- Modify: `apps/studio/src/components/ContactFloat.tsx` (upgraded Floating Contact Dock + Zalo QR modal + accessible Live Chat drawer with visibility-aware polling and unread badge)
- Modify: `apps/studio/src/app/(site)/layout.tsx` (pass dynamic `site.locales`, `site.localeSwitcherStyle`, `site.defaultLocale`, and render `ContactFloat` across all pages when enabled)
- Create: `apps/studio/src/components/admin/ChatInboxView.tsx` + `apps/studio/src/components/admin/ChatInboxClient.tsx`
- Modify: `apps/studio/src/components/admin/Nav.tsx` (add `Trò chuyện trực tuyến` `/admin/chat` with live `unreadByStaff` alert badge)
- Modify: `apps/studio/src/lib/admin-en/config.ts`, `apps/studio/src/lib/admin-en/nav.ts`, `apps/studio/src/lib/admin-en/misc.ts` (100% English translations for `pnpm check:i18n`)
- Run `pnpm --filter @hosso/studio generate:importmap` to register `ChatInboxView` in `apps/studio/src/app/(payload)/admin/importMap.js`.

**Verification:**
- Run `pnpm check:i18n`, `pnpm check:boundaries`, `pnpm test:admin-views`, `pnpm typecheck`.

---

### Task 5: Full Regression Gate, Anti-Pattern Scan & Live Playwright Browser E2E Verification

**Verification:**
1. `pnpm test:locales-chat`, `pnpm test:admin-views`, `pnpm test:editor-interactive`, `pnpm test:editor-preview`, `pnpm test:editor-frames`, `pnpm test:canvas`, `pnpm test:form-delivery`
2. `pnpm typecheck`, `pnpm check:boundaries`, `pnpm check:i18n`
3. Impeccable anti-pattern detector (`detect.mjs`) on all modified/new UI files (`0` P0/P1 findings).
4. Live Playwright E2E (`scratch/verify-dot2-locales-chat-e2e.mjs`) on disposable `tmpdir()` SQLite DB verifying:
   - Admin configures `vi` (`VN`) + `ko` (`KR`) with `dropdown-flag` switcher + enables `Live Chat` in `SiteSettings` (zero edits to `hosso.config.ts`).
   - Studio Visual Editor (`/editor/<id>`) immediately displays `한국어` (`ko`) in `LocaleSwitch`, saves & publishes Korean page content.
   - Public `/` (`VN`) and `/ko` (`KR`) render localized content, Korean storefront strings, crisp SVG flag dropdown switcher, and `0px` horizontal overflow at `1440×900` and `375×812`.
   - Visitor opens Live Chat drawer, sends message → Staff opens `/admin/chat`, sees unread session & badge, sends reply → Visitor drawer receives staff reply automatically via polling with `0` console/page errors!
