# Creating blocks and plugins for Hosso Studio

[Tiếng Việt](../PLUGIN-GUIDE.md) | **English**

This guide adds functionality to Studio at two levels:

1. **Block**: a new page-building block (for example "Frequently asked questions"). Do this when you only need a new way to show content.
2. **Plugin**: a package registered through `hosso.config.ts` that brings its own blocks, data, settings page and endpoints (for example the WIM plugin). Do this when you need data from an external system, a new collection or an admin page.

A real-world reference: `packages/plugin-wim` is the most complete plugin. See also [ARCHITECTURE.md](ARCHITECTURE.md) and [PLUGIN-WIM.md](PLUGIN-WIM.md).

## 1. Understand the model: schema is separate from renderer

This is the most important idea.

- A **schema** (`BlockSchema`) describes a block's data: its name, fields and defaults. A schema knows nothing about looks.
- A **renderer** is the React component that draws the block. It comes from the **theme**, or from the plugin as a fallback.
- At runtime `buildPuckConfig(schemas, theme)` combines the two into the Puck builder configuration.

So switching theme does not change the page content (the JSON stored in `pages.content`); only how it is drawn changes.

The order in which a renderer is looked up for a block (see [puck-config.ts](../../packages/blocks/src/puck-config.ts)):

1. The renderer of the selected theme.
2. The core fallback renderer (`PostList`, `TrustBar`, `CategoryGrid`, `SearchBox`, `TermList`, `NavMenu`, `Form`, `Reusable`).
3. The plugin's `fallbackRenderers`.
4. None: the editor shows a "missing" frame and the public page skips the block.

## 2. Level 1: add a block

### Built-in field types

Declare them in `fields` ([types.ts](../../packages/blocks/src/types.ts)):

| `type` | Used for |
|---|---|
| `text`, `textarea`, `number` | Short text, paragraphs, numbers |
| `media` | Pick an image from the Media library (`kind: 'video'` for video) |
| `ref` | Pick a record from another collection (needs `collection`) |
| `select`, `radio` | Choose one of the `options` |
| `array` | A repeated list (needs `arrayFields`, may have `defaultItemProps`) |

Text fields may set `contentEditable: true` to be edited directly on the builder canvas; only do this when the renderer prints the value as plain JSX children.

### Example: an "FAQ" block

**Schema.** Add it to `packages/blocks/src/core-blocks.ts` if it is a core block:

```ts
export const faq: BlockSchema<{ heading: string; items: { q: string; a: string }[] }> = {
  type: 'Faq',
  label: 'Câu hỏi thường gặp',
  fields: {
    heading: { type: 'text', label: 'Tiêu đề' },
    items: {
      type: 'array',
      label: 'Câu hỏi',
      arrayFields: { q: { type: 'text', label: 'Câu hỏi' }, a: { type: 'textarea', label: 'Trả lời' } },
      defaultItemProps: { q: 'Câu hỏi mới', a: '' },
    },
  },
  defaultProps: { heading: 'Câu hỏi thường gặp', items: [] },
}
```

Labels are written in Vietnamese in the code and translated through `packages/blocks/src/labels-en.ts` (add `'Câu hỏi thường gặp': 'Frequently asked questions'` and so on; `pnpm check:i18n` lists what is missing).

Then add `faq` to the `coreBlocks` array at the end of the file.

**Renderer.** Add it to the `renderers` of every theme that should draw it, or to `coreFallback` in `puck-config.ts` if every theme should have it out of the box:

```tsx
const Faq: BlockRenderer = ({ heading, items }) => (
  <section className="mt-wrap">
    {heading && <h2>{heading}</h2>}
    {(items ?? []).map((it: { q: string; a: string }, i: number) => (
      <details key={i}>
        <summary>{it.q}</summary>
        <p>{it.a}</p>
      </details>
    ))}
  </section>
)
```

Use the browser's built-in `<details>` element instead of writing JavaScript; the public page stays lighter.

**Notes:**
- `type` is the key stored in the page JSON. **Do not rename it** after pages use it, or old pages lose the block.
- If a theme has no renderer for the new block, the public page skips it. Add a renderer to all 3 built-in themes or put it in `coreFallback`.
- Fixed display strings (buttons, labels) go in `strings.vi.ts` and `strings.en.ts` and are read with `t(...)`.

## 3. Level 2: create a plugin

### Structure

```
packages/plugin-my/
  package.json
  tsconfig.json
  src/
    index.ts        export default plugin (type HossoPlugin)
    blocks.ts       the plugin's block schemas
    renderers.tsx   fallback renderers
    loaders.ts      server data for blocks
    styles.ts       CSS of the fallback renderers
    payload.ts      collections, globals, endpoints added to Payload
```

`package.json` follows the `plugin-wim` template:

