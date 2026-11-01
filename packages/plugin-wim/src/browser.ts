import type { HossoPlugin } from '@hosso/studio-blocks'
import { wimBlocks } from './blocks'
import { fallbackRenderers } from './renderers'
import { adminEn } from './admin-en'
import { css } from './styles'

// The editor consumes schemas and renderers; API credentials and HTTP clients stay on the server.
const plugin: HossoPlugin = {
  id: 'wim', blocks: wimBlocks, fallbackRenderers, css, adminEn,
  adminNav: [{ label: 'Kết nối Hosso WIM', href: '/admin/globals/wim-settings', roles: ['admin'] }],
}
export default plugin
