import type { HossoPlugin, PluginManifest } from '@hosso/studio-blocks';
import manifest from '../hosso.json';



// Public editor definition. Server integrations are intentionally absent.
const plugin: HossoPlugin = {
id: 'promotions',
manifest: { ...manifest, commercial: true } as PluginManifest,
adminNav: [{ label: 'Khuyến mãi', href: '/admin/collections/vouchers', roles: ['admin', 'publisher'] }],
adminEn: { 'Khuyến mãi': 'Promotions' }
}
export default plugin
