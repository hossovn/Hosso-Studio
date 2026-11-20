import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { getPayload } from 'payload'
import config from '../src/payload.config'
import { initializeManagedPlugins } from '../src/lib/kiln-plugins'
import { managedPluginAllowed, managedPluginSecrets } from '../../../packages/blocks/src/managed-plugins'

const checkpoint = JSON.parse(await readFile(process.env.KILN_PLUGIN_TEST_CHECKPOINT!, 'utf8'))
process.env.HOSSO_PLUGIN_AUTHORITY = 'kiln'
process.env.HOSSO_PLUGIN_TRUST = checkpoint.trust
process.env.HOSSO_TENANT = checkpoint.tenant
process.env.HOSSO_ENCRYPTION_KEY = 'ab'.repeat(32)
const payload = await getPayload({ config })
const clock = Date.now
try {
  await initializeManagedPlugins(payload)
  assert.equal(await managedPluginAllowed('payment'), true)
  assert.equal(await managedPluginAllowed('notify'), false)
  assert.equal((await managedPluginSecrets('payment')).sepayKey, 'test-sepay-webhook-secret-never-returned')
  process.env.HOSSO_TENANT = checkpoint.generation
  assert.equal(await managedPluginAllowed('payment'), false)
  process.env.HOSSO_TENANT = checkpoint.tenant
  Date.now = () => clock() + 301_000
  assert.equal(await managedPluginAllowed('payment'), false)
  await assert.rejects(() => managedPluginSecrets('payment'))
  console.log('PASS: fresh process reloads durable authority and encrypted secrets; wrong tenant and expired lease deny access')
} finally { Date.now = clock; await payload.destroy() }
