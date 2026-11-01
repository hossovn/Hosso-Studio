import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
assert.ok(process.env.AFFILIATE_TEST_DATABASE_URL, 'Use a disposable local PostgreSQL database')
process.env.HOSSO_LICENSE_ENFORCE = '0'
process.env.NODE_ENV = 'test'
const require = createRequire(new URL('../apps/studio/package.json', import.meta.url))
const { tsImport } = require('tsx/esm/api')
await tsImport('../packages/plugin-affiliate/test/integration.ts', { parentURL: import.meta.url, tsconfig: fileURLToPath(new URL('../apps/studio/tsconfig.json', import.meta.url)) })
