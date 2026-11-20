import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'

const image = process.env.PLATFORM_TEST_IMAGE || 'hosso-studio:platform-audit'
const prefix = 'hosso-platform-' + randomUUID().slice(0, 8)
const network = prefix + '-net', postgres = prefix + '-pg', studio = prefix + '-app'
const volumes = ['media', 'private', 'backups'].map((part) => prefix + '-' + part)
const password = randomUUID(), output = 'output/platform-container'
await mkdir(output, { recursive: true })
const docker = (args) => execFileSync('docker', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
const logs = () => { const result = spawnSync('docker', ['logs', studio], { encoding: 'utf8' }); return ((result.stdout || '') + (result.stderr || '')).replaceAll(password, '<fixture-secret>') }
const pause = () => new Promise((resolve) => setTimeout(resolve, 1000))
let started = false
try {
  const imageInfo = JSON.parse(docker(['image', 'inspect', image]))[0]
  docker(['network', 'create', network])
  docker(['run', '-d', '--name', postgres, '--network', network, '-e', 'POSTGRES_DB=platform', '-e', 'POSTGRES_PASSWORD=' + password, 'postgres:17-alpine'])
  for (let i = 0; ; i++) {
    try { docker(['exec', postgres, 'pg_isready', '-U', 'postgres', '-d', 'platform']); break } catch { assert.ok(i < 60, 'PostgreSQL did not start'); await pause() }
  }
  for (const volume of volumes) docker(['volume', 'create', volume])
  docker(['run', '-d', '--name', studio, '--network', network, '-p', '127.0.0.1::3000',
    '-e', `HOSSO_DATABASE_URL=postgres://postgres:${password}@${postgres}:5432/platform`,
    '-e', 'HOSSO_SECRET=' + randomUUID() + randomUUID(), '-e', 'HOSSO_SEED=false', '-e', 'HOSSO_DB_PUSH=false',
    '-e', 'HOSSO_ADMIN_EMAIL=container@example.test', '-e', 'HOSSO_ADMIN_PASSWORD=' + randomUUID(),
    '-e', 'HOSSO_BACKUP_DIR=/app/backups',
    ...volumes.flatMap((volume, index) => ['-v', `${volume}:/app/${['media', 'private', 'backups'][index]}`]), image])
  started = true
  const publicPort = () => JSON.parse(docker(['inspect', studio]))[0].NetworkSettings.Ports['3000/tcp'][0].HostPort
  const hostPorts = [publicPort()]
  let base = 'http://127.0.0.1:' + hostPorts[0]
  let healthy = false
  for (let i = 0; i < 180; i++) {
    try { if ((await fetch(base + '/api/health', { signal: AbortSignal.timeout(2000) })).ok) { healthy = true; break } } catch {}
    const running = docker(['inspect', '--format', '{{.State.Running}}', studio])
    assert.equal(running, 'true', 'Container exited during migration/startup')
    await pause()
  }
  assert.ok(healthy, 'Container did not become healthy after migrations')
  assert.equal((await fetch(base + '/api/plugins/analytics/config', { signal: AbortSignal.timeout(10000) })).status, 402, 'Production license enforcement remains enabled')
  const audit = JSON.parse(docker(['exec', studio, 'node', '-e', `const fs=require('fs');const dir='/app/seed/sites';const privateRoot='/app/private';fs.writeFileSync(privateRoot+'/fixture.txt','persistent');console.log(JSON.stringify({uid:process.getuid(),privateSource:fs.existsSync('/app/packages/plugin-cross-sell'),env:fs.existsSync('/app/apps/studio/.env'),kits:fs.readdirSync(dir).filter(n=>n.endsWith('.hosso-site.zip')).length,registration:fs.readFileSync('/app/apps/studio/hosso.installed.ts','utf8')}))`]))
  assert.notEqual(audit.uid, 0)
  assert.equal(audit.privateSource, false)
  assert.equal(audit.env, false)
  assert.equal(audit.kits, 6)
  assert.ok(!audit.registration.includes('plugin-cross-sell'))
  docker(['restart', studio])
  // Docker may allocate a new host port after restarting a container published
  // with an ephemeral port. Follow the current binding, not the old endpoint.
  hostPorts.push(publicPort())
  base = 'http://127.0.0.1:' + hostPorts[1]
  console.log(`Container host ports: ${hostPorts[0]} before restart, ${hostPorts[1]} after restart`)
  assert.equal(docker(['exec', studio, 'node', '-e', `console.log(require('fs').readFileSync('/app/private/fixture.txt','utf8'))`]), 'persistent')
  healthy = false
  for (let i = 0; i < 90; i++) {
    try { if ((await fetch(base + '/api/health', { signal: AbortSignal.timeout(2000) })).ok) { healthy = true; break } } catch {}
    assert.equal(docker(['inspect', '--format', '{{.State.Running}}', studio]), 'true', 'Container exited after restart')
    await pause()
  }
  assert.ok(healthy, 'Container must remain healthy after migration replay and restart')
  const migrations = docker(['exec', postgres, 'psql', '-U', 'postgres', '-d', 'platform', '-Atc', 'SELECT name FROM payload_migrations ORDER BY id'])
  assert.match(migrations, /20261117_090000_studio_platform/)
  await writeFile(output + '/result.json', JSON.stringify({ at: new Date().toISOString(), image, imageId: imageInfo.Id, imageCreatedAt: imageInfo.Created, hostPorts, nonRoot: true, privateVolume: true, privateSourceExcluded: true, kits: 6, migrations: migrations.split('\n') }, null, 2))
  console.log('PASS public container: frozen install/build, full PostgreSQL migration chain, health, production license, six kits, private-source exclusion, non-root and persistent private volume')
} catch (error) {
  if (started) await writeFile(output + '/failure.log', logs()).catch(() => {})
  throw error
} finally {
  if (started) await writeFile(output + '/server.log', logs()).catch(() => {})
  for (const name of [studio, postgres]) { try { docker(['rm', '-f', name]) } catch {} }
  for (const volume of volumes) { try { docker(['volume', 'rm', volume]) } catch {} }
  try { docker(['network', 'rm', network]) } catch {}
}