```json
{
  "name": "@hosso/plugin-my",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "scripts": { "typecheck": "tsc -p ." },
  "dependencies": { "@hosso/studio-blocks": "workspace:*" },
  "peerDependencies": { "react": "19.3.1" },
  "devDependencies": {
    "@types/react": "19.3.0",
    "payload": "3.91.0",
    "react": "19.3.1",
    "typescript": "5.9.3"
  }
}
```

`tsconfig.json`:

```json
{ "extends": "../../tsconfig.base.json", "include": ["src"] }
```

There is no build step: the package ships TypeScript source and `next.config.ts` picks up every `@hosso/*` package.

### The plugin object

A plugin is an object of type `HossoPlugin`. Every field except `id` is optional; declare only what you need:

```ts
import type { HossoPlugin } from '@hosso/studio-blocks'

const plugin: HossoPlugin = {
  id: 'my',
  blocks: myBlocks,                    // block schemas
  fallbackRenderers,                   // renderers when the theme draws none itself
  css,                                 // CSS for the fallback renderers
  loaders: { MyBlock: loadMyBlock },   // server data for blocks
  headerSlot: MyHeaderItem,            // inserted in the header (for example a cart)
  payload: applyPayload,               // adds collections/globals/endpoints
  portable: { globals: [{ slug: 'my-settings', secretFields: ['apiKey'] }] },
  checklist: async (payload) => [{ label: 'Kết nối dịch vụ X', done: false, href: '/admin/globals/my-settings' }],
  search: async (query, payload) => [{ title: '...', href: '/...' }],
  adminNav: [{ label: 'Kết nối dịch vụ X', href: '/admin/globals/my-settings', roles: ['admin'] }],
  adminEn: { 'Kết nối dịch vụ X': 'Connect service X' }, // English for your Vietnamese labels
}
export default plugin
```

| Field | What it does |
|---|---|
| `blocks` | Adds blocks to the builder |
| `fallbackRenderers` | Draws a block when the theme has no renderer of its own. Required if the block should work with every theme |
| `css` | CSS for the fallback renderers. Use only `--hs-*` variables so it follows the selected theme |
| `loaders` | Functions that run on the server, fetch data and pass it to the renderer through the `data` prop |
| `headerSlot` | A component inserted in the header, runs in the browser |
| `payload` | A function that receives the Payload config and returns a new one (adds collections, globals, endpoints) |
| `portable` | The plugin's globals included in the export/import package. `secretFields` **never** enter the package |
| `checklist` | Adds a step to the "Get started" card on the admin dashboard |
| `search` | Adds the plugin's results to the `/tim-kiem` search page |
| `adminNav` | Adds items to the "Plugins" group of the admin sidebar |
| `adminEn` | English text for the plugin's Vietnamese admin labels (block labels, checklist, settings) |

### Loader: fetching data for a block

The browser never calls external APIs. The server runs the loader and passes the result to the renderer's `data` prop.

```ts
import type { BlockLoader } from '@hosso/studio-blocks'

export const loadMyBlock: BlockLoader = async (props, ctx) => {
  // ctx: payload, searchParams, cookies, locale
  try {
    const res = await fetch(`https://api.example.com/items?q=${ctx.searchParams.q ?? ''}`)
    if (!res.ok) return { status: 'error', kind: 'upstream' }
    return { status: 'ok', items: await res.json() }
  } catch {
    return { status: 'error', kind: 'unreachable' }
  }
}
```

Rules to follow (exactly how `plugin-wim` does it with `guarded`):

- Always return `{ status: 'ok', ... }` or `{ status: 'error', kind }` and **never throw**. When the external system is down the block shows a friendly error and the rest of the page still renders.
- Handle `{ status: 'loading' }` or an empty `data` in the renderer; never assume `data` is always there.

The renderer reads the data:

```tsx
const MyBlock: BlockRenderer = ({ heading, data }) => {
  if (data?.status === 'error') return <p role="status">Could not load the data.</p>
  return <ul>{data?.items?.map((i: any) => <li key={i.id}>{i.name}</li>)}</ul>
}
```

### Adding collections, globals and endpoints to Payload

```ts
import type { Config } from 'payload'

export const applyPayload = (config: Config): Config => ({
  ...config,
  globals: [...(config.globals ?? []), MySettings],
  endpoints: [...(config.endpoints ?? []), ...myEndpoints],
})
```

For labels and descriptions in your Payload config you can pass `{ vi: '…', en: '…' }` objects (see `bi()` in `plugin-wim/src/lang.ts`); they follow the admin language.

When you build a settings page for a plugin:

- Only `admin` may read and write it (see `WimSettings` in `plugin-wim/src/payload.ts`).
- API keys and webhook secrets must be **encrypted when stored** and **masked when returned by the API/admin**. `plugin-wim` does this with `beforeChange` and `afterRead` hooks and AES-256-GCM encryption with `HOSSO_ENCRYPTION_KEY`. Reuse that approach; never store secrets as plain text.
- List the global in `portable` and put the secret fields in `secretFields` so the export package never leaks keys.

### Environment constraints

The plugin declaration runs on **both the server and the browser** (the editor loads it too). So:

- Do not import Node-only modules (`fs`, Node's `crypto`...). Use Web Crypto and `fetch`.
- Server-only parts (loaders, endpoints) may still call external APIs, but keep them out of the browser bundle.
- Never send data or secrets down to the client. Pass the renderer only what it has to display.

### Registering the plugin

Add it to `apps/studio/package.json`:

```json
"@hosso/plugin-my": "workspace:*",
```

Declare it in `apps/studio/hosso.config.ts` (this is the **only place** the core may mention a plugin):

```ts
import my from '@hosso/plugin-my'

