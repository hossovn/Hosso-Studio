// pnpm studio:update [--check | --auto] — update Studio (core, themes and plugins live in the repo) / Cập nhật Studio (lõi, theme và plugin nằm trong cùng mã nguồn).
//   (no flag)  backup, pull, install, migrate, build. Stops at the first failing step; the backup stays in HOSSO_BACKUP_DIR.
//   --check    only report whether a newer version exists (exit code 10 = update available, 0 = up to date).
//   --auto     for cron / Task Scheduler: does nothing when up to date or when the tree has local changes; otherwise updates,
//              rolls back to the previous commit if any step fails, then runs HOSSO_RESTART_CMD (for example "pm2 restart studio").
// Không cờ: sao lưu, kéo mã, cài, migrate, build. --check: chỉ báo có bản mới (mã thoát 10). --auto: dùng cho lịch chạy tự động, lỗi thì quay về bản trước rồi chạy HOSSO_RESTART_CMD.
import { execSync } from 'node:child_process'

const en = /^en/i.test(process.env.HOSSO_LANG || process.env.LC_ALL || process.env.LANG || '')
const L = (vi, e) => (en ? e : vi)
const args = process.argv.slice(2)
const auto = args.includes('--auto')
const check = args.includes('--check')
const run = (cmd) => {
  console.log(`\n> ${cmd}`)
  execSync(cmd, { stdio: 'inherit' })
}
const out = (cmd) => execSync(cmd, { encoding: 'utf8' }).trim()
const stamp = () => new Date().toISOString()

if (out('git status --porcelain --untracked-files=no')) {
  const msg = L('Có thay đổi chưa commit trong mã nguồn; commit hoặc stash trước khi cập nhật.', 'There are uncommitted changes in the source; commit or stash before updating.')
  // Chạy tự động thì bỏ qua êm: không muốn lịch chạy báo lỗi chỉ vì bạn đang sửa mã.
  console.error(`${auto ? `[${stamp()}] ` : ''}${msg}`)
  process.exit(auto ? 0 : 1)
}

const before = out('git rev-parse --short HEAD')
if (check || auto) {
  try {
    run('git fetch --quiet')
  } catch {
    console.error(L('Không kết nối được kho mã nguồn.', 'Could not reach the source repository.'))
    process.exit(auto ? 0 : 1)
  }
  const behind = Number(out('git rev-list --count HEAD..@{u}'))
  if (!behind) {
    console.log(L('Đã là bản mới nhất.', 'Already up to date.'))
    process.exit(0)
  }
  console.log(L(`Có ${behind} thay đổi mới.`, `${behind} new change(s) available.`))
  if (check) process.exit(10)
}

try {
  run('pnpm studio:backup')
  run('git pull --ff-only')
  if (out('git rev-parse --short HEAD') === before) console.log(L('\nĐã là bản mới nhất.', '\nAlready up to date.'))
  run('pnpm install --frozen-lockfile')
  run('pnpm migrate')
  run('pnpm build')
} catch (e) {
  if (!auto) throw e
  console.error(L(`\n[${stamp()}] Cập nhật lỗi, quay về bản ${before}.`, `\n[${stamp()}] Update failed, rolling back to ${before}.`))
  // Cây mã sạch (đã kiểm ở đầu) và chỉ kéo theo kiểu fast-forward nên quay về commit cũ không làm mất thay đổi của bạn.
  try {
    run(`git reset --hard ${before}`)
    run('pnpm install --frozen-lockfile')
  } catch {
    console.error(L('Quay về cũng lỗi: kiểm tra thủ công.', 'Rollback failed too: check manually.'))
  }
  process.exit(1)
}

const after = out('git rev-parse --short HEAD')
console.log(L(`\nCập nhật xong (${before} → ${after}).`, `\nUpdate finished (${before} → ${after}).`))
if (auto && process.env.HOSSO_RESTART_CMD && after !== before) run(process.env.HOSSO_RESTART_CMD)
else console.log(L('Khởi động lại Studio để dùng bản mới.', 'Restart Studio to use the new version.'))
