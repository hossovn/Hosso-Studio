import type { HossoPlugin } from '@hosso/studio-blocks'
import { wimBlocks } from './blocks'
import { loadProductDetail, loadProductGrid, loadVehicleSelector } from './loaders'
import { applyPayload } from './payload'
import { fallbackRenderers } from './renderers'
import { css } from './styles'

/** Plugin Hosso WIM: kết nối, block thương mại, cache, webhook. Khai báo trong hosso.config.ts. */
const plugin: HossoPlugin = {
  id: 'wim',
  blocks: wimBlocks,
  fallbackRenderers,
  css,
  payload: applyPayload,
  loaders: {
    WimVehicleSelector: loadVehicleSelector,
    WimProductGrid: loadProductGrid,
    WimProductDetail: loadProductDetail,
  },
}

export default plugin
