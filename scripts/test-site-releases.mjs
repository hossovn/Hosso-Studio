import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const require = createRequire(new URL('../apps/studio/package.json', import.meta.url))
const directory = await mkdtemp(join(tmpdir(), 'hosso-studio-releases-'))
const root = fileURLToPath(new URL('../apps/studio/', import.meta.url))
const processUnderTest = spawn(process.execPath, [join(dirname(require.resolve('payload')), '..', 'bin.js'), 'run', 'scripts/test-site-releases.ts'], {
  cwd: root, stdio: 'inherit', env: { ...process.env, HOSSO_DATABASE_URL: 'file:' + join(directory, 'studio.db').replaceAll('\\', '/'), HOSSO_SECRET: 'studio-release-tests-disposable-secret', HOSSO_SEED: 'false', HOSSO_SCRIPT: '1', HOSSO_ADMIN_EMAIL: '', HOSSO_ADMIN_PASSWORD: '', HOSSO_SMTP_URL: '', HOSSO_DB_PUSH: 'true', NODE_ENV: 'test' },
})
processUnderTest.on('exit', (code) => process.exit(code ?? 1))
