# Dynamic Multi-Locale Management & Floating Live Chat — Design Specification (Đợt 2)

**Date:** 2026-11-08  
**Project:** Hosso Studio (`@hosso/studio`, `@hosso/studio-blocks`)  
**Scope:** Đợt 2 of the MenuMate 100% no-code parity upgrade — dynamic multi-locale management (`vi`, `ko`, `en`, `ja`, `zh`, `fr`, `de`, `th`) in Admin without editing `hosso.config.ts`, plus upgraded Floating Contact Dock & real-time/polling Staff Live Chat (`/api/site/chat/*` + `/admin/chat` inbox).

---

## 1. Goals & Non-Goals

### Goals
1. **Zero-Code Multi-Locale Activation:** Site administrators can configure active site languages (e.g., Vietnamese `vi` + Korean `ko` / `한국어` like MenuMate's `VN / KR` switcher, or `en`, `ja`, `zh`, `fr`, `de`, `th`), set the default language (first row = unprefixed URLs), customize short switcher labels (`VN`, `KR`, `EN`), and choose switcher presentation (`code`, `pill-flag`, `dropdown-flag`) directly in `SiteSettings` (`Cài đặt website`) — taking effect immediately across Studio Visual Editor, public pages, URL routing (`/ko/...`), `hreflang` alternates, `sitemap.xml`, CMS Workspace, and Korean storefront UI strings (`strings.ko.ts`) without touching `hosso.config.ts` or restarting the server.
2. **Crisp Cross-Platform Flag Switcher:** Because Windows 10/11 does not render regional-indicator flag emojis (`🇻🇳`, `🇰🇷`), `LanguageSwitcher` renders crisp inline SVG flags alongside short codes (`VN ▾`, `KR`) with full keyboard/ARIA menu support (`Escape`, outside-click, `aria-current`).
3. **Upgraded Floating Contact Dock & Real-Time Staff Live Chat:**
   - Replace basic emoji floating links with a tactile, accessible Floating Contact Dock (Phone, Zalo link or QR modal, Email, and **Live Chat** launcher with unread badge) available on all pages (custom `siteFooter` or theme `Footer`) while suppressing legacy duplicate theme `.hs-float` / `.ha-float` / `.ta-float` stacks when active.
   - Visitors start and continue real conversations with staff via hardened endpoints (`POST /api/site/chat/start`, `POST /api/site/chat/send`, `GET /api/site/chat/poll`) backed by a `chat-sessions` Payload collection.
   - Moderators, publishers, and admins get a dedicated 2-pane **Live Chat Inbox** at `/admin/chat` (wired into `Nav.tsx` with live unread session counter) to read visitor context (name, phone, locale, page path), reply in real time, and mark sessions open/closed.

### Non-Goals
- External third-party SaaS chat SDKs or WebSocket/Redis broker dependencies — single-process polling with `visibilitychange` pause fits Hosso Studio's zero-external-infra deployment model (SQLite local + Postgres production).
- Dynamic arbitrary ISO codes outside the curated 8-locale catalog (`vi`, `en`, `ko`, `ja`, `zh`, `fr`, `de`, `th` + any extra locales in `hosso.config.ts`), because Drizzle/Postgres `enum__locales` requires a deterministic superset schema enum.

---

## 2. Architecture & Data Contracts

### 2.1 Dynamic Content Locales (`SUPPORTED_CONTENT_LOCALES` + `SiteSettings.siteLocales`)
- **Catalog (`apps/studio/src/lib/locales-catalog.ts`):**
  - Curated catalog of 8 content locales (`vi`, `en`, `ko`, `ja`, `zh`, `fr`, `de`, `th`), merged with `hosso.locales` via `getPayloadLocalizationLocales(hosso.locales)`.
  - Registered in `apps/studio/src/payload.config.ts` `localization.locales` so Payload's SQLite/Postgres `*_locales` tables and REST/Local APIs natively store and retrieve all catalog locales without server restarts.
  - Pure validator `resolveSiteLocales(rawSiteLocales, fallbackLocales)`:
    - Filters unknown codes, deduplicates preserving Admin row order, trims custom `label` and `shortLabel` (defaults: `vi→VN`, `ko→KR`, `en→EN`, `ja→JP`, `zh→CN`, `fr→FR`, `de→DE`, `th→TH`).
    - Falls back to `hosso.locales` when `siteLocales` is empty/unset (100% backward-compatible with all existing sites & tests).
    - `activeLocales[0].code` is the active `defaultLocale` for URL prefixing (`localizeHref`), `LanguageSwitcher`, `Editor`, and `sitemap.xml`.
- **Request Flow:**
  1. `proxy.ts` inspects the first pathname segment against `SUPPORTED_LOCALE_CODES` (edge-safe, zero DB access) and forwards `x-hosso-locale`.
  2. `getSiteLocaleConfig(editorDraft)` in `apps/studio/src/lib/locale.ts` caches per-request `SiteSettings` lookup via `React.cache`, returning `{ locales, defaultLocale, switcherStyle }`.
  3. `currentLocale()` and `[[...slug]]/page.tsx` validate the candidate segment against active `locales` and call `setLocale(locale, defaultLocale)` in `@hosso/studio-blocks`.
  4. `href(path, locale)` in `apps/studio/src/lib/site.tsx` uses `getDefaultLocale()` from `@hosso/studio-blocks` (with fallback to `hosso.locales[0].code`), ensuring every link helper, menu item, canonical tag, `hreflang` alternate, and `sitemap.ts` entry respects the active `defaultLocale`.
  5. Studio Editor (`editor/[id]/page.tsx`, `Editor.tsx`, `CanvasApp.tsx`, `SitePanels.tsx`, `PublishPanel.tsx`), `WidgetsView.tsx`, `ContentWorkspaceView.tsx`, `ArticleOutline.tsx`, `cms-api.ts`, `content-import.ts`, `endpoints.ts`, `site-releases.ts`, `site-package.ts`, `site-import.ts`, and `kiln.ts` all resolve active site locales dynamically.
- **Storefront Strings (`packages/blocks/src/strings.ko.ts`):**
  - Complete `Record<StringKey, string>` Korean dictionary + new `chat.*` UI keys across `strings.vi.ts`, `strings.en.ts`, and `strings.ko.ts`, registered in `packages/blocks/src/i18n.ts`.

### 2.2 Live Chat Security & Data Model (`ChatSessions` + `/api/site/chat/*`)
- **Collection (`apps/studio/src/collections/ChatSessions.ts`, slug `chat-sessions`):**
  - Collection access: `moderators` (`admin`, `publisher`, `moderator`) for `create`, `read`, `update`, `delete`. Public unauthenticated REST access to `/api/chat-sessions` is completely blocked (`403`).
  - Fields: `visitorName`, `visitorPhone`, `visitorEmail`, `locale`, `pagePath`, `status` (`'open' | 'replied' | 'closed'`), `unreadByStaff`, `unreadByVisitor`, `lastMessageAt`, `lastMessagePreview`, `tokenHash` (`access: { read: () => false }`, `admin: { hidden: true }`), `messages` (`json` array bounded to 200 items).
- **Cryptographic Session Ownership (IDOR Prevention):**
  - On `POST /api/site/chat/start`, server generates a 256-bit random hex `token` (`crypto.randomBytes(32).toString('hex')`), stores only `tokenHash = sha256(token)` in DB, and returns `token` once to the visitor client (`localStorage` scoped per origin).
  - Subsequent `POST /api/site/chat/send` and `GET /api/site/chat/poll` send `x-hosso-chat-token` header; server compares `sha256(token)` against `doc.tokenHash` via `crypto.timingSafeEqual`, returning uniform `403` on missing/mismatched sessions so session IDs cannot be enumerated or hijacked.
- **Abuse & XSS Hardening:**
  - Honeypot field (`website`) silently drops bot submissions without DB writes.
  - Per-IP sliding-window rate limits via `allow()` (`chat-start`: 8 / 10 min, `chat-send`: 30 / min, `chat-poll`: 90 / min).
  - Strict input sanitization (`sanitizeChatText`: strips C0/C1 control chars except `\n`, trims, enforces 1–1000 chars; plain React text rendering with zero `dangerouslySetInnerHTML`).
- **Staff Inbox (`/admin/chat`):**
  - Server component `ChatInboxView.tsx` checks `canModerate(req.user)` before rendering `ChatInboxClient.tsx`.
  - Authenticated staff endpoints (`GET /api/site/chat/inbox`, `POST /api/site/chat/reply`, `POST /api/site/chat/status`) enforce `canModerate(req.user)`.
  - `Nav.tsx` displays `Trò chuyện trực tuyến` (`/admin/chat`) with live `unreadByStaff > 0` alert badge.

### 2.3 Motion, Accessibility & Craft Floor
- Transitions animate **only** `transform` and `opacity` (`180ms cubic-bezier(0.23, 1, 0.32, 1)`); zero `transition: all`.
- Full `@media (prefers-reduced-motion: reduce)` and `@media (prefers-reduced-transparency: reduce)` support.
- Minimum `44×44px` touch targets (`48×48px` dock buttons), focus-visible rings, Escape to close chat drawer / QR modal / language dropdown, and `width: min(368px, calc(100vw - 24px))` so `375px` mobile viewports have `0px` horizontal overflow.
