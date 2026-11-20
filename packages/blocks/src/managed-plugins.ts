/** Shared, browser-safe contract. Only the Studio server installs the durable reader. */
export type ManagedCapability = { id: string; version: string; enabled: boolean }
export type ManagedSnapshot = {
  v: 1; iss: 'kiln'; aud: 'hosso-studio'; tenant_id: string; generation: string
  revision: number; hash: string; iat: number; exp: number; capabilities: ManagedCapability[]
}
export type ManagedTrust = { tenant: string; keys: Record<string, string>; versions: Record<string, string>; generation?: string }
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const decode = (value: string) => Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))
const invalid = (reason: string): never => { throw new Error(`managed_plugins_${reason}`) }

export async function verifyManagedSnapshot(token: string, trust: ManagedTrust, now = Math.floor(Date.now() / 1000)): Promise<ManagedSnapshot> {
  if (typeof token !== 'string' || token.length > 32768) invalid('token')
  const parts = token.split('.')
  if (parts.length !== 4 || parts[0] !== 'KPL1' || !/^[a-zA-Z0-9_-]{1,64}$/.test(parts[1])) invalid('token')
  const [, kid, body, signature] = parts
  if (!Object.hasOwn(trust.keys, kid) || !uuid.test(trust.tenant)) invalid('trust')
  const key = await crypto.subtle.importKey('raw', decode(trust.keys[kid]) as BufferSource, 'Ed25519', false, ['verify'])
  if (!await crypto.subtle.verify('Ed25519', key, decode(signature) as BufferSource, new TextEncoder().encode(body))) invalid('signature')
  const c = JSON.parse(new TextDecoder().decode(decode(body))) as ManagedSnapshot
  if (!c || c.v !== 1 || c.iss !== 'kiln' || c.aud !== 'hosso-studio' || c.tenant_id !== trust.tenant || !uuid.test(c.generation) || (trust.generation && c.generation !== trust.generation)) invalid('claims')
  if (!Number.isSafeInteger(c.revision) || c.revision < 0 || !Number.isSafeInteger(c.iat) || !Number.isSafeInteger(c.exp) || c.iat > now + 5 || c.exp <= now || c.exp <= c.iat || c.exp - c.iat > 300) invalid('lifetime')
  if (!Array.isArray(c.capabilities) || c.capabilities.length > 100) invalid('capabilities')
  const ids = new Set<string>()
  for (const cap of c.capabilities) {
    if (!cap || !/^[a-z0-9-]{1,64}$/.test(cap.id) || typeof cap.version !== 'string' || cap.version.length > 64 || typeof cap.enabled !== 'boolean' || ids.has(cap.id)) invalid('capabilities')
    ids.add(cap.id)
    if (cap.enabled && trust.versions[cap.id] !== cap.version) invalid('version')
  }
  // Canonical field order matches Go Capability's JSON encoding.
  const canonical = JSON.stringify(c.capabilities.map(({ id, version, enabled }) => ({ id, version, enabled })))
  const sum = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical))
  if (c.hash !== Array.from(new Uint8Array(sum), b => b.toString(16).padStart(2, '0')).join('')) invalid('hash')
  return c
}

/** A generation change requires an explicit operator recovery, never a normal push. */
export function acceptManagedSnapshot(previous: ManagedSnapshot | null, next: ManagedSnapshot): ManagedSnapshot {
  if (previous && (next.tenant_id !== previous.tenant_id || next.generation !== previous.generation || next.revision < previous.revision || next.iat < previous.iat || (next.revision === previous.revision && (next.hash !== previous.hash || next.exp < previous.exp)))) invalid('replay')
  return next
}

const readerKey = Symbol.for('hosso.managedPlugins.reader')
type Reader = () => Promise<ManagedSnapshot | null>
const state = globalThis as typeof globalThis & { [readerKey]?: Reader }
export const isManagedPlugins = () => process.env.HOSSO_PLUGIN_AUTHORITY === 'kiln'
export function configureManagedPlugins(reader: Reader) { state[readerKey] = reader }
export async function managedPluginAllowed(id: string): Promise<boolean> {
  if (!isManagedPlugins()) return true
  try {
    const snapshot = await state[readerKey]?.()
    return !!snapshot && snapshot.exp > Math.floor(Date.now() / 1000) && snapshot.capabilities.some(c => c.id === id && c.enabled)
  } catch { return false }
}
export async function requireManagedPlugin(id: string) {
  if (!await managedPluginAllowed(id)) invalid('disabled')
}
const secretKey = Symbol.for('hosso.managedPlugins.secrets')
const mailKey = Symbol.for('hosso.managedPlugins.mail')
const services = globalThis as typeof globalThis & { [secretKey]?: (id: string) => Promise<Record<string, string>>; [mailKey]?: (message: unknown) => Promise<unknown> }
export function configureManagedServices(secrets: (id: string) => Promise<Record<string, string>>, mail: (message: unknown) => Promise<unknown>) { services[secretKey] = secrets; services[mailKey] = mail }
export async function managedPluginSecrets(id: string) { await requireManagedPlugin(id); return await services[secretKey]?.(id) ?? {} }
/** Server-only service installed by Studio; used solely to authenticate late payment evidence. */
export async function retainedPaymentCredentials() {
  if (!isManagedPlugins() || !services[secretKey]) invalid('receipt_unconfigured')
  return services[secretKey]!('payment')
}
export async function sendManagedEmail(message: unknown) { await requireManagedPlugin('notify'); if (!services[mailKey]) invalid('mail_unconfigured'); return services[mailKey]!(message) }
