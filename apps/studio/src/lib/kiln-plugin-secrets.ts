import type { Payload, PayloadRequest, SendEmailOptions } from 'payload'
import { lookup } from 'node:dns/promises'
import nodemailer from 'nodemailer'
import { decryptCredential, encryptCredential, isPublicAddress } from '../../../../packages/blocks/src/server-security'
import { configureManagedServices, requireManagedPlugin } from '../../../../packages/blocks/src/managed-plugins'

export function approvedSmtpTarget(raw: string, from: string) {
  const target = new URL(raw)
  const hosts = (process.env.HOSSO_SMTP_ALLOWED_HOSTS || '').split(',').map(h => h.trim().toLowerCase()).filter(Boolean)
  if (!['smtp:', 'smtps:'].includes(target.protocol) || !hosts.includes(target.hostname.toLowerCase()) || target.search || target.hash || (target.pathname && target.pathname !== '/') || !target.username || !target.password || !['', '465', '587'].includes(target.port) || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(from)) throw new Error('SMTP relay is not approved or is incomplete')
  return target
}
export async function managedConfigurationReady(payload: Payload, plugin: string) {
  const secrets = await readPluginSecrets(payload, plugin)
  if (plugin === 'payment') return Boolean(secrets.sepayKey?.trim())
  if (plugin === 'notify') { try { approvedSmtpTarget(secrets.smtpUrl, secrets.mailFrom); return true } catch { return false } }
  if (plugin === 'shipping') {
    const settings = await payload.findGlobal({ slug: 'shipping-settings' as any, overrideAccess: true }) as any
    return !settings.ghnEnabled || Boolean(secrets.ghnToken?.trim() && secrets.ghnWebhookKey?.trim() && settings.ghnShopId)
  }
  return true
}

export async function readPluginSecrets(payload: Payload, plugin: string, req?: PayloadRequest): Promise<Record<string, string>> {
  const row = await payload.db.findOne({ collection: 'managed-plugin-state', where: { key: { equals: 'secrets:' + plugin } }, req }) as { token: string } | null
  return row ? JSON.parse(decryptCredential(row.token)) : {}
}
export async function writePluginSecrets(req: PayloadRequest, plugin: string, values: Record<string, string>) {
  await req.payload.db.upsert({ collection: 'managed-plugin-state', where: { key: { equals: 'secrets:' + plugin } }, data: { key: 'secrets:' + plugin, token: encryptCredential(JSON.stringify(values)) }, req })
}
export function initializePluginSecrets(payload: Payload) {
  configureManagedServices(id => readPluginSecrets(payload, id), async message => {
    const secrets = await readPluginSecrets(payload, 'notify')
    if (!secrets.smtpUrl || !secrets.mailFrom) throw new Error('Managed email is not configured')
    const target = approvedSmtpTarget(secrets.smtpUrl, secrets.mailFrom)
    // Operators approve relay hosts; tenant configuration cannot turn email into an internal-network proxy.
    const addresses = await lookup(target.hostname, { all: true })
    if (!addresses.length || addresses.some(a => !isPublicAddress(a.address))) throw new Error('SMTP relay address is not public')
    await requireManagedPlugin('notify')
    const transport = nodemailer.createTransport({ host: addresses[0].address, port: Number(target.port || (target.protocol === 'smtps:' ? 465 : 587)), secure: target.protocol === 'smtps:', requireTLS: true, tls: { servername: target.hostname }, auth: { user: decodeURIComponent(target.username), pass: decodeURIComponent(target.password) }, connectionTimeout: 10000, socketTimeout: 15000 })
    try { return await transport.sendMail({ ...(message as SendEmailOptions), from: secrets.mailFrom }) } finally { transport.close() }
  })
}
