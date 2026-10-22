# Licenses of the main libraries

[Tiếng Việt](../LICENSES.md) | **English**

Checked directly from each package's metadata (npm registry / repo) and with `pnpm licenses list --prod` on the installed dependency tree (updated in slice 1; update again every time a slice adds a dependency).

| Library | Version | License |
|---|---|---|
| payload, @payloadcms/next, @payloadcms/ui, @payloadcms/db-sqlite, @payloadcms/db-postgres, @payloadcms/translations | 3.91.0 | MIT |
| next | 16.4.2 | MIT |
| react, react-dom | 19.3.1 | MIT |
| graphql | 16.14.2 | MIT |
| @puckeditor/core | 0.23.0 | MIT |
| @nestjs/common, core, platform-express (mock WIM) | 11.2.7 | MIT |
| class-validator, class-transformer (mock WIM) | 0.15.1 / 0.5.1 | MIT |
| reflect-metadata, rxjs (mock WIM) | 0.2.2 / 7.8.2 | Apache-2.0 |
| openapi-typescript (dev) | 7.13.0 | MIT |
| ajv, yaml (dev, contract test) | 8.20.0 / 2.9.1 | MIT / ISC |
| fflate (export/import) | 0.8.3 | MIT |
| @payloadcms/email-nodemailer, nodemailer (notification emails) | 3.91.0 / 10.1.2 | MIT / MIT-0 |
| fast-xml-parser, node-html-parser (WordPress import) | 5.11.2 / 9.0.4 | MIT |
| pg (Postgres, through Payload) | 8.x | MIT |
| @libsql/client (SQLite, through Payload) | 0.x | MIT |
| typescript | 5.9.3 | Apache-2.0 |
| drizzle-orm (through Payload) | 0.45.2 | Apache-2.0 |

## Not MIT/ISC/BSD in the prod tree (reviewed)

| Package | License | Comment |
|---|---|---|
| argparse 2.0.1 | Python-2.0 | Permissive, redistribution allowed |
| caniuse-lite | CC-BY-4.0 | Browser data, attribution required (build time) |
| dompurify | MPL-2.0 OR Apache-2.0 | We choose Apache-2.0 |
| sanitize-filename, truncate-utf8-bytes, utf8-byte-length | WTFPL (or ISC/MIT) | Permissive; the last two are WTFPL only, a lawyer should confirm |
| sax | BlueOak-1.0.0 | Permissive |
| tslib | 0BSD | Permissive |

Result: no GPL, AGPL or LGPL in the prod dependency tree.

## sharp / libvips

The libvips binary bundled with `sharp` is LGPL-3.0. Decision: **do not use sharp**. `pnpm.overrides` sets `"sharp": "-"` to remove it from the tree (Next and Payload treat it as optional); uploaded images are not resized and Next's image optimization is off (`images.unoptimized`). We confirmed that `node_modules/.pnpm` contains neither sharp nor libvips.

## Tools used only for checking, not in the dependency tree

- Lighthouse 13.5.0 (Apache-2.0): performance measurement, run with `npx`.
- embedded-postgres (MIT): a temporary Postgres to test migrations when Docker cannot run.
