import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { lookup } from 'node:dns/promises'
import { BlockList, isIP } from 'node:net'
import http from 'node:http'
import https from 'node:https'

export const SECRET_MASK = '••••••••'
const PREFIX = 'enc:v1:'
function encryptionKey() {
  const raw = process.env.HOSSO_ENCRYPTION_KEY?.trim() || ''
  const key = Buffer.from(raw, /^[a-f\d]{64}$/i.test(raw) ? 'hex' : 'base64')
  if (key.length !== 32) throw new Error('HOSSO_ENCRYPTION_KEY must contain 32 bytes')
  return key
}
export function encryptCredential(value: string) {
  if (value.startsWith(PREFIX)) return value
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const bytes = Buffer.concat([cipher.update(value, 'utf8'), cipher.final(), cipher.getAuthTag()])
  return `${PREFIX}${iv.toString('base64')}:${bytes.toString('base64')}`
}
export function decryptCredential(value: string) {
  if (value === SECRET_MASK) throw new Error('Read credentials through the internal credential context')
  // Legacy plaintext is supported only until the credential migration rewrites it.
  if (!value.startsWith(PREFIX)) return value
  const [iv, encoded] = value.slice(PREFIX.length).split(':')
  const bytes = Buffer.from(encoded, 'base64')
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(iv, 'base64'))
  decipher.setAuthTag(bytes.subarray(-16))
  return Buffer.concat([decipher.update(bytes.subarray(0, -16)), decipher.final()]).toString('utf8')
}

const unbracket = (host: string) => host.replace(/^\[|\]$/g, '').toLowerCase()
const reservedV6 = new BlockList()
reservedV6.addSubnet('2001::', 23, 'ipv6')
reservedV6.addSubnet('2001:db8::', 32, 'ipv6')
reservedV6.addSubnet('2002::', 16, 'ipv6')
reservedV6.addSubnet('3fff::', 20, 'ipv6')
export function isPublicAddress(raw: string) {
  const address = unbracket(raw)
  if (isIP(address) === 4) {
    const [a, b, c] = address.split('.').map(Number)
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || b === 0 || (b === 88 && c === 99))) || (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) || (a === 203 && b === 0 && c === 113))
  }
  // Only global unicast; exclude documentation and transition ranges (including mapped IPv4).
  return isIP(address) === 6 && /^[23]/.test(address) && !reservedV6.check(address, 'ipv6')
}
function allowedPrivate(host: string) {
  return (process.env.HOSSO_PRIVATE_API_HOSTS || '').split(',').map((v) => v.trim().toLowerCase()).filter(Boolean).includes(unbracket(host))
}
export function assertExternalUrl(raw: string | URL) {
  const url = new URL(raw)
  const host = unbracket(url.hostname)
  const localDev = process.env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1', '::1'].includes(host)
  if ((url.protocol !== 'https:' && !(localDev && url.protocol === 'http:')) || url.username || url.password) throw new Error('HTTPS required without URL credentials')
  if (!localDev && !allowedPrivate(host) && (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || (isIP(host) && !isPublicAddress(host)))) throw new Error('Private API destination is not allowed')
  if (!localDev && url.port && url.port !== '443' && !allowedPrivate(host)) throw new Error('API port is not allowed')
  return url
}

/** Pin validated DNS results to the socket, reject redirects, and bound the response while reading. */
export async function fetchExternal(raw: string | URL, options: { method?: string; headers?: Record<string, string>; body?: string; timeoutMs?: number; maxBytes?: number } = {}): Promise<Response> {
  const url = assertExternalUrl(raw)
  const host = unbracket(url.hostname)
  const startedAt = Date.now()
  let dnsTimer: ReturnType<typeof setTimeout> | undefined
  const timeout = options.timeoutMs ?? 15000
  const addresses = isIP(host) ? [{ address: host, family: isIP(host) }] : await Promise.race([
    lookup(host, { all: true }),
    new Promise<never>((_, reject) => { dnsTimer = setTimeout(() => reject(new Error('API DNS timed out')), timeout) }),
  ]).finally(() => clearTimeout(dnsTimer))
  const localDev = process.env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1', '::1'].includes(host)
  if (!addresses.length || (!localDev && !allowedPrivate(host) && addresses.some((a) => !isPublicAddress(a.address)))) throw new Error('API DNS resolved to a forbidden address')
  const selected = addresses[0]
  return new Promise((resolve, reject) => {
    const request = (url.protocol === 'https:' ? https : http).request(url, {
      method: options.method || 'GET', headers: options.headers,
      lookup: ((_hostname: string, opts: any, cb: any) => opts?.all ? cb(null, [selected]) : cb(null, selected.address, selected.family)) as any,
    }, (response) => {
      const max = options.maxBytes ?? 2_000_000
      if ((response.statusCode || 0) >= 300 && (response.statusCode || 0) < 400) { response.destroy(); reject(new Error('API redirect rejected')); return }
      const chunks: Buffer[] = []
      let length = 0
      response.on('data', (chunk: Buffer) => {
        length += chunk.length
        if (length > max) { response.destroy(new Error('API response is too large')); return }
        chunks.push(chunk)
      })
      response.on('error', reject)
      response.on('end', () => {
        const headers = new Headers()
        for (const [name, value] of Object.entries(response.headers)) if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(', ') : value)
        const status = response.statusCode || 502
        resolve(new Response([204, 205, 304].includes(status) ? null : Buffer.concat(chunks), { status, headers }))
      })
    })
    const timer = setTimeout(() => request.destroy(new Error('API request timed out')), Math.max(1, timeout - (Date.now() - startedAt)))
    request.on('error', reject)
    request.on('close', () => clearTimeout(timer))
    if (options.body) request.write(options.body)
    request.end()
  })
}
