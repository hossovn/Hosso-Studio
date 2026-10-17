import config from '@payload-config'
import { getPayload } from 'payload'

import { createBackup } from '../src/lib/backup'

// pnpm studio:backup   (thư mục: HOSSO_BACKUP_DIR, số bản giữ: HOSSO_BACKUP_KEEP). Chạy định kỳ bằng cron hoặc service backup trong docker-compose.
const r = await createBackup(await getPayload({ config }))
console.log(`Đã sao lưu ${r.pages} trang, ${r.posts} bài viết, ${r.media} media -> ${r.name} (${Math.round(r.size / 1024)} KB)`)
process.exit(0)
