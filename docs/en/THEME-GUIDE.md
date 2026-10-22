# Creating a theme for Hosso Studio

[Tiếng Việt](../THEME-GUIDE.md) | **English**

A theme decides the **look** of the site: colors, fonts, header, footer and how each block is drawn. A theme holds no content. When you switch theme, the content of the pages stays the same; only how it is drawn changes.

This guide creates a new theme called `my-theme` from scratch. The built-in themes to compare with:

| Theme | Folder | Notes |
|---|---|---|
| Light & Clean | `packages/theme-default` | The default theme |
| Technical dark | `packages/theme-alt` | Compact, the easiest one to learn from |

## 1. What a theme consists of

```
packages/theme-my-theme/
  package.json     package declaration, depends on @hosso/studio-blocks
  tsconfig.json    extends tsconfig.base.json
  theme.json       name, title, tokens (colors, fonts, corner radius, spacing)
  preview.svg      preview image
  src/
    index.tsx      a renderer per block + header/footer, exports the theme
    styles.ts      the theme CSS
```

A theme is an object of type `Theme` ([types.ts](../../packages/blocks/src/types.ts)):

```ts
type Theme = {
  manifest: ThemeManifest                     // the content of theme.json
  css: string                                 // CSS, using --hs-* variables
  renderers: Record<string, BlockRenderer>    // block name -> component
  layout?: { Header; Footer }                 // the site frame
}
```

## 2. Steps

### Step 1. Copy the closest theme

The quickest way is to copy `theme-alt`:

```bash
cp -r packages/theme-alt packages/theme-my-theme
rm -rf packages/theme-my-theme/node_modules
```

### Step 2. Edit `package.json`

Change `name` to `@hosso/theme-my-theme` and keep the rest:

```json
{
  "name": "@hosso/theme-my-theme",
  "version": "0.1.0",
  "private": true,
  "license": "Apache-2.0",
  "type": "module",
  "exports": {
    ".": "./src/index.tsx",
    "./theme.json": "./theme.json"
  },
  "scripts": { "typecheck": "tsc -p ." },
  "dependencies": { "@hosso/studio-blocks": "workspace:*" },
  "peerDependencies": { "react": "19.3.1" },
  "devDependencies": {
    "@types/react": "19.3.0",
    "react": "19.3.1",
    "typescript": "5.9.3"
  }
}
```

Workspace packages ship TypeScript source with no separate build step. `next.config.ts` picks up every `@hosso/*` package by itself, so you do not edit anything there.

### Step 3. Edit `theme.json`

```json
{
  "name": "my-theme",
  "title": "My theme",
  "version": "0.1.0",
  "studio": "^0.1.0",
  "preview": "preview.svg",
  "pluginBlocks": [],
  "tokens": {
    "colors": {
      "bg": "#ffffff",
      "surface": "#f5f6f8",
      "text": "#14181f",
      "muted": "#5b6573",
      "primary": "#d71920",
      "onPrimary": "#ffffff",
      "border": "#e2e5ea"
    },
    "fonts": { "body": "be-vietnam-pro", "heading": "be-vietnam-pro" },
    "radius": "6px",
    "spacing": "1rem"
  }
}
```

Explanation:

- `name`: the identifier, lowercase, no spaces. It is also the key under which theme customizations are stored in the admin, so **do not change it once people use the theme**.
- `title`: the name shown in the admin.
- `studio`: the compatible Studio version range.
- `pluginBlocks`: names of plugin blocks the theme has its own renderer for. Leave `[]` if the theme does not draw plugin blocks itself (the plugin then uses its fallback renderer).
- `tokens.colors`: each key becomes a CSS variable `--hs-<kebab-name>`. For example `onPrimary` becomes `--hs-on-primary`.
- `tokens.fonts`: choose among `be-vietnam-pro`, `barlow`, `jetbrains-mono` (defined in `FONTS` in `types.ts`). Another font must be declared in the app, which is a core change.
- `radius`, `spacing`: become `--hs-radius` and `--hs-space`.

Administrators can override these tokens in Admin → Site appearance or in the Live customizer (Admin → Appearance). Any field left empty uses the value in `theme.json`.

### Step 4. Write the CSS in `src/styles.ts`

```ts
export const css = `
.hs-theme{background:var(--hs-bg);color:var(--hs-text);font-family:var(--hs-font-body);line-height:1.65}
.hs-theme a{color:var(--hs-primary)}
.mt-wrap{max-width:72rem;margin:0 auto;padding:0 var(--hs-space)}
`
```

Rules:

- All content lives inside `.hs-theme`. Colors, fonts, corner radius and spacing come **only from the `--hs-*` variables**, never hard-coded, so the admin can change them.
- Give your classes their own prefix (for example `mt-`) so they do not collide with another theme.
- Write mobile-first and use `@media(min-width:48rem)` for wide screens.
- Keep `:focus-visible` clearly visible so keyboard users can work.

### Step 5. Write the renderers in `src/index.tsx`

Each renderer is a component that receives the block's props, plus `id`. The key in `renderers` must equal the block's `type`.

