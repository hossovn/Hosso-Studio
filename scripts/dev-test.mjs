// Khởi chạy Hosso Studio Test với .env.test trên cổng 3001
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const studioDir = resolve(__dirname, '../apps/studio')
const envTestPath = resolve(studioDir, '.env.test')

// Nạp các biến môi trường từ .env.test
process.loadEnvFile(envTestPath)

const nextBin = resolve(studioDir, 'node_modules/next/dist/bin/next')

const proc = spawn(
  process.execPath,
  ['--no-deprecation', nextBin, 'dev', '-p', process.env.PORT || '3001'],
  {
    cwd: studioDir,
    stdio: 'inherit',
    env: { ...process.env, PORT: process.env.PORT || '3001' },
  }
)

proc.on('exit', (code) => process.exit(code ?? 0))
