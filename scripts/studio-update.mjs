// pnpm studio:update — update Studio with one command (git installs): backup, pull, install, migrate, build. / Cập nhật Studio bằng một lệnh.
// Stops at the first failing step; the backup stays in HOSSO_BACKUP_DIR so you can roll back. Restart the process (pm2/systemd/docker) afterwards. / Dừng ngay nếu một bước lỗi; bản sao lưu nằm trong HOSSO_BACKUP_DIR; khởi động lại tiến trình sau khi xong.
import { execSync } from 'node:child_process'

const en = /^en/i.test(process.env.HOSSO_LANG || process.env.LC_ALL || process.env.LANG || '')
const L = (vi, e) => (en ? e : vi)
const run = (cmd) => {
  console.log(`\n> ${cmd}`)
  execSync(cmd, { stdio: 'inherit' })
}
const out = (cmd) => execSync(cmd, { encoding: 'utf8' }).trim()

if (out('git status --porcelain --untracked-files=no')) {
  console.error(L('Có thay đổi chưa commit trong mã nguồn; commit hoặc stash trước khi cập nhật.', 'There are uncommitted changes in the source; commit or stash them before updating.'))
  process.exit(1)
}
const before = out('git rev-parse --short HEAD')
run('pnpm studio:backup')
run('git pull --ff-only')
if (out('git rev-parse --short HEAD') === before) console.log(L('\nĐã là bản mới nhất.', '\nAlready up to date.'))
run('pnpm install --frozen-lockfile')
run('pnpm migrate')
run('pnpm build')
console.log(L(`\nCập nhật xong (${before} → ${out('git rev-parse --short HEAD')}). Khởi động lại Studio để dùng bản mới.`, `\nUpdate finished (${before} → ${out('git rev-parse --short HEAD')}). Restart Studio to use the new version.`))
