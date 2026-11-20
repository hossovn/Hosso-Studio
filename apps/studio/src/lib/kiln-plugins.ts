import { APIError, type CollectionConfig, type Endpoint, type Payload, type PayloadRequest } from 'payload'
import { sql } from '@payloadcms/db-postgres'
import hosso from '@hosso-config'
import { acceptManagedSnapshot, configureManagedPlugins, isManagedPlugins, managedPluginAllowed, verifyManagedSnapshot, type ManagedTrust } from '../../../../packages/blocks/src/managed-plugins'
import { inTransaction } from '../../../../packages/blocks/src/transactions'
import { serviceTokenOk } from './kiln-auth'
import { initializePluginSecrets, managedConfigurationReady } from './kiln-plugin-secrets'

export const ManagedPluginState: CollectionConfig = {
  slug: 'managed-plugin-state', admin: { hidden: true }, timestamps: false, lockDocuments: false,
  access: { read: () => false, create: () => false, update: () => false, delete: () => false },
  fields: [{ name: 'key', type: 'text', unique: true, required: true }, { name: 'token', type: 'text', required: true }],
}
function trust(): ManagedTrust {
  return { tenant: process.env.HOSSO_TENANT || '', keys: JSON.parse(process.env.HOSSO_PLUGIN_TRUST || '{}'), versions: Object.fromEntries(hosso.plugins.map(p => [p.id, p.manifest?.version || ''])), generation: process.env.HOSSO_PLUGIN_GENERATION }
}
const current = (payload: Payload, req: Partial<PayloadRequest> = {}) => payload.db.findOne({ collection: 'managed-plugin-state', where: { key: { equals: 'authority' } }, req: req as PayloadRequest }) as Promise<{ token: string } | null>
export async function initializeManagedPlugins(payload: Payload) {
  initializePluginSecrets(payload)
  configureManagedPlugins(async () => {
    const saved = await current(payload)
    return saved ? verifyManagedSnapshot(saved.token, trust()) : null
  })
}
export async function activeManagedPlugins() {
  const allowed = await Promise.all(hosso.plugins.map(async p => await managedPluginAllowed(p.id) ? p : null))
  return allowed.filter(p => p !== null)
}
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } })
export function authorizePluginBridge(req: PayloadRequest) {
  if (!isManagedPlugins() || req.headers.get('x-hosso-tenant') !== process.env.HOSSO_TENANT || !serviceTokenOk(req.headers.get('authorization'))) throw new APIError('forbidden', 403)
}
export const kilnPlugins: Endpoint[] = [{
  path: '/site/kiln/plugins', method: 'put', handler: async req => {
    try {
      authorizePluginBridge(req)
      const body = await req.json?.()
      if (!body || typeof body.token !== 'string' || Object.keys(body).some(k => k !== 'token')) return json({ error: 'invalid_body' }, 400)
      const claims = await verifyManagedSnapshot(body.token, trust())
      await inTransaction(req, async () => {
        if (req.payload.db.name === 'postgres') {
          const adapter = req.payload.db as any
          await adapter.sessions[await req.transactionID!].db.execute(sql`SELECT pg_advisory_xact_lock(174832019, 2)`)
        }
        const saved = await current(req.payload, req)
        // Authenticate the old checkpoint even after its lease expires; expiry never permits replay.
        const previous = saved ? await verifyManagedSnapshot(saved.token, trust(), JSON.parse(Buffer.from(saved.token.split('.')[2], 'base64url').toString()).iat) : null
        acceptManagedSnapshot(previous, claims)
        await req.payload.db.upsert({ collection: 'managed-plugin-state', where: { key: { equals: 'authority' } }, data: { key: 'authority', token: body.token }, req })
      })
      const enabled = claims.capabilities.filter(c => c.enabled)
      const readiness = Object.fromEntries(await Promise.all(enabled.map(async c => {
        const plugin = hosso.plugins.find(p => p.id === c.id)!
        try {
          const steps = await plugin.checklist?.(req.payload)
          const status = await plugin.status?.(req.payload)
          const configured = await managedConfigurationReady(req.payload, c.id)
          return [c.id, !configured || steps?.some(s => !s.done) || status?.ok === false ? 'needs_configuration' : 'ready']
        } catch { return [c.id, 'needs_configuration'] }
      })))
      return json({ revision: claims.revision, generation: claims.generation, hash: claims.hash, expires_at: claims.exp, versions: Object.fromEntries(enabled.map(c => [c.id, c.version])), readiness })
    } catch (error) {
      if (error instanceof APIError) return json({ error: 'forbidden' }, error.status)
      const code = error instanceof Error ? error.message : ''
      return json({ error: code === 'managed_plugins_replay' ? 'revision_conflict' : 'invalid_snapshot' }, code === 'managed_plugins_replay' ? 409 : 400)
    }
  },
}]
