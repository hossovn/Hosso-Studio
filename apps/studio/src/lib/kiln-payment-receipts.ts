import { APIError, type Endpoint } from 'payload'
import hosso from '@hosso-config'
import { authorizePluginBridge } from './kiln-plugins'

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
export const kilnPaymentReceipts: Endpoint[] = (['get', 'post'] as const).map(method => ({
  path: method === 'get' ? '/site/kiln/plugins/payment/receipts/:cursor' : '/site/kiln/plugins/payment/receipts/:cursor/reconcile',
  method,
  handler: async req => {
    try {
      authorizePluginBridge(req)
      const cursor = Number(req.routeParams?.cursor)
      if (!Number.isSafeInteger(cursor) || cursor < (method === 'get' ? 0 : 1) || cursor > 2147483647) return json({ error: 'invalid_cursor' }, 400)
      const inbox = hosso.plugins.find(p => p.id === 'payment')?.retainedReceipts
      if (!inbox) return json({ error: 'unsupported_plugin' }, 503)
      return json(method === 'get' ? await inbox.list(req, cursor || undefined) : await inbox.reconcile(req, cursor))
    } catch (error) {
      return json({ error: 'receipt_request_failed' }, error instanceof APIError ? error.status : 409)
    }
  },
}))