```tsx
import { Rich, SiteNav, t, type BlockRenderer, type SiteChrome, type Theme, type ThemeManifest } from '@hosso/studio-blocks'
import manifest from '../theme.json'
import { css } from './styles'

const Hero: BlockRenderer = ({ title, subtitle, ctaLabel, ctaHref, image }) => (
  <section className="mt-hero">
    {image && <img src={image} alt="" fetchPriority="high" decoding="async" />}
    <div className="mt-wrap">
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
      {ctaLabel && <a href={ctaHref || '#'}>{ctaLabel}</a>}
    </div>
  </section>
)

const Text: BlockRenderer = ({ heading, body }) => (
  <section className="mt-wrap">
    <h2>{heading}</h2>
    <Rich text={String(body ?? '')} />
  </section>
)

export const theme: Theme = {
  manifest: manifest as ThemeManifest,
  css,
  renderers: { Hero, Text /* Image, Video, Features, ContactForm, Footer */ },
  layout: { Header, Footer }, // see step 6
}

export default theme
```

Core blocks a theme should have a renderer for: `Hero`, `Text`, `Image`, `Video`, `Features`, `ContactForm`, `Footer`. If the theme has **no** renderer for a block, Studio uses the core fallback (`PostList`, `TrustBar`, `CategoryGrid`, `SearchBox`, `TermList`, `NavMenu`, `Form`, `Reusable`) or the plugin's. A theme that does not draw every block still works.

Use the shared pieces from `@hosso/studio-blocks` instead of rewriting them:

| Piece | Used for |
|---|---|
| `Rich` | Text with **bold**, *italic*, links and lists |
| `SiteNav` | Two-level menu with dropdowns |
| `VideoEmbed` | Embeds YouTube/Vimeo or a video file |
| `t('key')` | Gets a UI string for the current language (vi/en) |

User-facing text should come through `t(...)`, never hard-coded in a component, so the multilingual site works correctly.

A note about the contact form: it posts `POST /api/contact` with the fields `name`, `phone`, `message` and a honeypot `website` (hidden with the `hs-hp` class). Keep these names or the form will not work.

### Step 6. Header and footer

`layout.Header` and `layout.Footer` receive `chrome` (data from Admin → Site appearance) of type `SiteChrome`:

- `siteName`, `logoUrl`, `announcement`
- `headerMenu`, `footerMenu` (up to two levels)
- `contact` (phone, email, address, Zalo), `social`
- `search` (whether to show the search box), `homeHref`, `searchHref`

`Header` also receives `actions`: the parts plugins add, for example the cart link. Render it where you want it, otherwise the cart will not show.

Use `chrome.homeHref` and `chrome.searchHref` for links, never a hard-coded `/`, because the site has several languages (`/en`).

### Step 7. Register the theme

Add the package to `apps/studio/package.json`:

```json
"@hosso/theme-my-theme": "workspace:*",
```

Then declare it in `apps/studio/hosso.config.ts`:

```ts
import myTheme from '@hosso/theme-my-theme'

export default defineHossoConfig({
  // ...
  themes: [defaultTheme, altTheme, shopTheme, myTheme],
})
```

The **first** theme in the `themes` array is the default theme of a new site.

Install again so pnpm links the new package:

```bash
pnpm install
```

### Step 8. Test

```bash
pnpm typecheck
pnpm check:boundaries
pnpm dev
```

Then go to Admin → Site appearance → "Appearance" tab → choose "My theme" (or use the Live customizer). Open the site and the builder (`/editor/<id>`) to look at each block, and try switching between the phone, tablet and desktop previews.

Checklist before you call it done:

- Every color, font, corner radius and spacing comes from the `--hs-*` variables (changing a token in the admin changes the look).
- Switching back and forth between your theme and the default theme: page content does not change.
- Pages are still readable with no plugin installed (remove `wim` from `hosso.config.ts` to try).
- Keyboard navigation works and focus is visible.
- Images have `alt`, the hero image at the top has `fetchPriority="high"`, other images have `loading="lazy"`.

## 3. Supporting plugin blocks

A plugin such as WIM brings its own blocks (product grid, cart, ...) and **has its own fallback renderers**, drawn with `--hs-*` variables so they fit every theme. A theme therefore does not have to do anything.

To draw a plugin block yourself for a better look:

1. Add a renderer with the same block name to the theme's `renderers`. A theme renderer wins over the fallback.
2. List that block name in `pluginBlocks` in `theme.json`.

Dynamic data of a plugin block (products, prices) arrives through the `data` prop after the server runs the loader. The theme only displays; it never calls an API.

## 4. Boundaries to keep

- A theme **must not import from a plugin** (for example `@hosso/plugin-wim`). `pnpm check:boundaries` will fail.
- A theme does not read the database or call APIs. All data comes through props.
- A theme does not change block schemas. Adding or changing a field is the job of `packages/blocks` (see [PLUGIN-GUIDE.md](PLUGIN-GUIDE.md) if the block belongs to a plugin).

## 5. Common problems

| Symptom | Usual cause |
|---|---|
| The theme is not in the picker | It is not in `themes` in `hosso.config.ts`, or `pnpm install` was not run after adding the dependency |
| A block shows a "missing" frame in the editor | The key in `renderers` does not equal the block's `type` |
| Changing a color in the admin has no effect | The CSS hard-codes colors instead of using `var(--hs-...)` |
| The menu or the cart does not show | `Header` does not render `SiteNav` or `actions` |
| A type error when importing `theme.json` | `"include": ["src", "theme.json"]` is missing in `tsconfig.json` |
