// pnpm studio:update — cập nhật Studio bằng một lệnh (cài đặt từ git): sao lưu, lấy mã mới, cài phụ thuộc, migrate, build.
// Dừng ngay nếu một bước lỗi; bản sao lưu nằm trong HOSSO_BACKUP_DIR để quay lại. Khởi động lại tiến trình (pm2/systemd/docker) sau khi xong.
import { execSync } from 'node:child_process'

const run = (cmd) => {
  console.log(`\n> ${cmd}`)
  execSync(cmd, { stdio: 'inherit' })
}
const out = (cmd) => execSync(cmd, { encoding: 'utf8' }).trim()

if (out('git status --porcelain --untracked-files=no')) {
  console.error('Có thay đổi chưa commit trong mã nguồn; commit hoặc stash trước khi cập nhật.')
  process.exit(1)
}
const before = out('git rev-parse --short HEAD')
run('pnpm studio:backup')
run('git pull --ff-only')
if (out('git rev-parse --short HEAD') === before) console.log('\nĐã là bản mới nhất.')
run('pnpm install --frozen-lockfile')
run('pnpm migrate')
run('pnpm build')
console.log(`\nCập nhật xong (${before} → ${out('git rev-parse --short HEAD')}). Khởi động lại Studio để dùng bản mới.`)