export default defineHossoConfig({
  // ...
  plugins: [wim, my],
})
```

Then:

```bash
pnpm install
pnpm dev
```

`pnpm dev` runs Payload's `generate:importmap` before starting.

### Plugin admin views

Register pages in `admin.components.views` with `path` and `Component`. After loading plugins, Studio wraps every custom view in `AdminViewShell` to retain Payload's sidebar and admin header. Original components stay registered in the import map; plugins should not add another `DefaultTemplate`. The built-in dashboard already has its own frame.

Use `Gutter` with shared classes `ha-workspace`, `ha-page-head`, `ha-panel`, `ha-button`, `ha-table-scroll` and `ha-data-table` for light/dark themes and small screens. Client components receive serializable data only; server components retain `AdminViewServerProps`. Each page and endpoint must still enforce its own data permissions.

### Manifest and enabling/disabling plugins

Each plugin has a `hosso.json` at its root (id, type `plugin`, vi/en name and description, version, management page, `needsBuild`). The plugin loads it into the `manifest` of the plugin object; the **Manage plugins** page in the admin (`/admin/plugins`) lists installed plugins from it. See `packages/plugin-affiliate` for an example.

The `NEXT_PUBLIC_HOSSO_PLUGINS` variable (comma-separated ids, for example `shop,shipping`) chooses which plugins are enabled; empty enables all. Next inlines it at build time, so changing it requires a rebuild. Disabling a plugin is like removing it: in dev mode Payload asks to confirm dropping the plugin's tables on startup.

### Removing a plugin

Delete the import line and the entry in `plugins` in `hosso.config.ts`. The site keeps working and the plugin's blocks are skipped. In dev, Payload may ask you to confirm dropping the plugin's settings table at startup. This is the intended behavior: also try removing your own plugin to make sure the site does not crash.

## 4. Mandatory rules

- **The core does not depend on plugins.** `apps/studio/src`, `packages/blocks` and `packages/theme-*` must not mention a plugin name. Check with `pnpm check:boundaries`. If your new plugin is outside the known list, make sure the script still catches violations.
- **Data owned by an external system stays in that system.** Do not copy products, orders... into the Studio database. Read them through a loader with a short cache.
- **Secrets are always encrypted and masked.** See above.
- **Failures must be soft.** When the external system fails only that block reports an error; the page still loads.
- **License.** A new library must be MIT, Apache-2.0, BSD or ISC. Record it in [LICENSES.md](../LICENSES.md).
- **UI strings** go in the plugin's strings files (like `strings.vi.ts` and `strings.en.ts` in `plugin-wim`), never hard-coded.
- **Admin labels** are bilingual: Vietnamese in the code and English in `adminEn`; server messages use `L('vi', 'en')` / `msg(req, 'vi', 'en')`.

## 5. Testing

```bash
pnpm typecheck
pnpm check:boundaries
pnpm check:i18n
pnpm test:admin-views
pnpm dev
```

A manual checklist:

1. The new block is in the builder, can be dragged into a page, its properties can be edited, and after publishing the public page shows it correctly.
2. Switch between themes: the block still shows correctly and no content is lost.
3. Switch off or break the external system: the block reports an error and the rest of the page is normal.
4. Remove the plugin from `hosso.config.ts`: `/` and `/admin` still return 200 and pages that contain the plugin's blocks still open.
5. Export and import a site package (`pnpm studio:export`, `pnpm studio:import`) and confirm there are no secrets in the package.

## 6. Common problems

| Symptom | Usual cause |
|---|---|
| The block is not in the builder | It was not added to the plugin's `blocks` (or `coreBlocks` for a core block) |
| The editor shows a "missing" frame | No renderer: missing in the theme, `coreFallback` and `fallbackRenderers` |
| `data` is always `undefined` | The key in `loaders` does not equal the block's `type` |
| The public page is blank where the block is | The loader throws instead of returning `{ status: 'error' }` |
| A build error about a Node module | The plugin imports `fs`, `crypto`... in the part that also runs in the browser |
| The new plugin does not load | `pnpm install` was not run after adding the dependency, or it is not in `plugins` |
