import definition from './browser'
import type { HossoPlugin, PluginManifest } from '@hosso/studio-blocks'
import manifest from '../hosso.json'
import { loadVehicleSelector } from './loaders'
import { loadCheckout, loadSharedDetail, loadSharedGrid, loadSharedOrder } from './shared-loaders'
import { WimError, wimFetch } from './client'
import { getWimConfig } from './config'
import { commerce } from './catalog'

import { applyPayload } from './payload'

/** Plugin Hosso WIM: kết nối, block thương mại, cache, webhook. Khai báo trong hosso.config.ts. */
const plugin: HossoPlugin = {
  ...definition,
  manifest: manifest as PluginManifest,
  commerce,

  checklist: async (payload) => [{ label: 'Kết nối Hosso WIM (địa chỉ API và khóa)', done: Boolean(await getWimConfig(payload)), href: '/admin/globals/wim-settings' }],
  payload: applyPayload,
  readOrder: async (payload, id) => {
    const cfg = await getWimConfig(payload)
    if (!cfg) throw new Error('WIM is not configured')
    return wimFetch(cfg, '/v1/orders/' + encodeURIComponent(id))
  },
  // Kiln gọi qua GET /api/site/status: gọi thẳng WIM (không qua cache) để biết kết nối còn sống không.
  status: async (payload) => {
    const cfg = await getWimConfig(payload)
    if (!cfg) return { ok: false, detail: 'unconfigured' }
    try {
      await wimFetch(cfg, '/v1/branches')
      return { ok: true }
    } catch (e) {
      return { ok: false, detail: e instanceof WimError ? (e.kind === 'http' ? `http ${e.status}` : e.kind) : 'error' }
    }
  },
  portable: { globals: [{ slug: 'wim-settings', secretFields: ['apiKey', 'webhookSecret'] }] },
  loaders: {
    WimVehicleSelector: loadVehicleSelector,
    WimProductGrid: loadSharedGrid,
    WimProductDetail: loadSharedDetail,
    WimCheckout: loadCheckout,
    WimOrderStatus: loadSharedOrder,
  },
}

export default plugin
