import type { HossoPlugin } from '@hosso/studio-blocks';
import { wimBlocks } from './blocks';
import { adminEn } from './admin-en';
import { fallbackRenderers } from './renderers';
import { css } from './styles';



// Public editor definition. Server integrations are intentionally absent.
const plugin: HossoPlugin = {
id: 'wim',
blocks: wimBlocks,
fallbackRenderers,
css,
adminEn,
adminNav: [{ label: 'Kết nối Hosso WIM', href: '/admin/globals/wim-settings', roles: ['admin'] }],
loaderTypes: ["WimVehicleSelector","WimProductGrid","WimProductDetail","WimCheckout","WimOrderStatus"]
}
export default plugin
