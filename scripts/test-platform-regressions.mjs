import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
const tests = [
  ['scripts/test-motion-runtime.mjs'], ['scripts/test-detailing-effects.mjs'], ['scripts/test-editor-interactive-upgrades.mjs'],
  ['scripts/test-platform-foundation.mts'], ['scripts/test-checkout-identity.mjs'], ['scripts/test-checkout-form.mjs'],
  ['scripts/test-order-receipt.mjs', '--shop-only'], ['scripts/test-order-origin.mjs'], ['scripts/test-commerce-security.mjs'],
  ['scripts/test-shipping-workflow.mjs'], ['scripts/test-site-package.mjs'], ['scripts/test-site-releases.mjs'],
  ['scripts/test-cms-workspace.mjs'], ['scripts/test-cms-workspace.mjs', 'scripts/test-content-models.ts'],
  ['scripts/test-cms-workspace.mjs', 'scripts/test-platform-runtime.ts'], ['scripts/test-cms-workspace.mjs', 'scripts/test-platform-commerce.ts'],
  ['scripts/test-cms-workspace.mjs', 'scripts/test-return-evidence.ts'],
  ['scripts/test-content-model-migration.mjs'], ['scripts/test-cms-migration.mjs'],
  ['scripts/test-platform-targets.mts'], ['scripts/test-cms-workspace.mjs', 'scripts/test-platform-kits.ts'],
  ['scripts/test-cms-workspace.mjs', 'scripts/test-platform-scale.ts'], ['scripts/test-platform-migration.mjs'],
]
await mkdir('output/platform-regressions', { recursive: true })
const results = []
for (let i = 0; i < tests.length; i += 2) await Promise.all(tests.slice(i, i + 2).map(async (args) => {
  const name = args.join(' ').replace(/[^a-z0-9_-]/gi, '_')
  const needsTsx = args[0].endsWith('.mts') || /test-(detailing-effects|editor-interactive-upgrades)\.mjs$/.test(args[0])
  const child = spawn(process.execPath, [...(needsTsx ? ['--import', 'tsx'] : []), ...args], { stdio: ['ignore', 'pipe', 'pipe'] })
  let log = ''
  child.stdout.on('data', (chunk) => { log += chunk }); child.stderr.on('data', (chunk) => { log += chunk })
  const code = await new Promise((resolve) => child.on('exit', resolve))
  await writeFile(`output/platform-regressions/${name}.log`, log)
  results.push({ name: args.join(' '), code })
  console.log(`${code === 0 ? 'PASS' : 'FAIL'} ${args.join(' ')}`)
  if (code !== 0) console.log(log.slice(-3500))
}))
await writeFile('output/platform-regressions/results.json', JSON.stringify(results, null, 2))
process.exitCode = results.some((result) => result.code !== 0) ? 1 : 0
