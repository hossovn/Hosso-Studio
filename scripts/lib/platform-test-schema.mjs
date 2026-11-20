import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

export async function sqlitePlatformSchema() {
  const require = createRequire(new URL('../../apps/studio/package.json', import.meta.url))
  process.env.HOSSO_DATABASE_URL = 'file::memory:'
  process.env.HOSSO_SECRET = 'platform-schema-test-only'
  process.env.HOSSO_SCRIPT = '1'
  const { tsImport } = require('tsx/esm/api')
  const { default: configPromise } = await tsImport('../../apps/studio/src/payload.config.ts', { parentURL: import.meta.url, tsconfig: fileURLToPath(new URL('../../apps/studio/tsconfig.json', import.meta.url)) })
  const config = await configPromise
  config.jobs.autoRun = []
  const payload = await require('payload').getPayload({ config, disableDBConnect: true, disableOnInit: true })
  try { return await require('drizzle-kit/api').generateSQLiteDrizzleJson(payload.db.schema) }
  finally { await payload.destroy() }
}
