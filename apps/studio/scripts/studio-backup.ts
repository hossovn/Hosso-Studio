import config from '@payload-config'
import { getPayload } from 'payload'
import { L } from '../src/lib/lang'

import { createBackup } from '../src/lib/backup'

// pnpm studio:backup   (folder: HOSSO_BACKUP_DIR, copies kept: HOSSO_BACKUP_KEEP). Run it from cron or the backup service in docker-compose. / Thư mục: HOSSO_BACKUP_DIR, số bản giữ: HOSSO_BACKUP_KEEP.
const r = await createBackup(await getPayload({ config }))
console.log(L(`Đã sao lưu ${r.pages} trang, ${r.posts} bài viết, ${r.media} media -> ${r.name} (${Math.round(r.size / 1024)} KB)`, `Backed up ${r.pages} pages, ${r.posts} posts, ${r.media} media -> ${r.name} (${Math.round(r.size / 1024)} KB)`))
process.exit(0)
