import type { HossoPlugin } from '@hosso/studio-blocks'
import { wimBlocks } from './blocks'
import { loadCheckout, loadOrderStatus, loadProductDetail, loadProductGrid, loadVehicleSelector } from './loaders'
import { CartLink } from './client/CartLink'
import { wimGet, type ProductPage } from './client'
import { getWimConfig } from './config'
import { formatVnd } from './format'
import { adminEn } from './admin-en'
import { applyPayload } from './payload'
import { fallbackRenderers } from './renderers'
import { css } from './styles'

/** Plugin Hosso WIM: kết nối, block thương mại, cache, webhook. Khai báo trong hosso.config.ts. */
const plugin: HossoPlugin = {
  id: 'wim',
  blocks: wimBlocks,
  fallbackRenderers,
  css,
  headerSlot: CartLink,
  adminEn,
  adminNav: [{ label: 'Kết nối Hosso WIM', href: '/admin/globals/wim-settings', roles: ['admin'] }],
  checklist: async (payload) => [{ label: 'Kết nối Hosso WIM (địa chỉ API và khóa)', done: Boolean(await getWimConfig(payload)), href: '/admin/globals/wim-settings' }],
  payload: applyPayload,
  portable: { globals: [{ slug: 'wim-settings', secretFields: ['apiKey', 'webhookSecret'] }] },
  search: async (q, payload) => {
    const cfg = await getWimConfig(payload)
    if (!cfg) return []
    const r = await wimGet<ProductPage>(cfg, '/v1/products', { q, pageSize: 8 }, ['list'])
    return r.items.map((p) => ({ title: p.name, href: `/chi-tiet?p=${p.id}`, description: `${p.brand} · ${p.code} · ${formatVnd(p.price)}` }))
  },
  loaders: {
    WimVehicleSelector: loadVehicleSelector,
    WimProductGrid: loadProductGrid,
    WimProductDetail: loadProductDetail,
    WimCheckout: loadCheckout,
    WimOrderStatus: loadOrderStatus,
  },
}

export default plugin
