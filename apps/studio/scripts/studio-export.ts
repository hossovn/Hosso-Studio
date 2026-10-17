import config from '@payload-config'
import fs from 'fs'
import path from 'path'
import { getPayload } from 'payload'

import { buildSitePackage } from '../src/lib/site-package'

// pnpm studio:export [tệp.zip]   (nội dung gói: xem src/lib/site-package.ts)
const out = path.resolve(process.env.INIT_CWD || process.cwd(), process.argv[2] || `hosso-site-${new Date().toISOString().slice(0, 10)}.zip`)
const r = await buildSitePackage(await getPayload({ config }))
fs.writeFileSync(out, r.data)
console.log(`Đã xuất ${r.pages} trang, ${r.posts} bài viết, ${r.media} media (${r.locales.join(', ')}) -> ${out}`)
if (r.secretsOmitted.length) console.log(`Không kèm bí mật: ${r.secretsOmitted.join(', ')} (nhập lại trong admin hoặc đặt bằng biến môi trường HOSSO_WIM_*).`)
process.exit(0)
