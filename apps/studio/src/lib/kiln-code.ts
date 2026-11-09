// Server-side authorization-code exchange. No browser-provided tenant or audience
// may select the identity accepted by this Studio instance.
export type KilnIdentity = { tenant_id: string; user_id: string; email?: string; role: 'owner' | 'admin'; aud: string; exp: number }
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function exchangeKilnCode(code: string, opts: {
  kilnURL: string; publicURL: string; tenant: string; allowHTTP?: boolean
  fetcher?: typeof fetch; now?: number
}): Promise<KilnIdentity> {
  if (!/^sso_code_[a-f0-9]{64}$/.test(code) || !uuid.test(opts.tenant)) throw new Error('invalid_sso_request')
  const target = new URL(opts.kilnURL)
  const site = new URL(opts.publicURL)
  if (target.username || target.password || target.search || target.hash || target.pathname !== '/') throw new Error('invalid_kiln_url')
  if (target.protocol !== 'https:' && !(target.protocol === 'http:' && opts.allowHTTP)) throw new Error('insecure_kiln_url')
  if (!['https:', 'http:'].includes(site.protocol)) throw new Error('invalid_public_url')
  const result = await (opts.fetcher ?? fetch)(new URL('/api/v1/auth/sso/verify', target), {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, audience: site.host }),
    cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(8000),
  })
  if (!result.ok) throw new Error('sso_rejected')
  const body = await result.json() as { success?: boolean; data?: KilnIdentity }
  const identity = body.data
  const now = Math.floor((opts.now ?? Date.now()) / 1000)
  if (!body.success || !identity || identity.tenant_id !== opts.tenant || identity.aud !== site.host
    || !uuid.test(identity.user_id) || !['owner', 'admin'].includes(identity.role)
    || !Number.isInteger(identity.exp) || identity.exp <= now || identity.exp > now + 120) throw new Error('invalid_sso_identity')
  return identity
}
