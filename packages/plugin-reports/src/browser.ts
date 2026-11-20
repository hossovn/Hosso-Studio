import type { HossoPlugin, PluginManifest } from '@hosso/studio-blocks';
import manifest from '../hosso.json';



// Public editor definition. Server integrations are intentionally absent.
const plugin: HossoPlugin = {
id: 'reports',
manifest: { ...manifest, commercial: true } as PluginManifest,
adminNav: [{ label: 'Báo cáo bán hàng', href: '/admin/shop-reports', roles: ['admin', 'publisher'] }],
adminEn: { 'Báo cáo bán hàng': 'Sales reports' }
}
export default plugin
