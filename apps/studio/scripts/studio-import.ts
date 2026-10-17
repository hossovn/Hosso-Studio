import config from '@payload-config'
import fs from 'fs'
import path from 'path'
import { getPayload } from 'payload'

import { importSitePackage } from '../src/lib/site-import'

// pnpm studio:import <tệp.zip>   (logic: src/lib/site-import.ts)
const input = process.argv[2]
if (!input) {
  console.error('Cách dùng: pnpm studio:import <tệp.zip>')
  process.exit(1)
}
await importSitePackage(await getPayload({ config }), new Uint8Array(fs.readFileSync(path.resolve(process.env.INIT_CWD || process.cwd(), input))))
process.exit(0)
