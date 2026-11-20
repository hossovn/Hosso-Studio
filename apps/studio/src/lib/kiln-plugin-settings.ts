import { APIError, type Endpoint, type Field, type PayloadRequest } from 'payload'
import { sql } from '@payloadcms/db-postgres'
import { authorizePluginBridge } from './kiln-plugins'
import { readPluginSecrets, writePluginSecrets } from './kiln-plugin-secrets'
import { managedPluginAllowed } from '../../../../packages/blocks/src/managed-plugins'
import { inTransaction } from '../../../../packages/blocks/src/transactions'

const globals: Record<string, string> = { shop: 'shop-settings', affiliate: 'affiliate-settings', wim: 'wim-settings', 'cross-sell': 'cross-sell-settings', payment: 'payment-settings', shipping: 'shipping-settings', notify: 'notify-settings', analytics: 'analytics-settings' }
const secretNames: Record<string, Record<string, string>> = { payment: { sepayKey: 'Khóa webhook SePay' }, shipping: { ghnToken: 'Token GHN', ghnWebhookKey: 'Khóa webhook GHN' }, notify: { smtpUrl: 'Kết nối SMTP (smtp://tài-khoản:mật-khẩu@máy-chủ)', mailFrom: 'Email người gửi' } }
type SettingField = { name: string; label: string; type: string; secret?: boolean; min?: number; max?: number; options?: { value: string; label: string }[]; fields?: SettingField[] }
const label = (value: any, fallback: string) => typeof value === 'string' ? value : value?.vi || fallback
function fieldsOf(fields: Field[]): SettingField[] {
  return fields.flatMap((field: any): SettingField[] => {
    if (field.type === 'tabs') return field.tabs.flatMap((tab: any) => fieldsOf(tab.fields))
    if (!field.name) return field.fields ? fieldsOf(field.fields) : []
    if (field.admin?.hidden || !['text', 'textarea', 'email', 'number', 'checkbox', 'select', 'array', 'group'].includes(field.type)) return []
    return [{ name: field.name, label: label(field.label, field.name), type: field.type, secret: ['apiKey', 'webhookSecret'].includes(field.name), min: field.min, max: field.max, options: field.options?.map((o: any) => typeof o === 'string' ? { value: o, label: o } : { value: o.value, label: label(o.label, o.value) }), fields: field.fields ? fieldsOf(field.fields) : undefined }]
  })
}
function sanitize(fields: SettingField[], data: Record<string, any>): Record<string, any> {
  return Object.fromEntries(fields.map(f => [f.name, f.secret ? (data[f.name] ? '••••••••' : '') : f.type === 'array' ? (data[f.name] || []).map((v: any) => sanitize(f.fields || [], v)) : f.type === 'group' ? sanitize(f.fields || [], data[f.name] || {}) : data[f.name] ?? (f.type === 'checkbox' ? false : '')]))
}
function validate(fields: SettingField[], values: unknown): Record<string, any> {
  if (!values || typeof values !== 'object' || Array.isArray(values)) throw new APIError('invalid_settings', 400)
  const out: Record<string, any> = {}
  for (const [key, value] of Object.entries(values)) {
    const f = fields.find(f => f.name === key)
    if (!f) throw new APIError('invalid_settings', 400)
    if (f.secret && value === '••••••••') continue
    if (f.type === 'array') {
      if (!Array.isArray(value) || value.length > 100) throw new APIError('invalid_settings', 400)
      out[key] = value.map(v => validate(f.fields || [], v)); continue
    }
    if (f.type === 'group') { out[key] = validate(f.fields || [], value); continue }
    const valid = f.type === 'checkbox' ? typeof value === 'boolean' : f.type === 'number' ? typeof value === 'number' && Number.isFinite(value) && value >= (f.min ?? 0) && value <= (f.max ?? 1e12) : typeof value === 'string' && value.length <= 4096 && (f.type !== 'select' || f.options?.some(o => o.value === value))
    if (!valid) throw new APIError('invalid_settings', 400)
    out[key] = value
  }
  return out
}
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } })
function endpoint(method: 'get' | 'patch'): Endpoint {
  return { path: '/site/kiln/plugins/:plugin/settings', method, handler: async req => {
    try {
      authorizePluginBridge(req)
      const plugin = String(req.routeParams?.plugin || '')
      if (!Object.hasOwn(globals, plugin)) return json({ fields: [], values: {}, updated_at: null, message: 'Ứng dụng này không cần cấu hình kết nối.' })
      if (!await managedPluginAllowed(plugin)) throw new APIError('plugin_disabled', 403)
      const slug = globals[plugin] as any
      const definition = req.payload.config.globals.find(g => g.slug === slug)
      if (!definition) throw new APIError('unsupported_plugin', 400)
      const extras = secretNames[plugin] || {}
      const schema = [...fieldsOf(definition.fields), ...Object.entries(extras).map(([name, label]) => ({ name, label, type: 'text', secret: true }))]
      const read = () => req.payload.findGlobal({ slug, req, depth: 0, overrideAccess: true }) as Promise<Record<string, any>>
      if (method === 'patch') {
        const body = await req.json?.()
        if (!body || Object.keys(body).some(k => !['values', 'expected_updated_at'].includes(k)) || !Object.hasOwn(body, 'expected_updated_at')) throw new APIError('invalid_settings', 400)
        const data = validate(schema, body.values)
        if (plugin === 'cross-sell' && data.backend === 'wim' && !await managedPluginAllowed('wim')) throw new APIError('wim_entitlement_required', 403)
        await inTransaction(req, async () => {
          if (req.payload.db.name === 'postgres') await (req.payload.db as any).sessions[await req.transactionID!].db.execute(sql`SELECT pg_advisory_xact_lock(174832019, 3)`)
          const before = await read()
          if ((before.updatedAt || null) !== body.expected_updated_at) throw new APIError('revision_conflict', 409)
          const secrets = await readPluginSecrets(req.payload, plugin, req)
          let secretChanged = false
          for (const key of Object.keys(extras)) if (Object.hasOwn(data, key)) { secrets[key] = data[key]; delete data[key]; secretChanged = true }
          if (secretChanged) await writePluginSecrets(req, plugin, secrets)
          await req.payload.updateGlobal({ slug, req, data, overrideAccess: true })
        })
      }
      const data = await read(), secrets = await readPluginSecrets(req.payload, plugin)
      return json({ fields: schema, values: sanitize(schema, { ...data, ...secrets }), updated_at: data.updatedAt || null })
    } catch (error) { return json({ error: error instanceof APIError && error.status === 409 ? 'revision_conflict' : 'settings_request_failed' }, error instanceof APIError ? error.status : 400) }
  } }
}
export const kilnPluginSettings = [endpoint('get'), endpoint('patch')]
